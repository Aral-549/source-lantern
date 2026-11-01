import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import golden from './golden/sample-brand-regressions.json';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('sample brand regression', () => {
  it(golden.cases[0].id, async () => {
    const fixture = await readFile(path.join(root, 'src', 'mock', 'scholarship-data.json'), 'utf8');
    const pdf = await PDFDocument.load(await readFile(path.join(root, 'public', 'samples', 'nova-guidelines.pdf')));
    expect(fixture).toContain('Source Lantern sample demo');
    expect(fixture).not.toContain('Digital Dark Spot');
    expect(pdf.getAuthor()).toBe('Source Lantern sample demo');
  });
});
