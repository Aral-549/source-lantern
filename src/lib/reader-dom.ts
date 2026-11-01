import type { Evidence, SelectionContext, Source } from '@/api/types';
import { locateQuote } from '@/lib/locateQuote';

type TextPosition = { node: Text; offset: number };
export interface DomTextIndex { text: string; positions: (TextPosition | null)[] }
export interface HighlightRect { left: number; top: number; width: number; height: number }

export function indexDomText(element: Element): DomTextIndex {
  let text = '';
  const positions: (TextPosition | null)[] = [];
  function separator() {
    if (text && !text.endsWith('\n')) { text += '\n'; positions.push(null); }
  }
  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent ?? '';
      for (let offset = 0; offset < value.length; offset += 1) positions.push({ node: node as Text, offset });
      text += value;
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.tagName === 'BR') { separator(); return; }
    if (node.matches('script,style,[data-not-source],[aria-hidden="true"]')) return;
    for (const child of node.childNodes) walk(child);
    if (/^(P|DIV|SECTION|H[1-6]|LI|BLOCKQUOTE|PRE|TR)$/.test(node.tagName)) separator();
  }
  for (const child of element.childNodes) walk(child);
  return { text, positions };
}

export function rangeForText(index: DomTextIndex, start: number, end: number): Range | null {
  let first = start;
  let last = end - 1;
  while (first < end && !index.positions[first]) first += 1;
  while (last >= first && !index.positions[last]) last -= 1;
  const a = index.positions[first];
  const b = index.positions[last];
  if (!a || !b) return null;
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset + 1);
  return range;
}

export function quoteRange(element: Element, quote: string, canonicalHint?: { text: string; charStart?: number; charEnd?: number }): Range | null {
  const index = indexDomText(element);
  let occurrence = 0;
  if (canonicalHint) {
    const desired = locateQuote(canonicalHint.text, quote, canonicalHint);
    if (!desired) return null;
    let cursor = 0;
    while (cursor < desired.start) {
      const earlier = locateQuote(canonicalHint.text, quote, { startHint: cursor });
      if (!earlier || earlier.start >= desired.start) break;
      occurrence += 1;
      cursor = earlier.start + 1;
    }
  }
  let cursor = 0;
  for (let ordinal = 0; ordinal <= occurrence; ordinal += 1) {
    const match = locateQuote(index.text, quote, { startHint: cursor });
    if (!match) return null;
    if (ordinal === occurrence) return rangeForText(index, match.start, match.end);
    cursor = match.start + 1;
  }
  return null;
}

export function relativeRects(range: Range, container: Element): HighlightRect[] {
  const base = container.getBoundingClientRect();
  return Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).map(rect => ({
    left: rect.left - base.left,
    top: rect.top - base.top,
    width: rect.width,
    height: rect.height,
  }));
}

export function evidenceBelongsTo(evidence: Evidence, source: Source) {
  return evidence.sourceId === source.id && evidence.sourceRevision === source.revision;
}

export function selectionContext(source: Source, selection: Selection): SelectionContext | null {
  const original = selection.toString().trim();
  if (Array.from(original).length < 3) return null;
  const characters = Array.from(original);
  const text = characters.slice(0, 1500).join('');
  const elementFor = (node: Node | null) => node instanceof Element ? node : node?.parentElement;
  const startPage = elementFor(selection.anchorNode)?.closest('[data-pdf-page]')?.getAttribute('data-pdf-page');
  const endPage = elementFor(selection.focusNode)?.closest('[data-pdf-page]')?.getAttribute('data-pdf-page');
  const page = startPage && startPage === endPage ? Number(startPage) : undefined;
  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  const reader = range ? elementFor(range.startContainer)?.closest('[data-selectable-source]') : null;
  let location: ReturnType<typeof locateQuote> = null;

  if (range && reader) {
    const index = indexDomText(reader);
    let domStart = index.positions.findIndex(position => position?.node === range.startContainer && position.offset === range.startOffset);
    if (domStart < 0) domStart = index.positions.findIndex(position => position !== null && range.comparePoint(position.node, position.offset) === 0);
    const selectedMatch = domStart >= 0 ? locateQuote(index.text, text, { startHint: domStart }) : null;
    if (selectedMatch) {
      let occurrence = 0;
      let cursor = 0;
      while (cursor < selectedMatch.start) {
        const earlier = locateQuote(index.text, text, { startHint: cursor });
        if (!earlier || earlier.start >= selectedMatch.start) break;
        occurrence += 1;
        cursor = earlier.start + 1;
      }
      let canonical = source.canonicalText;
      let canonicalBase = 0;
      if (source.kind === 'pdf' && page && source.sections.some(section => section.page === page)) {
        let offset = 0;
        let pageStart: number | undefined;
        const pageText: string[] = [];
        for (const section of source.sections) {
          if (section.page === page) { pageStart ??= offset; pageText.push(section.text); }
          offset += section.text.length + 2;
        }
        canonical = pageText.join('\n\n');
        canonicalBase = pageStart ?? 0;
      }
      cursor = 0;
      for (let ordinal = 0; ordinal <= occurrence; ordinal += 1) {
        const match = locateQuote(canonical, text, { startHint: cursor });
        if (!match) break;
        if (ordinal === occurrence) { location = { ...match, start: match.start + canonicalBase, end: match.end + canonicalBase }; break; }
        cursor = match.start + 1;
      }
    }
  }

  if (!location) {
    const unique = locateQuote(source.canonicalText, text);
    if (unique?.occurrences === 1) location = unique;
  }
  return {
    id: `${source.id}-${location?.start ?? 'selection'}-${text.length}`,
    sourceId: source.id,
    sourceRevision: source.revision,
    text,
    page,
    charStart: location?.start,
    charEnd: location?.end,
    truncated: characters.length > 1500,
  };
}
