'use client';



import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';

import Link from 'next/link';

import {

  ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, Check,

  CheckCheck, CheckCircle2, ChevronDown, ChevronRight, Circle, CircleHelp, ClipboardList,

  Clock3, Copy, FileText, FolderOpen, Highlighter, Home, Image as ImageIcon, Link2,

  ListFilter, Loader2, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen,

  PanelRightClose, PanelRightOpen, Plus, Quote, Search, ShieldCheck, Sparkles,

  Trash2, TriangleAlert, Upload, X,

} from 'lucide-react';

import type { Analysis, AnalyzeProgress, ChatMessage, Evidence, Finding, FindingType, SelectionContext, Source, SourceInput } from '@/api/types';

import { analyze, askQuestion } from '@/api/client';

import { createSampleAnalysis, SAMPLE_QUESTION, SAMPLE_SCENARIO_ID, sampleSourceInputs } from '@/mock/scholarship';

import SourceReader from '@/components/source-reader';

import OcrPanel, { useSourcePreparation } from '@/components/ocr-panel';

import PaperUpload, { UploadActivity } from '@/components/paper-upload';

import { ColouringLoader, LabelInput, LiquidToggle, MagnifyingDock, PaperSelect, SeekSearch, ToastStack } from '@/components/research-controls';

import type { WorkspaceDraft, WorkspaceSnapshot } from '@/lib/projects';

import { usePreferences } from '@/store/preferences';
import { logBoundary } from '@/lib/telemetry';
import { recognizeSource } from '@/lib/ocr';



const CATEGORIES: { type: FindingType; label: string; icon: typeof Circle; description: string }[] = [

  { type: 'conflict', label: 'Conflict', icon: TriangleAlert, description: 'Your sources may disagree. Compare the passages and check the current official notice.' },

  { type: 'gap', label: 'Gap', icon: CircleHelp, description: 'An expected topic was not found in the readable text reviewed. This is an AI suggestion, not proof that information does not exist.' },

  { type: 'outdated', label: 'Outdated', icon: Clock3, description: 'A source may refer to an earlier cycle. A missing date means currency is unknown.' },

  { type: 'single_source', label: 'Single-source', icon: Circle, description: 'Only one reviewed source supports this claim. Consider checking another source.' },

  { type: 'corroborated', label: 'Corroborated', icon: CheckCheck, description: 'Two or more added sources support this claim. Agreement does not prove correctness.' },

];

const dateLabel = (date: string | null) => date ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date)) : 'Date unknown';

const sourceIcon = (kind: Source['kind']) => kind === 'url' ? Link2 : FileText;

const safeOriginal = (url?: string) => { try { return url && ['http:', 'https:'].includes(new URL(url).protocol) ? url : undefined; } catch { return undefined; } };

function Badge({ type }: { type: FindingType }) { const category = CATEGORIES.find(c => c.type === type)!; const Icon = category.icon; return <span className={`status-badge status-${type}`}><Icon size={12} />{category.label}</span>; }

function Brand({ compact = false }: { compact?: boolean }) { return <div className="brand"><svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="5" fill="currentColor" /><circle cx="15" cy="17" r="8" fill="white" /><circle cx="20" cy="12" r="7" fill="currentColor" /><path d="M23 5v5M20.5 7.5h5" stroke="white" strokeWidth="1.4" /></svg>{!compact && <span>source lantern<span className="brand-beta">BETA</span></span>}</div>; }

function IconButton({ label, children, onClick, className = '', disabled = false }: { label: string; children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) { return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>; }



type Draft = WorkspaceDraft;

type Modal = 'add' | 'compare' | 'legend' | 'help' | 'library' | 'search' | 'removed' | 'copy' | null;

function SourceForm({ onAdd, notify, count, initialMethod = 'upload' }: { initialMethod?: 'upload' | 'links' | 'text'; onAdd: (drafts: Draft[]) => void; notify: (text: string) => void; count: number }) {

  const [tab, setTab] = useState(initialMethod); const [text, setText] = useState(''); const [title, setTitle] = useState(''); const [busy, setBusy] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const fileController = useRef<AbortController | null>(null);
  const mounted = useRef(true); const uploadJob = useRef(0);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; uploadJob.current++; fileController.current?.abort(); }; }, []);

  function base(id: string, name: string, kind: Source['kind']): Source { return { id, revision: id, title: name, shortTitle: name, kind, trust: 'unknown', trustOrigin: 'Unconfirmed user-provided source', publishedAt: null, status: 'queued', canonicalText: '', sections: [] }; }

  function addText() {

    if (count >= 6) return notify('You can add up to 6 sources. Remove one first.');

    if (tab === 'links') {

      const links = text.split(/\n/).map(s => s.trim()).filter(Boolean);

      if (!links.length) return notify('Paste at least one HTTP or HTTPS link.');

      if (links.length + count > 6) return notify('You can add up to 6 sources in total.');

      try {

        const urls = links.map(link => { const url = new URL(link); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); return url; });

        if (new Set(urls.map(url => url.href)).size !== urls.length) return notify('This list contains duplicate links.');

        onAdd(urls.map(url => { const id = crypto.randomUUID(); const preview = { ...base(id, url.hostname.replace(/^www\./, ''), 'url'), domain: url.hostname, url: url.href, error: 'Web fetching needs the backend. Paste the article text to preview it now.' }; return { input: { id, kind: 'url', title: preview.title, url: url.href }, preview }; })); setText('');

      } catch { notify('Use valid HTTP or HTTPS links without embedded credentials.'); }

    } else {

      if (!text.trim()) return notify('Paste some source text first.');

      if (text.length > 100000) return notify('Pasted sources are limited to 100,000 characters.');

      const id = crypto.randomUUID(), name = title.trim() || 'Pasted source'; const preview = { ...base(id, name, 'text'), canonicalText: text, markdown: text, status: 'ready' as const, sections: [{ id: 'text', text }] };

      onAdd([{ input: { id, kind: 'text', title: name, text }, preview }]); setText(''); setTitle('');

    }

  }

  async function addFiles(files: FileList | File[]) {

    if (files.length + count > 6) return notify('You can add up to 6 sources in total.');

    fileController.current?.abort(); const fileAbort = new AbortController(); fileController.current = fileAbort;
    const job = ++uploadJob.current; const valid = () => mounted.current && uploadJob.current === job;

    setBusy(true); const drafts: Draft[] = [];

    try {

    for (const file of Array.from(files)) {

      const ext = file.name.split('.').pop()?.toLowerCase();

      if (!['pdf', 'docx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) { notify(`${file.name}: use PDF, DOCX, TXT, MD, PNG, JPG or WebP.`); continue; }

      if (file.size > 20 * 1024 * 1024) { notify(`${file.name}: the limit is 20 MiB per file.`); continue; }

      if (!file.size) { notify(`${file.name} is empty.`); continue; }

      const id = crypto.randomUUID(), kind = ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : 'text';

      const preview = base(id, file.name, kind);

      if (kind === 'pdf' || ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) { preview.fileUrl = URL.createObjectURL(file); preview.status = 'ready'; if (kind !== 'pdf') { preview.imageUrl = preview.fileUrl; preview.unanalyzed = [{ kind: 'image', count: 1 }]; } }

      else if (kind === 'text') { let content: string; try { content = await file.text(); } catch { if (valid()) notify(`Could not read ${file.name}. Try again or paste its text.`); continue; } if (!valid()) return; if (!content.trim() || content.length > 100000) { notify(`${file.name}: use nonempty text under 100,000 characters.`); continue; } preview.canonicalText = content; preview.markdown = content; preview.sections = [{ id: 'text', text: content }]; preview.status = 'ready'; }

      else {
        logBoundary({ sourceId: id, mode: 'live', stage: 'docx_read', status: 'entry', inputCount: 1 });
        try {
          const mammoth = await import('mammoth'); const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
          if (!valid()) return;
          const content = result.value.trim(); if (content.length > 100000) throw new Error('Use a document under 100,000 text characters.');
          preview.canonicalText = content; preview.markdown = content; preview.sections = [{ id: 'document-text', text: content }]; preview.status = 'ready';
          const embedded: { bytes: ArrayBuffer; type: string }[] = [];
          await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { convertImage: mammoth.images.imgElement(async image => { embedded.push({ bytes: await image.readAsArrayBuffer(), type: image.contentType }); return { src: '' }; }) });
          if (!valid()) return;
          for (let index = 0; index < embedded.length; index++) {
            if (!valid()) return;
            const image = embedded[index]; const url = URL.createObjectURL(new Blob([image.bytes], { type: image.type }));
            try {
              const result = await recognizeSource({ ...base(id, file.name, 'text'), imageUrl: url }, undefined, fileAbort.signal);
              if (!valid()) return;
              preview.sections.push({ id: `embedded-image-${index + 1}`, text: result.text, title: `Embedded image ${index + 1}: recognized text (${Math.round(result.confidence)}% confidence)` });
              preview.canonicalText += `\n\n${result.text}`; preview.markdown += `\n\n### Embedded image ${index + 1}: recognized text (${Math.round(result.confidence)}% confidence)\n\n${result.text}`;
            } catch { if (fileAbort.signal.aborted) return; notify(`An embedded image in ${file.name} could not be read. Its original still needs review.`); }
            finally { URL.revokeObjectURL(url); }
          }
          if (!preview.canonicalText.trim() || preview.canonicalText.length > 100000) throw new Error('Use a readable document under 100,000 text characters.');
          if (embedded.length) preview.unanalyzed = [{ kind: 'image', count: embedded.length }];
          logBoundary({ sourceId: id, mode: 'live', stage: 'docx_read', status: 'exit', outputCount: content.length });
        } catch { logBoundary({ sourceId: id, mode: 'live', stage: 'docx_read', status: 'error', reason: 'invalid_document' }); if (valid()) notify(`Could not read ${file.name}. Try a PDF copy or paste its text.`); continue; }
      }

      drafts.push({ input: { id, kind, title: file.name, fileName: file.name, size: file.size, ...(kind === 'text' ? { text: preview.canonicalText } : {}) }, preview, blob: file });

    }

    if (valid() && drafts.length) onAdd(drafts);

    } finally {

      if (!valid()) drafts.forEach(draft => { if (draft.preview.fileUrl?.startsWith('blob:')) URL.revokeObjectURL(draft.preview.fileUrl); });

      if (valid()) { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }

    }

  }

  return <div className="source-form"><div className="source-methods" role="tablist" aria-label="Add source method">{[{ id: 'links', label: 'Links', icon: Link2 }, { id: 'upload', label: 'Upload files', icon: Upload }, { id: 'text', label: 'Paste text', icon: FileText }].map(item => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => { setTab(item.id as 'upload' | 'links' | 'text'); setText(''); }}><item.icon size={15} />{item.label}</button>)}</div>

    {tab === 'upload' ? <PaperUpload busy={busy} onFiles={files => addFiles(files)} /> : <><label className="sr-only" htmlFor={`source-${tab}`}>{tab === 'links' ? 'Source URLs, one per line' : 'Source text'}</label>{tab === 'text' && <LabelInput label="Source title (optional)" value={title} onChange={setTitle} />}<div className="source-entry"><textarea id={`source-${tab}`} value={text} onChange={e => setText(e.target.value)} placeholder={tab === 'links' ? 'Paste source links, one per line…' : 'Paste the passage or document you want to read…'} rows={3} /><button type="button" className="small-button" onClick={addText}><Plus size={14} />Add {tab === 'links' ? 'links' : 'text'}</button></div></>}

    <div className="source-form-note"><span>{count}/6 sources added</span><span>Only the sources you choose.</span></div></div>;

}



export default function Workspace({ initialDemo, projectId, projectTitle, initialSnapshot, onSnapshotChange, projectNavigation, onRequestSample, libraryRequest, onCreateProject }: { onCreateProject?: () => void; initialDemo?: string; projectId?: string; projectTitle?: string; initialSnapshot?: WorkspaceSnapshot; onSnapshotChange?: (snapshot: WorkspaceSnapshot) => void; projectNavigation?: ReactNode; onRequestSample?: () => void; libraryRequest?: number } = {}) {

  const preferences = usePreferences();

  const [analysis, setAnalysis] = useState<Analysis | null>(initialSnapshot?.analysis || null); const [question, setQuestion] = useState(initialSnapshot?.question || ''); const [drafts, setDrafts] = useState<Draft[]>(initialSnapshot?.drafts || []);

  const [loading, setLoading] = useState(false); const [progress, setProgress] = useState<AnalyzeProgress | null>(null); const [error, setError] = useState('');

  const [uploadReceipt, setUploadReceipt] = useState<{ key: number; files: { id: string; title: string }[] } | null>(null);
  const [outgoing, setOutgoing] = useState<{ source: Source; index: number }[]>([]);
  useEffect(() => { if (!outgoing.length) return; const timer = setTimeout(() => setOutgoing([]), 280); return () => clearTimeout(timer); }, [outgoing]);
  const [openTabs, setOpenTabs] = useState<string[]>([]); const [activeTab, setActiveTab] = useState('home');
  const [addMethod, setAddMethod] = useState<'upload' | 'links' | 'text'>('upload');

  const [rightTab, setRightTab] = useState<'findings' | 'checklist' | 'ask'>('ask'); const [filter, setFilter] = useState<FindingType | 'all'>('all');

  const [selectedId, setSelectedId] = useState<string | null>(null); const [activeEvidence, setActiveEvidence] = useState<Evidence | null>(null); const [reviewed, setReviewed] = useState<string[]>(initialSnapshot?.reviewed || []);

  const [hiddenTypes, setHiddenTypes] = useState<FindingType[]>([]); const [leftCollapsed, setLeftCollapsed] = useState(false); const [rightCollapsed, setRightCollapsed] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false); const [mobile, setMobile] = useState('reader'); const [modal, setModal] = useState<Modal>(null); const [search, setSearch] = useState('');

  const [toast, setToast] = useState(''); const [copyFallback, setCopyFallback] = useState(''); const [contexts, setContexts] = useState<SelectionContext[]>(initialSnapshot?.contexts || []); const [messages, setMessages] = useState<ChatMessage[]>(initialSnapshot?.messages || []); const [askText, setAskText] = useState(''); const [asking, setAsking] = useState(false);

  const [selection, setSelection] = useState<{ context: SelectionContext; rect: { top: number; left: number; bottom: number }; touch: boolean } | null>(null);

  const [manualItems, setManualItems] = useState<Analysis['checklist']>(initialSnapshot?.manualItems || []);

  useEffect(() => { onSnapshotChange?.({ analysis, question, drafts, messages, contexts, manualItems, reviewed }); }, [analysis, question, drafts, messages, contexts, manualItems, reviewed, onSnapshotChange]);

  const runRef = useRef<AbortController | null>(null); const askRef = useRef<AbortController | null>(null); const generation = useRef(0); const composerRef = useRef<HTMLTextAreaElement>(null); const draftRef = useRef<Draft[]>([]);

  useEffect(() => { if (libraryRequest) { setActiveTab('library'); setMobile('reader'); setMenuOpen(false); } }, [libraryRequest]);

  const entryRef = useRef<string | undefined>(undefined);

  useEffect(() => {

    const timer = setTimeout(() => {

      if (entryRef.current === initialDemo) return;

      entryRef.current = initialDemo;

      if (initialDemo === 'scholarship') void runSample();

      else if (initialDemo) setToast('Unknown sample. Choose Try sample demo to open the scholarship example.');

    }, 0);

    return () => clearTimeout(timer);

  }, [initialDemo]);

  useEffect(() => { usePreferences.getState().hydrate(); return () => { runRef.current?.abort(); askRef.current?.abort(); for (const draft of draftRef.current) if (draft.preview.fileUrl?.startsWith('blob:')) URL.revokeObjectURL(draft.preview.fileUrl); }; }, []);

  useEffect(() => { draftRef.current = drafts; }, [drafts]);

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3800); return () => clearTimeout(timer); }, [toast]);

  useEffect(() => { if (!selectedId) return; document.getElementById(`finding-${selectedId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [selectedId, rightTab, filter]);

  useEffect(() => { const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSelection(null); setMenuOpen(false); } if (event.altKey && event.key.toLowerCase() === 'a' && selection) { event.preventDefault(); addContext(selection.context); } }; document.addEventListener('keydown', dismiss); return () => document.removeEventListener('keydown', dismiss); });

  const sources = analysis?.sources || (loading ? createSampleAnalysis().sources : drafts.map(d => d.preview));

  const sourceRows = sources.map(source => ({ source, removing: false })); outgoing.forEach(item => sourceRows.splice(Math.min(item.index, sourceRows.length), 0, { source: item.source, removing: true }));
  const activeSource = sources.find(source => source.id === activeTab);

  const findings = analysis?.findings || [];

  const sortedFindings = [...findings].sort((a, b) => CATEGORIES.findIndex(c => c.type === a.type) - CATEGORIES.findIndex(c => c.type === b.type));

  const visibleFindings = sortedFindings.filter(f => filter === 'all' || f.type === filter);

  const selectedFinding = findings.find(f => f.id === selectedId);

  const checklist = [...(analysis?.checklist || []), ...manualItems].map(item => ({ ...item, checked: preferences.checks[`${projectId || "local"}:${analysis?.id}:${item.id}`] ?? item.checked }));

  const checkedCount = checklist.filter(item => item.checked).length;

  const sentContexts = messages.flatMap(message => message.contexts || []);



  function openSource(id: string) { setOpenTabs(tabs => tabs.includes(id) ? tabs : [...tabs, id]); setActiveTab(id); setMobile('reader'); setMenuOpen(false); }

  function navigate(evidence: Evidence, findingId?: string) { const source = sources.find(s => s.id === evidence.sourceId && s.revision === evidence.sourceRevision); if (!source) return setToast('This source is no longer available.'); openSource(source.id); setActiveEvidence({ ...evidence }); if (findingId) setSelectedId(findingId); }

  function selectFinding(finding: Finding) { setSelectedId(finding.id); setRightTab('findings'); setRightCollapsed(false); if (finding.evidence[0]) navigate(finding.evidence[0], finding.id); else setActiveEvidence(null); }

  const receiveSelection = useCallback((context: SelectionContext, rect: { top: number; left: number; bottom: number }) => setSelection({ context, rect, touch: window.matchMedia('(pointer: coarse)').matches }), []);

  const clearSelection = useCallback(() => setSelection(null), []);

  function addContext(context: SelectionContext) { if (!analysis) { setSelection(null); return setToast('Questions about your own files need the backend. Try the labelled sample to explore passage questions.'); } if (contexts.length >= 5) return setToast('You can attach up to 5 passages.'); if (!contexts.some(c => c.sourceId === context.sourceId && c.text === context.text)) setContexts(items => [...items, context]); setRightTab('ask'); setRightCollapsed(false); setMobile('ask'); setSelection(null); setTimeout(() => composerRef.current?.focus(), 40); }

  function contextEvidence(context: SelectionContext): Evidence { return { sourceId: context.sourceId, sourceRevision: context.sourceRevision, quote: context.text, page: context.page, charStart: context.charStart, charEnd: context.charEnd, quoteMatched: false }; }

  function cancelRun() { runRef.current?.abort(); generation.current++; setLoading(false); setProgress(null); setToast('Sample analysis cancelled.'); }

  function reset() { runRef.current?.abort(); askRef.current?.abort(); generation.current++; setAnalysis(null); setQuestion(''); setLoading(false); setProgress(null); setError(''); setOpenTabs([]); setActiveTab('overview'); setSelectedId(null); setActiveEvidence(null); setMessages([]); setContexts([]); setReviewed([]); setManualItems([]); setAsking(false); setDrafts(current => { if (projectId) return current; current.forEach(d => d.preview.fileUrl?.startsWith('blob:') && URL.revokeObjectURL(d.preview.fileUrl)); return []; }); setMobile('reader'); setMenuOpen(false); }

  async function runSample() {

    if (projectId && !projectId.startsWith('sample-scholarship') && onRequestSample) { onRequestSample(); return; }

    runRef.current?.abort(); askRef.current?.abort(); const controller = new AbortController(); runRef.current = controller; const version = ++generation.current;

    setAnalysis(null); setLoading(true); setProgress(null); setError(''); setQuestion(SAMPLE_QUESTION); setMessages([]); setContexts([]); setReviewed([]); setManualItems([]); setAsking(false); setActiveTab('overview'); setOpenTabs([]); setMobile('reader'); setModal(null);

    try { const result = await analyze({ question: SAMPLE_QUESTION, sources: sampleSourceInputs(), mode: 'sample', scenarioId: SAMPLE_SCENARIO_ID, requestId: crypto.randomUUID(), revision: String(version) }, p => { if (generation.current === version) setProgress(p); }, controller.signal); if (generation.current !== version) return; setAnalysis(result); const source = [...result.sources].sort((a, b) => result.findings.filter(f => f.evidence.some(e => e.sourceId === b.id)).length - result.findings.filter(f => f.evidence.some(e => e.sourceId === a.id)).length)[0]; if (source) { setOpenTabs([source.id]); setActiveTab(source.id); } const conflict = result.findings.find(f => f.type === 'conflict'); setSelectedId(conflict?.id || null); setActiveEvidence(conflict?.evidence[0] || null); setFilter('all'); setRightTab('ask'); setRightCollapsed(false); }

    catch (failure) { if (controller.signal.aborted || version !== generation.current) return; setError(failure instanceof Error ? failure.message : 'The sample could not be loaded. Try again.'); }

    finally { if (version === generation.current) setLoading(false); }

  }

  function addDrafts(items: Draft[]) {

    if (loading) cancelRun();

    if (analysis) { askRef.current?.abort(); generation.current++; setAnalysis(null); setMessages([]); setContexts([]); setAsking(false); setManualItems([]); setSelectedId(null); setActiveEvidence(null); setOpenTabs([]); setToast('Started a new draft. Sample results were cleared.'); }

    const next = [...drafts]; const accepted: Draft[] = []; let duplicateId: string | undefined;

    for (const item of items) { if (next.length >= 6) break; const existing = item.input.url ? next.find(d => d.input.url === item.input.url) : undefined; if (existing) { duplicateId = existing.input.id; setToast('That source is already in this draft.'); continue; } next.push(item); accepted.push(item); }

    setDrafts(next);
    const files = accepted.filter(draft => draft.blob).map(draft => ({ id: draft.input.id, title: draft.input.title })); if (files.length) setUploadReceipt({ key: Date.now(), files });

    if (accepted[0]) openSource(accepted[0].input.id); else if (duplicateId) openSource(duplicateId); setModal(null);

  }

  function removeDraft(id: string) { const source = sources.find(item => item.id === id); if (!source) return; setOutgoing(items => [...items, { source, index: sources.findIndex(item => item.id === id) }]); setToast(`Removed ${source.title} from this project.`); const draft = drafts.find(d => d.input.id === id); if (draft?.preview.fileUrl?.startsWith('blob:')) URL.revokeObjectURL(draft.preview.fileUrl); setDrafts(items => items.filter(d => d.input.id !== id)); setOpenTabs(tabs => tabs.filter(tab => tab !== id)); if (activeTab === id) setActiveTab('overview'); }

  async function copy(text: string) { try { await navigator.clipboard.writeText(text); setToast('Copied to clipboard.'); } catch { setCopyFallback(text); setModal('copy'); } }

  function report(onlyChecklist = false) { const heading = `# ${onlyChecklist ? 'Verification checklist' : 'Source Lantern research review'}\n\n${analysis?.mode === 'sample' ? 'Sample demo: fictional sources for illustration.\n\n' : ''}${analysis?.question || question}\n\n`; const items = checklist.map(item => `- [${item.checked ? 'x' : ' '}] (${item.priority}) ${item.text}\n  Why: ${item.why}`).join('\n'); const evidence = onlyChecklist ? '' : `## Findings\n\n${findings.map(f => `### ${f.title}\n${f.provenance === 'sourced' ? 'Sourced' : 'AI suggestion'} | ${f.confidence} confidence: ${f.confidenceReason}\n${f.detail}\n${f.evidence.map(e => `> ${e.quote}\nSource: ${sources.find(s => s.id === e.sourceId)?.title}${e.page ? `, page ${e.page}` : ''}`).join('\n')}\n`).join('\n')}\n`; return `${heading}${evidence}## Checklist\n\n${items}\n\n## Sources\n\n${sources.map(source => `- ${source.title} (${dateLabel(source.publishedAt)})${safeOriginal(source.url) ? `: ${source.url}` : ''}`).join('\n')}\n\nFindings are signals based only on the readable text of the sources reviewed. Unprocessed images, charts and tables may contain additional information. Confirm requirements with the current official source.\n`; }

  function download(onlyChecklist = false) { const url = URL.createObjectURL(new Blob([report(onlyChecklist)], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = onlyChecklist ? 'verification-checklist.md' : 'source-lantern-review.md'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); setToast('Markdown download started.'); }

  function addChecklist(finding?: Finding, text?: string) { if (!analysis) return; if (finding && checklist.some(item => item.findingIds.includes(finding.id))) return setToast('This finding already has an action in your checklist.'); const action = text || (finding?.type === 'gap' ? `Check ${finding.title.toLowerCase()} in the latest official notice` : `Confirm: ${finding?.title}`); if (checklist.some(item => item.text === action)) return setToast('This action is already in your checklist.'); setManualItems(items => [...items, { id: crypto.randomUUID(), priority: 'medium', text: action, why: finding?.detail || 'Some source content was not analyzed.', findingIds: finding ? [finding.id] : [], checked: false, suggestedCheck: 'Current official notice' }]); setToast('Added to checklist.'); }

  async function sendQuestion(override?: { context: SelectionContext; compare: boolean }) {

    if (!analysis || asking) return; const selected = override ? [override.context] : contexts; const text = override?.compare ? 'Do the other sources support, contradict or not mention this passage?' : askText.trim() || (selected.length ? 'Explain this passage and tell me what to verify.' : ''); if (!text) return;

    const version = generation.current; const controller = new AbortController(); askRef.current?.abort(); askRef.current = controller; setAsking(true); setRightTab('ask'); setRightCollapsed(false); setMobile('ask'); setSelection(null); setContexts([]); setAskText(''); setMessages(items => [...items, { id: crypto.randomUUID(), role: 'user', text, createdAt: new Date().toISOString(), contexts: selected }]);

    try { const reply = await askQuestion({ analysis, question: text, contexts: selected, compare: override?.compare }, controller.signal); if (version === generation.current && !controller.signal.aborted) setMessages(items => [...items, reply]); }

    catch (failure) { if (!controller.signal.aborted && version === generation.current) setToast(failure instanceof Error ? failure.message : 'Could not load a sample reply. Try again.'); }

    finally { if (version === generation.current) setAsking(false); }

  }

  function resize(event: React.PointerEvent, side: 'left' | 'right') { const start = event.clientX; const initial = usePreferences.getState(); const move = (e: PointerEvent) => initial.setSizes(side === 'left' ? initial.left + e.clientX - start : initial.left, side === 'right' ? initial.right - e.clientX + start : initial.right); const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.body.style.cursor = ''; }; document.body.style.cursor = 'col-resize'; document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); }

  function updateOcrSource(updated: Source) {

    runRef.current?.abort(); askRef.current?.abort(); generation.current++;

    const originalSources = analysis?.sources;

    setAnalysis(null); setMessages([]); setContexts([]); setManualItems([]); setSelectedId(null); setActiveEvidence(null); setAsking(false);

    setDrafts(current => originalSources ? originalSources.map(source => ({ input: { id: source.id, kind: source.kind, title: source.title, text: source.id === updated.id ? updated.canonicalText : source.canonicalText, fileName: source.kind === 'pdf' ? source.domain || source.title + '.pdf' : undefined }, preview: source.id === updated.id ? updated : source })) : current.map(draft => draft.preview.id === updated.id ? { ...draft, input: { ...draft.input, text: updated.canonicalText }, preview: updated } : draft));

    setToast('File reading complete. The source text is ready to inspect.');

  }

  const preparation = useSourcePreparation(analysis ? [] : drafts.map(draft => draft.preview), updateOcrSource);

  const showModal = (value: Modal) => { setSearch(''); setModal(value); };

  const citation = (evidence: Evidence, index: number, findingId?: string) => <button className="citation" key={`${evidence.sourceId}-${index}`} onClick={() => navigate(evidence, findingId)} title={`Show quote in ${sources.find(s => s.id === evidence.sourceId)?.shortTitle || evidence.sourceId}`}><FileText size={11} />{sources.findIndex(s => s.id === evidence.sourceId) + 1}{evidence.page ? ` · p.${evidence.page}` : ''}<ArrowUpRight size={10} /></button>;



  const homeView = <div className="workspace-home"><section><h1>Quick actions</h1><div className="home-actions"><button onClick={() => { setAddMethod('upload'); showModal('add'); }}><Upload size={20} /><span>Upload files</span></button><button onClick={() => { setAddMethod('text'); showModal('add'); }}><FileText size={20} /><span>Add a note</span></button><button onClick={() => { setActiveTab('library'); setMobile('reader'); }}><FolderOpen size={20} /><span>Open project files</span></button><button onClick={() => { setRightTab('ask'); setRightCollapsed(false); setMobile('ask'); composerRef.current?.focus(); }}><MessageSquare size={20} /><span>Chat with sources</span></button></div></section><section className="home-recent"><div className="home-section-heading"><h2>Project files</h2><button className="text-button" onClick={() => setActiveTab('library')}>View all<ChevronRight size={16} /></button></div>{sources.length ? <div className="home-file-grid">{sources.map(source => <button key={source.id} onClick={() => openSource(source.id)}><FileText size={20} /><strong>{source.shortTitle}</strong><span>{source.imageUrl ? 'Image' : source.kind.toUpperCase()} · {source.status === 'ready' ? 'Ready to read' : 'Preparing'}</span></button>)}</div> : <button className="home-empty-files" onClick={() => { setAddMethod('upload'); showModal('add'); }}><Upload size={20} /><span>Add your first document, image or note</span></button>}</section><section className="home-question"><h2>Research question</h2><LabelInput id="research-question" label="What are you looking into?" value={question} onChange={setQuestion} multiline /></section>{error && <p className="error-banner" role="alert">{error}</p>}<div className="home-demo"><p>File reading works locally. Live AI analysis is not connected.</p><button className="text-button" onClick={() => void runSample()}>Open fictional sample<ArrowUpRight size={16} /></button></div></div>;
  const libraryView = <div className="workspace-library"><div className="library-heading"><h1>{projectTitle || 'Project files'}</h1><button className="secondary-button" onClick={() => { setAddMethod('upload'); showModal('add'); }}><Plus size={16} />Add files</button></div><p>{sources.length} files in this project</p>{sources.length ? <table className="file-table"><thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead><tbody>{sources.map(source => <tr key={source.id}><td><button onClick={() => openSource(source.id)}><FileText size={17} /><span>{source.title}</span></button></td><td>{source.imageUrl ? 'Image' : source.kind.toUpperCase()}</td><td>{source.canonicalText ? 'Ready' : source.error ? 'Needs attention' : 'Reading'}</td></tr>)}</tbody></table> : <p className="library-empty">Upload a file to start this project.</p>}</div>;

  return <div className={`app-shell ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`} data-right-tab={rightTab} data-analysis-mode={analysis?.mode || 'draft'} data-mobile={mobile} style={{ '--sidebar-width': `${preferences.left}px`, '--right-width': `${preferences.right}px` } as CSSProperties}>

    {uploadReceipt && <UploadActivity key={uploadReceipt.key} files={uploadReceipt.files} sources={drafts.map(draft => draft.preview)} preparation={preparation} onDismiss={() => setUploadReceipt(null)} />}
    {menuOpen && <button className="sidebar-scrim" aria-label="Close source drawer" onClick={() => setMenuOpen(false)} />}

    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Workspace navigation">

      <div className="sidebar-brand"><Brand /><IconButton label="Collapse sidebar" onClick={() => setLeftCollapsed(!leftCollapsed)}><PanelLeftClose size={16} /></IconButton></div>

      {analysis && <button className="new-analysis-button" onClick={reset} title="New analysis"><Plus size={17} /><span className="sidebar-label">New analysis</span><span className="shortcut sidebar-label">N</span></button>}

      <nav className="primary-nav">{onCreateProject && <button onClick={onCreateProject} title="Create project"><Plus size={17} /><span className="sidebar-label">Create</span></button>}<button className={activeTab === 'home' ? 'active' : ''} onClick={() => { setActiveTab('home'); setMobile('reader'); setMenuOpen(false); }} title="Home"><Home size={17} /><span className="sidebar-label">Home</span></button><button onClick={() => { setActiveTab('library'); setMobile('reader'); setMenuOpen(false); }} title="Library"><FolderOpen size={17} /><span className="sidebar-label">Library</span><span className="nav-count sidebar-label">{sources.length}</span></button><button onClick={() => showModal('search')} title="Search sources"><Search size={17} /><span className="sidebar-label">Search sources</span></button></nav>

      {projectNavigation}<div className="sidebar-section-heading"><span className="sidebar-label">Files</span><span className="sidebar-label">{sources.length || ''}</span><IconButton label="Add source" onClick={() => { setAddMethod('upload'); showModal('add'); }}><Plus size={15} /></IconButton></div>

      <div className="source-list">{preparation.job && <div className="source-preparation-state" role="status"><span className="activity-dots" aria-hidden="true"><i /><i /><i /></span><span>Reading files · {Math.round(preparation.job.progress.progress * 100)}%</span></div>}{sourceRows.length ? sourceRows.map(({ source, removing }) => { const Icon = sourceIcon(source.kind); const count = findings.filter(f => f.evidence.some(e => e.sourceId === source.id)).length; return <div key={source.id} aria-hidden={removing || undefined} inert={removing || undefined} className={`source-row-wrap ${removing ? 'is-removing' : ''} ${activeTab === source.id ? 'active' : ''}`}><button className="source-row" title={source.title} onClick={() => openSource(source.id)}><span className={`source-file-icon file-${source.kind}`}><Icon size={17} /><span>{source.kind === 'pdf' ? 'PDF' : source.kind === 'url' ? 'WEB' : 'TXT'}</span></span><span className="source-row-content sidebar-label"><span className="source-row-title">{source.shortTitle}</span><span className="source-domain">{source.domain || (analysis ? 'Sample document' : 'Local preview')}</span><span className="source-date"><span className={`source-dot ${loading ? 'is-loading' : ''}`} />{loading ? 'Sample: reading' : dateLabel(source.publishedAt)}</span></span>{!!count && <span className="finding-count sidebar-label">{count}</span>}</button>{!analysis && !loading && <IconButton className="source-remove" label={`Remove ${source.title}`} onClick={() => removeDraft(source.id)}><Trash2 size={16} /></IconButton>}</div>; }) : <div className="sidebar-empty"><div className="empty-source-lines"><span /><span /><span /></div><p>Your research starts<br />with a few good sources.</p></div>}</div>

      <button className="sidebar-add" onClick={() => { setAddMethod('upload'); showModal('add'); }} title="Add source"><Plus size={15} /><span className="sidebar-label">Add source</span></button>

      <div className="sidebar-bottom"><button onClick={() => showModal('legend')} title="How findings are labelled"><CircleHelp size={16} /><span className="sidebar-label">How findings are labelled</span></button><div className="sidebar-profile"><span className="profile-avatar">Y</span><span className="sidebar-label"><strong>Your workspace</strong><small>Stored on this device</small></span><IconButton label="Help" onClick={() => showModal('help')}><CircleHelp size={16} /></IconButton></div></div>

    </aside>

    {!leftCollapsed && <div className="resize-handle left-resize" role="separator" aria-label="Resize source sidebar" aria-orientation="vertical" tabIndex={0} onPointerDown={e => resize(e, 'left')} onKeyDown={e => { if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); preferences.setSizes(preferences.left + (e.key === 'ArrowRight' ? 12 : -12), preferences.right); } }} />}

    <main className="workspace-main"><header className="topbar"><div className="breadcrumb"><IconButton label="Open navigation menu" className="mobile-menu" onClick={() => setMenuOpen(true)}><Menu size={19} /></IconButton>{leftCollapsed && <IconButton label="Expand sidebar" onClick={() => setLeftCollapsed(false)}><PanelLeftOpen size={17} /></IconButton>}<span className="breadcrumb-root">{projectTitle || "My workspace"}</span><span className="breadcrumb-divider">/</span><span className="breadcrumb-current">{projectTitle || (analysis ? 'Source review' : 'Research workspace')}</span></div><div className="topbar-actions"><span className="local-label"><span />Local workspace</span><IconButton label="Help with this workspace" onClick={() => showModal('help')}><CircleHelp size={17} /></IconButton><span className="top-avatar">Y</span></div></header>

      <div className="workspace-body"><section className="center-pane" aria-label="Source reader and overview">

        <div className="center-tabbar"><div className="center-tabs" role="tablist" aria-label="Open documents"><button role="tab" aria-selected={activeTab === 'home'} className={`document-tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => { setActiveTab('home'); setMobile('reader'); }}><Home size={14} />Home</button>{activeTab === 'library' && <button role="tab" aria-selected className="document-tab active"><FolderOpen size={14} />Library</button>}<button role="tab" aria-selected={activeTab === 'overview'} className={`document-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setMobile('reader'); }}><Home size={14} />Overview</button>{openTabs.map(id => { const source = sources.find(s => s.id === id); if (!source) return null; const Icon = sourceIcon(source.kind); return <div key={id} className={`document-tab-wrap ${activeTab === id ? 'active' : ''}`}><button role="tab" aria-selected={activeTab === id} className="document-tab" onClick={() => openSource(id)}><Icon size={14} /><span>{source.shortTitle}</span></button><IconButton label={`Close ${source.shortTitle} tab`} onClick={() => { setOpenTabs(tabs => tabs.filter(t => t !== id)); if (activeTab === id) { setActiveTab('overview'); setActiveEvidence(null); } }}><X size={12} /></IconButton></div>; })}<IconButton label="Add a source" onClick={() => { setAddMethod('upload'); showModal('add'); }}><Plus size={15} /></IconButton></div>{!!analysis && <div className="tabbar-tools"><details className="menu-popover"><summary aria-label="Highlight filters" title="Highlight filters"><Highlighter size={15} /></summary><div className="popover-content"><strong>Show highlights</strong><LiquidToggle label="All highlights" checked={hiddenTypes.length === 0} onChange={on => setHiddenTypes(on ? [] : CATEGORIES.filter(category => category.type !== "gap").map(category => category.type))} />{CATEGORIES.filter(c => c.type !== 'gap').map(c => <label key={c.type}><input type="checkbox" checked={!hiddenTypes.includes(c.type)} onChange={() => setHiddenTypes(types => types.includes(c.type) ? types.filter(t => t !== c.type) : [...types, c.type])} />{c.label}</label>)}</div></details><details className="menu-popover export-menu"><summary><ArrowDownToLine size={14} /><span>Export</span><ChevronDown size={11} /></summary><div className="popover-content"><button onClick={() => download(false)}>Download report (.md)</button><button onClick={() => download(true)}>Download checklist (.md)</button><button onClick={() => void copy(report(true))}>Copy checklist</button></div></details></div>}</div>

        {activeTab === 'library' ? libraryView : loading ? <div className="loading-view"><ColouringLoader progress={((progress?.index || 0) + 1) * 18} label="Reading the prepared sources" /><span className="eyebrow"><Loader2 size={14} className="spin" />SAMPLE ANALYSIS</span><h1>A clearer picture,<br />one source at a time.</h1><p>Demonstrating a prepared analysis of three fictional sources.</p><div className="progress-stages">{['Reading your sources', 'Suggesting topics to check', 'Comparing the details', 'Checking source quotes', 'Building your checklist'].map((stage, index) => <div className={index < (progress?.index || 0) ? 'done' : index === (progress?.index || 0) ? 'current' : ''} key={stage}>{index < (progress?.index || 0) ? <CheckCircle2 size={19} /> : index === (progress?.index || 0) ? <Loader2 size={19} className="spin" /> : <Circle size={19} />}<span>{stage}</span></div>)}</div><button className="secondary-button" onClick={cancelRun}>Cancel sample</button></div> : activeSource ? <><div className="source-header"><div className="source-header-eyebrow"><span className="eyebrow">{activeSource.kind === 'pdf' ? 'DOCUMENT' : activeSource.kind === 'url' ? 'WEB SOURCE' : 'SOURCE PREVIEW'}</span>{analysis && <span className="sample-tag">Fictional sample</span>}</div><div className="source-title-row"><h1>{activeSource.title}</h1>{activeSource.fileUrl ? <a className="icon-button" href={activeSource.fileUrl} target="_blank" rel="noreferrer" title="Open original document" aria-label="Open original document"><ArrowUpRight size={17} /></a> : safeOriginal(activeSource.url) && <a className="icon-button" href={activeSource.url} target="_blank" rel="noreferrer" title="Open original source" aria-label="Open original source"><ArrowUpRight size={17} /></a>}</div><details className="source-info"><summary aria-label="Document information"><CircleHelp size={16} /></summary><div className="source-metadata"><span className="trust-label" title={activeSource.trustOrigin}><ShieldCheck size={12} />{activeSource.trust === 'official' ? 'Official · sample' : activeSource.trust === 'unknown' ? 'Origin unconfirmed' : activeSource.trust}</span><span>{activeSource.domain || 'Local document'}</span><span>{dateLabel(activeSource.publishedAt)}</span></div></details></div>{analysis ? <div className="sample-notice"><span className="sample-dot" />Sample demo: fictional sources for illustration.</div> : <div className="preview-notice"><CircleHelp size={14} />Preview only. Live analysis is not connected yet.</div>}{activeSource.unanalyzed?.length ? <details className="unread-notice compact-source-notice"><summary><ImageIcon size={16} /><span>{activeSource.unanalyzed.reduce((sum, item) => sum + item.count, 0)} {activeSource.ocr ? 'visual item needs review' : 'item not fully read'}</span><ChevronDown size={16} /></summary><div><p>{activeSource.ocr ? 'Text has been read automatically. Visual relationships in images, charts or tables still need review.' : 'This source contains an image or other content not included in the readable text. It may hold additional details.'}</p><button onClick={() => addChecklist(undefined, `Check the images and tables in ${activeSource.shortTitle} manually`)}>Add check</button></div></details> : null}{!analysis && (activeSource.imageUrl || activeSource.kind === 'pdf') && <OcrPanel key={activeSource.id + activeSource.revision} source={activeSource} preparation={preparation} />}{activeSource.error && !activeSource.canonicalText && !activeSource.fileUrl ? <div className="source-unavailable"><FileText size={35} /><h2>Ready for the next step</h2><p>{activeSource.error}</p><button className="primary-button" onClick={() => { setAddMethod('upload'); showModal('add'); }}>Paste text instead<ArrowRight size={15} /></button><button className="text-button" onClick={() => { setAddMethod('upload'); showModal('add'); }}>Upload another file</button></div> : <SourceReader source={activeSource} findings={findings} selectedFindingId={selectedId} activeEvidence={activeEvidence} hiddenTypes={hiddenTypes} sentContexts={sentContexts} onFindingClick={id => { const finding = findings.find(f => f.id === id); if (finding) { setFilter('all'); setRightTab('findings'); setRightCollapsed(false); setMobile('findings'); setSelectedId(id); } }} onSelect={receiveSelection} onSelectionClear={clearSelection} onContextClick={context => { setRightTab('ask'); setRightCollapsed(false); setMobile('ask'); document.getElementById(`message-${messages.find(m => m.contexts?.some(c => c.id === context.id))?.id}`)?.scrollIntoView({ block: 'center' }); }} />}</> : analysis && activeTab !== 'home' ? <div className="overview-scroll"><div className="overview-heading"><span className="eyebrow">RESEARCH OVERVIEW</span><h1>{analysis.question}</h1><p>{sources.filter(s => s.status === 'ready').length} sources reviewed<span>·</span>{dateLabel(analysis.createdAt)}<span>·</span><span className="sample-tag">Fictional sample</span></p></div><div className="coverage-summary"><div><span className="eyebrow">TOPIC COVERAGE</span><h2><strong>{analysis.stats.topicsCovered}</strong><span>of {analysis.stats.topicsTotal}</span>suggested topics</h2><p>Expected topics are an AI suggestion, not a measure of correctness.</p></div><div className="coverage-ring" style={{ '--coverage': `${analysis.stats.topicsCovered / analysis.stats.topicsTotal * 100}%` } as CSSProperties}><span>{Math.round(analysis.stats.topicsCovered / analysis.stats.topicsTotal * 100)}<small>%</small></span></div></div><div className="section-title"><h2>What the sources say</h2><span><Quote size={13} />Source-backed summary</span></div><div className="summary-list">{analysis.summary.map((item, index) => <div key={index}><span className="summary-dot" /><p>{item.text}<span className="inline-citations">{item.evidence.map((e, i) => citation(e, i))}</span></p></div>)}</div><div className="section-title"><h2>See what is covered</h2><span className="ai-label"><Sparkles size={12} />AI-suggested topics</span></div><div className="coverage-table-wrap"><table className="coverage-table"><thead><tr><th>Topic</th>{sources.map(source => <th key={source.id} title={source.title}>{source.shortTitle}</th>)}</tr></thead><tbody>{analysis.topics.map(topic => <tr key={topic.id}><th>{topic.label}</th>{sources.map(source => { const cell = analysis.coverage.find(c => c.topicId === topic.id && c.sourceId === source.id); const status = cell?.status || 'missing'; return <td key={source.id}><button className={`coverage-cell cell-${status}`} aria-label={`${topic.label}, ${source.shortTitle}: ${status}`} onClick={() => { const finding = findings.find(f => f.topicId === topic.id && (status === 'missing' ? f.type === 'gap' : f.evidence.some(e => e.sourceId === source.id))); if (finding) { setFilter('all'); selectFinding(finding); const cellEvidence = finding.evidence.find(e => e.sourceId === source.id); if (cellEvidence) navigate(cellEvidence, finding.id); setMobile(cellEvidence ? 'reader' : 'findings'); } else openSource(source.id); }}>{status === 'covered' ? <Check size={14} /> : status === 'conflict' ? <TriangleAlert size={13} /> : status === 'outdated' ? <Clock3 size={13} /> : <span>—</span>}</button></td>; })}</tr>)}</tbody></table></div><p className="scope-footnote">Findings describe the readable text of your sources. Images and other unprocessed content may hold additional details.</p></div> : homeView}

      </section>

      {!rightCollapsed && <><div className="resize-handle right-resize" role="separator" aria-label="Resize analysis panel" aria-orientation="vertical" tabIndex={0} onPointerDown={e => resize(e, 'right')} onKeyDown={e => { if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); preferences.setSizes(preferences.left, preferences.right + (e.key === 'ArrowLeft' ? 12 : -12)); } }} /><aside className="right-panel" aria-label="Analysis panel"><div className="right-panel-heading"><div><span className="assistant-mark"><Sparkles size={16} /></span><h2>Project chat</h2>{analysis && <span className="subtle-count">{findings.length}</span>}</div><IconButton label="Collapse analysis panel" onClick={() => setRightCollapsed(true)}><PanelRightClose size={16} /></IconButton></div><div className="analysis-tabs" role="tablist" aria-label="Analysis views">{[{ id: 'findings', label: 'Findings', icon: Highlighter }, { id: 'checklist', label: 'Checklist', icon: ClipboardList }, { id: 'ask', label: 'Chat', icon: MessageSquare }].map(tab => <button key={tab.id} role="tab" aria-selected={rightTab === tab.id} className={rightTab === tab.id ? 'active' : ''} onClick={() => setRightTab(tab.id as typeof rightTab)}><tab.icon size={14} />{tab.label}{tab.id === 'checklist' && !!checklist.length && <span>{checklist.length}</span>}</button>)}</div>

      {!analysis ? <><div className="assistant-empty">{loading ? <><div className="skeleton-line" /><div className="skeleton-line short" />{[0, 1, 2].map(i => <div className="skeleton-card" key={i}><span /><span /><span /></div>)}<p>Sample findings will appear here.</p></> : <><div className="assistant-empty-icon"><BookOpen size={28} strokeWidth={1.4} /></div><h3>{sources.length ? 'Chat with this project' : 'Chat with your sources'}</h3><p>{sources.length ? `${sources.filter(source => !!source.canonicalText).length} of ${sources.length} sources have readable text. Open a file on the left to inspect it.` : 'Your findings, checklist and source questions stay together in this panel.'}</p><div className="analysis-availability"><strong>Live analysis is not connected</strong><p>Your files are saved and prepared locally. The fictional sample shows how evidence and findings will work.</p><button className="secondary-button" onClick={() => void runSample()}>Explore the sample<ArrowUpRight size={18} /></button></div></>}</div>{rightTab === 'ask' && <><div className="chat-composer custom-chat-composer"><button className="chat-attach icon-button" type="button" aria-label="Add files to this project" onClick={() => { setAddMethod('upload'); showModal('add'); }}><Plus size={18} /></button><textarea aria-label="Chat requires a connected analysis backend" placeholder="Ask about your sources" disabled rows={2} /><div><span>Live analysis not connected</span><button type="button" aria-label="Send question" disabled><ArrowUp size={17} /></button></div></div><p className="chat-disclaimer">Try the fictional sample to explore cited answers.</p></>}</> : rightTab === 'findings' ? <><details className="evidence-strip"><summary><ShieldCheck size={14} />{analysis.stats.quotesMatched} source quotes matched<ChevronDown size={14} /></summary><div><ShieldCheck size={14} /><strong>{analysis.stats.quotesMatched} quotes matched</strong><span>in source text</span></div><button onClick={() => showModal('removed')}>{analysis.removedFindings.length} candidates removed<ChevronRight size={12} /></button>{sources.some(s => s.unanalyzed?.length) && <span className="unread-line">Some images were not analyzed.</span>}</details><div className="finding-filters compact-finding-filters"><PaperSelect label="Finding type" value={filter} onChange={value => setFilter(value as FindingType | 'all')} options={[{ value: 'all', label: 'All findings', count: findings.length }, ...CATEGORIES.map(category => ({ value: category.type, label: category.label, count: findings.filter(finding => finding.type === category.type).length }))]} /><span>{visibleFindings.length} {visibleFindings.length === 1 ? 'finding' : 'findings'}</span></div><div className="findings-heading"><span>{filter === 'all' ? 'WORTH A CLOSER LOOK' : CATEGORIES.find(c => c.type === filter)?.label.toUpperCase()}</span><span>{visibleFindings.length} findings</span></div><div className="findings-scroll" onKeyDown={e => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return; const index = visibleFindings.findIndex(f => f.id === selectedId); if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const finding = visibleFindings[(Math.max(0, index) + (e.key === 'ArrowDown' ? 1 : -1) + visibleFindings.length) % visibleFindings.length]; if (finding) setSelectedId(finding.id); } if (e.key === 'Enter' && selectedFinding && e.target === e.currentTarget) selectFinding(selectedFinding); }} tabIndex={0} aria-label="Findings list">{visibleFindings.length ? visibleFindings.map(finding => <article key={finding.id} id={`finding-${finding.id}`} className={`finding-card ${selectedId === finding.id ? 'selected' : ''} ${reviewed.includes(finding.id) ? 'is-reviewed' : ''}`}><div className="finding-labels"><Badge type={finding.type} /><span className={`provenance ${finding.provenance}`} title={finding.provenance === 'sourced' ? 'Quote exists in source text; interpretation may still be uncertain.' : 'A suggested check, not a source-backed fact.'}>{finding.provenance === 'sourced' ? <Quote size={10} /> : <Sparkles size={10} />}{finding.provenance === 'sourced' ? 'Sourced' : 'AI suggestion'}</span>{reviewed.includes(finding.id) && <Check size={12} />}</div><button className="finding-title" onClick={() => selectedId === finding.id ? setSelectedId(null) : selectFinding(finding)}><span>{finding.title}</span><ChevronDown size={14} className={selectedId === finding.id ? 'rotated' : ''} /></button><p className="finding-detail">{finding.detail}</p>{selectedId === finding.id && <div className="finding-expanded"><div className="confidence"><span className={`confidence-dots ${finding.confidence}`}><i /><i /><i /></span><span>{finding.confidence[0].toUpperCase() + finding.confidence.slice(1)} confidence</span></div><p className="confidence-reason">{finding.confidenceReason}</p>{finding.evidence.length ? finding.evidence.map((evidence, index) => <div className="evidence-quote" key={index}><Quote size={12} /><blockquote>{evidence.quote}</blockquote><button onClick={() => navigate(evidence, finding.id)}><FileText size={12} />{sources.find(s => s.id === evidence.sourceId)?.shortTitle}{evidence.page ? ` · p.${evidence.page}` : ''}<ArrowUpRight size={12} /></button></div>) : <div className="gap-note"><span>Not found in the text of {sources.filter(s => s.status === 'ready').length} sources reviewed</span>{finding.whereToCheck && <p><Sparkles size={12} />Where to check: {finding.whereToCheck}</p>}</div>}{finding.type === 'conflict' && <button className="compare-button" onClick={() => showModal('compare')}><BookOpen size={14} />Compare side by side<ArrowUpRight size={13} /></button>}<div className="finding-actions"><button onClick={() => addChecklist(finding)}><Plus size={12} />Add to checklist</button><button onClick={() => setReviewed(ids => ids.includes(finding.id) ? ids.filter(id => id !== finding.id) : [...ids, finding.id])}><Check size={12} />{reviewed.includes(finding.id) ? 'Reviewed' : 'Mark reviewed'}</button></div></div>}</article>) : <div className="panel-empty"><CircleHelp size={23} /><p>No {filter === 'all' ? '' : CATEGORIES.find(c => c.type === filter)?.label.toLowerCase()} findings in this analysis.</p><button className="text-button" onClick={() => setFilter('all')}>Show all findings</button></div>}</div><div className="panel-scope"><CircleHelp size={13} /><span>Signals from your sources, not final answers.<br />Confirm with the current official notice.</span></div></> : rightTab === 'checklist' ? <><div className="checklist-progress"><div><strong>Your next steps</strong><span>{checkedCount} of {checklist.length} checked</span></div><div className="progress-track"><span style={{ width: `${checklist.length ? checkedCount / checklist.length * 100 : 0}%` }} /></div><p>A little less uncertainty with every check.</p></div><div className="checklist-scroll">{(['high', 'medium', 'low'] as const).map(priority => <section className="priority-group" key={priority}><h3><span className={`priority-dot priority-${priority}`} />{priority} priority<span>{checklist.filter(item => item.priority === priority).length}</span></h3>{checklist.filter(item => item.priority === priority).map(item => <div className={`checklist-item ${item.checked ? 'checked' : ''}`} key={item.id}><label><input type="checkbox" checked={item.checked} onChange={e => preferences.setCheck(`${projectId || "local"}:${analysis.id}:${item.id}`, e.target.checked)} /><span>{item.text}</span></label><p>{item.why}</p>{item.findingIds.map(id => { const finding = findings.find(f => f.id === id); return finding && <button className="checklist-finding-link" key={id} onClick={() => { setFilter('all'); selectFinding(finding); }}><Highlighter size={11} />Related finding<ArrowUpRight size={10} /></button>; })}{item.suggestedCheck && <small><Sparkles size={10} />Suggested check: {item.suggestedCheck}</small>}</div>)}</section>)}</div><div className="panel-bottom-actions"><button className="secondary-button" onClick={() => void copy(report(true))}><Copy size={13} />Copy checklist</button><IconButton label="Download checklist Markdown" onClick={() => download(true)}><ArrowDownToLine size={16} /></IconButton></div></> : <><div className="chat-scroll">{!messages.length && <div className="ask-intro"><span className="assistant-mark"><MessageSquare size={22} strokeWidth={1.4} /></span><h3>Ask your sources</h3><p>Ask a question or select a passage in the document.</p>{['Where do the income documents differ?', 'What do the sources say about the deadline?', 'What is missing about renewal?'].map(text => <button key={text} onClick={() => { setAskText(text); composerRef.current?.focus(); }}>{text}<ArrowUpRight size={13} /></button>)}<small>Prepared sample replies only. Answers are scoped to the fictional sources.</small></div>}{messages.map(message => <div className={`chat-message message-${message.role}`} key={message.id} id={`message-${message.id}`}><div className="message-role">{message.role === 'assistant' ? <><Sparkles size={12} />Sample assistant</> : 'You'}</div>{message.contexts?.map(context => <button className="message-context" key={context.id} onClick={() => navigate(contextEvidence(context))}><Quote size={12} /><span>{context.text}</span><small>{sources.find(s => s.id === context.sourceId)?.shortTitle}{context.page ? ` · p.${context.page}` : ''}</small></button>)}<p>{message.text}</p>{message.evidence?.length ? <div className="message-evidence-label"><span className="provenance sourced"><Quote size={10} />Sourced passages</span><span className="inline-citations">{message.evidence.map((e, i) => citation(e, i))}</span></div> : message.role === 'assistant' && <span className="ai-label"><Sparkles size={11} />Sample response</span>}{message.sourceComparison?.map(row => <div className={`comparison-row result-${row.result}`} key={row.sourceId}><strong>{sources.find(s => s.id === row.sourceId)?.shortTitle}</strong><span>{row.result === 'supports' ? 'Supports' : row.result === 'possible_conflict' ? 'Possible conflict' : 'Not found in this source'}</span>{row.quote && <><blockquote>{row.quote}</blockquote><button className="text-button" onClick={() => { const source = sources.find(s => s.id === row.sourceId); if (source) navigate({ sourceId: source.id, sourceRevision: source.revision, quote: row.quote!, page: row.page, quoteMatched: true }); }}>Show in source<ArrowUpRight size={11} /></button></>}</div>)}{message.confidence && <p className="message-confidence">{message.confidence} confidence · {message.confidenceReason}</p>}{message.suggestChecklistItem && <button className="text-button" onClick={() => addChecklist(undefined, message.suggestChecklistItem)}><Plus size={12} />Add next step to checklist</button>}</div>)}{asking && <div className="agent-monitor" role="status"><span className="agent-monitor-mark" aria-hidden="true"><i /><i /><i /></span><div><strong>Reading the selected context</strong><p>Preparing a cited sample reply</p></div></div>}</div><form className="chat-composer" onSubmit={e => { e.preventDefault(); void sendQuestion(); }}>{contexts.map(context => <div className="quote-chip" key={context.id}><button onClick={() => navigate(contextEvidence(context))} type="button"><Quote size={12} /><span>{context.text}</span><small>{sources.find(s => s.id === context.sourceId)?.shortTitle}{context.page ? ` · p.${context.page}` : ''}{context.truncated ? ' · trimmed to 1,500 characters' : ''}</small></button><IconButton label="Remove quoted passage" onClick={() => setContexts(items => items.filter(c => c.id !== context.id))}><X size={12} /></IconButton></div>)}<button className="chat-attach icon-button" type="button" aria-label="Add files to this project" onClick={() => { setAddMethod('upload'); showModal('add'); }}><Plus size={18} /></button><label className="sr-only" htmlFor="ask-question">Ask about your sources</label><textarea ref={composerRef} id="ask-question" placeholder={contexts.length ? 'Ask about this passage…' : 'Ask about these sources…'} value={askText} onChange={e => setAskText(e.target.value)} rows={2} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendQuestion(); } }} /><div><span><Quote size={12} />{contexts.length ? `${contexts.length}/5 passages attached` : 'Select text to add context'}</span><button type="submit" aria-label="Send question" title="Send question" disabled={asking || (!askText.trim() && !contexts.length)}><ArrowUp size={17} /></button></div></form><p className="chat-disclaimer">Sample answers. Check the cited passages yourself.</p></>}

      </aside></>}{rightCollapsed && <div className="assistant-rail"><IconButton label="Expand analysis panel" onClick={() => setRightCollapsed(false)}><PanelRightOpen size={18} /></IconButton><button onClick={() => { setRightCollapsed(false); setRightTab('findings'); }} title="Open findings"><Highlighter size={17} /><span>Analysis</span></button></div>}

      </div></main>

    <MagnifyingDock active={mobile} items={[{ id: 'sources', label: 'Sources', icon: FolderOpen }, { id: 'reader', label: 'Reader', icon: BookOpen }, { id: 'findings', label: 'Findings', icon: Highlighter }, { id: 'checklist', label: 'Checklist', icon: ClipboardList }, { id: 'ask', label: 'Chat', icon: MessageSquare }]} onSelect={id => { if (id === 'sources') { setMenuOpen(true); return; } setMobile(id); if (id === 'findings' || id === 'checklist' || id === 'ask') { setRightTab(id); setRightCollapsed(false); } }} />

    {selection && <div className="selection-toolbar" role="toolbar" aria-label="Selected passage actions" style={{ top: Math.max(8, Math.min(window.innerHeight - 62, selection.touch ? selection.rect.bottom + 16 : selection.rect.top > 52 ? selection.rect.top - 46 : selection.rect.bottom + 8)), left: Math.max(8, Math.min(selection.rect.left, typeof window !== 'undefined' ? window.innerWidth - 325 : selection.rect.left)) }} onPointerDown={e => e.preventDefault()}><button onClick={() => addContext(selection.context)}><MessageSquare size={13} />Ask about this</button><button title="Check against other sources" aria-label="Check against other sources" disabled={!analysis} onClick={() => void sendQuestion({ context: selection.context, compare: true })}><CheckCheck size={15} /></button><button title="Copy passage" aria-label="Copy passage" onClick={() => void copy(selection.context.text)}><Copy size={14} /></button></div>}

    <ToastStack message={toast} onDismiss={() => setToast('')} />

    <Dialog.Root open={!!modal} onOpenChange={open => !open && setModal(null)}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className={`dialog-content ${modal === 'compare' ? 'compare-dialog' : ''}`}><div className="dialog-heading"><Dialog.Title>{modal === 'add' ? 'Bring in a source' : modal === 'compare' ? 'A closer look at the difference' : modal === 'legend' ? 'How findings are labelled' : modal === 'library' ? 'Your source library' : modal === 'search' ? 'Search your sources' : modal === 'removed' ? 'Candidates removed from this analysis' : modal === 'copy' ? 'Copy your text' : 'A little guidance'}</Dialog.Title><Dialog.Close className="icon-button" aria-label="Close dialog"><X size={18} /></Dialog.Close></div><Dialog.Description className="dialog-description">{modal === 'compare' ? 'A possible conflict, with both passages available for you to inspect.' : modal === 'add' ? 'Add up to 6 sources. Local previews work now; live analysis will use the backend.' : modal === 'removed' ? 'These candidates were excluded because their required quote was absent from source text.' : modal === 'copy' ? 'Clipboard access was unavailable. Select and copy the text below.' : modal === 'search' ? 'Find text in the sources currently loaded in this workspace.' : modal === 'legend' ? 'Labels describe the sources you added. They do not establish factual correctness.' : modal === 'library' ? 'Only the sources currently loaded in this local workspace are shown.' : 'Read the evidence, keep uncertainty visible, and decide what to check next.'}</Dialog.Description>

    {modal === 'add' && <SourceForm initialMethod={addMethod} key={`modal-${generation.current}`} count={analysis ? 0 : drafts.length} onAdd={addDrafts} notify={setToast} />}

    {modal === 'compare' && selectedFinding && <><div className="comparison-title"><Badge type="conflict" /><h3>{selectedFinding.title}</h3>{selectedFinding.conflictScore != null && <span>Conflict signal {selectedFinding.conflictScore.toFixed(2)} · a signal, not proof</span>}</div><div className="compare-columns">{selectedFinding.evidence.map((evidence, index) => { const source = sources.find(s => s.id === evidence.sourceId); return <section key={index}><span className="eyebrow">SOURCE {index + 1}</span><h3>{source?.title}</h3><p className="compare-meta">{source?.trust} · {dateLabel(source?.publishedAt || null)}{evidence.page ? ` · page ${evidence.page}` : ''}</p><blockquote>{evidence.quote.split(/(income certificate|Form 16|ITR|6 months)/gi).map((part, i) => /^(income certificate|Form 16|ITR|6 months)$/i.test(part) ? <strong key={i}>{part}</strong> : part)}</blockquote><button className="secondary-button" onClick={() => { navigate(evidence, selectedFinding.id); setModal(null); }}>Show in source<ArrowUpRight size={14} /></button></section>; })}</div><div className="comparison-explanation"><span className="ai-label"><Sparkles size={12} />AI suggestion</span><p>{selectedFinding.detail}</p><strong>What to check next</strong><p>Confirm the accepted income documents in the latest official scholarship notice. The quoted difference alone does not establish which requirement applies.</p></div><button className="primary-button" onClick={() => addChecklist(selectedFinding)}><Plus size={14} />Add to checklist</button></>}

    {modal === 'legend' && <div className="legend-list">{CATEGORIES.map(category => <div key={category.type}><Badge type={category.type} /><p>{category.description}</p></div>)}<div className="legend-provenance"><span className="provenance sourced"><Quote size={11} />Sourced</span><p>A quote is present in the source text. Its interpretation may still need checking.</p><span className="provenance ai_suggestion"><Sparkles size={11} />AI suggestion</span><p>A proposed topic, explanation, or next check. Treat it as a suggestion.</p></div></div>}

    {(modal === 'search' || modal === 'library') && <><SeekSearch value={search} onChange={setSearch} /><div className="library-results">{sources.filter(source => (modal === 'search' ? `${source.title} ${source.canonicalText}` : source.title).toLowerCase().includes(search.toLowerCase())).map(source => { const offset = source.canonicalText.toLowerCase().indexOf(search.toLowerCase()); return <button key={source.id} onClick={() => { if (search && offset >= 0 && modal === 'search') navigate({ sourceId: source.id, sourceRevision: source.revision, quote: source.canonicalText.slice(offset, offset + search.length), charStart: offset, charEnd: offset + search.length, quoteMatched: false }); else openSource(source.id); setModal(null); }}><FileText size={19} /><span><strong>{source.title}</strong><small>{dateLabel(source.publishedAt)} · {source.kind.toUpperCase()}</small>{search && offset >= 0 && <p>…{source.canonicalText.slice(Math.max(0, offset - 30), offset + 100)}…</p>}</span><ArrowUpRight size={15} /></button>; })}{!sources.length && <p className="panel-empty">Add sources or open the sample to build your library.</p>}{!!sources.length && !sources.some(source => (modal === 'search' ? `${source.title} ${source.canonicalText}` : source.title).toLowerCase().includes(search.toLowerCase())) && <p className="panel-empty">No matches in the available source text. Try another phrase.</p>}</div></>}

    {modal === 'removed' && <div className="removed-list">{analysis?.removedFindings.map((finding, index) => <div key={index}><TriangleAlert size={16} /><span><strong>{finding.title}</strong><p>{finding.reason}</p></span></div>)}</div>}

    {modal === 'copy' && <textarea className="copy-fallback" readOnly value={copyFallback} onFocus={e => e.target.select()} autoFocus aria-label="Text to copy" />}

    {modal === 'help' && <div className="help-copy"><h3>Start with the scholarship sample</h3><p>Try the sample demo to explore three fictional sources. Click a finding to jump to its quote, or select text in the reader and choose Ask about this.</p><h3>Turn findings into next steps</h3><p>Compare possible conflicts, inspect confidence reasons, and work through the Checklist. Copy or download your report at any time.</p><h3>Your own documents</h3><p>PDF and text files can be previewed locally. Web fetching, DOCX extraction, and live analysis need the future backend. Your uploads are never substituted with sample results.</p><h3>What stays on this device</h3><p>Pane sizes and checklist checks are saved locally when storage is available. Documents and questions stay in memory for this session.</p><button className="primary-button" onClick={() => void runSample()}>Try sample demo<ArrowRight size={14} /></button></div>}

    </Dialog.Content></Dialog.Portal></Dialog.Root>

  </div>;

}

