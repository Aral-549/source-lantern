# Contract: Source Lantern production deployment

## Purpose

Publish the existing Source Lantern Next.js frontend to Vercel without adding a backend, secrets, accounts, analytics, or data migrations.

## Inputs

- Source tree: the validated Next.js frontend in this repository.
- Hosting account: the already authenticated Vercel account selected by the CLI.
- Production output directory: Vercel's required `.next` build output.

## Outputs

- A Vercel production deployment with a stable public URL.
- A project-scoped deployment configuration that preserves `.next-production` for non-Vercel local production builds.

## Behavior cases (input → expected output)

| # | Input | Expected output | Notes |
|---|---|---|---|
| 1 | Vercel production build | Build emits `.next` and Vercel serves `/` and `/workspace` | No API keys required for the frontend-first milestone |
| 2 | Local production build | Build continues to use `.next-production` | Avoids colliding with development `.next` output |
| 3 | Public visitor opens `/workspace?demo=scholarship` | Labelled fictional sample renders with no secret or backend request | Sample remains clearly fictional |
| 4 | Hosting build fails | No failed deployment is presented as the submission URL | Inspect logs before retrying |
| 5 | Bedrock integration is prepared | Production configuration contains region and model ID; bearer-token slot contains no value until the user adds it | No secret is committed, logged, or client-exposed |

## Edge cases that must be covered

- Vercel's expected output directory differs from the local production directory.
- The source tree has no database, migration, environment variable, or API key requirement until its server-side Bedrock adapter is implemented.
- The generated OCR and sample-PDF assets are available in the deployed public bundle.

## Explicitly out of scope

- Custom domain setup, Git hosting, CI, backend deployment, analytics, authentication, telemetry, and paid Vercel features.
- Storing or transmitting an actual Bedrock bearer token.

## Status

- [x] Drafted
- [x] Reviewed by a human -- 1 November 2026; user requested production deployment
- [x] Implementation matches this contract
- [x] Production smoke test complete -- 1 November 2026; `/` and `/workspace?demo=scholarship` returned HTTP 200 with Source Lantern content
