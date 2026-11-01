import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Source } from '../src/api/types';
import { mergeOcrResult, recognizeSource } from '../src/lib/ocr';

const modules = vi.hoisted(() => ({ createWorker: vi.fn(), getDocument: vi.fn() }));
vi.mock('tesseract.js', () => ({ createWorker: modules.createWorker }));
vi.mock('react-pdf', () => ({ pdfjs: { GlobalWorkerOptions: { workerSrc: '' }, OPS: { paintImageMaskXObject: 83, paintImageXObject: 85, paintInlineImageXObject: 86 }, getDocument: modules.getDocument } }));

function source(): Source {
  return { id: 'ocr-source', revision: 'input-revision', title: 'Uploaded image', shortTitle: 'Image', kind: 'text', trust: 'unknown', trustOrigin: 'User upload', publishedAt: null, status: 'ready', canonicalText: '', sections: [], imageUrl: 'blob:original-image' };
}
const recognizedData = () => ({ data: { text: 'Actual engine output in a lifecycle unit test.\n', confidence: 93, tsv: '' } });
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
class DecodableImage {
  src = ''; naturalWidth = 1000; naturalHeight = 500;
  async decode() {}
}
let worker: { recognize: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> };
beforeEach(() => {
  modules.createWorker.mockReset(); modules.getDocument.mockReset();
  worker = { recognize: vi.fn(async () => recognizedData()), terminate: vi.fn(async () => undefined) };
  modules.createWorker.mockResolvedValue(worker); vi.stubGlobal('Image', DecodableImage);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('OCR lifecycle and async source ownership (mocked engine, real helper)', () => {
  it('returns recognized text and terminates the local worker', async () => {
    const input = source(), progress = vi.fn();
    const output = await recognizeSource(input, progress);
    expect(output.text).toBe('Actual engine output in a lifecycle unit test.');
    expect(output.sourceId).toBe(input.id); expect(output.sourceRevision).toBe(input.revision);
    expect(output.pages[0].method).toBe('ocr'); expect(output.pages[0].width).toBe(1000); expect(output.pages[0].height).toBe(500);
    expect(worker.terminate).toHaveBeenCalled(); expect(progress.mock.calls.at(-1)?.[0].progress).toBe(1);
  });

  it('OCR-REG-005: pending recognition cannot adopt a changed source revision', async () => {
    const input = source(), recognition = deferred<ReturnType<typeof recognizedData>>(); worker.recognize.mockReturnValue(recognition.promise);
    const pending = recognizeSource(input); await vi.waitFor(() => expect(worker.recognize).toHaveBeenCalled());
    input.revision = 'edited-while-recognizing'; recognition.resolve(recognizedData());
    const output = await pending;
    expect(output.sourceRevision).toBe('input-revision');
    expect(() => mergeOcrResult(input, output)).toThrow(/changed|source|recognition/i);
  });

  it('OCR-REG-006: late logger events cannot update progress after success', async () => {
    const progress = vi.fn(); await recognizeSource(source(), progress);
    const before = progress.mock.calls.length, options = modules.createWorker.mock.calls[0][2] as { logger: (message: { progress: number; status: string }) => void };
    options.logger({ progress: 0.4, status: 'late recognition event' });
    expect(progress).toHaveBeenCalledTimes(before);
  });

  it('OCR-REG-007: selectable native PDF text is reused without Tesseract recognition', async () => {
    const page = { getTextContent: vi.fn(async () => ({ items: [{ str: 'Native selectable text.' }] })), getOperatorList: vi.fn(async () => ({ fnArray: [] })), getViewport: vi.fn(() => ({ width: 600, height: 800 })), cleanup: vi.fn(), render: vi.fn() };
    const document = { numPages: 1, getPage: vi.fn(async () => page) };
    const loadingTask = { promise: Promise.resolve(document), destroy: vi.fn(async () => undefined) };
    modules.getDocument.mockReturnValue(loadingTask);
    const input = { ...source(), kind: 'pdf' as const, imageUrl: undefined, fileUrl: 'blob:original-pdf', pageCount: 1 };
    const output = await recognizeSource(input);
    expect(output.text).toBe('Native selectable text.'); expect(output.pages[0].method).toBe('native');
    expect(worker.recognize).not.toHaveBeenCalled(); expect(page.render).not.toHaveBeenCalled();
    expect(modules.getDocument).toHaveBeenCalledWith(expect.objectContaining({ url: 'blob:original-pdf' }));
    expect(loadingTask.destroy).toHaveBeenCalled();
  });

  it('OCR-REG-008: oversized image is rejected before an expensive worker is initialized', async () => {
    vi.stubGlobal('Image', class extends DecodableImage { naturalWidth = 6000; naturalHeight = 5000; });
    await expect(recognizeSource(source())).rejects.toThrow(/megapixel|larger|resize/i);
    expect(modules.createWorker).not.toHaveBeenCalled();
  });

  it('OCR-REG-008: corrupt image decoding fails before worker initialization', async () => {
    vi.stubGlobal('Image', class extends DecodableImage { async decode() { throw new Error('Image decoding failed'); } });
    await expect(recognizeSource(source())).rejects.toThrow(/decod|image/i);
    expect(modules.createWorker).not.toHaveBeenCalled();
  });

  it('already-aborted work does not create a worker', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(recognizeSource(source(), undefined, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(modules.createWorker).not.toHaveBeenCalled();
  });

  it('OCR-REG-009: worker finishing initialization after abort is terminated without recognition', async () => {
    const initializing = deferred<typeof worker>(); modules.createWorker.mockReturnValue(initializing.promise);
    const controller = new AbortController(), pending = recognizeSource(source(), undefined, controller.signal);
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(modules.createWorker).toHaveBeenCalled()); controller.abort(); initializing.resolve(worker); await assertion;
    expect(worker.recognize).not.toHaveBeenCalled(); expect(worker.terminate).toHaveBeenCalled();
  });

  it('cancelling recognition releases the worker and ignores subsequent progress', async () => {
    const recognition = deferred<ReturnType<typeof recognizedData>>(); worker.recognize.mockReturnValue(recognition.promise);
    worker.terminate.mockImplementation(async () => { recognition.reject(new Error('Worker terminated')); });
    const controller = new AbortController(), progress = vi.fn(), pending = recognizeSource(source(), progress, controller.signal);
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(worker.recognize).toHaveBeenCalled()); controller.abort(); await assertion;
    const before = progress.mock.calls.length, options = modules.createWorker.mock.calls[0][2] as { logger: (message: { progress: number; status: string }) => void };
    options.logger({ progress: 0.9, status: 'late recognition event' }); expect(progress).toHaveBeenCalledTimes(before); expect(worker.terminate).toHaveBeenCalled();
  });

  it('recognition failure and empty recognition release resources and never return success', async () => {
    worker.recognize.mockRejectedValueOnce(new Error('Engine failed'));
    await expect(recognizeSource(source())).rejects.toThrow(/failed/i); expect(worker.terminate).toHaveBeenCalled();
    worker.recognize.mockResolvedValueOnce({ data: { text: '  \n', confidence: 0, tsv: '' } });
    await expect(recognizeSource(source())).rejects.toThrow(/no readable text|clearer|transcription/i);
  });
});
