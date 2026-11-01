'use client';
import { FileText, FolderOpen } from 'lucide-react';

export default function CurrentFilesFolder({ files, onOpen }: { files: { id: string; title: string; kind: string }[]; onOpen: () => void }) {
  return <button type="button" className="current-files-folder" onClick={onOpen} aria-label={`Open current project files, ${files.length} documents`}><span className="folder-illustration" aria-hidden="true"><span className="folder-back" />{files.slice(0, 4).map((file, index) => <span key={file.id} className="folder-file-preview" style={{ '--file-index': index } as React.CSSProperties}><FileText size={20} /><span>{file.kind.toUpperCase()}</span></span>)}<span className="folder-front"><FolderOpen size={28} /></span></span><span className="folder-caption"><strong>Project files</strong><span>{files.length} {files.length === 1 ? 'document' : 'documents'}</span></span><span className="folder-file-names">{files.length ? files.slice(0, 2).map(file => file.title).join(', ') : 'Your uploaded pages will appear here'}</span></button>;
}
