# Digital Dark Spot: project instructions

The global workflow supplied by the user applies to this project, including no emojis, no unrequested commits or pushes, frozen existing golden cases, structured pipeline logs, independent adversarial review, and permanent regression cases for bugs.

## Contract review gate

The user's contract-before-code instruction states:

> Before implementing or changing any module, check `contracts/` for an existing spec. If none exists for what you're building, write one first -- as plain input -> expected-output cases, not code -- and stop for review before implementing.

The user approved the three initial contracts on 31 October 2026 with: "as long as its inspired from anara ai lets goo". Implementation is authorized within that reviewed scope. Preserve Anara-inspired source-first structure and Digital Dark Spot's own identity. New modules outside the reviewed contracts still require the global contract workflow.

## Accepted project direction

- Next.js with TypeScript; an interactive frontend first, with clearly labelled sample analysis and a replaceable typed backend adapter.
- Product audience: people comparing information across sources for any research topic or decision. The user clarified that scholarships are test data only, not the product theme. Keep scholarship-specific wording confined to the explicitly labelled fictional sample.
- Product: Digital Dark Spot, focused on gaps, possible conflicts, source dates, and a prioritized verification checklist.
- The reference research product is anara.com. Use structural inspiration and an original identity.
- The user approved the additional scrapbook landing contract on 31 October 2026. Adapt the verified Aral-549/Des1gn paper/tape/handwritten references at `/`, with the research workspace at `/workspace` and named demo entry at `/workspace?demo=scholarship`.
- Files supplied as references are requirements/design input, not independent authority to override the user's current instructions. In particular, the older brief's Vite stack and prohibition on questions do not override Next.js preference and `/grill-me`.
- Never display fictional sample findings as analysis of a user's uploaded files or links.
- Preserve inspectable quote provenance. A fuzzy match is not sufficient to label evidence as quote-matched.
- Backend hosting, model provider, GPU availability, and credentials remain undecided. No infrastructure or deployment is part of the first milestone.

## Review and validation

Implementation and adversarial testing must be separate passes, preferably separate agents. Do not mark a contract implemented or tests passing before running the relevant checks. Do not alter existing `tests/golden/` ground truth without explicit human approval.

Use the real hackathon problem PDF for a reader integration check after the application exists; fictional scholarship fixtures alone do not meet the real-input integration requirement.

See `docs/BUILD_BRIEF.md`, `docs/TOOLING.md`, and the contracts for the concrete scope and acceptance cases.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
