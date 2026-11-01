// @vitest-environment jsdom
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Source } from '../src/api/types';
import type { OcrResult } from '../src/lib/ocr';
import OcrPanel, { useSourcePreparation, type PreparationState } from '../src/components/ocr-panel';

const engine = vi.hoisted(() => ({ recognize: vi.fn() }));
vi.mock('../src/lib/ocr', async importOriginal => ({ ...await importOriginal<typeof import('../src/lib/ocr')>(), recognizeSource: engine.recognize }));
function input(id: string, kind: 'image' | 'pdf' = 'image'): Source {
  return { id, revision: `${id}-original`, title: id, shortTitle: id, kind: kind === 'pdf' ? 'pdf' : 'text', trust: 'unknown', trustOrigin: 'Uploaded file', publishedAt: null, status: 'ready', canonicalText: '', sections: [], fileUrl: `blob:${id}`, ...(kind === 'image' ? { imageUrl: `blob:${id}` } : { pageCount: 1 }) };
}
function output(source: Source): OcrResult { return { sourceId: source.id, sourceRevision: source.revision, text: `Readable ${source.id}`, confidence: 95, pages: [{ page: 1, text: `Readable ${source.id}`, confidence: 95, width: 600, height: 800, words: [], method: source.kind === 'pdf' ? 'native' : 'ocr' }] }; }
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
let root: Root | undefined, view: { state: PreparationState; sources: Source[]; setSources: (sources: Source[]) => void };
const commits = vi.fn();
function Harness({ initial }: { initial: Source[] }) {
  const [sources, setSources] = useState(initial);
  const state = useSourcePreparation(sources, updated => { commits(updated); setSources(previous => previous.map(source => source.id === updated.id ? updated : source)); });
  view = { state, sources, setSources };
  return createElement('main', null, sources.map(source => createElement(OcrPanel, { key: source.id, source, preparation: state })));
}
async function render(sources: Source[], key = 'project-alpha') {
  if (!root) { const host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root!.render(createElement(Harness, { key, initial: sources })));
}
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; commits.mockReset(); engine.recognize.mockReset(); engine.recognize.mockImplementation(async (source: Source) => output(source)); });
afterEach(async () => { if (root) { const current = root; root = undefined; await act(async () => current.unmount()); } document.body.innerHTML = ''; });

describe('automatic preparation of every uploaded supported source', () => {
  it('AUTO-REG-001/006: prepares unopened image/PDF sources and skips prepared files', async () => {
    await render([input('image'), input('pdf', 'pdf')]);
    expect(engine.recognize.mock.calls.map(call => call[0].id)).toEqual(['image', 'pdf']);
    expect(view.sources.every(source => source.ocr)).toBe(true); expect(view.state.pending).toBe(0);
    expect([...document.querySelectorAll('button')].some(button => /extract.*ocr|run ocr/i.test(button.textContent || ''))).toBe(false);
    await act(async () => view.setSources([...view.sources])); expect(engine.recognize).toHaveBeenCalledTimes(2);
  });
  it('AUTO-REG-002: failure does not block later sources or retry in a loop', async () => {
    engine.recognize.mockRejectedValueOnce(new Error('Unreadable image'));
    const first = input('first'); await render([first, input('second', 'pdf')]);
    expect(engine.recognize.mock.calls.map(call => call[0].id)).toEqual(['first', 'second']);
    expect(view.state.failed['first:first-original']).toBe('Unreadable image');
    await act(async () => view.setSources([...view.sources])); expect(engine.recognize).toHaveBeenCalledTimes(2);
    await act(async () => view.state.retry(first)); expect(engine.recognize).toHaveBeenCalledTimes(3); expect(view.sources[0].ocr).toBeDefined();
  });
  it('AUTO-REG-003: removing a source aborts and discards a late result', async () => {
    const source = input('removed'), pending = deferred<OcrResult>(); engine.recognize.mockReturnValue(pending.promise);
    await render([source]); const signal = engine.recognize.mock.calls[0][2] as AbortSignal;
    await act(async () => view.setSources([])); expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve(output(source))); expect(commits).not.toHaveBeenCalled(); expect(view.sources).toEqual([]);
  });
  it('AUTO-REG-003: switching projects discards old completion and progress', async () => {
    const old = input('alpha'), pending = deferred<OcrResult>(); engine.recognize.mockReturnValueOnce(pending.promise);
    await render([old]); const progress = engine.recognize.mock.calls[0][1] as (value: { progress: number; status: string }) => void;
    const signal = engine.recognize.mock.calls[0][2] as AbortSignal;
    await render([input('beta')], 'project-beta'); expect(signal.aborted).toBe(true);
    await act(async () => { progress({ progress: 0.8, status: 'Stale Alpha progress' }); pending.resolve(output(old)); });
    expect(commits.mock.calls.map(call => call[0].id)).toEqual(['beta']); expect(view.sources.map(source => source.id)).toEqual(['beta']);
  });
  it('AUTO-REG-004: imageUrl alone is a sufficient image input', async () => {
    const image = input('image-only-url'); delete image.fileUrl; await render([image]);
    expect(engine.recognize).toHaveBeenCalledTimes(1); expect(view.sources[0].ocr).toBeDefined();
  });
  it('AUTO-REG-005: progress updates do not restart the source job', async () => {
    const source = input('progress'), pending = deferred<OcrResult>(); engine.recognize.mockReturnValue(pending.promise); await render([source]);
    const progress = engine.recognize.mock.calls[0][1] as (value: { progress: number; status: string }) => void;
    await act(async () => { progress({ progress: 0.2, status: 'Reading' }); progress({ progress: 0.5, status: 'Recognizing' }); });
    expect(engine.recognize).toHaveBeenCalledTimes(1); expect(view.state.job?.progress.progress).toBe(0.5);
    await act(async () => pending.resolve(output(source))); expect(commits).toHaveBeenCalledTimes(1);
  });
  it('cancel marks one source for retry and permits the rest of the queue', async () => {
    const first = input('cancelled'), pending = deferred<OcrResult>(); engine.recognize.mockReturnValueOnce(pending.promise); await render([first, input('following')]);
    const signal = engine.recognize.mock.calls[0][2] as AbortSignal;
    await act(async () => view.state.cancel()); expect(signal.aborted).toBe(true); expect(view.state.failed['cancelled:cancelled-original']).toMatch(/cancel/i);
    await act(async () => pending.resolve(output(first))); expect(commits.mock.calls.map(call => call[0].id)).toEqual(['following']);
  });
});
