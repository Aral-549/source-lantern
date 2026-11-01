import type { Analysis, ChatMessage, SelectionContext, Source, SourceInput } from '../api/types';
import { logBoundary } from './telemetry';

export interface WorkspaceDraft { input: SourceInput; preview: Source; blob?: Blob }
export interface WorkspaceSnapshot {
  question: string; drafts: WorkspaceDraft[]; analysis: Analysis | null;
  messages: ChatMessage[]; contexts: SelectionContext[];
  manualItems: Analysis['checklist']; reviewed: string[];
}
export interface Project { id: string; name: string; archived: boolean; createdAt: string; updatedAt: string; snapshot: WorkspaceSnapshot }
export const emptySnapshot = (): WorkspaceSnapshot => ({ question: '', drafts: [], analysis: null, messages: [], contexts: [], manualItems: [], reviewed: [] });
export const PROJECT_DB = 'digital-dark-spot-projects';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Local project storage is unavailable in this browser.'));
    const request = indexedDB.open(PROJECT_DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('projects')) request.result.createObjectStore('projects', { keyPath: 'id' }); };
    request.onerror = () => reject(new Error('Could not open local project storage.'));
    request.onblocked = () => reject(new Error('Close other workspace tabs and retry opening project storage.'));
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
  });
}
function assertProject(value: unknown): asserts value is Project {
  const project = value as Project;
  if (!project || typeof project.id !== 'string' || !project.id || typeof project.name !== 'string' || !project.name.trim() || project.name.length > 100 || typeof project.archived !== 'boolean' || !project.snapshot || !Array.isArray(project.snapshot.drafts) || !Array.isArray(project.snapshot.messages) || !Array.isArray(project.snapshot.contexts) || !Array.isArray(project.snapshot.manualItems) || !Array.isArray(project.snapshot.reviewed) || typeof project.snapshot.question !== 'string') throw new Error('A project record is invalid. Its stored data was not changed.');
  const ids = new Set<string>();
  if (typeof project.createdAt !== 'string' || typeof project.updatedAt !== 'string' || !Number.isFinite(Date.parse(project.createdAt)) || !Number.isFinite(Date.parse(project.updatedAt))) throw new Error('Project dates are invalid.');
  for (const draft of project.snapshot.drafts) {
    if (!draft?.preview?.id || !draft.input?.id || draft.preview.id !== draft.input.id || ids.has(draft.preview.id) || typeof draft.preview.revision !== 'string' || !draft.preview.revision || typeof draft.preview.canonicalText !== 'string' || !Array.isArray(draft.preview.sections)) throw new Error('Project source identities or revisions are invalid.');
    ids.add(draft.preview.id);
  }
}
function stored(project: Project): Project {
  assertProject(project);
  return { ...project, name: project.name.trim(), snapshot: { ...project.snapshot, drafts: project.snapshot.drafts.map(draft => {
    const preview = { ...draft.preview };
    if (preview.fileUrl?.startsWith('blob:')) delete preview.fileUrl;
    if (preview.imageUrl?.startsWith('blob:')) delete preview.imageUrl;
    return { ...draft, preview };
  }) } };
}
export async function listProjects(): Promise<Project[]> {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const transaction = db.transaction('projects', 'readonly'); const request = transaction.objectStore('projects').getAll();
    request.onerror = () => reject(new Error('Could not read local projects.'));
    request.onsuccess = () => { try { request.result.forEach(assertProject); resolve(request.result.sort((a: Project, b: Project) => b.updatedAt.localeCompare(a.updatedAt))); } catch (error) { reject(error); } };
  }); } finally { db.close(); }
}
export async function saveProject(project: Project): Promise<void> {
  const record = stored(project); const db = await database();
  logBoundary({ sourceId: project.id, mode: 'live', stage: 'project_save', status: 'entry', inputCount: project.snapshot.drafts.length });
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('projects', 'readwrite');
    transaction.objectStore('projects').put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(new Error('Project could not be saved. Storage may be full; keep your original files and retry.'));
  }); logBoundary({ sourceId: project.id, mode: 'live', stage: 'project_save', status: 'exit', outputCount: record.snapshot.drafts.length }); }
  catch (error) { logBoundary({ sourceId: project.id, mode: 'live', stage: 'project_save', status: 'error', reason: 'storage_write_failed' }); throw error; }
  finally { db.close(); }
}
export async function moveDocument(sourceId: string, fromId: string, toId: string): Promise<void> {
  if (!sourceId || !fromId || !toId || fromId === toId) throw new Error('Choose a different destination project.');
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('projects', 'readwrite'); const store = transaction.objectStore('projects');
    const fromRequest = store.get(fromId); const toRequest = store.get(toId); let completed = 0; let error: Error | null = null;
    const update = () => { if (++completed !== 2) return; try {
      const from: Project = fromRequest.result, to: Project = toRequest.result; assertProject(from); assertProject(to);
      if (from.archived || to.archived) throw new Error('Restore an archived project before moving documents.');
      const document = from.snapshot.drafts.find(draft => draft.input.id === sourceId);
      if (!document) throw new Error('The source document is no longer in that project.');
      if (to.snapshot.drafts.length >= 6 || to.snapshot.drafts.some(draft => draft.input.id === sourceId || (document.input.url && draft.input.url === document.input.url))) throw new Error('The destination is full or already contains this source.');
      const clearAnalysis = (snapshot: WorkspaceSnapshot): WorkspaceSnapshot => ({ ...snapshot, analysis: null, messages: [], contexts: [], manualItems: [], reviewed: [] });
      from.snapshot = clearAnalysis({ ...from.snapshot, drafts: from.snapshot.drafts.filter(draft => draft.input.id !== sourceId) });
      to.snapshot = clearAnalysis({ ...to.snapshot, drafts: [...to.snapshot.drafts, document] });
      from.updatedAt = to.updatedAt = new Date().toISOString(); store.put(stored(from)); store.put(stored(to));
    } catch (failure) { error = failure instanceof Error ? failure : new Error('Could not move the document.'); transaction.abort(); } };
    fromRequest.onsuccess = toRequest.onsuccess = update;
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(error || new Error('The document move failed. Neither project was changed.'));
  }); } finally { db.close(); }
}
