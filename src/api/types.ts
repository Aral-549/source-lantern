export type SourceKind = 'url' | 'pdf' | 'docx' | 'text';
export type FindingType = 'corroborated' | 'single_source' | 'conflict' | 'outdated' | 'gap';
export type Confidence = 'high' | 'medium' | 'low';
export interface SourceSection { id: string; title?: string; text: string; page?: number }
export interface Source {
  id: string; revision: string; title: string; shortTitle: string; kind: SourceKind;
  domain?: string; url?: string; fileUrl?: string;
  trust: 'official' | 'news' | 'blog' | 'unknown'; trustOrigin: string;
  publishedAt: string | null; cycleLabel?: string;
  status: 'queued' | 'fetching' | 'extracting' | 'ready' | 'failed'; error?: string;
  canonicalText: string; markdown?: string; sections: SourceSection[];
  hasTextLayer?: boolean; pageCount?: number;
  imageUrl?: string;
  ocr?: { confidence: number; processedPages: number; engine: string; recognizedAt: string; pages: { page: number; text: string; confidence: number; width: number; height: number; words: { text: string; confidence: number; left: number; top: number; width: number; height: number }[]; method: 'ocr' | 'native' }[] };
  unanalyzed?: { kind: 'image' | 'chart' | 'table' | 'scanned_page'; count: number; pages?: number[] }[];
}
export interface Evidence {
  sourceId: string; sourceRevision: string; quote: string; page?: number; sectionId?: string;
  charStart?: number; charEnd?: number; quoteMatched: boolean;
}
export interface Finding {
  id: string; type: FindingType; topicId: string; title: string; detail: string;
  provenance: 'sourced' | 'ai_suggestion'; confidence: Confidence; confidenceReason: string;
  evidence: Evidence[]; conflictScore?: number; relatedQuestion?: string; whereToCheck?: string;
}
export interface Topic { id: string; label: string; aiPredicted: boolean }
export interface CoverageCell { topicId: string; sourceId: string; status: 'covered' | 'missing' | 'conflict' | 'outdated' }
export interface ChecklistItem {
  id: string; priority: 'high' | 'medium' | 'low'; text: string; why: string;
  findingIds: string[]; suggestedCheck?: string; checked: boolean;
}
export interface Analysis {
  id: string; mode: 'sample' | 'live'; question: string; createdAt: string;
  sources: Source[]; topics: Topic[]; coverage: CoverageCell[];
  summary: { text: string; evidence: Evidence[] }[];
  findings: Finding[]; checklist: ChecklistItem[];
  removedFindings: { title: string; reason: string }[];
  stats: { topicsCovered: number; topicsTotal: number; findingsTotal: number; quotesMatched: number };
  partial?: boolean;
}
export interface SelectionContext {
  id: string; sourceId: string; sourceRevision: string; text: string;
  page?: number; charStart?: number; charEnd?: number; truncated?: boolean;
}
export interface ChatMessage {
  id: string; role: 'user' | 'assistant'; text: string; createdAt: string;
  contexts?: SelectionContext[]; evidence?: Evidence[]; confidence?: Confidence; confidenceReason?: string;
  sourceComparison?: { sourceId: string; result: 'supports' | 'possible_conflict' | 'not_found'; quote?: string; page?: number }[];
  suggestChecklistItem?: string;
}
export interface SourceInput { id: string; kind: SourceKind; title: string; url?: string; text?: string; fileName?: string; size?: number }
export interface AnalyzeRequest { question: string; sources: SourceInput[]; mode: 'sample' | 'live'; scenarioId?: string; requestId: string; revision: string }
export interface AnalyzeProgress { stage: 'reading' | 'predicting_topics' | 'comparing' | 'checking_quotes' | 'building_checklist' | 'done'; message: string; index: number }
export interface QuestionRequest { analysis: Analysis; question: string; contexts: SelectionContext[]; compare?: boolean }
