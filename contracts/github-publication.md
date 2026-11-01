# Contract: Source Lantern GitHub publication

## Purpose

Publish the existing, validated Source Lantern submission source to a public GitHub repository with a submission-ready README and the live Vercel demo link. This contract explicitly excludes adding a backend or publishing credentials.

## Inputs

- Source tree: the validated Next.js Source Lantern frontend in this workspace.
- GitHub account: `Aral-549`, authenticated locally through the GitHub CLI.
- Repository name: `source-lantern`.
- Live demo URL: `https://digital-dark-spot-smoky.vercel.app`.

## Outputs

- Public repository: `https://github.com/Aral-549/source-lantern`.
- A root `README.md` that describes the problem, solution, features, stack, local setup, validation commands, demo-data boundary, and live deployment.
- A first commit on the default branch containing only project source, documentation, and safe configuration templates.

## Behavior cases (input → expected output)

| # | Input | Expected output | Notes |
| --- | --- | --- | --- |
| 1 | Visitor opens the repository page | README names Source Lantern and links to the live demo | Link is public and clickable |
| 2 | Developer follows local setup | `npm install`, `npm run dev`, and validation commands are documented | Node.js requirement is stated |
| 3 | Visitor reads the product description | It describes general source comparison, not a scholarship-only tool | Scholarship content remains labelled as fictional demo data |
| 4 | Source is published | No `.env.local`, bearer token, Vercel metadata, node modules, or build output is tracked | `.env.example` may be tracked with blank values only |
| 5 | Reviewer opens the deployment link from README | It reaches the live Source Lantern application | Deployment URL is not represented as a live Bedrock analysis service |

## Edge cases that must be covered

- The requested `Aral-549/source-lantern` name is already taken or cannot be created.
- Generated OCR and sample assets required for a local run are included without publishing credentials.
- Existing local files that are not intended for publication are excluded before the initial commit.
- README feature claims distinguish the working demo from the future server-side Bedrock adapter.

## Explicitly out of scope

- Publishing, storing, logging, or transmitting `AWS_BEARER_TOKEN_BEDROCK` or any other secret.
- Implementing the Bedrock server adapter, authentication, database, CI, custom domain, or analytics.
- Changing the live Vercel deployment behavior.

## Status

- [x] Drafted
- [x] Reviewed by a human -- 1 November 2026; user approved publication
- [x] Implementation matches this contract
- [ ] Public repository verified
