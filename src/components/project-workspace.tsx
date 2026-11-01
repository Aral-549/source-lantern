'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Archive, ArrowUpRight, Copy, FileText, FolderOpen, MoreHorizontal, Plus, X } from 'lucide-react';
import Workspace from './workspace';
import ProjectRail from './project-rail';
import CurrentFilesFolder from './current-files-folder';
import { LabelInput } from './research-controls';
import { emptySnapshot, listProjects, moveDocument, saveProject, type Project, type WorkspaceSnapshot } from '@/lib/projects';

function hydrated(project: Project): Project {
  return { ...project, snapshot: { ...project.snapshot, drafts: project.snapshot.drafts.map(draft => {
    if (!draft.blob) return draft;
    const url = URL.createObjectURL(draft.blob);
    return { ...draft, preview: { ...draft.preview, fileUrl: url, imageUrl: draft.preview.imageUrl !== undefined || draft.blob.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(draft.input.fileName || '') ? url : undefined } };
  }) } };
}
export default function ProjectWorkspace({ initialDemo }: { initialDemo?: string }) {
  const [projects, setProjects] = useState<Project[]>([]); const [active, setActive] = useState<Project | null>(null); const [ready, setReady] = useState(false); const [error, setError] = useState(''); const [status, setStatus] = useState(''); const [session, setSession] = useState(0); const [demoTarget, setDemoTarget] = useState(initialDemo); const [libraryRequest, setLibraryRequest] = useState<{projectId:string;nonce:number}|null>(null);
  const [dialog, setDialog] = useState<'create' | 'manage' | null>(null); const [name, setName] = useState(''); const [showArchived, setShowArchived] = useState(false); const [selectedDocument, setSelectedDocument] = useState(''); const [destination, setDestination] = useState(''); const [pinned, setPinned] = useState(''); const [pending, setPending] = useState(false);
  const current = useRef<Project | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const alive = useRef(true); const entryHandled = useRef(false);
  const saving = useRef<Promise<void>>(Promise.resolve()); const operation = useRef(false);
  const refresh = useCallback(async () => { const values = await listProjects(); if (alive.current) setProjects(values); return values; }, []);
  async function persist(project: Project) { const operation = saving.current.catch(() => undefined).then(() => saveProject(project)); saving.current = operation; await operation; if (alive.current) { setStatus('Saved on this device'); await refresh(); } }
  async function flush() { if (timer.current) { clearTimeout(timer.current); timer.current = null; } if (current.current) await persist(current.current); }
  async function open(project: Project) { if (operation.current) return; operation.current = true; setError(''); setPending(true); try { await flush(); const latest = (await listProjects()).find(value => value.id === project.id); if (!latest) throw new Error('This project is no longer available.'); const restored = hydrated(latest); current.current = restored; setActive(restored); setSession(value => value + 1); setDemoTarget(undefined); setDialog(null); window.history.replaceState(null, '', '/workspace'); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not open the project.'); } finally { operation.current = false; setPending(false); } }
  useEffect(() => {
    alive.current = true;
    void (async () => { try {
      let values = await listProjects();
      if (initialDemo === 'scholarship' && !entryHandled.current) {
        entryHandled.current = true;
        let sample = values.find(project => project.id.startsWith('sample-scholarship') && !project.snapshot.drafts.length);
        if (!sample) { const date = new Date().toISOString(); sample = { id: values.some(project => project.id === 'sample-scholarship') ? `sample-scholarship-${crypto.randomUUID()}` : 'sample-scholarship', name: 'Scholarship sample', archived: false, createdAt: date, updatedAt: date, snapshot: emptySnapshot() }; await saveProject(sample); values = await listProjects(); }
        if (sample.archived) { sample = { ...sample, archived: false }; await saveProject(sample); values = await listProjects(); }
        if (alive.current) { const restored = hydrated(sample); current.current = restored; setActive(restored); }
      }
      if (alive.current) {
        if (initialDemo !== 'scholarship' && !current.current) {
          let stored = ''; try { stored = localStorage.getItem('dds.active-project') || ''; } catch {}
          const selected = values.find(project => project.id === stored && !project.archived);
          if (selected) { const restored = hydrated(selected); current.current = restored; setActive(restored); }
        }
        setProjects(values); setReady(true);
      }
    } catch (failure) { if (alive.current) { setError(failure instanceof Error ? failure.message : 'Project storage is unavailable.'); setReady(true); } } })();
    return () => { alive.current = false; if (timer.current) clearTimeout(timer.current); if (current.current) { const finalRecord = current.current; saving.current = saving.current.catch(() => undefined).then(() => saveProject(finalRecord)).catch(() => undefined); } };
  }, [initialDemo]);
  useEffect(() => { if (active) { try { localStorage.setItem('dds.active-project', active.id); } catch {} } }, [active?.id]);
  const saveSnapshot = useCallback((snapshot: WorkspaceSnapshot) => {
    const selected = current.current; if (!selected || selected.id !== active?.id) return;
    current.current = { ...selected, snapshot, updatedAt: new Date().toISOString() }; setStatus('Saving on this device…');
    if (timer.current) clearTimeout(timer.current);
    const record = current.current;
    timer.current = setTimeout(() => { timer.current = null; void persist(record).catch(failure => { if (alive.current) { setStatus('Not saved'); setError(failure instanceof Error ? failure.message : 'Local save failed. Keep your original files and retry.'); } }); }, 300);
  }, [active?.id]);
  async function create() {
    if (operation.current) return;
    if (!name.trim() || name.trim().length > 100) return setError('Use a project name with 1–100 characters.');
    operation.current = true; setPending(true); setError('');
    try { await flush(); const date = new Date().toISOString(); const project: Project = { id: crypto.randomUUID(), name: name.trim(), archived: false, createdAt: date, updatedAt: date, snapshot: emptySnapshot() }; await saveProject(project); current.current = project; setActive(project); await refresh(); setDialog(null); setName(''); window.history.replaceState(null, '', '/workspace'); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not create project.'); } finally { operation.current = false; setPending(false); }
  }
  async function updateProject(project: Project) {
    if (operation.current) return; operation.current = true; setPending(true);
    try { await flush(); const latest = current.current?.id === project.id ? { ...project, snapshot: current.current.snapshot } : project; await saveProject(latest); await refresh(); if (active?.id === project.id) { if (project.archived) { current.current = null; setActive(null); } else { current.current = latest; setActive(latest); } } setStatus('Project updated'); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update project.'); } finally { operation.current = false; setPending(false); }
  }
  async function move() {
    if (!active || !selectedDocument || !destination || operation.current) return;
    operation.current = true; setPending(true); setError('');
    try { await flush(); await moveDocument(selectedDocument, active.id, destination); const values = await refresh(); const from = values.find(project => project.id === active.id)!; const restored = hydrated(from); current.current = restored; setActive(restored); setSession(value => value + 1); setSelectedDocument(''); setStatus('Document moved. Related analysis was cleared.'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The move failed.'); } finally { operation.current = false; setPending(false); }
  }
  async function openSample() {
    if (operation.current) return; operation.current = true; setPending(true);
    try { await flush(); const values = await listProjects(); let sample = values.find(project => project.id.startsWith('sample-scholarship') && !project.snapshot.drafts.length); if (!sample) { const date = new Date().toISOString(); sample = { id: values.some(project => project.id === 'sample-scholarship') ? `sample-scholarship-${crypto.randomUUID()}` : 'sample-scholarship', name: 'Scholarship sample', archived: false, createdAt: date, updatedAt: date, snapshot: emptySnapshot() }; } sample = { ...sample, archived: false }; await saveProject(sample); current.current = hydrated(sample); setActive(current.current); setSession(value => value + 1); setDemoTarget('scholarship'); await refresh(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not open sample project.'); } finally { operation.current = false; setPending(false); }
  }
  const currentFiles = current.current?.snapshot.analysis?.sources || current.current?.snapshot.drafts.map(draft => draft.preview) || [];
  const projectNavigation = <><ProjectRail projects={projects} activeId={active?.id} status={status} pending={pending} onOpen={project => void open(project)} onCreate={() => { setName(''); setDialog('create'); setError(''); }} onManage={() => { setName(active?.name || ''); setDialog('manage'); setError(''); }} /><CurrentFilesFolder files={currentFiles} onOpen={() => active && setLibraryRequest(value => ({projectId:active.id,nonce:(value?.nonce || 0)+1}))} /></>;
  return <div className="project-host">{active ? <Workspace key={`${active.id}-${session}`} projectId={active.id} projectTitle={active.name} libraryRequest={libraryRequest?.projectId === active.id ? libraryRequest.nonce : 0} initialSnapshot={active.snapshot} onSnapshotChange={saveSnapshot} projectNavigation={projectNavigation} onCreateProject={() => { setName(''); setDialog('create'); setError(''); }} onRequestSample={() => void openSample()} initialDemo={demoTarget === 'scholarship' && active.id.startsWith('sample-scholarship') ? demoTarget : undefined} /> : <div className="project-start"><a href="/">Source Lantern</a><div className="project-start-layout"><aside>{projectNavigation}</aside><main><FolderOpen size={44} strokeWidth={1.4} /><h1>A project for each question</h1><p>Keep your documents, notes and research questions together. Create a project to start, or open one from the list.</p><button className="primary-button" onClick={() => { setName(''); setDialog('create'); }}>Create project<Plus size={20} /></button><a href="/workspace?demo=scholarship">Try the labelled sample</a>{!ready && <p role="status">Opening local project storage…</p>}</main></div></div>}{error && <div className="project-storage-error" role="alert"><p>{error}</p><button onClick={() => void refresh().then(() => setError('')).catch(failure => setError(failure.message))}>Retry storage</button><button onClick={() => setError('')} aria-label="Dismiss project error"><X size={18} /></button></div>}
    <Dialog.Root open={!!dialog} onOpenChange={open => !open && setDialog(null)}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content project-dialog"><div className="dialog-heading"><Dialog.Title>{dialog === 'create' ? 'Create a research project' : 'Manage your projects'}</Dialog.Title><Dialog.Close className="icon-button" aria-label="Close project dialog"><X size={22} /></Dialog.Close></div><Dialog.Description>Projects and original files are saved in this browser. They are not synced to an account or backed up in the cloud.</Dialog.Description>{dialog === 'create' ? <form onSubmit={event => { event.preventDefault(); void create(); }}><LabelInput id="new-project-name" label="Project name" value={name} onChange={setName} maxLength={100} autoFocus /><button className="primary-button" disabled={pending || !name.trim()} type="submit">Create project</button></form> : <><label className="project-archive-toggle"><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />Show archived projects</label>{projects.filter(project => showArchived || !project.archived).map(project => <article className="project-paper-card" key={project.id}><div className={`paper-corner-actions ${pinned === project.id ? 'pinned' : ''}`}><button className="corner-toggle" aria-label={`Actions for ${project.name}`} aria-expanded={pinned === project.id} onClick={() => setPinned(pinned === project.id ? '' : project.id)}><MoreHorizontal size={20} /></button><div className="corner-action-fan"><button title="Open project" aria-label={`Open ${project.name}`} onClick={() => void open(project)} disabled={project.archived}><ArrowUpRight size={20} /></button><button title="Copy project name" aria-label={`Copy ${project.name}`} onClick={() => void navigator.clipboard.writeText(project.name).then(() => setStatus('Project name copied')).catch(() => setError('Clipboard access was unavailable. Select and copy the name.'))}><Copy size={18} /></button><button title={project.archived ? 'Restore project' : 'Archive project'} aria-label={`${project.archived ? 'Restore' : 'Archive'} ${project.name}`} onClick={() => void updateProject({ ...project, archived: !project.archived })}><Archive size={18} /></button></div></div><h3>{project.name}</h3><p>{project.snapshot.analysis?.sources.length ?? project.snapshot.drafts.length} documents{project.archived ? ', archived' : ''}</p>{active?.id === project.id && <form onSubmit={event => { event.preventDefault(); if (name.trim()) void updateProject({ ...project, name: name.trim() }); }}><input className="text-input" aria-label="Rename project" value={name} onChange={event => setName(event.target.value)} maxLength={100} /><button className="secondary-button" type="submit">Rename</button></form>}</article>)}{active && <section className="project-move"><h3>Move a document</h3><label>Document<select value={selectedDocument} onChange={event => setSelectedDocument(event.target.value)}><option value="">Choose document</option>{(current.current?.snapshot.drafts || []).map(draft => <option key={draft.input.id} value={draft.input.id}>{draft.input.title}</option>)}</select></label><label>Destination<select value={destination} onChange={event => setDestination(event.target.value)}><option value="">Choose project</option>{projects.filter(project => !project.archived && project.id !== active.id).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><button className="primary-button" disabled={pending || !selectedDocument || !destination} onClick={() => void move()}>Move document</button></section>}</>}{error && <p role="alert">{error}</p>}</Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
