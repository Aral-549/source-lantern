export interface QuoteOptions {
  charStart?: number;
  charEnd?: number;
  startHint?: number;
}

export interface QuoteLocation { start: number; end: number; occurrences: number }

interface NormalizedText { text: string; starts: number[]; ends: number[] }

const replacements: Record<string, string> = {
  '\u2018': "'", '\u2019': "'", '\u201a': "'", '\u201b': "'",
  '\u201c': '"', '\u201d': '"', '\u201e': '"', '\u201f': '"',
  '\u2010': '-', '\u2011': '-', '\u2012': '-', '\u2013': '-', '\u2014': '-',
  '\ufb00': 'ff', '\ufb01': 'fi', '\ufb02': 'fl', '\ufb03': 'ffi', '\ufb04': 'ffl', '\ufb05': 'st', '\ufb06': 'st',
};

function withMap(value: string): NormalizedText {
  let text = '';
  const starts: number[] = [];
  const ends: number[] = [];
  for (let index = 0; index < value.length;) {
    const point = value.codePointAt(index)!;
    const char = String.fromCodePoint(point);
    const width = char.length;
    if (char === '\u00ad') { index += width; continue; }
    if (char === '-' && /\p{L}$/u.test(text)) {
      const wrap = value.slice(index).match(/^-(?:\r\n|\n|\r)[ \t]*/);
      if (wrap && /^\p{L}/u.test(value.slice(index + wrap[0].length))) {
        index += wrap[0].length;
        continue;
      }
    }
    if (/\s/u.test(char)) {
      if (text && !text.endsWith(' ')) {
        text += ' '; starts.push(index); ends.push(index + width);
      } else if (text.endsWith(' ')) {
        ends[ends.length - 1] = index + width;
      }
      index += width;
      continue;
    }
    const replacement = replacements[char] ?? char;
    text += replacement;
    for (let offset = 0; offset < replacement.length; offset++) {
      starts.push(index); ends.push(index + width);
    }
    index += width;
  }
  if (text.endsWith(' ')) { text = text.slice(0, -1); starts.pop(); ends.pop(); }
  return { text, starts, ends };
}

export function normalize(text: string): string {
  return withMap(text).text;
}

function wholeTokenBoundaries(text: string, start: number, end: number): boolean {
  const before = Array.from(text.slice(0, start));
  const inside = Array.from(text.slice(start, end));
  const after = Array.from(text.slice(end));
  const word = (value: string | undefined) => value !== undefined && /[\p{L}\p{M}\p{N}_]/u.test(value);
  const digit = (value: string | undefined) => value !== undefined && /\p{N}/u.test(value);
  if ((word(before.at(-1)) && word(inside[0])) || (word(inside.at(-1)) && word(after[0]))) return false;
  const numberSeparator = (value: string | undefined) => value !== undefined && /[.,\u066b\u066c]/u.test(value);
  if (digit(inside[0]) && numberSeparator(before.at(-1)) && digit(before.at(-2))) return false;
  if (digit(inside.at(-1)) && numberSeparator(after[0]) && digit(after[1])) return false;
  return true;
}

/** Case-sensitive full-quote location with offsets into the original UTF-16 string. */
export function locateQuote(haystack: string, quote: string, options: QuoteOptions = {}): QuoteLocation | null {
  if (typeof haystack !== 'string' || typeof quote !== 'string') return null;
  const needle = normalize(quote);
  if (!needle) return null;
  const mapped = withMap(haystack);
  const matches: number[] = [];
  let cursor = 0;
  while (cursor <= mapped.text.length - needle.length) {
    const found = mapped.text.indexOf(needle, cursor);
    if (found < 0) break;
    if (wholeTokenBoundaries(mapped.text, found, found + needle.length)) matches.push(found);
    cursor = found + 1;
  }
  if (!matches.length) return null;
  const { charStart, charEnd } = options;
  if (Number.isInteger(charStart) && Number.isInteger(charEnd) && charStart! >= 0 && charEnd! > charStart! && charEnd! <= haystack.length && normalize(haystack.slice(charStart, charEnd)) === needle && wholeTokenBoundaries(haystack, charStart!, charEnd!)) {
    return { start: charStart!, end: charEnd!, occurrences: matches.length };
  }
  const hint = Number.isFinite(options.startHint) ? Math.max(0, options.startHint!) : 0;
  const found = matches.find((position) => mapped.starts[position] >= hint);
  if (found === undefined) return null;
  return { start: mapped.starts[found], end: mapped.ends[found + needle.length - 1], occurrences: matches.length };
}
