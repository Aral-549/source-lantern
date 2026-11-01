'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { FileText, Search } from 'lucide-react';
import type { Source, Finding, Evidence, FindingType, SelectionContext } from '@/api/types';
import { evidenceBelongsTo, quoteRange, relativeRects, selectionContext, type HighlightRect } from '@/lib/reader-dom';
import './reader.css';

const PdfReader = dynamic(() => import('./pdf-reader'), { ssr: false, loading: () => <div className="reader-loading">Preparing document reader...</div> });

export interface SourceReaderProps {
  source: Source;
  findings: Finding[];
  selectedFindingId: string | null;
  activeEvidence: Evidence | null;
  hiddenTypes: FindingType[];
  sentContexts: SelectionContext[];
  onFindingClick: (id: string) => void;
  onSelect: (context: SelectionContext, rect: { top: number; left: number; bottom: number }) => void;
  onSelectionClear: () => void;
  onContextClick?: (context: SelectionContext) => void;
}
interface TextRect extends HighlightRect { key: string; findingId?: string; type?: FindingType; quote: string; context?: SelectionContext }

function TextReader({ source, findings, selectedFindingId, activeEvidence, hiddenTypes, sentContexts, onFindingClick, onContextClick }: SourceReaderProps) {
  const article = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [rectangles, setRectangles] = useState<TextRect[]>([]);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [alignmentMissing, setAlignmentMissing] = useState(false);
  useEffect(() => {
    if (!article.current) return;
    const observer = new ResizeObserver(() => setRevision(value => value + 1));
    observer.observe(article.current);
    return () => observer.disconnect();
  }, [source.id]);

  useEffect(() => {
    const element = article.current;
    if (!element) return;
    const values: TextRect[] = [];
    for (const finding of findings) {
      if (hiddenTypes.includes(finding.type)) continue;
      for (const evidence of finding.evidence.filter(item => evidenceBelongsTo(item, source))) {
        const range = quoteRange(element, evidence.quote, { text: source.canonicalText, charStart: evidence.charStart, charEnd: evidence.charEnd });
        if (!range) continue;
        relativeRects(range, element).forEach((rect, index) => values.push({ ...rect, key: `${finding.id}-${evidence.quote}-${index}`, findingId: finding.id, type: finding.type, quote: evidence.quote }));
      }
    }
    for (const context of sentContexts.filter(item => item.sourceId === source.id && item.sourceRevision === source.revision)) {
      const range = quoteRange(element, context.text, { text: source.canonicalText, charStart: context.charStart, charEnd: context.charEnd });
      if (!range) continue;
      relativeRects(range, element).forEach((rect, index) => values.push({ ...rect, key: `${context.id}-${index}`, quote: context.text, context }));
    }
    setRectangles(values);
  }, [source, findings, hiddenTypes, sentContexts, revision]);

  useEffect(() => {
    if (!activeEvidence || !article.current || !evidenceBelongsTo(activeEvidence, source)) { setAlignmentMissing(false); return; }
    const range = quoteRange(article.current, activeEvidence.quote, { text: source.canonicalText, charStart: activeEvidence.charStart, charEnd: activeEvidence.charEnd });
    setAlignmentMissing(!range);
    range?.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [activeEvidence, source, revision]);

  const searchDocument = () => {
    if (!article.current || !search.trim()) return;
    const range = quoteRange(article.current, search.trim());
    setSearchMessage(range ? 'Matching passage found' : 'No matching phrase');
    range?.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (window.getSelection()?.toString().trim()) return;
    if ((event.target as Element).closest('a,button,input')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left; const y = event.clientY - bounds.top;
    const hit = rectangles.find(rect => x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height);
    if (hit?.findingId) onFindingClick(hit.findingId);
    else if (hit?.context) onContextClick?.(hit.context);
  };

  if (!source.canonicalText && !source.markdown && !source.sections.length) return <div className="reader-empty"><FileText size={28} /><h3>{source.imageUrl ? 'Reading text from your image' : 'Source text is not available yet'}</h3><p>{source.error || (source.imageUrl ? 'Recognition starts automatically. Keep the original image available to review the transcription.' : 'No readable text is available. Retry reading or paste a transcription.')}</p></div>;
  return <div className="source-reader text-reader">
    <div className="reader-tools"><span className="reader-page-label">Text view</span><form className="reader-search" onSubmit={event => { event.preventDefault(); searchDocument(); }}><Search size={14} /><input aria-label="Find in source text" placeholder="Find in document" value={search} onChange={event => setSearch(event.target.value)} /><button type="submit" className="reader-tool-button" title="Find phrase" aria-label="Find phrase"><Search size={14} /></button></form></div>
    {searchMessage && <div className="reader-notice" role="status">{searchMessage}</div>}
    {alignmentMissing && <div className="reader-notice">Exact phrase not located in document view. Inspect the quote in its finding card.</div>}
    <div className="reader-stage" ref={stage}>
      <article className="reader-paper reader-article" data-selectable-source={source.id} ref={article} onClick={handleClick} style={{ position: 'relative' }}>
        <div className="reader-text-content">
          <div className="reader-document-title" data-not-source><span>{source.kind === 'url' ? 'WEB SOURCE' : 'DOCUMENT'}</span><h1>{source.title}</h1></div>
          {source.sections.length ? source.sections.map(section => <section className="reader-section" key={section.id} data-section-id={section.id}>
            {section.title && <h2 data-not-source>{section.title}</h2>}
            <Markdown components={{ img: () => <span className="reader-notice" data-not-source>Image not analyzed</span>, a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer">{children}</a> }}>{section.text}</Markdown>
          </section>) : <Markdown components={{ img: () => <span className="reader-notice" data-not-source>Image not analyzed</span>, a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer">{children}</a> }}>{source.markdown || source.canonicalText}</Markdown>}
        </div>
        <div aria-label="Source evidence" className="reader-highlight-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {rectangles.map(rect => <button type="button" key={rect.key} className={rect.context ? 'reader-sent-underline' : `reader-highlight highlight-${rect.type} ${selectedFindingId === rect.findingId ? 'reader-highlight-selected' : ''}`}
            data-finding-id={rect.findingId} aria-label={rect.context ? 'Open question about passage' : `Show ${rect.type?.replace('_', ' ')} finding`} title={rect.quote}
            onClick={() => rect.findingId ? onFindingClick(rect.findingId) : rect.context && onContextClick?.(rect.context)}
            style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height, pointerEvents: 'none', padding: 0, borderRadius: 1 }} />)}
        </div>
      </article>
    </div>
  </div>;
}

export default function SourceReader(props: SourceReaderProps) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSelect: props.onSelect, onSelectionClear: props.onSelectionClear });
  callbacks.current = { onSelect: props.onSelect, onSelectionClear: props.onSelectionClear };
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const updateSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) {
        callbacks.current.onSelectionClear(); return;
      }
      const elementFor = (node: Node | null) => node instanceof Element ? node : node?.parentElement;
      const origin = elementFor(selection.anchorNode);
      const destination = elementFor(selection.focusNode);
      if (!origin?.closest('[data-selectable-source]') || !destination?.closest('[data-selectable-source]') || origin.closest('input,textarea,button,[contenteditable="true"]')) {
        callbacks.current.onSelectionClear(); return;
      }
      const context = selectionContext(props.source, selection);
      if (!context) { callbacks.current.onSelectionClear(); return; }
      const rectangle = selection.getRangeAt(0).getBoundingClientRect();
      callbacks.current.onSelect(context, { top: rectangle.top, left: rectangle.left, bottom: rectangle.bottom });
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') callbacks.current.onSelectionClear(); };
    const onScroll = () => {
      const selection = window.getSelection();
      if (!selection?.rangeCount || selection.isCollapsed) return;
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const bounds = root.getBoundingClientRect();
      if (rect.bottom < bounds.top || rect.top > bounds.bottom) callbacks.current.onSelectionClear();
    };
    document.addEventListener('selectionchange', updateSelection);
    document.addEventListener('keyup', onKey);
    root.addEventListener('pointerup', updateSelection);
    root.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('selectionchange', updateSelection);
      document.removeEventListener('keyup', onKey);
      root.removeEventListener('pointerup', updateSelection);
      root.removeEventListener('scroll', onScroll, true);
    };
  }, [props.source]);
  return <div className="source-reader-container" ref={container} style={{ minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>{props.source.kind === 'pdf' ? <PdfReader key={`${props.source.id}-${props.source.revision}`} {...props} /> : <TextReader key={`${props.source.id}-${props.source.revision}`} {...props} />}</div>;
}
