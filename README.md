# Source Lantern

> See what your sources leave out.

[Open the live demo](https://digital-dark-spot-smoky.vercel.app) · [Try the fictional sample](https://digital-dark-spot-smoky.vercel.app/workspace?demo=scholarship)

Source Lantern is a source-first research workspace for decisions that depend on many documents. It helps people keep evidence together, inspect original passages, notice possible conflicts and information gaps, and turn uncertainty into a prioritized verification checklist.

It is built for any information-heavy workflow: research, policies, applications, compliance, planning, and comparison. The scholarship flow in the demo is fictional sample data only; it is not the product's theme or a real analysis.

## The problem

Important details are often spread across PDFs, links, screenshots, text files, and personal notes. Reading more sources does not necessarily make a decision clearer: dates can be stale, requirements can be incomplete, and two credible-looking sources can disagree.

Source Lantern keeps the source beside the analysis. It is designed to help a user ask better questions, return to the exact supporting passage, and decide what needs human verification next.

## What the demo does

- Organizes source material into separate research projects.
- Accepts PDFs, text, Markdown, DOCX files, images, and links in the workspace.
- Reads PDFs and documents locally, with automatic OCR for uploaded images and scanned pages.
- Displays source text, evidence highlights, findings, coverage, possible conflicts, and gaps in one resizable workspace.
- Lets users navigate from a finding to its source passage and build a verification checklist.
- Exports a research review as Markdown.
- Includes a clearly labelled fictional sample with inspectable quote provenance.
- Works in a responsive, light-mode interface built around warm paper, ink, and cobalt states.

## Product principles

1. **Sources before summaries.** Findings should lead back to the original material.
2. **Signals are not verdicts.** A possible conflict or gap is a prompt to verify, not a claim that a source is false.
3. **Quote provenance matters.** Evidence remains tied to canonical source text and context.
4. **Images are evidence too.** OCR starts automatically for image-based material rather than making it a separate task.
5. **Demo data stays honest.** Fictional findings are never presented as analysis of a user's uploaded files.

## Technology

| Area | Implementation |
| --- | --- |
| App framework | Next.js 16, React, TypeScript |
| Interface | Custom responsive source-reader workspace, Lucide icons, IBM Plex Sans, Source Serif 4 |
| PDF reading | React PDF / PDF.js |
| OCR | Tesseract.js with locally prepared English assets |
| DOCX reading | Mammoth |
| Local persistence | IndexedDB and browser storage |
| Validation | Vitest and TypeScript |
| Hosting | Vercel |

## Run locally

### Requirements

- Node.js 20.9 or later
- npm

### Setup

```bash
git clone https://github.com/Aral-549/source-lantern.git
cd source-lantern
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

`npm install` prepares the sample PDFs and local OCR assets. If needed, regenerate the sample PDFs with:

```bash
npm run samples
```

### Useful routes

| Route | Purpose |
| --- | --- |
| `/` | Source Lantern scrapbook landing page |
| `/workspace` | Empty source-first research workspace |
| `/workspace?demo=scholarship` | Clearly labelled fictional scholarship demo |

## Validate the project

```bash
npm test
npm run typecheck
npm run build
```

The test suite includes quote-provenance behavior, source isolation, upload and document-reading flows, OCR-related behavior, UI accessibility checks, and integration against the supplied real hackathon problem PDF. Existing golden regression cases are frozen.

## Deployment and Bedrock readiness

The frontend is deployed at [digital-dark-spot-smoky.vercel.app](https://digital-dark-spot-smoky.vercel.app).

The Vercel production project is prepared with the following server-only configuration values:

```text
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-haiku-20241022-v1:0
AWS_BEARER_TOKEN_BEDROCK=
```

`AWS_BEARER_TOKEN_BEDROCK` must be entered in Vercel as a secret; it must never be committed, printed, or exposed through a `NEXT_PUBLIC_` variable. The current submission intentionally does not make a Bedrock call yet: it has no server-side Bedrock adapter. The frontend is therefore fully usable as an interactive, source-aware demo, while live analysis of arbitrary custom sources is the next backend milestone.

## Project structure

```text
src/                 Next.js application, workspace components, and client-side adapters
public/              Sample documents and generated runtime assets
contracts/           Reviewed behavior and delivery contracts
tests/               Automated and frozen regression checks
docs/                Problem alignment, tooling notes, validation notes, and deck prompt
scripts/             Sample-PDF and OCR-asset preparation scripts
```

## Design attribution

The visual direction draws on the paper, tape, handwriting, typography, and scrapbook explorations in [Aral-549/Des1gn](https://github.com/Aral-549/Des1gn). The workspace uses an original Source Lantern identity and source-first research layout.

## Hackathon submission

- Project: Source Lantern
- Team: Devengers
- Event: SHINCHAN Online Hackathon 2026
- Live demo: [https://digital-dark-spot-smoky.vercel.app](https://digital-dark-spot-smoky.vercel.app)
- Presentation prompt: [docs/PRESENTATION_PROMPT.md](docs/PRESENTATION_PROMPT.md)

## License

No license has been selected for this submission yet. Add one before reuse outside the hackathon context.
