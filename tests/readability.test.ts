// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import typographyGolden from './golden/readability-regressions.json';

function resolveVariables(value: string): string {
  return value.replace(/var\((--[\w-]+)\)/g, (_match, name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim());
}
function cssPixels(input: string): number {
  const value = resolveVariables(input);
  const direct = value.match(/^([\d.]+)(px|pt)$/);
  if (direct) return Number(direct[1]) * (direct[2] === 'pt' ? 4 / 3 : 1);
  // jsdom preserves max() rather than laying it out. Its explicit pixel floor is
  // sufficient for this static policy check; actual layout is checked in-browser.
  if (value.startsWith('max(')) {
    const fixed = Array.from(value.matchAll(/([\d.]+)(px|pt)/g), match => Number(match[1]) * (match[2] === 'pt' ? 4 / 3 : 1));
    if (fixed.length) return Math.max(...fixed);
  }
  throw new Error(`Cannot establish a fixed pixel floor from computed size ${value}`);
}
function fontWeight(input: string): number { const value = resolveVariables(input); return value === 'bold' ? 700 : value === 'normal' ? 400 : Number(value); }

beforeEach(() => {
  for (const file of ['globals.css', 'readability.css']) {
    const style = document.createElement('style'); style.dataset.readabilityTest = file;
    style.textContent = readFileSync(join(process.cwd(), 'src/app', file), 'utf8'); document.head.append(style);
  }
});
afterEach(() => { document.body.innerHTML = ''; document.head.querySelectorAll('[data-readability-test]').forEach(node => node.remove()); });

describe('user-corrected readable UI typography', () => {
  it('TYPE-REG-001: the declared floor is16px rather than16pt', () => {
    expect(getComputedStyle(document.documentElement).getPropertyValue('--readable-min').trim()).toBe(typographyGolden.cases[0].expected.readableMinimumToken);
  });
  for (const index of [1, 2]) {
    const vector = typographyGolden.cases[index];
    it(`${vector.id}: ${vector.name}`, () => {
      document.body.innerHTML = vector.html!;
      const elements = document.querySelectorAll<HTMLElement>(vector.selector!);
      expect(elements.length).toBeGreaterThan(0);
      for (const element of elements) {
        const style = getComputedStyle(element), pixels = cssPixels(style.fontSize);
        expect(pixels, element.outerHTML).toBeGreaterThanOrEqual(vector.expected.minimumCssPixels!);
        if (pixels <= typographyGolden.minimumCssPixels + 0.01) expect(fontWeight(style.fontWeight), element.outerHTML).toBeGreaterThanOrEqual(vector.expected.minimumWeightAtFloor!);
      }
    });
  }
  it('TYPE-REG-004: UI font rules do not rewrite PDF glyph metrics', () => {
    const vector = typographyGolden.cases[3]; document.body.innerHTML = vector.html!;
    const style = getComputedStyle(document.querySelector<HTMLElement>(vector.selector!)!);
    expect(style.fontSize).toBe(vector.expected.fontSize); expect(style.fontWeight).toBe(vector.expected.fontWeight);
  });
});
