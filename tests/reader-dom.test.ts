// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Source } from '../src/api/types';
import { evidenceBelongsTo, indexDomText, quoteRange, selectionContext } from '../src/lib/reader-dom';
import SourceReader, { type SourceReaderProps } from '../src/components/source-reader';
import domGolden from './golden/reader-dom-regressions.json';

let mountedRoot: Root | undefined;
function source(text: string): Source {
  return { id: 'dom-source', revision: 'dom-revision', title: 'Source title', shortTitle: 'Source', kind: 'text',
    trust: 'unknown', trustOrigin: 'Independent test source', publishedAt: null, status: 'ready', canonicalText: text,
    sections: [{ id: 'body', text }] };
}
function article(html: string): HTMLElement {
  const element = document.createElement('article');
  element.dataset.selectableSource = 'dom-source';
  element.innerHTML = html;
  document.body.append(element);
  return element;
}
function select(node: Node, anchor: number, focus: number, focusNode = node): Selection {
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.setBaseAndExtent(node, anchor, focusNode, focus);
  return selection;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => ({ x: 10, y: 20, left: 10, right: 110, top: 20, bottom: 40, width: 100, height: 20, toJSON: () => ({}) }) });
});
afterEach(async () => {
  if (mountedRoot) { const root = mountedRoot; mountedRoot = undefined; await act(async () => root.unmount()); }
  window.getSelection()?.removeAllRanges(); document.body.innerHTML = ''; vi.unstubAllGlobals();
});

describe('reader DOM provenance', () => {
  for (const index of [0, 1, 3]) {
    const vector = domGolden.cases[index];
    it(`${vector.id}: ${vector.name}`, () => {
      const element = article(vector.html!);
      const node = element.querySelector('p')!.firstChild!;
      const selection = select(node, vector.selection!.anchor, vector.selection!.focus);
      const context = selectionContext(source(vector.canonicalText!), selection);
      expect(context).toMatchObject(vector.expected);
    });
  }

  it('DOM-REG-003: maps a normalized cross-BR quote to actual text nodes', () => {
    const vector = domGolden.cases[2];
    const element = article(vector.html!);
    const range = quoteRange(element, vector.quote!);
    expect(range).not.toBeNull();
    expect(range!.startContainer.textContent).toBe(vector.expected.rangeStartNodeText);
    expect(range!.startOffset).toBe(vector.expected.rangeStartOffset);
    expect(range!.endContainer.textContent).toBe(vector.expected.rangeEndNodeText);
    expect(range!.endOffset).toBe(vector.expected.rangeEndOffset);
  });

  it('canonical occurrence hints choose the second real rendered span', () => {
    const element = article('<p><span>Ready.</span> <em>Ready.</em></p>');
    const range = quoteRange(element, 'Ready', { text: 'Ready. Ready.', charStart: 7, charEnd: 12 });
    expect(range).not.toBeNull();
    expect(range!.startContainer).toBe(element.querySelector('em')!.firstChild);
    expect(range!.startOffset).toBe(0);
    expect(range!.endOffset).toBe(5);
  });

  it('DOM-REG-005: truncation does not split supplementary Unicode or lose source offsets', () => {
    const vector = domGolden.cases[4], generator = vector.generator!;
    const text = generator.prefix.repeat(generator.repeat) + generator.bridge + generator.suffix;
    const element = article('<p></p>'); element.querySelector('p')!.textContent = text;
    const node = element.querySelector('p')!.firstChild!;
    const context = selectionContext(source(text), select(node, 0, text.length))!;
    expect(Array.from(context.text)).toHaveLength(vector.expected.codePointLength!);
    expect(context.text).toHaveLength(vector.expected.utf16Length!);
    expect(Array.from(context.text).at(-1)).toBe(vector.expected.lastCharacter);
    expect(context).toMatchObject({ charStart: vector.expected.charStart, charEnd: vector.expected.charEnd, truncated: true });
  });

  it('DOM-REG-007: cross-page selection preserves source and offsets without inventing a page', () => {
    const vector = domGolden.cases[6];
    const element = article(vector.html!);
    const spans = element.querySelectorAll('span');
    const selection = select(spans[0].firstChild!, 0, spans[1].textContent!.length, spans[1].firstChild!);
    const context = selectionContext(source(vector.canonicalText!), selection)!;
    expect(context.text).toBe(vector.expected.text);
    expect(context.charStart).toBe(vector.expected.charStart);
    expect(context.charEnd).toBe(vector.expected.charEnd);
    expect(context.page).toBeUndefined();
    expect(context.sourceId).toBe('dom-source');
    expect(context.sourceRevision).toBe('dom-revision');
  });

  it('does not index interface decorations, scripts, hidden text, or outside-reader content as evidence', () => {
    const element = article('<h1 data-not-source>Decoration</h1><p>Real <strong>source</strong> text.</p><span aria-hidden="true">Hidden</span><script>Untrusted script text</script>');
    document.body.insertAdjacentHTML('beforeend', '<aside>Outside source text</aside>');
    expect(indexDomText(element).text).toBe('Real source text.\n');
    expect(quoteRange(element, 'Decoration')).toBeNull();
    expect(quoteRange(element, 'Hidden')).toBeNull();
    expect(quoteRange(element, 'Outside source text')).toBeNull();
  });

  it('short selections do not become contexts', () => {
    const element = article('<p>ab</p>');
    const selection = select(element.querySelector('p')!.firstChild!, 0, 2);
    expect(selectionContext(source('ab'), selection)).toBeNull();
  });

  it('evidence cannot cross a source or source-revision boundary', () => {
    const current = source('A source passage.');
    const quote = { sourceId: current.id, sourceRevision: current.revision, quote: 'A source passage.', quoteMatched: true };
    expect(evidenceBelongsTo(quote, current)).toBe(true);
    expect(evidenceBelongsTo({ ...quote, sourceId: 'other-source' }, current)).toBe(false);
    expect(evidenceBelongsTo({ ...quote, sourceRevision: 'old-revision' }, current)).toBe(false);
  });

  async function mountReader() {
    const host = document.createElement('div'); document.body.append(host);
    const onSelect = vi.fn(), onSelectionClear = vi.fn();
    const props: SourceReaderProps = { source: source('Readable source passage.'), findings: [], selectedFindingId: null, activeEvidence: null, hiddenTypes: [], sentContexts: [], onFindingClick: vi.fn(), onSelect, onSelectionClear };
    mountedRoot = createRoot(host);
    await act(async () => mountedRoot!.render(createElement(SourceReader, props)));
    return { host, onSelect, onSelectionClear };
  }

  it('DOM-REG-006: outside-source selections never invoke passage actions', async () => {
    const vector = domGolden.cases[5];
    const { onSelect, onSelectionClear } = await mountReader();
    document.body.insertAdjacentHTML('beforeend', vector.outsideHtml!);
    const outside = document.querySelector('aside')!.firstChild!;
    select(outside, 0, outside.textContent!.length);
    await act(async () => document.dispatchEvent(new Event('selectionchange')));
    expect(onSelect).toHaveBeenCalledTimes(vector.expected.selectionCallbacks!);
    expect(onSelectionClear.mock.calls.length).toBeGreaterThanOrEqual(vector.expected.selectionClearCallbacksAtLeast!);
  });

  it('a selection crossing from source text to an outside panel is rejected', async () => {
    const { host, onSelect, onSelectionClear } = await mountReader();
    const body = host.querySelector('.reader-section p')!.firstChild!;
    document.body.insertAdjacentHTML('beforeend', '<aside>Outside source text</aside>');
    const outside = document.querySelector('aside')!.firstChild!;
    select(body, 0, outside.textContent!.length, outside);
    await act(async () => document.dispatchEvent(new Event('selectionchange')));
    expect(onSelect).not.toHaveBeenCalled(); expect(onSelectionClear).toHaveBeenCalled();
  });
});
