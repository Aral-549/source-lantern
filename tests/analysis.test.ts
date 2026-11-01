import { describe, expect, it } from 'vitest';
import type { Analysis, Evidence, Finding, Source } from '../src/api/types';
import { validateAnalysis } from '../src/lib/analysis';
import { locateQuote } from '../src/lib/locateQuote';
import { createSampleAnalysis } from '../src/mock/scholarship';
import evidenceGolden from './golden/evidence-regressions.json';
import demoGolden from './golden/demo-regressions.json';

function isolatedAnalysis(text: string, quote: string, sourceId = 'isolated-source', revision = 'revision-1'): Analysis {
  const source: Source = {
    id: sourceId, revision, title: 'Independent test source', shortTitle: 'Test source', kind: 'text',
    trust: 'unknown', trustOrigin: 'Test input', publishedAt: null, status: 'ready',
    canonicalText: text, sections: [{ id: 'body', text }],
  };
  const evidence: Evidence = { sourceId, sourceRevision: revision, quote, quoteMatched: false };
  const finding: Finding = {
    id: 'isolated-finding', topicId: 'topic', type: 'single_source', title: 'Potential source observation',
    detail: 'Inspect the quote.', provenance: 'sourced', confidence: 'medium', confidenceReason: 'One source only.',
    evidence: [evidence],
  };
  return {
    id: 'isolated-analysis', mode: 'sample', question: 'What does this source say?', createdAt: '2026-10-31T04:30:00.000Z',
    sources: [source], topics: [{ id: 'topic', label: 'Test topic', aiPredicted: true }],
    coverage: [{ sourceId, topicId: 'topic', status: 'covered' }], summary: [], findings: [finding], checklist: [],
    removedFindings: [], stats: { topicsCovered: 1, topicsTotal: 1, findingsTotal: 1, quotesMatched: 0 },
  };
}

describe('canonical evidence validation', () => {
  for (const index of [2, 3]) {
    const vector = evidenceGolden.cases[index];
    it(`${vector.id}: ${vector.name}`, () => {
      const input = isolatedAnalysis(vector.input.source.canonicalText, vector.input.candidate!.requiredEvidence[0].quote,
        vector.input.source.id, vector.input.source.revision);
      const actual = validateAnalysis(input);
      if (vector.expected.sourcedCandidateDisposition === 'retained') {
        expect(actual.findings).toHaveLength(1);
        expect(actual.findings[0].evidence[0].quoteMatched).toBe(true);
        expect(actual.stats.quotesMatched).toBe(1);
      } else {
        expect(actual.findings).toHaveLength(0);
        expect(actual.removedFindings).toHaveLength(1);
        expect(actual.removedFindings[0].reason.length).toBeGreaterThan(0);
        expect(actual.stats.quotesMatched).toBe(0);
      }
    });
  }

  it('rejects stale source revisions even when the words are unchanged', () => {
    const input = isolatedAnalysis('Same sentence.', 'Same sentence.');
    input.findings[0].evidence[0].sourceRevision = 'old-revision';
    expect(() => validateAnalysis(input)).toThrow();
  });

  it('cannot rescue absent evidence by matching a different source', () => {
    const input = isolatedAnalysis('There is no deadline here.', '30 November 2026');
    input.sources.push({ ...input.sources[0], id: 'other-source', canonicalText: '30 November 2026', sections: [{ id: 'body', text: '30 November 2026' }] });
    const actual = validateAnalysis(input);
    expect(actual.findings).toHaveLength(0);
    expect(actual.removedFindings).toHaveLength(1);
  });

  it('rejects unknown source references rather than displaying dangling evidence', () => {
    const input = isolatedAnalysis('Quoted.', 'Quoted.');
    input.findings[0].evidence[0].sourceId = 'nonexistent';
    expect(() => validateAnalysis(input)).toThrow();
  });

  it('rejects unknown topic references', () => {
    const input = isolatedAnalysis('Quoted.', 'Quoted.');
    input.findings[0].topicId = 'nonexistent';
    expect(() => validateAnalysis(input)).toThrow();
  });

  it('rejects duplicate IDs', () => {
    const input = isolatedAnalysis('Quoted.', 'Quoted.');
    input.sources.push(structuredClone(input.sources[0]));
    expect(() => validateAnalysis(input)).toThrow();
  });

  it('does not treat a quoteMatched flag as proof of textual presence', () => {
    const input = isolatedAnalysis('The limit is 5 mW.', '5 MW');
    input.findings[0].evidence[0].quoteMatched = true;
    expect(validateAnalysis(input).findings).toHaveLength(0);
  });

  it('does not expose malformed sourced gap candidates', () => {
    const input = isolatedAnalysis('Quoted.', 'Quoted.');
    input.findings[0].type = 'gap';
    let output: Analysis | undefined;
    try { output = validateAnalysis(input); } catch { /* Rejecting the invalid response is also valid. */ }
    if (output) expect(output.findings.some(finding => finding.type === 'gap' && (finding.provenance === 'sourced' || finding.evidence.length))).toBe(false);
  });

  it('removes unsupported sourced summary statements', () => {
    const input = isolatedAnalysis('Applications close in November.', 'Applications close in November.');
    input.summary = [{ text: 'Applications close in December.', evidence: [{ ...input.findings[0].evidence[0], quote: 'Applications close in December.' }] }];
    expect(validateAnalysis(input).summary).toHaveLength(0);
  });

  it('recomputes display counts rather than trusting response totals', () => {
    const input = isolatedAnalysis('Quoted.', 'Quoted.');
    input.stats = { topicsCovered: 999, topicsTotal: 999, findingsTotal: 999, quotesMatched: 999 };
    const actual = validateAnalysis(input);
    expect(actual.stats).toEqual({ topicsCovered: 1, topicsTotal: 1, findingsTotal: 1, quotesMatched: 1 });
  });
});

describe('sample data and partial-source scope', () => {
  it('A15-A18: fixture totals agree with retained entities and evidence', () => {
    const sample = createSampleAnalysis();
    expect(sample.mode).toBe('sample');
    expect(sample.sources).toHaveLength(3);
    expect(sample.topics).toHaveLength(9);
    expect(sample.findings).toHaveLength(8);
    expect(sample.removedFindings).toHaveLength(2);
    expect(sample.stats).toEqual({ topicsCovered: 6, topicsTotal: 9, findingsTotal: 8, quotesMatched: 8 });
    expect(sample.findings.filter(finding => finding.provenance === 'sourced')).toHaveLength(5);
    expect(sample.findings.filter(finding => finding.type === 'corroborated')).toHaveLength(2);
    expect(sample.findings.filter(finding => finding.type === 'gap')).toHaveLength(3);
    for (const finding of sample.findings) {
      for (const evidence of finding.evidence) {
        const source = sample.sources.find(item => item.id === evidence.sourceId)!;
        expect(source.revision).toBe(evidence.sourceRevision);
        expect(locateQuote(source.canonicalText, evidence.quote)).not.toBeNull();
        expect(evidence.quoteMatched).toBe(true);
      }
    }
  });

  it('DEMO-REG-002: checked gaps contain no fabricated source quotes', () => {
    const sample = createSampleAnalysis();
    const renewal = sample.findings.find(finding => finding.id === 'renewal-gap')!;
    expect(renewal.type).toBe('gap');
    expect(renewal.provenance).toBe('ai_suggestion');
    expect(renewal.evidence).toEqual(demoGolden.cases[1].expected_output.evidence);
    for (const source of sample.sources) expect(source.canonicalText.toLowerCase()).not.toContain('renewal');
  });

  it('DEMO-REG-003: zero readable sources fails instead of producing gaps', () => {
    const input = createSampleAnalysis();
    input.sources.forEach(source => { source.status = 'failed'; source.error = 'Explicit test read failure'; });
    expect(() => validateAnalysis(input)).toThrow();
  });

  it('DEMO-REG-004: one readable source cannot produce cross-source agreement or conflict', () => {
    const input = createSampleAnalysis();
    input.sources.filter(source => source.id !== 'guidelines').forEach(source => { source.status = 'failed'; source.error = 'Explicit test read failure'; });
    const actual = validateAnalysis(input);
    expect(actual.partial).toBe(true);
    expect(actual.findings.filter(finding => finding.type === 'corroborated' || finding.type === 'conflict')).toEqual([]);
    for (const finding of actual.findings) for (const evidence of finding.evidence) expect(evidence.sourceId).toBe('guidelines');
    for (const summary of actual.summary) for (const evidence of summary.evidence) expect(evidence.sourceId).toBe('guidelines');
    const retainedIds = new Set(actual.findings.map(finding => finding.id));
    for (const action of actual.checklist) for (const findingId of action.findingIds) expect(retainedIds.has(findingId)).toBe(true);
    expect(actual.stats.findingsTotal).toBe(actual.findings.length);
  });

  it('DEMO-REG-005: summary has navigable, current-source quote references', () => {
    const sample = createSampleAnalysis();
    expect(sample.summary.length).toBeGreaterThanOrEqual(4);
    for (const statement of sample.summary) {
      expect(statement.evidence.length).toBeGreaterThan(0);
      for (const evidence of statement.evidence) {
        const source = sample.sources.find(item => item.id === evidence.sourceId)!;
        expect(evidence.sourceRevision).toBe(source.revision);
        expect(locateQuote(source.canonicalText, evidence.quote)).not.toBeNull();
      }
    }
    const summaryText = sample.summary.map(statement => statement.text).join(' ').toLowerCase();
    expect(summaryText).toMatch(/eligib|citizen|age/);
    expect(summaryText).toMatch(/document|certificate|income proof/);
    expect(summaryText).toMatch(/deadline|november/);
    expect(summaryText).toMatch(/amount|50,000|50 000/);
  });
});
