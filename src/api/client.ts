import type { Analysis, AnalyzeProgress, AnalyzeRequest, ChatMessage, Evidence, QuestionRequest, Source, SourceInput } from './types';
import { createSampleAnalysis, SAMPLE_QUESTION, SAMPLE_SCENARIO_ID, sampleSourceInputs } from '../mock/scholarship';
import { validateAnalysis } from '../lib/analysis';
import { locateQuote } from '../lib/locateQuote';
import { logBoundary } from '../lib/telemetry';

export class AdapterError extends Error {
  constructor(message: string, public readonly code: 'validation' | 'not_connected' | 'invalid_response') { super(message); this.name = 'AdapterError'; }
}

function abortError(): Error { return new DOMException('Operation cancelled.', 'AbortError'); }
function checkAbort(signal?: AbortSignal): void { if (signal?.aborted) throw abortError(); }
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(abortError()); return; }
    const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(abortError()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

function validateInputs(question: string, inputs: SourceInput[]): void {
  if (typeof question !== 'string' || !question.trim()) throw new AdapterError('Enter a research question before analyzing sources.', 'validation');
  if (!Array.isArray(inputs) || inputs.length < 2 || inputs.length > 6) throw new AdapterError('Add 2-6 sources before analyzing.', 'validation');
  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const input of inputs) {
    if (!input || typeof input.id !== 'string' || ids.has(input.id) || !input.id) throw new AdapterError('Each source needs a unique ID.', 'validation');
    ids.add(input.id);
    if (!['url', 'pdf', 'docx', 'text'].includes(input.kind) || typeof input.title !== 'string' || !input.title.trim()) throw new AdapterError('Use a supported source with a title.', 'validation');
    if (input.size !== undefined && (!Number.isFinite(input.size) || input.size < 0 || input.size > 20 * 1024 * 1024)) throw new AdapterError('Files must be 20 MiB or smaller.', 'validation');
    if (input.text !== undefined && (typeof input.text !== 'string' || input.text.length > 100000 || !input.text.trim())) throw new AdapterError('Pasted text must contain 1-100000 characters.', 'validation');
    if (input.kind === 'url') {
      let url: URL;
      try { url = new URL(input.url ?? ''); } catch { throw new AdapterError('Enter a complete HTTP or HTTPS URL.', 'validation'); }
      if (!['http:', 'https:'].includes(url.protocol)) throw new AdapterError('Only HTTP and HTTPS links are supported.', 'validation');
      if (urls.has(url.href)) throw new AdapterError('This source link has already been added.', 'validation');
      urls.add(url.href);
    }
    if (input.fileName && !/\.(pdf|docx|txt|md)$/i.test(input.fileName)) throw new AdapterError('Upload PDF, DOCX, TXT, or Markdown files.', 'validation');
    if (input.kind === 'text' && !input.text?.trim()) throw new AdapterError('Add some text to this source.', 'validation');
    if ((input.kind === 'pdf' || input.kind === 'docx') && !input.fileName) throw new AdapterError('Select a file for this source.', 'validation');
  }
}

function inputSignature(input: SourceInput): string {
  return JSON.stringify([input.id, input.kind, input.title, input.url ?? null, input.text ?? null, input.fileName ?? null, input.size ?? null]);
}

export async function analyze(request: AnalyzeRequest, onProgress?: (progress: AnalyzeProgress) => void, signal?: AbortSignal): Promise<Analysis> {
  checkAbort(signal);
  if (!request || typeof request.requestId !== 'string' || typeof request.revision !== 'string') throw new AdapterError('The analysis request is incomplete.', 'validation');
  validateInputs(request.question, request.sources);
  logBoundary({ requestId: request.requestId, revision: request.revision, mode: request.mode, stage: 'input', status: 'entry', inputCount: request.sources.length, simulation: request.mode === 'sample' });
  const expected = sampleSourceInputs();
  const sameSources = request.sources.length === expected.length && request.sources.every((input, index) => inputSignature(input) === inputSignature(expected[index]));
  if (request.mode !== 'sample' || request.scenarioId !== SAMPLE_SCENARIO_ID || request.question !== SAMPLE_QUESTION || !sameSources) {
    logBoundary({ requestId: request.requestId, revision: request.revision, mode: request.mode, stage: 'input', status: 'error', reason: 'live_adapter_not_connected' });
    throw new AdapterError('Live analysis is not connected yet. Try the sample demo, or keep your sources ready for the backend.', 'not_connected');
  }
  logBoundary({ requestId: request.requestId, revision: request.revision, mode: request.mode, stage: 'input', status: 'exit', outputCount: request.sources.length, simulation: true });
  const stages: { stage: AnalyzeProgress['stage']; message: string }[] = [
    { stage: 'reading', message: 'Reading the prepared sample sources' },
    { stage: 'predicting_topics', message: 'Suggesting what a complete answer could cover' },
    { stage: 'comparing', message: 'Comparing statements across the sample sources' },
    { stage: 'checking_quotes', message: 'Checking quoted text against each sample source' },
    { stage: 'building_checklist', message: 'Building your verification checklist' },
  ];
  try {
    for (let index = 0; index < stages.length; index++) {
      checkAbort(signal);
      const current = stages[index];
      logBoundary({ requestId: request.requestId, revision: request.revision, mode: 'sample', stage: current.stage, status: 'entry', inputCount: request.sources.length, simulation: true });
      onProgress?.({ ...current, index });
      await delay(1250, signal);
      logBoundary({ requestId: request.requestId, revision: request.revision, mode: 'sample', stage: current.stage, status: 'exit', outputCount: request.sources.length, durationMs: 1250, simulation: true });
    }
    checkAbort(signal);
    const result = createSampleAnalysis();
    onProgress?.({ stage: 'done', message: 'Sample analysis ready', index: stages.length });
    logBoundary({ requestId: request.requestId, analysisId: result.id, revision: request.revision, mode: 'sample', stage: 'presentation', status: 'exit', outputCount: result.findings.length, simulation: true });
    return result;
  } catch (error) {
    logBoundary({ requestId: request.requestId, revision: request.revision, mode: 'sample', stage: 'analysis', status: 'error', reason: signal?.aborted ? 'cancelled' : 'analysis_failed', simulation: true });
    throw error;
  }
}

function quoteEvidence(source: Source, quote: string): Evidence | null {
  const match = locateQuote(source.canonicalText, quote);
  if (!match) return null;
  const section = source.sections.find((item) => locateQuote(item.text, quote));
  return { sourceId: source.id, sourceRevision: source.revision, quote, quoteMatched: true, charStart: match.start, charEnd: match.end, ...(section ? { sectionId: section.id, page: section.page } : {}) };
}

export async function askQuestion(request: QuestionRequest, signal?: AbortSignal): Promise<ChatMessage> {
  checkAbort(signal);
  if (!request || !Array.isArray(request.contexts) || request.contexts.length > 5) throw new AdapterError('Add up to five selected passages.', 'validation');
  const question = request.question?.trim() || (request.contexts.length ? 'Explain this passage and tell me what to verify.' : '');
  if (!question) throw new AdapterError('Enter a question or select a passage.', 'validation');
  if (request.analysis.mode !== 'sample' || request.analysis.id !== SAMPLE_SCENARIO_ID) throw new AdapterError('Live analysis is not connected yet.', 'not_connected');
  const analysis = validateAnalysis(request.analysis);
  const ready = analysis.sources.filter((source) => source.status === 'ready' && source.canonicalText.trim());
  for (const context of request.contexts) {
    const source = ready.find((item) => item.id === context.sourceId && item.revision === context.sourceRevision);
    if (!source || !context.text || Array.from(context.text).length > 1500 || !locateQuote(source.canonicalText, context.text, { charStart: context.charStart, charEnd: context.charEnd })) throw new AdapterError('A selected passage is unavailable in the current source. Select it again.', 'validation');
  }
  const requestId = `chat-${Date.now()}`;
  logBoundary({ requestId, analysisId: analysis.id, mode: 'sample', stage: 'question', status: 'entry', inputCount: request.contexts.length, simulation: true });
  await delay(900, signal);
  checkAbort(signal);
  const contextText = request.contexts.map((context) => context.text).join(' ');
  const explaining = /^(Explain this passage|Do the other sources|Check against)/i.test(question) || request.compare;
  const incomeQuestion = /income|certificate|form 16|\bitr\b|document/i.test(question) || (explaining && /income|certificate|form 16|\bitr\b/i.test(contextText));
  const deadlineQuestion = /deadline|application date|end of November|most recent|cycle/i.test(question) || (explaining && /deadline|November|2025|2026/.test(contextText));
  const message: ChatMessage = { id: requestId, role: 'assistant', text: 'This sample demo has no prepared answer to that question', createdAt: new Date().toISOString(), confidence: 'low', confidenceReason: 'This is a prepared sample response, not a live AI analysis.' };
  const get = (sourceId: string, quote: string) => {
    const source = ready.find((item) => item.id === sourceId);
    return source ? quoteEvidence(source, quote) : null;
  };
  if (incomeQuestion) {
    const quotes = [get('guidelines', 'Submit an income certificate issued within the last 6 months.'), get('listing', 'Income proof: Form 16 or ITR of parents.')].filter((item): item is Evidence => item !== null);
    message.evidence = quotes;
    message.text = quotes.length > 1 ? 'The guidelines ask for an income certificate issued within the last 6 months [1]. The listing instead mentions Form 16 or ITR of parents [2]. This may be a conflict; confirm the current official document list.' : quotes.length === 1 ? `The readable source states: "${quotes[0].quote}" [1]. Only one reviewed source supports this observation, so a cross-source comparison is unavailable.` : 'This sample demo has no prepared answer to that question';
    message.confidence = 'medium'; message.confidenceReason = 'The quoted wording is present; different document names may refer to different requirements.';
    message.suggestChecklistItem = 'Confirm the current official list of accepted income documents';
  } else if (deadlineQuestion) {
    const quotes = [get('guidelines', 'The application deadline is 30 November 2026.'), get('listing', 'Applications close at the end of November.'), get('blog', 'For the 2025 application cycle, the deadline was 30 November 2025.')].filter((item): item is Evidence => item !== null);
    message.evidence = quotes;
    message.text = quotes.map((quote, index) => `"${quote.quote}" [${index + 1}]`).join(' ') + ' Confirm the current cycle and exact deadline on the latest official notice.';
    message.confidence = 'medium'; message.confidenceReason = 'One source is undated and the blog explicitly refers to an earlier cycle.';
    message.suggestChecklistItem = 'Confirm the current application deadline on the official notice';
  } else if (/renewal|renew/i.test(question)) {
    message.text = `Not found in the text of ${ready.length} sources reviewed. The prepared sample does not state renewal conditions. AI suggestion: check the latest official renewal policy.`;
    message.confidenceReason = 'This gap was checked against the readable sample text; unread images may contain additional details.';
    message.suggestChecklistItem = 'Confirm the scholarship renewal conditions';
  } else if (/application link|where.*apply|official.*link/i.test(question)) {
    message.text = `Not found in the text of ${ready.length} sources reviewed. The sample sources do not provide an official application link. AI suggestion: find the latest official scholarship notice.`;
  } else if (/selection process|how.*selected/i.test(question)) {
    message.text = `Not found in the text of ${ready.length} sources reviewed. AI suggestion: ask the scholarship office for the published selection process.`;
  }
  if (request.compare && request.contexts.length && ready.length > 1) {
    const primary = request.contexts[0];
    message.sourceComparison = ready.filter((source) => source.id !== primary.sourceId).map((source) => {
      const exact = quoteEvidence(source, primary.text);
      if (exact) return { sourceId: source.id, result: 'supports' as const, quote: exact.quote, page: exact.page };
      const alternate = incomeQuestion ? source.id === 'guidelines' ? 'Submit an income certificate issued within the last 6 months.' : source.id === 'listing' ? 'Income proof: Form 16 or ITR of parents.' : null : deadlineQuestion ? source.id === 'guidelines' ? 'The application deadline is 30 November 2026.' : source.id === 'listing' ? 'Applications close at the end of November.' : source.id === 'blog' ? 'For the 2025 application cycle, the deadline was 30 November 2025.' : null : null;
      const found = alternate ? quoteEvidence(source, alternate) : null;
      if (found) return { sourceId: source.id, result: 'possible_conflict' as const, quote: found.quote, page: found.page };
      return { sourceId: source.id, result: 'not_found' as const };
    });
    if (!incomeQuestion && !deadlineQuestion) message.text = 'This sample compares the exact selected wording with the other readable sources. A phrase not found is not proof that the source disagrees or lacks related information.';
  } else if (request.compare && ready.length < 2) {
    message.sourceComparison = [];
    message.text = 'Only one source was readable. Add another readable source before comparing sources.';
  }
  logBoundary({ requestId, analysisId: analysis.id, mode: 'sample', stage: 'question', status: 'exit', outputCount: message.evidence?.length ?? 0, simulation: true });
  return message;
}
