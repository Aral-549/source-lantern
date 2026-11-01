# PPT prompt: Source Lantern

Copy the prompt below into a deck-generation tool. Attach the listed project-owned visual files with it.

```text
Create a polished 9-slide hackathon submission deck for “Source Lantern”.

Source Lantern is a light-mode, source-first research workspace that helps people compare documents, surface possible conflicts and missing information, inspect quote provenance, and leave with a prioritized verification checklist. It is built for any information-heavy decision; scholarships are only a clearly labelled fictional demo dataset.

Audience: hackathon judges. Tone: clear, credible, human, and evidence-first. Do not claim that AI proves truth. Use “signals”, “possible conflict”, “what to verify”, and “reviewed text”. State that the current submission is a frontend-first milestone: prepared demo analysis is real UI behavior, while live analysis for custom files awaits a backend adapter.

Visual direction:
- Light mode only. Use warm paper #faf8f3, ink #14161f, white panels, and cobalt #1f23c4 for active states and primary actions.
- Typography: IBM Plex Sans for UI/body, Source Serif 4 only for source-document excerpts. Large regular-weight headings; body copy at least 16px.
- Square or 2–4px control corners. No dark mode, violet gradients, glass cards, neon, generic AI brain art, or stock-photo people.
- Use a slim source-reader / analysis-panel layout as a recurring visual motif. Keep lots of white space and one visual idea per slide.

Attached image references and how to use them:
1. docs/screenshots/workspace-refined.jpg — use on slides 3 and 6 as the product proof. It is an earlier structural screenshot: replace the visible old name with “Source Lantern” if it appears.
2. public/samples/nova-guidelines.pdf — render page 3 or crop its highlighted text as an evidence-document visual on slides 2 and 5. Label it “Fictional sample data”.
3. docs/screenshots/anara-structure-home.jpg — reference only for dense three-pane composition; never place it in the deck and never use Anara branding or copy.

Slides:
1. Title — “Source Lantern” with the line “See what your sources leave out.” Include a small abstract paper-lantern/source-card motif, not a lightbulb stock icon. Add “SHINCHAN Online Hackathon 2026” and team placeholder “Devengers”.
2. The problem — “Important decisions are buried across fragmented, inconsistent documents.” Show 3 overlapping document snippets: an official note, a listing, and personal notes. Call out: conflicting details, missing information, stale advice, and unreadable images/scans.
3. The solution — full-width Source Lantern workspace screenshot. Annotate only three regions: “Keep sources together”, “Read evidence in context”, “Turn uncertainty into checks”.
4. How it works — 4-step horizontal flow: Add files and URLs → Read PDF, image and document text automatically → Compare source claims with quote provenance → Act on a prioritized checklist. Include OCR as part of automatic reading, not a separate user step.
5. What the product surfaces — use a clean table or three cards: Possible conflict, Information gap, Potentially outdated detail. Pair each with a short, cautious evidence example from the fictional scholarship source PDF. Add a small note: “Signals from reviewed text, not final answers.”
6. Live product walkthrough — use the workspace screenshot and show the interaction sequence: select a source passage → open cited finding → inspect matching quote → add a verification action. Include resizable reader and chat panels as an interaction detail.
7. Why it is credible — explain explicit sample labelling, strict quote matching against canonical source text, citations with source/page context, automatic OCR for images and scanned PDFs, and no fabricated results for a user’s custom documents. Present as an evidence/provenance diagram, not a text wall.
8. Build and readiness — concise architecture: Next.js + TypeScript frontend; local PDF/document/image reading; PDF.js; Tesseract OCR; IndexedDB project workspace; typed backend boundary ready for live analysis. Add “153 automated tests passing” and “Production build passes”. Use small technical labels, no logos except optional Next.js mark.
9. Closing — “Better questions. Clearer evidence. Your next step.” Show a paper checklist becoming a clean source map. Add the deployment URL placeholder: [paste Vercel URL here]. Include a small “Try the fictional demo” CTA.

Output requirements:
- Deliver editable PPTX or Google Slides.
- Use 16:9 format.
- Keep each slide to one headline, one evidence-backed point, and one dominant visual.
- Add brief speaker notes for each slide, suitable for a 4–5 minute demo.
- Preserve the fictional-data disclaimer wherever the scholarship sample appears.
```
