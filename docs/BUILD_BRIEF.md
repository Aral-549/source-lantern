> Scope correction, 31 October 2026: the user clarified that scholarships are fictional test data only. The product serves general research questions. This supersedes student-only positioning in the historical planning below.

# Digital Dark Spot: first frontend

## Decisions confirmed by the user

- Build an interactive frontend with clearly labelled sample analysis first; prepare a backend connection.
- Optimize the first demonstration for students checking scholarship or application requirements.
- Prefer Next.js; the backend/cloud details will follow later.
- Use the attached files as context and inspect the proposed tools.
- Pressure-test the product decisions through questions, as requested by `/grill-me`.

No installed skill or command named `grill-me` was found in the local skill/command locations checked. The interview is being conducted directly.

## Five-line design brief

1. Subject and job: help a student compare scholarship requirements and decide what to verify before applying.
2. The move: each finding opens its exact source passage; selecting a passage carries it into a source-scoped question.
3. The real thing: readable documents, conflicting income-document requirements, a missing renewal policy, and an actionable checklist.
4. Accent source: blue annotation ink from reviewing documents; status colors express named finding categories.
5. Type pair: IBM Plex Sans for compact controls and labels, Source Serif 4 for sustained source reading.

## Visual direction

A light, three-pane research workspace. The source document takes the central area; findings and the checklist remain beside it. The signature interaction is the connection between finding and passage, not decoration or a large landing-page hero.

| Token | Proposed value | Purpose |
| --- | --- | --- |
| Canvas | #F6F7F9 | Workspace behind documents |
| Paper | #FFFFFF | Reader and panels |
| Ink | #20252C | Primary text |
| Muted ink | #586271 | Supporting text |
| Rule | #DDE2E8 | Panel boundaries |
| Annotation blue | #315CCC | Active controls and selected evidence |

Use near-square panels, 4px controls, and pills only for tags/filters. No panel shadows; restrained shadows only for floating menus or dialogs. Finding categories use text and icons as well as color. Final color pairs must pass contrast checks; this palette is a proposal, not a claim that testing has passed.

The supplied UI prompt is a reference rather than an existing project design system. Retain its light workspace, serif reader, and citation interactions; adapt its Vite stack to Next.js and its rounded indigo treatment to the global design preferences. The required Undefault rules were found at `C:/Users/h3r0/Downloads/Des1gn/Design/undefault/AGENT-RULES.md`, rather than the stale double-Des1gn path. The lesson `configurator-hero` informs showing the working artifact itself; no marketing hero or decorative 3D kit is needed for this application.

## First user journey

1. Open the new-analysis screen and choose the clearly labelled fictional scholarship demo.
2. Watch cancellable sample progress; the UI explains that it is demonstrating prepared results.
3. Read the sample guidelines in the center. Inspect a finding and jump to the supporting passage.
4. Compare conflicting income-document quotes with source dates visible.
5. Select a passage, ask about it, and inspect cited sample replies.
6. Add verification actions to a checklist, check items off, and export Markdown.

Users may stage their own source inputs and preview supported local content. The frontend must explicitly explain when extraction or live analysis needs the future backend. Custom sources never inherit the sample analysis.

Unprepared sample chat questions receive an explicit no-prepared-answer response. Only checked missing topics receive a not-found response. A zero-readable-source run is a failure, and a one-readable-source result is partial rather than a comparison.

## Implementation shape after contract review

- Next.js App Router, React, TypeScript, CSS variables and Tailwind where useful.
- Client workspace boundary for browser selection, PDF rendering, local storage, and interactive state.
- Radix primitives for accessible dialogs/popovers, Lucide icons, Zustand for workspace state.
- React-PDF/PDF.js with text layer and geometric highlight overlays; React Markdown for extracted text.
- Self-hosted font packages. No runtime dependency on third-party font loading.
- A typed client adapter separates sample responses from future Python HTTP responses.
- Vitest for meaningful core golden cases; browser integration checks against a real document and the sample workflow.
- Select and lock compatible package versions at scaffolding time using the current official documentation. No packages are installed yet.

## Build sequence

Reviewed packet: [workspace behavior](../contracts/frontend-workspace.md), [evidence and selection](../contracts/evidence-navigation.md), and [sample/backend boundary](../contracts/analysis-adapter.md). The user authorized implementation on 31 October 2026, retaining Anara-inspired workspace structure.

1. Human review of the three contracts.
2. App shell, tokens, responsive navigation, and sample source fixtures.
3. Reader, evidence location, highlights, and bidirectional navigation.
4. Findings, conflict comparison, checklist, and coverage overview.
5. Selection-to-question interaction and typed sample adapter.
6. Input staging, progress/cancellation/failure states, exports, and accessibility.
7. Separate adversarial pass, golden cases, real-document integration, production build, and browser checks.

Each milestone must be concrete and checked in the browser. No feature is declared complete solely because its controls are present.

Independent reviewers checked the draft contracts before implementation. The identified specification defects and planned regression cases are recorded in `BUGLOG.md`; they remain open until application behavior is implemented and executable tests pass. No runtime or production-build verification has occurred yet.

## Scope limits

The first milestone does not include accounts, a marketing landing page, live crawling, real AI analysis, automatic web research, collaboration, deployment, GPU OCR, or support for every document format. Backend extension points are part of the contract; backend operation is not.

## Hackathon context

The announcement states a deadline of **1 November 2026, 5:00 PM IST**, with submissions through Unstop. Required submission metadata: project title, description, and an accessible GitHub repository. Deployment, video, and slides are optional. This is context, not authorization to commit, push, or submit.

The linked official problem statement calls for information gaps, possible contradictions with references, outdated/undated warnings, a structured summary, and a prioritized verification checklist. A generic chatbot or summary alone does not satisfy it. It permits real sources or clearly identified sample sources for the demonstration.

The official rubric totals 10 marks: working core workflow 2.5; innovation 2; problem relevance 1.5; technical quality/reliability 1.5; evidence/accuracy/transparency 1.5; presentation/demo 1.

## Reference provenance

- Announcement: `[1030, 905 AM] null   SHINCHAN ONLINE HACKATHON 2026.txt`, supplied from the Unigram documents directory.
- UI reference: `digital-dark-spot-workspace-ui-prompt.md`, supplied from the same directory.
- Tool transcript: `C:/Users/h3r0/.codex/attachments/d228f077-b14b-4aa5-a853-1b2b1c83c3b6/Pasted text.txt`. Treat tool claims as unverified until checked against their primary repositories.
- [Official problem PDF](https://drive.google.com/file/d/1CoAB4CU5eH61WN9QCoFRtkV8QgwbaOZo/view), read during requirements review.
- [Anara research workspace](https://anara.com/) and [official interface documentation](https://docs.anara.com/).
- [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation).

## Open decisions

- Human review completed on 31 October 2026; implementation is authorized.
- Backend provider, CPU/GPU resources, model endpoint, privacy requirements, and deployment target will be decided when live analysis enters scope.
- The first audience and sample-first scope are confirmed; no further design-style questionnaire is needed to begin implementation after contract review.
