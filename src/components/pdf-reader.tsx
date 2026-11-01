'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronDown, ChevronUp, Maximize2, Minus, Plus, Search, RotateCcw } from 'lucide-react';
import type { Source, Finding, Evidence, FindingType, SelectionContext } from '@/api/types';
import { evidenceBelongsTo, quoteRange, relativeRects, type HighlightRect } from '@/lib/reader-dom';
import { locateQuote } from '@/lib/locateQuote';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfReaderProps {
  source: Source;
  findings: Finding[];
  selectedFindingId: string | null;
  activeEvidence: Evidence | null;
  hiddenTypes: FindingType[];
  sentContexts: SelectionContext[];
  onFindingClick: (id: string) => void;
  onContextClick?: (context: SelectionContext) => void;
}
interface PaintedRect extends HighlightRect {
  key: string; findingId?: string; type?: FindingType; page: number; quote: string; context?: SelectionContext;
}

export default function PdfReader({ source, findings, selectedFindingId, activeEvidence, hiddenTypes, sentContexts, onFindingClick, onContextClick }: PdfReaderProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(source.pageCount ?? 0);
  const [pageWidth, setPageWidth] = useState(560);
  const [zoom, setZoom] = useState(1);
  const [renderVersion, setRenderVersion] = useState(0);
  const [painted, setPainted] = useState<PaintedRect[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [pageTextCounts, setPageTextCounts] = useState<Record<number, number>>({});
  const [alignmentMissing, setAlignmentMissing] = useState(false);
  const [hideNoText, setHideNoText] = useState(false);
  const onTextLayerRendered = useCallback(() => setRenderVersion(version => version + 1), []);

  useEffect(() => {
    const target = viewport.current;
    if (!target) return;
    const observer = new ResizeObserver(([entry]) => setPageWidth(Math.max(240, Math.min(650, entry.contentRect.width - 52))));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const orderedPages = useCallback((pageHint?: number) => {
    const pages = Array.from(viewport.current?.querySelectorAll<HTMLElement>('[data-pdf-page]') ?? []);
    if (!pageHint) return pages;
    return [...pages].sort((a, b) => {
      const p = Number(a.dataset.pdfPage); const q = Number(b.dataset.pdfPage);
      return Math.abs(p - pageHint) - Math.abs(q - pageHint) || p - q;
    });
  }, []);

  const locateInPages = useCallback((quote: string, pageHint?: number, charStart?: number, charEnd?: number) => {
    const canonicalPages = new Map<number, { text: string; start: number }>();
    let offset = 0;
    for (const section of source.sections) {
      if (section.page) {
        const current = canonicalPages.get(section.page);
        canonicalPages.set(section.page, current ? { ...current, text: `${current.text}\n\n${section.text}` } : { text: section.text, start: offset });
      }
      offset += section.text.length + 2;
    }
    const canonicalMatch = source.canonicalText ? locateQuote(source.canonicalText, quote, { charStart, charEnd }) : null;
    const validOffsets = charStart !== undefined && charEnd !== undefined && canonicalMatch?.start === charStart && canonicalMatch?.end === charEnd;
    let preferredPage = pageHint;
    if (validOffsets) {
      for (const [number, content] of canonicalPages) {
        if (charStart >= content.start && charEnd <= content.start + content.text.length) { preferredPage = number; break; }
      }
    }
    for (const page of orderedPages(preferredPage)) {
      const layer = page.querySelector('.react-pdf__Page__textContent, .textLayer');
      if (!layer) continue;
      const content = canonicalPages.get(Number(page.dataset.pdfPage));
      const range = quoteRange(layer, quote, content ? { text: content.text, charStart: validOffsets ? charStart - content.start : undefined, charEnd: validOffsets ? charEnd - content.start : undefined } : undefined);
      if (range) return { page, range, number: Number(page.dataset.pdfPage) };
    }
    return null;
  }, [orderedPages, source]);

  useEffect(() => {
    const rectangles: PaintedRect[] = [];
    for (const finding of findings) {
      if (hiddenTypes.includes(finding.type)) continue;
      for (const evidence of finding.evidence.filter(item => evidenceBelongsTo(item, source))) {
        const match = locateInPages(evidence.quote, evidence.page, evidence.charStart, evidence.charEnd);
        if (!match) continue;
        relativeRects(match.range, match.page).forEach((rect, index) => rectangles.push({
          ...rect, key: `${finding.id}-${evidence.quote}-${index}`, findingId: finding.id,
          type: finding.type, page: match.number, quote: evidence.quote,
        }));
      }
    }
    for (const context of sentContexts.filter(item => item.sourceId === source.id && item.sourceRevision === source.revision)) {
      const match = locateInPages(context.text, context.page, context.charStart, context.charEnd);
      if (!match) continue;
      relativeRects(match.range, match.page).forEach((rect, index) => rectangles.push({
        ...rect, key: `${context.id}-${index}`, page: match.number, quote: context.text, context,
      }));
    }
    setPainted(rectangles);
  }, [findings, hiddenTypes, sentContexts, source, renderVersion, pageWidth, zoom, locateInPages]);

  useEffect(() => {
    if (!activeEvidence || !evidenceBelongsTo(activeEvidence, source)) { setAlignmentMissing(false); return; }
    const match = locateInPages(activeEvidence.quote, activeEvidence.page, activeEvidence.charStart, activeEvidence.charEnd);
    if (match) {
      const target = match.range.startContainer.parentElement;
      target?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      setCurrentPage(match.number);
      setAlignmentMissing(false);
    } else {
      const page = viewport.current?.querySelector(`[data-pdf-page="${activeEvidence.page ?? 1}"]`);
      page?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      setAlignmentMissing(renderVersion > 0);
    }
  }, [activeEvidence, source, renderVersion, locateInPages]);

  useEffect(() => {
    const root = viewport.current;
    if (!root || !numPages) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setCurrentPage(Number((visible[0].target as HTMLElement).dataset.pdfPage));
    }, { root, threshold: [0.1, 0.3, 0.6] });
    root.querySelectorAll('[data-pdf-page]').forEach(page => observer.observe(page));
    return () => observer.disconnect();
  }, [numPages, renderVersion]);

  const findText = () => {
    if (!search.trim()) { setSearchResult('Enter text to find'); return; }
    const matches = orderedPages().flatMap(page => {
      const layer = page.querySelector('.react-pdf__Page__textContent, .textLayer');
      const range = layer ? quoteRange(layer, search.trim()) : null;
      return range ? [{ page, range }] : [];
    });
    if (!matches.length) { setSearchResult('No matching page'); return; }
    const next = searchIndex % matches.length;
    matches[next].range.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setCurrentPage(Number(matches[next].page.dataset.pdfPage));
    setSearchResult(`Matching page ${next + 1} of ${matches.length}`);
    setSearchIndex(next + 1);
  };

  const onPageClick = (event: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    if (window.getSelection()?.toString().trim()) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left; const y = event.clientY - bounds.top;
    const hit = painted.find(rect => rect.page === pageNumber && x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height);
    if (hit?.findingId) onFindingClick(hit.findingId);
    else if (hit?.context) onContextClick?.(hit.context);
  };

  const noText = source.hasTextLayer === false || (numPages > 0 && Object.keys(pageTextCounts).length === numPages && Object.values(pageTextCounts).every(count => count === 0));
  return <div className="source-reader pdf-reader">
    <div className="reader-tools" aria-label="PDF controls">
      <div className="reader-tools-group">
        <button className="reader-tool-button" aria-label="Previous page" title="Previous page" disabled={currentPage <= 1} onClick={() => viewport.current?.querySelector(`[data-pdf-page="${currentPage - 1}"]`)?.scrollIntoView({ block: 'start' })}><ChevronUp size={15} /></button>
        <span className="reader-page-label">Page {currentPage} of {numPages || '...'}</span>
        <button className="reader-tool-button" aria-label="Next page" title="Next page" disabled={!numPages || currentPage >= numPages} onClick={() => viewport.current?.querySelector(`[data-pdf-page="${currentPage + 1}"]`)?.scrollIntoView({ block: 'start' })}><ChevronDown size={15} /></button>
      </div>
      <div className="reader-tools-group">
        <button className="reader-tool-button" aria-label="Zoom out" title="Zoom out" disabled={zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5, value - 0.1))}><Minus size={14} /></button>
        <span className="reader-page-label">{Math.round(zoom * 100)}%</span>
        <button className="reader-tool-button" aria-label="Zoom in" title="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(value => Math.min(2, value + 0.1))}><Plus size={14} /></button>
        <button className="reader-tool-button" aria-label="Fit PDF to width" title="Fit to width" onClick={() => setZoom(1)}><Maximize2 size={14} /></button>
      </div>
      <form className="reader-search" onSubmit={event => { event.preventDefault(); findText(); }}>
        <Search size={14} aria-hidden="true" /><input aria-label="Find in PDF" placeholder="Find in document" value={search} onChange={event => { setSearch(event.target.value); setSearchIndex(0); setSearchResult(''); }} />
        <button className="reader-tool-button" aria-label="Find next matching page" title="Find next matching page" type="submit"><ChevronDown size={14} /></button>
      </form>
    </div>
    {searchResult && <p className="reader-notice" role="status">{searchResult}</p>}
    {noText && !hideNoText && <div className="reader-notice" role="status">This PDF has no selectable text, so highlights are unavailable. Findings remain available as quote cards.<button onClick={() => setHideNoText(true)}>Dismiss</button></div>}
    {alignmentMissing && !noText && <div className="reader-notice">Exact phrase not located in document view. Inspect the source quote in the finding card.</div>}
    <div className="reader-stage pdf-stage" ref={viewport}>
      {error ? <div className="reader-error" role="alert"><strong>Could not open this PDF</strong><p>{error}</p><button onClick={() => { setError(''); setRetryKey(value => value + 1); }}><RotateCcw size={14} /> Retry</button>{source.fileUrl && <a href={source.fileUrl} target="_blank" rel="noreferrer">Open file directly</a>}</div> : <Document
        key={`${source.id}-${source.revision}-${retryKey}`}
        file={source.fileUrl}
        suspense={false}
        loading={<div className="reader-loading">Opening document...</div>}
        onLoadSuccess={({ numPages: pages }) => { setNumPages(pages); setPageTextCounts({}); }}
        onLoadError={reason => setError(reason.message || 'Try another file or paste its text instead.')}
        onPassword={() => setError('This file needs a password. Upload an unlocked copy or paste its text instead.')}
        noData={<div className="reader-empty">No PDF file is available. Upload a file or paste its text instead.</div>}
      >
        {Array.from({ length: numPages }, (_, index) => index + 1).map(pageNumber => <div className="reader-page" key={pageNumber} data-pdf-page={pageNumber} data-selectable-source={source.id} style={{ position: 'relative', width: pageWidth * zoom, margin: '0 auto 24px' }} onClick={event => onPageClick(event, pageNumber)}>
          <Page pageNumber={pageNumber} width={pageWidth * zoom} renderTextLayer renderAnnotationLayer={false}
            onRenderTextLayerSuccess={onTextLayerRendered}
            onGetTextSuccess={content => setPageTextCounts(counts => ({ ...counts, [pageNumber]: content.items.reduce((sum, item) => sum + ('str' in item ? item.str.trim().length : 0), 0) }))}
          />
          <div className="reader-highlight-layer" aria-label={`Evidence on page ${pageNumber}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {painted.filter(rect => rect.page === pageNumber).map(rect => <button key={rect.key} type="button" className={rect.context ? 'reader-sent-underline' : `reader-highlight highlight-${rect.type} ${selectedFindingId === rect.findingId ? 'reader-highlight-selected' : ''}`}
              data-finding-id={rect.findingId} aria-label={rect.context ? 'Open question about this passage' : `Show ${rect.type?.replace('_', ' ')} finding`}
              title={rect.quote} onClick={() => rect.findingId ? onFindingClick(rect.findingId) : rect.context && onContextClick?.(rect.context)}
              style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height, pointerEvents: 'none', padding: 0, borderRadius: 1 }}
            />)}
          </div>
        </div>)}
      </Document>}
    </div>
  </div>;
}
