import { describe, expect, it } from 'vitest';
import type { Source } from '../src/api/types';
import { mergeOcrResult, parseOcrWords, type OcrPage, type OcrResult } from '../src/lib/ocr';

function imageSource(): Source {
  return { id: 'image-source', revision: 'original-revision', title: 'Original image', shortTitle: 'Image', kind: 'text', trust: 'unknown', trustOrigin: 'User upload', publishedAt: null, status: 'ready', canonicalText: '', sections: [], imageUrl: 'blob:original-image', unanalyzed: [{ kind: 'image', count: 1 }] };
}
function result(): OcrResult {
  return { sourceId: 'image-source', sourceRevision: 'original-revision', text: 'Recognized source text.', confidence: 95, pages: [{ page: 1, text: 'Recognized source text.', confidence: 95, width: 1000, height: 500, words: [{ text: 'Recognized', confidence: 96, left: 10, top: 20, width: 100, height: 30 }], method: 'ocr' }] };
}

describe('recognized text revision and provenance merge', () => {
  it('OCR-REG-001: rejects stale source/revision without changing the original', () => {
    const source = imageSource(), original = structuredClone(source);
    expect(() => mergeOcrResult(source, { ...result(), sourceId: 'different-source' })).toThrow(/changed|source|recognition/i);
    expect(() => mergeOcrResult(source, { ...result(), sourceRevision: 'stale-revision' })).toThrow(/changed|source|recognition/i);
    expect(source).toEqual(original);
  });

  it('OCR-REG-002: preserves original image, OCR confidence, page geometry, and a new revision', () => {
    const source = imageSource(), recognized = result(), merged = mergeOcrResult(source, recognized);
    expect(merged.id).toBe(source.id); expect(merged.revision).not.toBe(source.revision);
    expect(merged.imageUrl).toBe('blob:original-image'); expect(merged.canonicalText).toBe(recognized.text);
    expect(merged.sections[0].page).toBe(1); expect(merged.ocr?.confidence).toBe(95);
    expect((merged.ocr as (NonNullable<Source['ocr']> & { pages?: OcrPage[] }) | undefined)?.pages).toEqual(recognized.pages);
    expect(source.canonicalText).toBe('');
  });

  it('OCR-REG-003: partial recognition keeps accurate notices for unprocessed scanned pages', () => {
    const source = { ...imageSource(), kind: 'pdf' as const, pageCount: 3, unanalyzed: [{ kind: 'scanned_page' as const, count: 3, pages: [1, 2, 3] }, { kind: 'chart' as const, count: 1, pages: [2] }] };
    const merged = mergeOcrResult(source, result());
    expect(merged.unanalyzed).toEqual(expect.arrayContaining([{ kind: 'scanned_page', count: 2, pages: [2, 3] }, { kind: 'chart', count: 1, pages: [2] }]));
    expect(merged.unanalyzed?.some(item => item.kind === 'scanned_page' && item.pages?.includes(1))).toBe(false);
  });

  it('OCR-REG-004: duplicate page numbers cannot create ambiguous canonical blocks', () => {
    const duplicate = result(); duplicate.pages.push({ ...duplicate.pages[0], text: 'A different second result.' }); duplicate.text = duplicate.pages.map(page => page.text).join('\n\n');
    expect(() => mergeOcrResult({ ...imageSource(), kind: 'pdf', pageCount: 2 }, duplicate)).toThrow();
  });

  it('OCR-REG-004: a result cannot invent pages beyond the source document', () => {
    const invalid = result(); invalid.pages[0].page = 3;
    expect(() => mergeOcrResult({ ...imageSource(), kind: 'pdf', pageCount: 2 }, invalid)).toThrow();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 101])('rejects invalid recognition confidence %j', confidence => {
    expect(() => mergeOcrResult(imageSource(), { ...result(), confidence })).toThrow();
  });

  it('rejects empty text and mismatched page text instead of marking it ready', () => {
    expect(() => mergeOcrResult(imageSource(), { ...result(), text: '   ' })).toThrow();
    expect(() => mergeOcrResult(imageSource(), { ...result(), text: 'Different text than the page record.' })).toThrow();
  });

  it('word parsing keeps only actual word rows and valid confidence/size', () => {
    const header = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext';
    const rows = [
      '5\t1\t1\t1\t1\t1\t10\t20\t100\t30\t96\tRecognized',
      '4\t1\t1\t1\t1\t0\t10\t20\t100\t30\t-1\tNot a word row',
      '5\t1\t1\t1\t1\t2\t10\t20\t0\t30\t96\tZero width',
      '5\t1\t1\t1\t1\t3\t10\t20\t100\t30\t-1\tUnknown confidence',
      '5\t1\t1\t1\t1\t4\t10\t20\t100\t30\t96\t   ',
    ];
    expect(parseOcrWords([header, ...rows].join('\n'))).toEqual([{ text: 'Recognized', left: 10, top: 20, width: 100, height: 30, confidence: 96 }]);
  });
});
