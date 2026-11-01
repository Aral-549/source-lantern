import type { Analysis, Evidence, Finding, Source } from '../api/types';
import { locateQuote } from './locateQuote';
import { logBoundary } from './telemetry';

const findingTypes = new Set(['corroborated', 'single_source', 'conflict', 'outdated', 'gap']);
const confidenceLevels = new Set(['high', 'medium', 'low']);

function invalid(message: string): never { throw new Error(`Invalid analysis response: ${message}`); }
function uniqueIds(items: { id: string }[], label: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id || seen.has(item.id)) invalid(`${label} IDs must be present and unique.`);
    seen.add(item.id);
  }
}

export function validateAnalysis(input: Analysis): Analysis {
  if (!input || typeof input !== 'object') invalid('Expected an analysis object.');
  for (const field of ['sources', 'topics', 'coverage', 'summary', 'findings', 'checklist', 'removedFindings'] as const) {
    if (!Array.isArray(input[field])) invalid(`${field} must be an array.`);
  }
  if (typeof input.id !== 'string' || typeof input.question !== 'string' || !['sample', 'live'].includes(input.mode)) invalid('Missing analysis identity, question, or mode.');
  const analysis = structuredClone(input);
  logBoundary({ analysisId: analysis.id, mode: analysis.mode, stage: 'validate_analysis', status: 'entry', inputCount: analysis.findings.length });
  uniqueIds(analysis.sources, 'Source'); uniqueIds(analysis.topics, 'Topic'); uniqueIds(analysis.findings, 'Finding'); uniqueIds(analysis.checklist, 'Checklist');
  const sourceMap = new Map<string, Source>();
  for (const source of analysis.sources) {
    if (typeof source.revision !== 'string' || typeof source.canonicalText !== 'string' || !Array.isArray(source.sections)) invalid('Source revision, canonical text, and sections are required.');
    if (!['queued', 'fetching', 'extracting', 'ready', 'failed'].includes(source.status)) invalid('Unknown source status.');
    sourceMap.set(source.id, source);
  }
  const ready = analysis.sources.filter((source) => source.status === 'ready' && source.canonicalText.trim());
  if (!ready.length) {
    logBoundary({ analysisId: analysis.id, mode: analysis.mode, stage: 'validate_analysis', status: 'error', reason: 'no_readable_sources', outputCount: 0 });
    throw new Error('No sources could be read. Retry, paste text instead, or upload a readable file.');
  }
  const readyIds = new Set(ready.map((source) => source.id));
  const topicIds = new Set(analysis.topics.map((topic) => topic.id));
  const findEvidence = (evidence: Evidence, findingId?: string): Evidence | null => {
    if (!evidence || typeof evidence.quote !== 'string' || !evidence.quote.trim()) invalid('Evidence must contain a nonempty quote.');
    const source = sourceMap.get(evidence.sourceId);
    if (!source) invalid('Evidence references an unknown source.');
    if (evidence.sourceRevision !== source.revision) invalid('Evidence source revision is stale.');
    if (!readyIds.has(source.id)) return null;
    const match = locateQuote(source.canonicalText, evidence.quote, { charStart: evidence.charStart, charEnd: evidence.charEnd });
    logBoundary({ analysisId: analysis.id, sourceId: source.id, findingId, mode: analysis.mode, stage: 'check_quote', status: match ? 'exit' : 'error', outputCount: match ? 1 : 0, reason: match ? 'canonical_quote_present' : 'canonical_quote_absent' });
    return match ? { ...evidence, charStart: match.start, charEnd: match.end, quoteMatched: true } : null;
  };
  const retained: Finding[] = [];
  for (const finding of analysis.findings) {
    if (!findingTypes.has(finding.type) || !confidenceLevels.has(finding.confidence) || !['sourced', 'ai_suggestion'].includes(finding.provenance)) invalid('Unknown finding label, provenance, or confidence.');
    if (!topicIds.has(finding.topicId) || !Array.isArray(finding.evidence)) invalid('Finding topic or evidence is invalid.');
    if (finding.conflictScore !== undefined && (!Number.isFinite(finding.conflictScore) || finding.conflictScore < 0 || finding.conflictScore > 1)) invalid('Conflict signal must be between zero and one.');
    if (finding.type === 'gap') {
      if (finding.provenance !== 'ai_suggestion' || finding.evidence.length) invalid('Gaps must be AI suggestions without quoted evidence.');
      retained.push(finding); continue;
    }
    if (finding.provenance === 'sourced' && !finding.evidence.length) invalid('Sourced findings require quoted evidence.');
    const quotes = finding.evidence.map((quote) => findEvidence(quote, finding.id));
    if (quotes.some((quote) => quote === null)) {
      analysis.removedFindings.push({ title: finding.title, reason: 'Required evidence quote is absent from the canonical source-text snapshot or its source was not readable.' });
      continue;
    }
    const checkedEvidence = quotes.filter((quote): quote is Evidence => quote !== null);
    if ((finding.type === 'corroborated' || finding.type === 'conflict') && new Set(checkedEvidence.map((quote) => quote.sourceId)).size < 2) {
      analysis.removedFindings.push({ title: finding.title, reason: 'At least two readable sources are needed for a comparison finding.' });
      continue;
    }
    retained.push({ ...finding, evidence: checkedEvidence });
  }
  analysis.findings = retained;
  analysis.partial = ready.length < analysis.sources.length || ready.length < 2;
  analysis.summary = analysis.summary.flatMap((statement) => {
    if (!statement || typeof statement.text !== 'string' || !Array.isArray(statement.evidence) || !statement.evidence.length) return [];
    const quotes = statement.evidence.map((quote) => findEvidence(quote));
    return quotes.every((quote) => quote !== null) ? [{ ...statement, evidence: quotes as Evidence[] }] : [];
  });
  analysis.coverage = analysis.coverage.filter((cell) => {
    if (!topicIds.has(cell.topicId) || !sourceMap.has(cell.sourceId) || !['covered', 'missing', 'conflict', 'outdated'].includes(cell.status)) invalid('Coverage references an unknown source/topic or state.');
    return readyIds.has(cell.sourceId);
  }).map((cell) => ready.length === 1 && cell.status === 'conflict' ? { ...cell, status: 'covered' as const } : cell);
  const findingIds = new Set(analysis.findings.map((finding) => finding.id));
  analysis.checklist = analysis.checklist.map((item) => {
    if (!['high', 'medium', 'low'].includes(item.priority) || typeof item.text !== 'string') invalid('Checklist item is invalid.');
    return { ...item, findingIds: item.findingIds.filter((id) => findingIds.has(id)) };
  });
  analysis.stats = {
    topicsCovered: new Set(analysis.coverage.filter((cell) => cell.status !== 'missing').map((cell) => cell.topicId)).size,
    topicsTotal: analysis.topics.length,
    findingsTotal: analysis.findings.length,
    quotesMatched: analysis.findings.reduce((count, finding) => count + finding.evidence.length, 0),
  };
  logBoundary({ analysisId: analysis.id, mode: analysis.mode, stage: 'validate_analysis', status: 'exit', inputCount: input.findings.length, outputCount: retained.length });
  return analysis;
}
