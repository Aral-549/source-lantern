// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectWorkspace from '../src/components/project-workspace';
import { emptySnapshot, type Project, type WorkspaceSnapshot } from '../src/lib/projects';
import { createSampleAnalysis } from '../src/mock/scholarship';

const storage = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), move: vi.fn() }));
vi.mock('../src/lib/projects', async importOriginal => ({ ...await importOriginal<typeof import('../src/lib/projects')>(), listProjects: storage.list, saveProject: storage.save, moveDocument: storage.move }));
interface WorkspaceProps { projectId?: string; projectNavigation?: ReactNode; initialSnapshot?: WorkspaceSnapshot; onSnapshotChange?: (snapshot: WorkspaceSnapshot) => void }
let workspace: WorkspaceProps;
vi.mock('../src/components/workspace', () => ({ default: (props: WorkspaceProps) => { workspace = props; return createElement('main', { 'data-active-project': props.projectId }, props.projectNavigation); } }));

let records: Map<string, Project>, root: Root | undefined;
function project(id: string): Project { return { id, name: id, archived: false, createdAt: '2026-10-31T10:00:00Z', updatedAt: '2026-10-31T10:00:00Z', snapshot: { ...emptySnapshot(), question: `${id} original research` } }; }
function deferred() { let resolve!: () => void; const promise = new Promise<void>(yes => { resolve = yes; }); return { promise, resolve }; }
async function mount(initialDemo?: string) { const host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root!.render(createElement(ProjectWorkspace, { initialDemo }))); }
const button = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
async function click(label: string) { await act(async () => button(label).click()); }
async function emit(question: string) { await act(async () => workspace.onSnapshotChange!({ ...emptySnapshot(), question })); }
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; records = new Map(); localStorage.clear();
  storage.list.mockReset().mockImplementation(async () => [...records.values()].map(value => structuredClone(value)));
  storage.save.mockReset().mockImplementation(async (value: Project) => { records.set(value.id, structuredClone(value)); }); storage.move.mockReset();
});
afterEach(async () => { if (root) { const current = root; root = undefined; await act(async () => current.unmount()); } document.body.innerHTML = ''; vi.useRealTimers(); });

describe('project manager session boundaries', () => {
  it('MANAGER-REG-001: archived sample entry preserves saved user content', async () => {
    const archived = { ...project('sample-scholarship'), name: 'Archived sample notes', archived: true };
    archived.snapshot.question = 'Keep my existing research question'; records.set(archived.id, archived);
    await mount('scholarship');
    expect(records.get(archived.id)!.snapshot.question).toBe('Keep my existing research question');
    expect(workspace.initialSnapshot?.question).toBe('Keep my existing research question');
    expect(records.get(archived.id)!.archived).toBe(false);
  });
  it('MANAGER-REG-002: manager uses actual completed-analysis source count', async () => {
    const sample = project('Alpha'); sample.snapshot.analysis = createSampleAnalysis(); records.set(sample.id, sample);
    await mount(); await click('Manage projects');
    const card = document.querySelector('.project-paper-card')!;
    expect(card.querySelector('p')!.textContent).toBe('3 documents');
  });
  it('MANAGER-REG-003: final unmount save cannot be overwritten by an older queued autosave', async () => {
    vi.useFakeTimers(); records.set('Alpha', project('Alpha')); await mount(); await click('Open project Alpha');
    const pending = deferred(); storage.save.mockImplementation(async (value: Project) => { if (value.snapshot.question === 'First pending snapshot') await pending.promise; records.set(value.id, structuredClone(value)); });
    await emit('First pending snapshot'); await act(async () => vi.advanceTimersByTimeAsync(300));
    await emit('Second queued snapshot'); await act(async () => vi.advanceTimersByTimeAsync(300));
    await emit('Final snapshot on unmount');
    const mounted = root!; root = undefined; await act(async () => mounted.unmount());
    pending.resolve(); vi.useRealTimers();
    await vi.waitFor(() => expect(records.get('Alpha')!.snapshot.question).toBe('Final snapshot on unmount'));
  });
  it('MANAGER-REG-004: overlapping project operations cannot commit out of order', async () => {
    for (const id of ['Alpha', 'Beta', 'Gamma']) records.set(id, project(id)); await mount(); await click('Open project Alpha'); await click('Manage projects');
    const pending = deferred(); storage.save.mockImplementation(async (value: Project) => { await pending.promise; records.set(value.id, structuredClone(value)); });
    await click('Open Beta'); await click('Open Gamma');
    expect(storage.save).toHaveBeenCalledTimes(1); pending.resolve();
    await act(async () => { for (let index = 0; index < 10; index++) await Promise.resolve(); });
    expect(workspace.projectId).toBe('Beta');
  });
  it('MANAGER-REG-005: a stale previous-project callback cannot overwrite the current project', async () => {
    vi.useFakeTimers(); records.set('Alpha', project('Alpha')); records.set('Beta', project('Beta')); await mount(); await click('Open project Alpha');
    const staleCallback = workspace.onSnapshotChange!; await click('Open project Beta');
    await act(async () => staleCallback({ ...emptySnapshot(), question: 'Wrong late Alpha callback' })); await act(async () => vi.advanceTimersByTimeAsync(400));
    expect(workspace.projectId).toBe('Beta'); expect(records.get('Beta')!.snapshot.question).toBe('Beta original research');
  });
});
