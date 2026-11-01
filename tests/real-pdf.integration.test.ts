import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { locateQuote, normalize } from '../src/lib/locateQuote';
import realPdfGolden from './golden/real-pdf-provenance.json';

describe('real input: official hackathon PDF', () => {
  it('extracts the original two-page document and locates independently observed passages', async () => {
    const bytes = await readFile(join(process.cwd(), realPdfGolden.fixturePath));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(realPdfGolden.sha256);
    const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, verbosity: 0 });
    const pdf = await task.promise;
    try {
      expect(pdf.numPages).toBe(realPdfGolden.expectedPages);
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items.map(item => 'str' in item ? item.str : '').join(' ');
        expect(text.trim().length).toBeGreaterThan(100);
        for (const evidence of realPdfGolden.expectedQuotes.filter(item => item.page === pageNumber)) {
          const match = locateQuote(text, evidence.quote);
          expect(match, `Page ${pageNumber}: ${evidence.quote}`).not.toBeNull();
          expect(normalize(text.slice(match!.start, match!.end))).toBe(normalize(evidence.quote));
        }
      }
    } finally {
      await task.destroy();
    }
  });
});
