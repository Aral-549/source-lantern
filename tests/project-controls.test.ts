// @vitest-environment jsdom
import { act, createElement, useState, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectRail from '../src/components/project-rail';
import CurrentFilesFolder from '../src/components/current-files-folder';
import { MagnifyingDock, SeekSearch } from '../src/components/research-controls';
import { emptySnapshot, type Project } from '../src/lib/projects';
function project(id: string): Project { return { id, name: id, archived: false, createdAt: '2026-10-31T10:00:00Z', updatedAt: '2026-10-31T10:00:00Z', snapshot: emptySnapshot() }; }
let root: Root | undefined;
async function render(element: ReactElement) { if (!root) { const host = document.createElement('div'); document.body.append(host); root = createRoot(host); } await act(async () => root!.render(element)); }
const button = (name: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
const key = (target: Element, name: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
function rail(pending = false) { return createElement(ProjectRail, { projects: ['Alpha', 'Beta', 'Gamma'].map(project), activeId: 'Alpha', status: '', pending, onOpen: vi.fn(), onCreate: vi.fn(), onManage: vi.fn() }); }
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear(); });
afterEach(async () => { if (root) { const current = root; root = undefined; await act(async () => current.unmount()); } document.body.innerHTML = ''; vi.useRealTimers(); });

describe('project navigation and keyboard controls', () => {
  it('NAV-REG-001: pin boundaries disable ineffective moves and within-group order persists', async () => {
    localStorage.setItem('dds.project-navigation.v1', JSON.stringify({ pins: ['Alpha'], order: ['Alpha', 'Beta', 'Gamma'] })); await render(rail());
    expect(button('Move Beta up').disabled).toBe(true); expect(button('Move Alpha down').disabled).toBe(true);
    await act(async () => button('Move Gamma up').click());
    expect([...document.querySelectorAll('.project-open span')].map(node => node.textContent)).toEqual(['Alpha', 'Gamma', 'Beta']);
    expect(JSON.parse(localStorage.getItem('dds.project-navigation.v1')!).order).toEqual(['Alpha', 'Gamma', 'Beta']);
  });
  it('NAV-REG-002: keyboard entry into flyout cancels its blur-close timer', async () => {
    vi.useFakeTimers(); await render(rail()); await act(async () => button('Open project Alpha').focus());
    await act(async () => button('Close project details').focus()); await act(async () => vi.advanceTimersByTime(200));
    expect(document.querySelector('.project-flyout')).not.toBeNull();
  });
  it('NAV-REG-003: Escape closes flyout and restores project-trigger focus', async () => {
    await render(rail()); const trigger = button('Open project Alpha'); await act(async () => trigger.focus());
    const close = button('Close project details'); await act(async () => close.focus()); await act(async () => key(close, 'Escape'));
    expect(document.querySelector('.project-flyout')).toBeNull(); expect(document.activeElement?.getAttribute('aria-label')).toBe('Open project Alpha');
  });
  it('NAV-REG-004: pending operations disable the flyout open action', async () => {
    await render(rail()); await act(async () => button('Open project Alpha').focus()); await render(rail(true));
    const open = document.querySelector<HTMLButtonElement>('.project-flyout .secondary-button')!;
    expect(open.disabled).toBe(true);
  });
  it('NAV-REG-005: folder count and names derive from the actual source records', async () => {
    const onOpen = vi.fn(); await render(createElement(CurrentFilesFolder, { files: [{ id: 'a', title: 'Original guide', kind: 'pdf' }, { id: 'b', title: 'Application notes', kind: 'text' }, { id: 'c', title: 'Current notice', kind: 'url' }], onOpen }));
    const folder = button('Open current project files, 3 documents'); expect(folder).not.toBeNull(); expect(folder.textContent).toContain('3 documents'); expect(folder.textContent).toContain('Original guide, Application notes');
    await act(async () => folder.click()); expect(onOpen).toHaveBeenCalledTimes(1);
  });
  it('NAV-REG-006: Escape returns focus from hidden search input to its visible trigger', async () => {
    vi.useFakeTimers(); function Search() { const [value, setValue] = useState(''); return createElement(SeekSearch, { value, onChange: setValue }); }
    await render(createElement(Search)); await act(async () => button('Open source search').click()); await act(async () => vi.runOnlyPendingTimers());
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Search loaded sources"]')!; expect(document.activeElement).toBe(input);
    await act(async () => key(input, 'Escape')); expect(document.activeElement).toBe(button('Open source search')); expect(input.tabIndex).toBe(-1);
  });
  it('NAV-REG-007: Escape from a dock tool returns focus to the Tools trigger', async () => {
    const icon = () => createElement('svg'); const items = ['reader', 'findings', 'ask', 'checklist'].map(id => ({ id, label: id, icon }));
    await render(createElement(MagnifyingDock, { items, active: 'reader', onSelect: vi.fn() })); await act(async () => button('Open tools').click());
    const tool = document.querySelector<HTMLButtonElement>('.dock-tool-grid button')!; await act(async () => tool.focus()); await act(async () => key(tool, 'Escape'));
    expect(document.querySelector('.dock-tool-grid')).toBeNull(); expect(document.activeElement).toBe(button('Open tools'));
  });
});
