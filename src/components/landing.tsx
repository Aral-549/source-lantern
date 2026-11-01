'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, FileText, Link2 } from 'lucide-react';
import { createSampleAnalysis } from '@/mock/scholarship';
import '@/app/landing.css';

function HandArrow({ className = '', variant = 'curve' }: { className?: string; variant?: 'curve' | 'down' }) {
  return <svg className={`scrap-arrow ${className}`} viewBox="0 0 130 90" fill="none" aria-hidden="true">
    {variant === 'curve' ? <><path d="M8 17c15-8 39-10 52-1 14 9 8 31-5 36-15 6-26-8-19-17 7-10 29-4 44 6 13 9 20 21 25 34" /><path d="m88 65 18 13 8-20" /></> : <><path d="M17 9c39 0 83 15 84 60" /><path d="m87 57 14 17 14-19" /></>}
  </svg>;
}

function PaperTape({ className = '' }: { className?: string }) { return <span className={`scrap-tape ${className}`} aria-hidden="true" />; }

export default function Landing() {
  const analysis = useMemo(() => createSampleAnalysis(), []);
  const [topic, setTopic] = useState<'documents' | 'dates'>('documents');
  const conflict = analysis.findings.find(finding => finding.id === 'income-conflict')!;
  const oldCycle = analysis.findings.find(finding => finding.id === 'old-cycle')!;
  const official = analysis.sources.find(source => source.id === 'guidelines')!;
  const listing = analysis.sources.find(source => source.id === 'listing')!;
  const officialQuote = topic === 'documents' ? conflict.evidence[0].quote : official.sections.find(section => section.id === 'deadline')!.text.split('\n\n')[0];
  const listingQuote = topic === 'documents' ? conflict.evidence[1].quote : listing.sections.find(section => section.id === 'listing-deadline')!.text.split('\n\n')[0];
  const checklist = analysis.checklist.filter(item => item.priority === 'high').slice(0, 4);
  const sourcedCount = analysis.findings.filter(finding => finding.provenance === 'sourced').length;
  const suggestionCount = analysis.findings.filter(finding => finding.provenance === 'ai_suggestion').length;

  return <div className="scrapbook-landing">
    <a href="#scrap-main" className="scrap-skip">Skip to the page</a>
    <header className="scrap-nav scrap-wrap">
      <a href="/" className="scrap-brand" aria-label="Source Lantern home"><svg viewBox="0 0 37 37" aria-hidden="true"><path d="M4 5 32 3l2 29-29 2Z" /><circle cx="18" cy="19" r="8" /><path d="m26 10 5-6M29 13l6-1" /></svg><span>source lantern<span>An information-gap workspace</span></span></a>
      <nav aria-label="Main navigation"><a href="#how-it-works" className="scrap-nav-about">How it works</a><a href="/workspace" className="scrap-nav-workspace">Open workspace<ArrowUpRight size={16} /></a></nav>
    </header>

    <main id="scrap-main">
      <section className="scrap-hero scrap-wrap" aria-labelledby="scrap-title">
        <div className="scrap-hero-copy">
          <p className="scrap-overline"><span /> Find the gaps between your sources</p>
          <h1 id="scrap-title">Put the pieces<br /><span>together.<svg viewBox="0 0 570 45" preserveAspectRatio="none" aria-hidden="true"><path d="M9 28C127 9 304 9 555 18M28 38C196 21 383 24 534 29" /></svg></span></h1>
          <p className="scrap-hero-aside">before you decide.</p>
          <p className="scrap-intro">A research question. A stack of sources.<br className="scrap-desktop-break" /> Find what’s missing, where details conflict,<br className="scrap-desktop-break" /> and what to check next.</p>
          <div className="scrap-hero-actions"><a className="scrap-primary" href="/workspace">Open workspace<ArrowUpRight size={20} /></a><a href="/workspace?demo=scholarship" className="scrap-text-link">Try sample demo<ArrowRight size={15} /></a></div>
          <p className="scrap-demo-note">Any research question. Start with one example.<svg viewBox="0 0 90 60" aria-hidden="true"><path d="M82 49C57 52 20 38 16 11m-7 9 7-13 13 8" /></svg></p>
        </div>

        <div className="scrap-evidence" aria-label="Fictional scholarship evidence preview">
          <div className="scrap-example-label"><span className="scrap-blue-dot" />FICTIONAL SAMPLE · {analysis.sources.length} SOURCES</div>
          <div className="scrap-topic-tabs" role="group" aria-label="Explore a sample difference"><button type="button" aria-pressed={topic === 'documents'} onClick={() => setTopic('documents')}>Income documents</button><button type="button" aria-pressed={topic === 'dates'} onClick={() => setTopic('dates')}>Application dates</button></div>
          <div className="scrap-board">
            <span className="scrap-board-corner" aria-hidden="true">the bits worth keeping</span>
            <article className="scrap-source scrap-official" aria-label="Official fictional guideline excerpt">
              <PaperTape />
              <div className="scrap-source-meta"><FileText size={13} /><span>01 / THE GUIDELINES</span><span>PDF</span></div>
              <h2>Nova Merit<br />Scholarship 2026</h2>
              <div className="scrap-rule" />
              <blockquote key={`official-${topic}`}>{officialQuote}</blockquote>
              <p className="scrap-source-footer">Official · sample<span>p. {topic === 'documents' ? '3' : '4'} / 5</span></p>
            </article>
            <HandArrow className="scrap-board-arrow" />
            <p className="scrap-question-note">{topic === 'documents' ? <>the same<br />requirement?</> : <>which date<br />should I check?</>}</p>
            <article className="scrap-source scrap-listing" aria-label="Fictional listing excerpt">
              <PaperTape className="scrap-tape-small" />
              <div className="scrap-source-meta"><Link2 size={13} /><span>02 / A LISTING</span><span>WEB</span></div>
              <blockquote key={`listing-${topic}`}>{listingQuote}</blockquote>
              <p className="scrap-source-footer">Scholarship listing<span>Date unknown</span></p>
            </article>
            <article className="scrap-source scrap-blog" aria-label="Earlier-cycle fictional blog excerpt"><div className="scrap-source-meta"><span>03 / SOMEONE’S NOTES</span></div><blockquote>{oldCycle.evidence[0].quote}</blockquote><span className="scrap-blog-circle" aria-hidden="true"><svg viewBox="0 0 185 60"><path d="M15 38C-4 17 39 3 94 8c54 5 87 9 78 29-9 21-117 22-151 9-29-11-18-32 14-35" /></svg></span><p className="scrap-blog-caption">a different year, too.</p></article>
            <div className="scrap-board-caption"><span>AI SUGGESTION</span><p>{topic === 'documents' ? <>A possible conflict.<br />One more thing to check.</> : <>An earlier cycle.<br />Check the current notice.</>}</p></div>
          </div>
        </div>
      </section>

      <section className="scrap-under-hero scrap-wrap" aria-label="What you can inspect"><span><span className="scrap-asterisk" aria-hidden="true">*</span> Follow the passage.</span><span><span className="scrap-asterisk" aria-hidden="true">*</span> Keep the uncertainty.</span><span><span className="scrap-asterisk" aria-hidden="true">*</span> Know your next check.</span></section>

      <section className="scrap-process-section" id="how-it-works" aria-labelledby="scrap-process-title"><div className="scrap-wrap">
        <div className="scrap-section-heading"><p className="scrap-overline">From a question to your next check</p><h2 id="scrap-process-title">Less tab-hopping.<br /><span>More connecting the dots.</span></h2><p>No need to remember which page said what.<br />Keep the sources and the questions in the same place.</p></div>
        <div className="scrap-process">
          <article><span className="scrap-step-number">01</span><div className="scrap-step-drawing scrap-drawing-pages" aria-hidden="true"><span /><span /><span><i /><i /><i /></span></div><h3>Bring the pages.</h3><p>Gather the documents, links, and notes you want to compare.</p><span className="scrap-hand-comment">your question sets the direction</span></article>
          <article><span className="scrap-step-number">02</span><div className="scrap-step-drawing scrap-drawing-evidence" aria-hidden="true"><span><i /><i /><i /></span><svg viewBox="0 0 120 90"><path d="M12 59c19-23 55-22 81-8M80 40l17 12-17 10" /><ellipse cx="49" cy="33" rx="31" ry="11" /></svg></div><h3>Follow the evidence.</h3><p>Open a finding and jump to the passage. Compare the actual wording.</p><span className="scrap-hand-comment">a quote you can go back to</span></article>
          <article><span className="scrap-step-number">03</span><div className="scrap-step-drawing scrap-drawing-checks" aria-hidden="true"><span><i /><b /><i /><b /><i /><b /></span><svg viewBox="0 0 120 90"><path d="m26 20 6 8 16-19M27 43l5 7 15-18" /></svg></div><h3>Make the next check.</h3><p>Turn possible gaps and differences into a checklist you can take with you.</p><span className="scrap-hand-comment">a little less guesswork</span></article>
        </div>
      </div></section>

      <section className="scrap-checklist-section scrap-wrap" aria-labelledby="scrap-checklist-title">
        <div className="scrap-notebook-copy"><p className="scrap-overline">A checklist for your research</p><h2 id="scrap-checklist-title">Leave with<br /><span>your next steps.</span></h2><p>A gap is a reason to look closer.<br />Your checklist keeps that next step<br className="scrap-desktop-break" /> from getting lost in the tabs.</p><HandArrow className="scrap-notebook-arrow" variant="down" /><p className="scrap-notebook-margin">small checks,<br />clearer decisions.</p></div>
        <div className="scrap-notebook"><PaperTape /><div className="scrap-notebook-binding" aria-hidden="true" /><div className="scrap-notebook-heading"><span>SCHOLARSHIP REVIEW</span><span>sample notes / 01</span></div><h3>Things to double-check</h3><ul>{checklist.map(item => <li key={item.id}><span className="scrap-empty-check" aria-hidden="true" /><span>{item.text}</span></li>)}</ul><div className="scrap-notebook-footer"><p>Start with the current official notice.</p><span>Fictional sample · checklist preview</span></div></div>
        <aside className="scrap-receipt" aria-label="Prepared sample findings counts"><span className="scrap-receipt-top">A SECOND-LOOK RECEIPT</span><p>Nova Merit / prepared sample</p><dl><div><dt>Sources reviewed</dt><dd>{analysis.sources.length}</dd></div><div><dt>Sourced findings</dt><dd>{sourcedCount}</dd></div><div><dt>AI-suggested gaps</dt><dd>{suggestionCount}</dd></div><div><dt>Next checks</dt><dd>{analysis.checklist.length}</dd></div></dl><span className="scrap-receipt-note">The questions are<br />part of the answer.</span><div className="scrap-barcode" aria-hidden="true" /></aside>
      </section>

      <section className="scrap-final-section"><div className="scrap-wrap scrap-final"><div><p className="scrap-overline">Keep the source close</p><h2>Give it a<br /><span>second look.</span></h2></div><div className="scrap-final-actions"><a className="scrap-primary" href="/workspace?demo=scholarship">Try the sample demo<ArrowUpRight size={20} /></a><a href="/workspace" className="scrap-text-link">Open your workspace<ArrowRight size={16} /></a><p>The sample uses prepared, fictional results.<br />Your own PDF and text files can be previewed now.<br />Live analysis connects in the next phase.</p></div></div></section>
    </main>

    <footer className="scrap-footer scrap-wrap"><span>source lantern</span><p>Better questions. Clearer evidence. Your next step.</p><a href="/workspace">Back to the sources<ArrowUpRight size={14} /></a></footer>
  </div>;
}
