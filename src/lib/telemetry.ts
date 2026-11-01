export interface PipelineEvent {
  requestId?: string; analysisId?: string; sourceId?: string; findingId?: string;
  revision?: string; mode: 'sample' | 'live'; stage: string;
  status: 'entry' | 'exit' | 'error'; inputCount?: number; outputCount?: number;
  durationMs?: number; reason?: string; simulation?: boolean;
}

const recentEvents: (PipelineEvent & { timestamp: string })[] = [];

export function logBoundary(event: PipelineEvent): void {
  const entry = { ...event, timestamp: new Date().toISOString() };
  recentEvents.push(entry);
  if (recentEvents.length > 250) recentEvents.shift();
  if (process.env.NODE_ENV !== 'test') console.debug('[digital-dark-spot:pipeline]', entry);
}

export function getPipelineEvents(): readonly (PipelineEvent & { timestamp: string })[] {
  return recentEvents.map((event) => ({ ...event }));
}
