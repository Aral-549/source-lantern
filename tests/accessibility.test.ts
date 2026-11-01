// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import contrastGolden from './golden/accessibility-regressions.json';

function luminance(rgb: number[]): number {
  const linear = rgb.map(channel => { const srgb = channel / 255; return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4; });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrast(a: number[], b: number[]): number {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
function channels(value: string): number[] {
  const numbers = value.match(/[\d.]+/g)?.map(Number);
  if (!numbers || numbers.length < 3) throw new Error(`Expected a computed RGB color, received ${value}`);
  return numbers;
}
function backgroundOf(element: HTMLElement): number[] {
  let current: HTMLElement | null = element;
  while (current) {
    const background = channels(getComputedStyle(current).backgroundColor);
    if (background.length < 4 || background[3] !== 0) return background.slice(0, 3);
    current = current.parentElement;
  }
  return [255, 255, 255];
}

beforeEach(() => {
  const style = document.createElement('style');
  style.dataset.testStylesheet = 'workspace';
  style.textContent = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
  document.head.append(style);
});
afterEach(() => { document.body.innerHTML = ''; document.head.querySelectorAll('[data-test-stylesheet]').forEach(style => style.remove()); });

describe('regression text contrast in the actual workspace stylesheet', () => {
  it('uses the standard relative luminance contrast scale', () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBe(21);
    expect(contrast([127, 127, 127], [127, 127, 127])).toBe(1);
  });
  for (const vector of contrastGolden.cases) {
    it(`${vector.id}: ${vector.name}`, () => {
      expect(contrast(vector.observedPair.foreground, vector.observedPair.background)).toBeLessThan(contrastGolden.minimumTextContrast);
      document.body.innerHTML = vector.html;
      const element = document.querySelector<HTMLElement>(vector.textSelector)!;
      const foreground = channels(getComputedStyle(element).color).slice(0, 3);
      const background = backgroundOf(element);
      expect(contrast(foreground, background), `${getComputedStyle(element).color} against ${background.join(',')}`).toBeGreaterThanOrEqual(vector.expected.minimumContrastRatio);
    });
  }
});
