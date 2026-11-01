import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { IDBFactory, IDBKeyRange, IDBObjectStore as FakeObjectStore } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Analysis, Source } from '../src/api/types';
import { emptySnapshot, listProjects, moveDocument, PROJECT_DB, saveProject, type Project, type WorkspaceDraft } from '../src/lib/projects';

function textDraft(id: string, text = 'An inspectable research source.'): WorkspaceDraft {
  const preview: Source = { id, revision: `${id}-revision`, title: `${id} title`, shortTitle: id, kind: 'text', trust: 'unknown', trustOrigin: 'User-provided source', publishedAt: null, status: 'ready', canonicalText: text, sections: [{ id: 'body', text }] };
  return { input: { id, kind: 'text', title: preview.title, text }, preview };
}
function project(id: string, drafts: WorkspaceDraft[] = []): Project {
  return { id, name: id, archived: false, createdAt: '2026-10-31T10:00:00.000Z', updatedAt: '2026-10-31T10:00:00.000Z', snapshot: { ...emptySnapshot(), question: `${id} research question`, drafts } };
}
function analysisFor(source: Source): Analysis {
  return { id: `analysis-${source.id}`, mode: 'live', question: 'Inspect the added source', createdAt: '2026-10-31T10:00:00.000Z', sources: [source], topics: [], coverage: [], summary: [], findings: [], checklist: [], removedFindings: [], stats: { topicsCovered: 0, topicsTotal: 0, findingsTotal: 0, quotesMatched: 0 } };
}
function seedDerivedState(value: Project): Project {
  const source = value.snapshot.drafts[0].preview;
  value.snapshot.analysis = analysisFor(source);
  value.snapshot.messages = [{ id: `message-${value.id}`, role: 'user', text: 'Inspect the added source', createdAt: '2026-10-31T10:00:00.000Z' }];
  value.snapshot.contexts = [{ id: `context-${value.id}`, sourceId: source.id, sourceRevision: source.revision, text: source.canonicalText }];
  value.snapshot.manualItems = [{ id: `action-${value.id}`, priority: 'medium', text: 'Read the original source', why: 'Check the supplied material', findingIds: [], checked: true }];
  value.snapshot.reviewed = ['old-observation'];
  return value;
}
function hash(bytes: Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }
async function rawPut(value: unknown): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const opening = indexedDB.open(PROJECT_DB, 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore('projects', { keyPath: 'id' });
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result, transaction = db.transaction('projects', 'readwrite');
      transaction.objectStore('projects').put(value);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  });
}

beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('IDBKeyRange', IDBKeyRange); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('local project persistence and ownership', () => {
  it('P01/P11: starts empty and persists a new named empty project', async () => {
    expect(await listProjects()).toEqual([]);
    await saveProject(project('Alpha'));
    const records = await listProjects();
    expect(records).toHaveLength(1); expect(records[0].id).toBe('Alpha'); expect(records[0].snapshot.drafts).toEqual([]);
  });

  it('PROJECT-REG-001: original real PDF bytes persist while ephemeral preview URL does not', async () => {
    const original = new Uint8Array(await readFile(join(process.cwd(), 'tests/fixtures/real-problem-statement.pdf')));
    const draft = textDraft('official-problem', 'DIGITAL DARK SPOT');
    draft.input = { id: draft.input.id, kind: 'pdf', title: 'Official problem statement', fileName: 'problem.pdf', size: original.length };
    draft.preview = { ...draft.preview, kind: 'pdf', fileUrl: 'blob:expired-after-reload' };
    draft.blob = new Blob([original], { type: 'application/pdf' });
    await saveProject(project('Alpha', [draft]));
    const saved = (await listProjects())[0].snapshot.drafts[0];
    expect(saved.preview.id).toBe('official-problem'); expect(saved.preview.revision).toBe('official-problem-revision');
    expect(saved.preview.fileUrl).toBeUndefined(); expect(saved.blob).toBeInstanceOf(Blob);
    expect(hash(new Uint8Array(await saved.blob!.arrayBuffer()))).toBe(hash(original));
    expect(draft.preview.fileUrl).toBe('blob:expired-after-reload');
  });

  it('PROJECT-REG-002: saving one project leaves the other project state isolated', async () => {
    const alpha = seedDerivedState(project('Alpha', [textDraft('alpha-document')]));
    const beta = seedDerivedState(project('Beta', [textDraft('beta-document')]));
    await saveProject(alpha); await saveProject(beta);
    alpha.snapshot.question = 'An updated question only in Alpha'; alpha.snapshot.drafts.push(textDraft('another-alpha-document'));
    await saveProject(alpha);
    const records = await listProjects(), savedBeta = records.find(record => record.id === 'Beta')!;
    expect(savedBeta).toEqual(beta); expect(records).toHaveLength(2);
  });

  it('PROJECT-REG-003: document move preserves identity and invalidates both derived workspaces', async () => {
    const alpha = seedDerivedState(project('Alpha', [textDraft('moving-document')]));
    const beta = seedDerivedState(project('Beta', [textDraft('existing-document')]));
    const originalSource = structuredClone(alpha.snapshot.drafts[0]);
    await saveProject(alpha); await saveProject(beta); await moveDocument('moving-document', 'Alpha', 'Beta');
    const records = await listProjects(), from = records.find(record => record.id === 'Alpha')!, to = records.find(record => record.id === 'Beta')!;
    expect(from.snapshot.drafts).toHaveLength(0);
    expect(to.snapshot.drafts.map(draft => draft.input.id)).toEqual(['existing-document', 'moving-document']);
    expect(to.snapshot.drafts[1]).toEqual(originalSource);
    for (const changed of [from, to]) {
      expect(changed.snapshot.analysis).toBeNull(); expect(changed.snapshot.messages).toEqual([]); expect(changed.snapshot.contexts).toEqual([]);
      expect(changed.snapshot.manualItems).toEqual([]); expect(changed.snapshot.reviewed).toEqual([]);
    }
  });

  it('PROJECT-REG-004: rename/archive/restore retain the same ID and source contents', async () => {
    const original = project('Alpha', [textDraft('persistent-document')]); await saveProject(original);
    await saveProject({ ...original, name: ' Renamed research ', archived: true });
    let stored = (await listProjects())[0]; expect(stored.id).toBe('Alpha'); expect(stored.name).toBe('Renamed research'); expect(stored.archived).toBe(true);
    expect(stored.snapshot).toEqual(original.snapshot);
    await saveProject({ ...stored, archived: false }); stored = (await listProjects())[0];
    expect(stored.archived).toBe(false); expect(stored.snapshot.drafts[0].preview.revision).toBe('persistent-document-revision');
  });

  it.each(['', '   ', 'x'.repeat(101)])('P02: invalid project name is rejected before persistence: %j', async name => {
    const invalid = { ...project('Alpha'), name };
    await expect(saveProject(invalid)).rejects.toThrow(); expect(await listProjects()).toEqual([]);
  });

  it('PROJECT-REG-005: unavailable storage rejects rather than claiming a save', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(listProjects()).rejects.toThrow(/unavailable|storage/i);
    await expect(saveProject(project('Alpha'))).rejects.toThrow(/unavailable|storage/i);
  });

  it('PROJECT-REG-005: a failed write preserves the existing stored record', async () => {
    const original = project('Alpha', [textDraft('existing-document')]); await saveProject(original);
    vi.spyOn(FakeObjectStore.prototype, 'put').mockImplementation(() => { throw new DOMException('Storage is full', 'QuotaExceededError'); });
    await expect(saveProject({ ...original, name: 'Must not be saved' })).rejects.toThrow();
    vi.restoreAllMocks(); expect((await listProjects())[0]).toEqual(original);
  });

  it('PROJECT-REG-006: missing destination or wrong ownership rejects without changing records', async () => {
    const alpha = project('Alpha', [textDraft('alpha-document')]), beta = project('Beta', [textDraft('beta-document')]);
    await saveProject(alpha); await saveProject(beta);
    await expect(moveDocument('alpha-document', 'Alpha', 'Missing')).rejects.toThrow();
    await expect(moveDocument('alpha-document', 'Beta', 'Alpha')).rejects.toThrow();
    const records = await listProjects(); expect(records.find(record => record.id === 'Alpha')).toEqual(alpha); expect(records.find(record => record.id === 'Beta')).toEqual(beta);
  });

  it('PROJECT-REG-007: second-write failure aborts both sides of a move', async () => {
    const alpha = project('Alpha', [textDraft('moving-document')]), beta = project('Beta', [textDraft('existing-document')]);
    await saveProject(alpha); await saveProject(beta);
    const originalPut = FakeObjectStore.prototype.put; let writes = 0;
    vi.spyOn(FakeObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (++writes === 2) throw new DOMException('Second project write failed', 'QuotaExceededError');
      return originalPut.call(this, value, key);
    });
    await expect(moveDocument('moving-document', 'Alpha', 'Beta')).rejects.toThrow(); vi.restoreAllMocks();
    const records = await listProjects(); expect(records.find(record => record.id === 'Alpha')).toEqual(alpha); expect(records.find(record => record.id === 'Beta')).toEqual(beta);
  });

  it('PROJECT-REG-008: mutating a returned record cannot mutate storage without save', async () => {
    const original = project('Alpha', [textDraft('document')]); await saveProject(original);
    const returned = (await listProjects())[0]; returned.name = 'Unsaved mutation'; returned.snapshot.drafts[0].preview.canonicalText = 'Unsaved text'; returned.snapshot.drafts.length = 0;
    expect((await listProjects())[0]).toEqual(original);
  });

  it('P07: collision or full destination cannot partially remove the source', async () => {
    const alpha = project('Alpha', [textDraft('moving-document')]), beta = project('Beta', Array.from({ length: 6 }, (_, index) => textDraft(`destination-${index}`)));
    await saveProject(alpha); await saveProject(beta);
    await expect(moveDocument('moving-document', 'Alpha', 'Beta')).rejects.toThrow();
    expect((await listProjects()).find(record => record.id === 'Alpha')).toEqual(alpha);
  });

  it('P08: archived projects must be restored before a document move', async () => {
    const alpha = project('Alpha', [textDraft('moving-document')]), beta = { ...project('Beta'), archived: true };
    await saveProject(alpha); await saveProject(beta);
    await expect(moveDocument('moving-document', 'Alpha', 'Beta')).rejects.toThrow(/restore|archiv/i);
    expect((await listProjects()).find(record => record.id === 'Alpha')).toEqual(alpha);
  });

  it('corrupt stored records produce an explicit invalid-record error', async () => {
    await rawPut({ id: 'corrupt-record', name: 'Corrupt' });
    await expect(listProjects()).rejects.toThrow(/invalid|stored/i);
  });

  it('PROJECT-REG-009: missing stored timestamps are validated before sorting', async () => {
    await saveProject(project('Alpha'));
    const broken = project('Beta') as unknown as Record<string, unknown>; delete broken.updatedAt;
    await rawPut(broken);
    await expect(listProjects()).rejects.toThrow(/invalid|stored/i);
  });

  it('PROJECT-REG-010: source revisions are required before a draft is persisted', async () => {
    const broken = project('Alpha', [textDraft('document')]);
    delete (broken.snapshot.drafts[0].preview as unknown as Record<string, unknown>).revision;
    await expect(saveProject(broken)).rejects.toThrow(/invalid|revision|source/i);
    expect(await listProjects()).toEqual([]);
  });
});
