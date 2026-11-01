import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyzeRequest, ChatMessage, QuestionRequest, SelectionContext } from '../src/api/types';
import { analyze, askQuestion } from '../src/api/client';
import { createSampleAnalysis, sampleSourceInputs, SAMPLE_QUESTION, SAMPLE_SCENARIO_ID } from '../src/mock/scholarship';
import { locateQuote } from '../src/lib/locateQuote';
import demoGolden from './golden/demo-regressions.json';

function sampleRequest(): AnalyzeRequest {
  return { question: SAMPLE_QUESTION, sources: sampleSourceInputs(), mode: 'sample', scenarioId: SAMPLE_SCENARIO_ID, requestId: 'test-request', revision: 'test-revision' };
}

function selectedIncomeContext(): SelectionContext {
  const sample = createSampleAnalysis();
  const evidence = sample.findings.find(finding => finding.id === 'income-conflict')!.evidence.find(item => item.sourceId === 'guidelines')!;
  return { id: 'test-context', sourceId: evidence.sourceId, sourceRevision: evidence.sourceRevision, text: evidence.quote, page: evidence.page, charStart: evidence.charStart, charEnd: evidence.charEnd };
}

async function reply(request: QuestionRequest): Promise<ChatMessage> {
  const pending = askQuestion(request);
  await vi.runAllTimersAsync();
  return pending;
}

describe('sample adapter boundaries and cancellation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('A01/A03: only explicit sample run resolves prepared results with ordered progress', async () => {
    const progress = vi.fn();
    const pending = analyze(sampleRequest(), progress);
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.mode).toBe('sample');
    expect(result.stats.findingsTotal).toBe(8);
    expect(progress.mock.calls.map(call => call[0].stage)).toEqual(['reading', 'predicting_topics', 'comparing', 'checking_quotes', 'building_checklist', 'done']);
  });

  it('A02: valid user inputs cannot be replaced by the fictional scholarship analysis', async () => {
    const input = sampleRequest();
    input.mode = 'live';
    input.scenarioId = undefined;
    input.question = 'What does my uploaded loan agreement require?';
    input.sources = [
      { id: 'personal-a', kind: 'text', title: 'My agreement', text: 'A personal user document.' },
      { id: 'personal-b', kind: 'text', title: 'My notes', text: 'Another personal document.' },
    ];
    await expect(analyze(input)).rejects.toThrow(/not connected/i);
  });

  it('custom source text cannot enter sample mode by retaining its scenario ID', async () => {
    const input = sampleRequest();
    input.sources[0] = { id: input.sources[0].id, kind: 'text', title: 'Different contents', text: 'Private uploaded source.' };
    const assertion = expect(analyze(input)).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;
  });

  it.each([
    ['blank question', (input: AnalyzeRequest) => { input.question = '   '; }],
    ['one source', (input: AnalyzeRequest) => { input.sources = input.sources.slice(0, 1); }],
    ['seven sources', (input: AnalyzeRequest) => { input.sources = Array.from({ length: 7 }, (_, index) => ({ id: `source-${index}`, kind: 'text' as const, title: 'Text', text: 'Source body' })); }],
    ['unsafe URL scheme', (input: AnalyzeRequest) => { input.sources[0] = { id: 'bad-url', kind: 'url', title: 'Unsafe URL', url: 'javascript:alert(1)' }; }],
    ['oversized file', (input: AnalyzeRequest) => { input.sources[0] = { id: 'oversized', kind: 'pdf', title: 'Large PDF', fileName: 'large.pdf', size: 20 * 1024 * 1024 + 1 }; }],
    ['oversized text', (input: AnalyzeRequest) => { input.sources[0] = { id: 'long-text', kind: 'text', title: 'Long text', text: 'x'.repeat(100001) }; }],
    ['empty pasted text', (input: AnalyzeRequest) => { input.sources[0] = { id: 'empty-text', kind: 'text', title: 'Empty text', text: '   \n' }; }],
  ])('A06/A07: rejects %s before producing any progress', async (_name, change) => {
    const input = sampleRequest();
    change(input);
    const progress = vi.fn();
    const assertion = expect(analyze(input, progress)).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;
    expect(progress).not.toHaveBeenCalled();
  });

  it('A04: cancellation rejects and no further progress arrives', async () => {
    const controller = new AbortController();
    const progress = vi.fn();
    const pending = analyze(sampleRequest(), progress, controller.signal);
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(1600);
    controller.abort();
    await assertion;
    const callsAtAbort = progress.mock.calls.length;
    await vi.runAllTimersAsync();
    expect(progress).toHaveBeenCalledTimes(callsAtAbort);
    expect(progress.mock.calls.some(call => call[0].stage === 'done')).toBe(false);
  });

  it('already-aborted run cannot emit progress or commit a result', async () => {
    const controller = new AbortController();
    controller.abort();
    const progress = vi.fn();
    await expect(analyze(sampleRequest(), progress, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(progress).not.toHaveBeenCalled();
  });
});

describe('source-scoped sample questions', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('DEMO-REG-001: unprepared question does not make a false absence claim', async () => {
    const golden = demoGolden.cases[0];
    const result = await reply({ analysis: createSampleAnalysis(), question: golden.input.user_question!, contexts: [] });
    expect(result.text).toContain(golden.expected_output.reply_text!);
    expect(result.text).not.toMatch(/not found/i);
    expect(result.evidence ?? []).toHaveLength(0);
  });

  it('a prepared renewal gap is limited to reviewed text, not an assertion that no policy exists', async () => {
    const result = await reply({ analysis: createSampleAnalysis(), question: 'What are the renewal conditions?', contexts: [] });
    expect(result.text).toMatch(/not found in the (text of (the |3 )?)?sources reviewed/i);
    expect(result.text).not.toMatch(/no renewal policy exists/i);
    expect(result.evidence ?? []).toHaveLength(0);
  });

  it('income-document reply cites exact quotes from both disagreeing sources', async () => {
    const sample = createSampleAnalysis();
    const result = await reply({ analysis: sample, question: 'What income documents do I need?', contexts: [selectedIncomeContext()] });
    expect(result.text).toMatch(/possible conflict|may be a conflict/i);
    expect(result.evidence?.map(item => item.sourceId)).toEqual(expect.arrayContaining(['guidelines', 'listing']));
    expect(result.confidenceReason?.length).toBeGreaterThan(0);
    for (const evidence of result.evidence ?? []) {
      const source = sample.sources.find(item => item.id === evidence.sourceId)!;
      expect(evidence.sourceRevision).toBe(source.revision);
      expect(locateQuote(source.canonicalText, evidence.quote)).not.toBeNull();
    }
  });

  it('Check against other sources has one row per other readable source', async () => {
    const sample = createSampleAnalysis();
    const context = selectedIncomeContext();
    const result = await reply({ analysis: sample, question: 'Check against other sources', contexts: [context], compare: true });
    const rows = result.sourceComparison ?? [];
    expect(rows.map(row => row.sourceId).sort()).toEqual(['blog', 'listing']);
    for (const row of rows) {
      if (row.result === 'not_found') expect(row.quote).toBeUndefined();
      else {
        expect(row.quote).toBeTruthy();
        const source = sample.sources.find(item => item.id === row.sourceId)!;
        expect(locateQuote(source.canonicalText, row.quote!)).not.toBeNull();
      }
    }
  });

  it('DEMO-REG-004: failed sources cannot appear in a one-source comparison reply', async () => {
    const sample = createSampleAnalysis();
    sample.sources.filter(source => source.id !== 'guidelines').forEach(source => { source.status = 'failed'; });
    const result = await reply({ analysis: sample, question: 'Check against other sources', contexts: [selectedIncomeContext()], compare: true });
    expect(result.sourceComparison ?? []).toHaveLength(0);
    expect(result.evidence?.some(item => item.sourceId !== 'guidelines') ?? false).toBe(false);
  });

  it('removed or revised selected passages are rejected rather than rebound to similar text', async () => {
    const sample = createSampleAnalysis();
    const context = selectedIncomeContext();
    context.sourceRevision = 'stale-revision';
    const assertion = expect(askQuestion({ analysis: sample, question: 'Explain this passage', contexts: [context] })).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('more than five contexts is a visible error, not silent truncation', async () => {
    const context = selectedIncomeContext();
    const assertion = expect(askQuestion({ analysis: createSampleAnalysis(), question: 'Explain these passages', contexts: Array.from({ length: 6 }, (_, index) => ({ ...context, id: `context-${index}` })) })).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('chat cancellation cannot resolve a stale prepared reply', async () => {
    const controller = new AbortController();
    const pending = askQuestion({ analysis: createSampleAnalysis(), question: 'What is the deadline?', contexts: [] }, controller.signal);
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    await vi.runAllTimersAsync();
  });
});
