import { describe, expect, it } from 'vitest';
import { locateQuote, normalize } from '../src/lib/locateQuote';
import evidenceGolden from './golden/evidence-regressions.json';
import boundaryGolden from './golden/quote-boundaries.json';
import tokenGolden from './golden/quote-token-regressions.json';
import recoveryGolden from './golden/quote-boundary-recovery.json';

describe('evidence location: fixed contract vectors', () => {
  for (const vector of tokenGolden.cases) {
    it(`${vector.id}: ${vector.reason}`, () => {
      expect(locateQuote(vector.source, vector.quote)).toBeNull();
    });
    it(`${vector.id}: explicit offsets cannot approve a token-internal quote`, () => {
      const charStart = vector.source.indexOf(vector.quote);
      expect(locateQuote(vector.source, vector.quote, { charStart, charEnd: charStart + vector.quote.length })).toBeNull();
    });
  }
  for (const vector of recoveryGolden.cases) {
    it(`${vector.id}: skips token-internal occurrences and finds the valid later quote`, () => {
      expect(locateQuote(vector.source, vector.quote)).toMatchObject(vector.expected);
    });
  }
  for (const vector of boundaryGolden.cases) {
    it(`${vector.id}: ${JSON.stringify(vector.quote)}`, () => {
      const actual = locateQuote(vector.source, vector.quote, vector.options);
      if (!vector.expected) {
        expect(actual).toBeNull();
      } else {
        expect(actual).toMatchObject({ start: vector.expected.start, end: vector.expected.end });
        expect(vector.source.slice(actual!.start, actual!.end)).toBe(vector.expected.original);
      }
    });
  }

  it('EV-REG-001: preserves case-sensitive units', () => {
    const vector = evidenceGolden.cases[0];
    expect(locateQuote(vector.input.source.canonicalText, vector.input.candidate!.requiredEvidence[0].quote)).toBeNull();
  });

  it('EV-REG-002: maps supplementary Unicode using UTF-16 offsets', () => {
    const vector = evidenceGolden.cases[1];
    const actual = locateQuote(vector.input.source.canonicalText, vector.input.evidence!.quote);
    expect(actual).toMatchObject(vector.expected.canonicalRange!);
    expect(vector.input.source.canonicalText.slice(actual!.start, actual!.end)).toBe(vector.expected.matchedOriginalText);
  });

  it('E09: prefers a valid explicit occurrence rather than the first phrase', () => {
    expect(locateQuote('Ready. Ready. Ready.', 'Ready', { charStart: 14, charEnd: 19 })).toMatchObject({ start: 14, end: 19 });
  });

  it('E09: discloses repeated occurrences', () => {
    expect(locateQuote('Ready. Ready. Ready.', 'Ready')).toMatchObject({ occurrences: 3 });
  });

  it('E08: noninteger offsets cannot move the returned range', () => {
    const actual = locateQuote('First. Required.', 'Required', { charStart: 7.5, charEnd: 15.5 });
    expect(actual).toMatchObject({ start: 7, end: 15 });
  });

  it('normalization never lowercases source prose or units', () => {
    expect(normalize('5 mW and 5 MW')).toBe('5 mW and 5 MW');
  });
});
