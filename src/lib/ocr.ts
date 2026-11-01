import type { Source } from '../api/types';
import { logBoundary } from './telemetry';

export interface OcrWord { text: string; confidence: number; left: number; top: number; width: number; height: number }
export interface OcrPage { page: number; text: string; confidence: number; width: number; height: number; words: OcrWord[]; method: 'ocr' | 'native' }
export interface OcrResult { sourceId: string; sourceRevision: string; pages: OcrPage[]; text: string; confidence: number }
export interface OcrProgress { progress: number; status: string }
const cancelled = () => new DOMException('Recognition cancelled.', 'AbortError');
export function checkOcrAbort(signal?: AbortSignal): void { if (signal?.aborted) throw cancelled(); }
export function parseOcrWords(tsv: string): OcrWord[] {
  return tsv.split(/\r?\n/).slice(1).flatMap(row => {
    const fields = row.split('\t'); if (fields[0] !== '5' || !fields.slice(11).join('\t').trim()) return [];
    const values = fields.slice(6, 11).map(Number); if (values.some(value => !Number.isFinite(value)) || values[0] < 0 || values[1] < 0 || values[4] < 0 || values[2] <= 0 || values[3] <= 0) return [];
    return [{ text: fields.slice(11).join('\t'), left: values[0], top: values[1], width: values[2], height: values[3], confidence: Math.min(100, values[4]) }];
  });
}
export function mergeOcrResult(source: Source, result: OcrResult): Source {
  if (source.id !== result.sourceId || source.revision !== result.sourceRevision) throw new Error('This source changed during recognition. Run OCR again.');
  if (!result.pages.length || !result.text.trim() || !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 100 || result.pages.some(page => !Number.isInteger(page.page) || page.page < 1 || !Number.isFinite(page.confidence) || page.confidence < 0 || page.confidence > 100)) throw new Error('Recognition returned invalid or empty text. Retry or paste a corrected transcription.');
  if (new Set(result.pages.map(page => page.page)).size !== result.pages.length || result.pages.some(page => source.pageCount && page.page > source.pageCount)) throw new Error('Recognition page provenance is invalid.');
  const sections = result.pages.map(page => ({ id: `ocr-page-${page.page}`, title: `Recognized text, page ${page.page}`, page: page.page, text: page.text }));
  const canonicalText = sections.map(section => section.text).join('\n\n');
  if (canonicalText !== result.text) throw new Error('Recognition text and page provenance do not agree.');
  const processed = new Set(result.pages.map(page => page.page));
  const unanalyzed = source.unanalyzed?.flatMap(item => {
    if (item.kind !== 'scanned_page') return [item];
    if (item.pages) { const pages = item.pages.filter(page => !processed.has(page)); return pages.length ? [{ ...item, pages, count: pages.length }] : []; }
    return source.pageCount && processed.size >= source.pageCount ? [] : [item];
  });
  return { ...source, pageCount: source.kind === 'pdf' ? result.pages.length : source.pageCount, revision: crypto.randomUUID(), canonicalText, markdown: canonicalText, sections, status: 'ready', error: undefined, ocr: { confidence: result.confidence, processedPages: result.pages.length, engine: 'PDF.js / Tesseract.js', recognizedAt: new Date().toISOString(), pages: structuredClone(result.pages) }, unanalyzed };
}
export async function recognizeSource(source: Source, onProgress?: (progress: OcrProgress) => void, signal?: AbortSignal): Promise<OcrResult> {
  checkOcrAbort(signal);
  const sourceId = source.id, sourceRevision = source.revision;
  const url = source.imageUrl || source.fileUrl;
  if (!url) throw new Error('Open an image or PDF file before starting OCR.');
  logBoundary({ sourceId: source.id, revision: source.revision, mode: 'live', stage: 'ocr', status: 'entry', inputCount: 1 });
  const { createWorker } = await import('tesseract.js'); checkOcrAbort(signal);
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  let pdf: { destroy: () => Promise<void> } | null = null;
  let pageNumber = 1, totalPages = 1, active = true;
  const abort = () => { if (worker) void worker.terminate().catch(() => undefined); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const ensureWorker = async () => {
      if (worker) return;
      checkOcrAbort(signal); onProgress?.({ progress: 0, status: 'Loading local OCR engine and English model' });
      worker = await createWorker('eng', 1, { workerPath: '/ocr/worker.min.js', corePath: '/ocr/core', langPath: '/ocr/lang', gzip: true, logger: message => { if (active && !signal?.aborted) onProgress?.({ progress: ((pageNumber - 1) + Math.max(0, Math.min(1, message.progress || 0))) / totalPages, status: `Page ${pageNumber}: ${message.status}` }); } });
      checkOcrAbort(signal);
    };
    const pages: OcrPage[] = [];
    const readImage = async (input: string | HTMLCanvasElement, width: number, height: number): Promise<void> => {
      checkOcrAbort(signal); await ensureWorker(); const { data } = await worker!.recognize(input, {}, { text: true, tsv: true }); checkOcrAbort(signal);
      pages.push({ page: pageNumber, text: data.text.trim(), confidence: data.confidence, width, height, words: parseOcrWords(data.tsv || ''), method: 'ocr' });
    };
    if (source.kind === 'pdf') {
      const { pdfjs } = await import('react-pdf'); pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const task = pdfjs.getDocument({ url }); pdf = task; const document = await task.promise; totalPages = document.numPages;
      if (totalPages > 25) throw new Error('OCR currently supports up to 25 PDF pages. Split this file and try again.');
      for (pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        checkOcrAbort(signal); const page = await document.getPage(pageNumber);
        const content = await page.getTextContent(); checkOcrAbort(signal);
        const nativeText = content.items.flatMap(item => 'str' in item ? [item.str] : []).join(' ').trim();
        const operators = await page.getOperatorList(); checkOcrAbort(signal);
        const imageOps = [pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageMaskXObject];
        const rasterImage = operators.fnArray.some(op => imageOps.includes(op));
        const imageNeedsOcr = rasterImage || source.unanalyzed?.some(item => item.kind !== 'scanned_page' && (!item.pages || item.pages.includes(pageNumber)));
        if (nativeText && !imageNeedsOcr) { const bounds = page.getViewport({ scale: 1 }); pages.push({ page: pageNumber, text: nativeText, confidence: 100, width: bounds.width, height: bounds.height, words: [], method: 'native' }); page.cleanup(); continue; }
        const view = page.getViewport({ scale: 1 }); const scale = Math.min(2, 2400 / Math.max(view.width, view.height)); const viewport = page.getViewport({ scale });
        const canvas = window.document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d'); if (!context) throw new Error('This browser cannot render PDF pages for recognition.');
        try { await page.render({ canvasContext: context, canvas, viewport }).promise; await readImage(canvas, canvas.width, canvas.height); }
        finally { canvas.width = canvas.height = 0; page.cleanup(); }
      }
    } else {
      const image = new Image(); image.src = url;
      await image.decode(); checkOcrAbort(signal);
      if (image.naturalWidth * image.naturalHeight > 24_000_000) throw new Error('This image is larger than 24 megapixels. Resize it before OCR.');
      await readImage(url, image.naturalWidth, image.naturalHeight);
    }
    const text = pages.map(page => page.text).join('\n\n');
    if (!text.trim()) throw new Error('No readable text was recognized. Try a clearer image or paste a manual transcription.');
    const result = { sourceId, sourceRevision, pages, text, confidence: pages.reduce((sum, page) => sum + page.confidence, 0) / pages.length };
    onProgress?.({ progress: 1, status: 'Recognition complete' });
    logBoundary({ sourceId: source.id, mode: 'live', stage: 'ocr', status: 'exit', outputCount: pages.length });
    return result;
  } catch (error) {
    logBoundary({ sourceId: source.id, mode: 'live', stage: 'ocr', status: 'error', reason: signal?.aborted ? 'cancelled' : 'recognition_failed' });
    if (signal?.aborted) throw cancelled(); throw error;
  } finally {
    active = false;
    signal?.removeEventListener('abort', abort);
    const closingWorker = worker as Awaited<ReturnType<typeof createWorker>> | null;
    if (closingWorker) await closingWorker.terminate().catch(() => undefined);
    if (pdf) await pdf.destroy().catch(() => undefined);
  }
}
