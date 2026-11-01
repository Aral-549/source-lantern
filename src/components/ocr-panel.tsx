'use client';

import { useEffect, useRef, useState } from 'react';

import { FileCheck2, Loader2, X } from 'lucide-react';

import type { Source } from '@/api/types';

import { mergeOcrResult, recognizeSource, type OcrProgress } from '@/lib/ocr';



// One source at a time limits memory and keeps unopened uploads in the same pipeline.

export function useSourcePreparation(sources: Source[], onUpdate: (source: Source) => void) {

  const latest = useRef(sources); latest.current = sources;

  const commit = useRef(onUpdate); commit.current = onUpdate;

  const [failed, setFailed] = useState<Record<string, string>>({});

  const [job, setJob] = useState<{ sourceId: string; progress: OcrProgress } | null>(null);

  const controller = useRef<AbortController | null>(null);

  const eligible = sources.filter(source => !source.ocr && (source.fileUrl || source.imageUrl) && (source.kind === 'pdf' || source.imageUrl));

  const next = eligible.find(source => !failed[source.id + ':' + source.revision]);

  const key = next ? next.id + ':' + next.revision : '';

  useEffect(() => {

    if (!next) { setJob(null); return; }

    const source = next, identity = key, abort = new AbortController(); controller.current = abort;

    setJob({ sourceId: source.id, progress: { progress: 0, status: 'Reading uploaded file' } });

    void recognizeSource(source, progress => { if (!abort.signal.aborted) setJob({ sourceId: source.id, progress }); }, abort.signal)

      .then(result => {

        if (abort.signal.aborted || !latest.current.some(item => item.id === source.id && item.revision === source.revision)) return;

        commit.current(mergeOcrResult(source, result));

      })

      .catch(error => { if (!abort.signal.aborted) setFailed(previous => ({ ...previous, [identity]: error instanceof Error ? error.message : 'File reading failed.' })); });

    return () => { abort.abort(); if (controller.current === abort) controller.current = null; };

    // Identity is intentional: progress renders must not restart the worker.

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [key]);

  function cancel() { if (!next) return; controller.current?.abort(); setFailed(previous => ({ ...previous, [key]: 'Reading cancelled. Retry when ready.' })); setJob(null); }

  function retry(source: Source) { setFailed(previous => { const copy = { ...previous }; delete copy[source.id + ':' + source.revision]; return copy; }); }

  return { job, pending: eligible.length, failed, cancel, retry };

}

export type PreparationState = ReturnType<typeof useSourcePreparation>;



export default function OcrPanel({ source, preparation }: { source: Source; preparation: PreparationState }) {

  const running = preparation.job?.sourceId === source.id;

  const error = preparation.failed[source.id + ':' + source.revision];

  const scanned = source.ocr?.pages?.some(page => page.method === 'ocr');

  return <section className="ocr-panel" aria-label="Source reading status">{source.ocr ? <details className="reading-details"><summary><FileCheck2 size={18} /><span>{scanned ? `Image text read, ${Math.round(source.ocr.confidence)}% confidence` : 'Document text read and ready'}</span><span aria-hidden="true">+</span></summary><p className="ocr-scope">{scanned ? 'Recognition reads text on this device. Review the original for errors and visual relationships.' : 'The selectable PDF text was reused without unnecessary recognition.'}</p>{source.imageUrl && <div className="original-image"><img src={source.imageUrl} alt="Original uploaded source" /></div>}</details> : <><div className="ocr-panel-actions"><FileCheck2 size={18} /><span>{running ? 'Reading this file automatically...' : error ? 'This file needs attention.' : 'Queued for automatic reading.'}</span>{running && <button className="secondary-button" type="button" onClick={preparation.cancel}><X size={18} />Cancel</button>}{error && <button className="secondary-button" type="button" onClick={() => preparation.retry(source)}>Retry reading</button>}</div>{running && <p role="status"><Loader2 size={18} className="spin" />{preparation.job?.progress.status} ({Math.round((preparation.job?.progress.progress || 0) * 100)}%)</p>}{error && <p role="alert">{error}</p>}</>}</section>;
}
