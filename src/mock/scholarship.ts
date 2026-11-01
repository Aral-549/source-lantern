import type { Analysis, ChecklistItem, Evidence, Finding, Source, SourceInput, Topic } from '../api/types';
import { validateAnalysis } from '../lib/analysis';
import { locateQuote } from '../lib/locateQuote';
import data from './scholarship-data.json';

export const SAMPLE_SCENARIO_ID = 'nova-merit-2026';
export const SAMPLE_QUESTION = 'What should I verify before applying for the Nova Merit Scholarship?';

const sourceRevision = 'nova-v1';
function makeSources(): Source[] {
  const officialSections = data.officialSections;
  const listingSections = [
    { id: 'listing-eligibility', title: 'Eligibility at a glance', text: 'Applicants must be aged 17-25 and be Indian citizens.\n\nThis listing collects the main application requirements in one place.' },
    { id: 'listing-documents', title: 'Documents to prepare', text: 'Income proof: Form 16 or ITR of parents.\n\nKeep identity and enrollment documents ready for your application.' },
    { id: 'listing-deadline', title: 'Application window', text: 'Applications close at the end of November.\n\nThis fictional listing does not show a publication date.' },
  ];
  const blogSections = [
    { id: 'blog-cycle', title: 'Notes from my application', text: 'For the 2025 application cycle, the deadline was 30 November 2025.\n\nThese notes describe my experience in that earlier cycle, rather than an updated notice for 2026.' },
    { id: 'blog-award', title: 'What I remember', text: 'The amount is INR 50,000. Apply through the portal.\n\nThis fictional post shares a student perspective and does not include a direct application link.' },
  ];
  return [
    { id: 'guidelines', revision: sourceRevision, title: 'Nova Merit Scholarship 2026', shortTitle: 'Official guidelines', kind: 'pdf', domain: 'nova-guidelines.pdf', fileUrl: '/samples/nova-guidelines.pdf', trust: 'official', trustOrigin: 'Fictional sample metadata, not an authenticated organization', publishedAt: '2026-02-02', status: 'ready', canonicalText: officialSections.map((section) => section.text).join('\n\n'), sections: officialSections, hasTextLayer: true, pageCount: 5, unanalyzed: [{ kind: 'image', count: 1, pages: [1] }] },
    { id: 'listing', revision: sourceRevision, title: 'Nova scholarship: eligibility and documents', shortTitle: 'Scholarship listing', kind: 'url', domain: 'scholarship-listing.example', trust: 'unknown', trustOrigin: 'Fictional sample listing; publisher is not authenticated', publishedAt: null, status: 'ready', canonicalText: listingSections.map((section) => section.text).join('\n\n'), sections: listingSections },
    { id: 'blog', revision: sourceRevision, title: 'My Nova scholarship application notes', shortTitle: 'Student application notes', kind: 'url', domain: 'student-notes.example', trust: 'blog', trustOrigin: 'Fictional student blog sample', publishedAt: null, cycleLabel: '2025 application cycle', status: 'ready', canonicalText: blogSections.map((section) => section.text).join('\n\n'), sections: blogSections },
  ];
}

export function sampleSourceInputs(): SourceInput[] {
  return makeSources().map((source) => ({ id: source.id, kind: source.kind, title: source.title, text: source.canonicalText, ...(source.kind === 'pdf' ? { fileName: 'nova-guidelines.pdf' } : { url: `https://${source.domain}/nova` }) }));
}

export function createSampleAnalysis(): Analysis {
  const sources = makeSources();
  const evidence = (sourceId: string, quote: string, sectionId: string, page?: number): Evidence => {
    const source = sources.find((item) => item.id === sourceId)!;
    const location = locateQuote(source.canonicalText, quote);
    return { sourceId, sourceRevision, quote, sectionId, ...(page ? { page } : {}), ...(location ? { charStart: location.start, charEnd: location.end } : {}), quoteMatched: Boolean(location) };
  };
  const age = [evidence('guidelines', 'Applicants must be aged 17-25', 'eligibility', 2), evidence('listing', 'Applicants must be aged 17-25', 'listing-eligibility')];
  const citizenship = [evidence('guidelines', 'be Indian citizens', 'eligibility', 2), evidence('listing', 'be Indian citizens', 'listing-eligibility')];
  const income = [evidence('guidelines', 'Submit an income certificate issued within the last 6 months.', 'documents', 3), evidence('listing', 'Income proof: Form 16 or ITR of parents.', 'listing-documents')];
  const cycle = evidence('blog', 'For the 2025 application cycle, the deadline was 30 November 2025.', 'blog-cycle');
  const ceiling = evidence('guidelines', 'Family income must be below INR 6,00,000.', 'documents', 3);
  const deadline = evidence('guidelines', 'The application deadline is 30 November 2026.', 'deadline', 4);
  const amount = evidence('guidelines', 'The scholarship amount is INR 50,000 per year.', 'deadline', 4);
  const findings: Finding[] = [
    { id: 'income-conflict', type: 'conflict', topicId: 'documents', title: 'Income documents differ between sources', detail: 'The guidelines ask for a recent income certificate. The listing mentions Form 16 or ITR. These may be different requirements; confirm the current document list.', provenance: 'sourced', confidence: 'medium', confidenceReason: 'Two sources use different document names; only one is presented as the official sample.', evidence: income, conflictScore: 0.82 },
    { id: 'renewal-gap', type: 'gap', topicId: 'renewal', title: 'Renewal conditions are not described', detail: 'Not found in the text of 3 sources reviewed. A yearly award does not tell us whether or how it can be renewed.', provenance: 'ai_suggestion', confidence: 'medium', confidenceReason: 'No reviewed text states renewal conditions; unread content may contain additional details.', evidence: [], relatedQuestion: 'Can I keep the scholarship in later years?', whereToCheck: 'Check the latest official renewal policy.' },
    { id: 'application-gap', type: 'gap', topicId: 'application', title: 'The official application link is missing', detail: 'Not found in the text of 3 sources reviewed. The blog mentions a portal without providing a link.', provenance: 'ai_suggestion', confidence: 'medium', confidenceReason: 'No direct official application URL appears in the reviewed text.', evidence: [], relatedQuestion: 'Where do I apply?', whereToCheck: 'Find the application page through the current official scholarship notice.' },
    { id: 'selection-gap', type: 'gap', topicId: 'selection', title: 'Selection process needs a closer look', detail: 'Not found in the text of 3 sources reviewed. The sources do not describe how applications are assessed.', provenance: 'ai_suggestion', confidence: 'low', confidenceReason: 'The expected topic is an AI suggestion rather than a stated requirement.', evidence: [], relatedQuestion: 'How are applicants selected?', whereToCheck: 'Ask the scholarship office for the published selection process.' },
    { id: 'old-cycle', type: 'outdated', topicId: 'deadline', title: 'The student notes refer to an earlier cycle', detail: 'The post explicitly describes a 2025 cycle and deadline. It may not describe the current application window.', provenance: 'sourced', confidence: 'high', confidenceReason: 'The quoted passage explicitly names the 2025 cycle; current applicability is not established.', evidence: [cycle] },
    { id: 'income-limit', type: 'single_source', topicId: 'income', title: 'Income ceiling appears in one source', detail: 'Only the guidelines state the income ceiling. Check its current wording and how family income is defined.', provenance: 'sourced', confidence: 'high', confidenceReason: 'The amount is stated in the guidelines and is not stated in the other reviewed texts.', evidence: [ceiling] },
    { id: 'age', type: 'corroborated', topicId: 'age', title: 'Two sources state the same age range', detail: 'The guidelines and listing both state ages 17-25. Agreement between these sources is not proof of current eligibility.', provenance: 'sourced', confidence: 'high', confidenceReason: 'The same age range appears in two source passages.', evidence: age },
    { id: 'citizenship', type: 'corroborated', topicId: 'eligibility', title: 'Two sources mention Indian citizenship', detail: 'Both the guidelines and listing mention Indian citizenship. Confirm the full eligibility conditions on the current notice.', provenance: 'sourced', confidence: 'high', confidenceReason: 'Both supplied texts contain this condition.', evidence: citizenship },
    { id: 'rejected-quota', type: 'single_source', topicId: 'eligibility', title: 'Claimed a 10 percent reservation quota', detail: 'Candidate discarded by quote checking.', provenance: 'sourced', confidence: 'low', confidenceReason: 'Quote not present.', evidence: [evidence('guidelines', 'A 10 percent reservation quota applies.', 'eligibility', 2)] },
    { id: 'rejected-fee', type: 'single_source', topicId: 'application', title: 'Claimed an application processing fee', detail: 'Candidate discarded by quote checking.', provenance: 'sourced', confidence: 'low', confidenceReason: 'Quote not present.', evidence: [evidence('listing', 'The application processing fee is INR 500.', 'listing-documents')] },
  ];
  const topics: Topic[] = [
    ['eligibility', 'Eligibility'], ['age', 'Age limit'], ['income', 'Income criteria'], ['documents', 'Documents required'], ['deadline', 'Deadline'], ['amount', 'Scholarship amount'], ['application', 'Official application link'], ['renewal', 'Renewal conditions'], ['selection', 'Selection process'],
  ].map(([id, label]) => ({ id, label, aiPredicted: true }));
  const checklist: ChecklistItem[] = [
    { id: 'check-deadline', priority: 'high', text: 'Confirm the current application deadline', why: 'One source describes an earlier application cycle.', findingIds: ['old-cycle'], suggestedCheck: 'Latest official scholarship notice', checked: false },
    { id: 'check-documents', priority: 'high', text: 'Confirm which income documents are accepted', why: 'Income certificate and Form 16 / ITR are named in different sources.', findingIds: ['income-conflict'], suggestedCheck: 'Current official document checklist', checked: false },
    { id: 'check-renewal', priority: 'high', text: 'Ask about renewal conditions', why: 'The reviewed text does not explain future-year eligibility.', findingIds: ['renewal-gap'], suggestedCheck: 'Official renewal policy', checked: false },
    { id: 'check-link', priority: 'high', text: 'Find the official application link', why: 'No direct application URL appears in the reviewed text.', findingIds: ['application-gap'], suggestedCheck: 'Current scholarship notice', checked: false },
    { id: 'check-income', priority: 'medium', text: 'Confirm the income ceiling and its definition', why: 'The threshold appears only in the guidelines.', findingIds: ['income-limit'], suggestedCheck: 'Official eligibility guidance', checked: false },
    { id: 'check-cycle', priority: 'medium', text: 'Check which cycle the blog describes', why: 'Earlier-cycle advice may not apply to this year.', findingIds: ['old-cycle'], checked: false },
    { id: 'check-selection', priority: 'low', text: 'Find the published selection process', why: 'The sources do not explain how applications are assessed.', findingIds: ['selection-gap'], suggestedCheck: 'Scholarship office', checked: false },
    { id: 'check-award', priority: 'low', text: 'Confirm the award and payment schedule', why: 'An annual amount does not describe when payments arrive.', findingIds: [], suggestedCheck: 'Current award terms', checked: false },
  ];
  return validateAnalysis({
    id: SAMPLE_SCENARIO_ID, mode: 'sample', question: SAMPLE_QUESTION, createdAt: '2026-10-31T04:30:00.000Z', sources, topics,
    coverage: topics.flatMap((topic) => sources.map((source) => ({ topicId: topic.id, sourceId: source.id, status: topic.id === 'application' || topic.id === 'renewal' || topic.id === 'selection' ? 'missing' as const : source.id === 'guidelines' ? topic.id === 'documents' ? 'conflict' as const : 'covered' as const : source.id === 'listing' ? ['eligibility', 'age', 'deadline'].includes(topic.id) ? 'covered' as const : topic.id === 'documents' ? 'conflict' as const : 'missing' as const : topic.id === 'deadline' ? 'outdated' as const : topic.id === 'amount' ? 'covered' as const : 'missing' as const }))),
    summary: [
      { text: 'Eligibility: the guidelines and listing both mention ages 17-25 and Indian citizenship.', evidence: [evidence('guidelines', 'Applicants must be aged 17-25 and be Indian citizens.', 'eligibility', 2), evidence('listing', 'Applicants must be aged 17-25 and be Indian citizens.', 'listing-eligibility')] },
      { text: 'Required documents may differ: an income certificate in the guidelines, versus Form 16 or ITR in the listing. Confirm the current list.', evidence: income },
      { text: 'The guidelines give a 30 November 2026 deadline; the student notes describe a 2025 deadline and may be outdated.', evidence: [deadline, cycle] },
      { text: 'The guidelines state an award of INR 50,000 per year. Confirm the current payment terms.', evidence: [amount] },
      { text: 'An income ceiling below INR 6,00,000 appears only in the guidelines.', evidence: [ceiling] },
    ],
    findings, checklist, removedFindings: [], stats: { topicsCovered: 0, topicsTotal: 0, findingsTotal: 0, quotesMatched: 0 },
  });
}
