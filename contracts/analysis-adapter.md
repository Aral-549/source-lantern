# Contract: sample analysis and future backend adapter

## Purpose

Provide one typed boundary for analysis progress/results and source-scoped questions, with explicit sample/live separation. This contract specifies observable behavior, not a choice of backend host or model.

## Inputs

- A question, ordered source inputs, explicit mode/sample scenario, request ID, source-set revision, and cancellation signal.
- Supported first-build source kinds: URL, PDF, DOCX, TXT/Markdown, and pasted text. TXT/Markdown map to readable text sources.
- A question plus up to five selection contexts for an existing analysis.
- Adapter responses containing source metadata/content, topics, coverage cells, summary citations, findings/evidence, checklist items, removed findings, and progress events.
- Canonical text snapshots and their revisions, with source-wide UTF-16 offsets as specified in `evidence-navigation.md`; parser-native offsets require conversion.

## Outputs

- Typed progress and an analysis result for the named fictional sample scenario.
- Typed sample chat replies, clear unsupported-live responses, and recoverable validation/failure states.
- Validated source/finding references and derived display counts.
- Structured diagnostic events at each implemented pipeline boundary.

## Behavior cases (input -> expected output)

| # | Input | Expected output | Notes |
| --- | --- | --- | --- |
| A01 | Exact named sample scenario | Resolve the prepared fictional sources/results in sample mode | Scenario ID is explicit, not guessed from user text |
| A02 | Custom question/source set sent to sample adapter | Return Live analysis is not connected yet | Never relabel fictional content as a user's source |
| A03 | Sample analysis starts | Emit labelled demo stages: source reading, topic suggestions, comparison, quote checking, checklist, done | Approximate 6-8 seconds; clearly simulated |
| A04 | Cancel during any stage | Stop progress/reply timers and prevent result commit | A cancelled run cannot overwrite another run |
| A05 | Older response arrives after question/source revision changed | Ignore it and preserve current workspace | Match request ID and source-set revision |
| A06 | Fewer than two or more than six source inputs, or blank question | Return validation error before progress | Counts include files/links/pasted sources uniformly |
| A07 | Invalid URL scheme, unsupported type, empty text, file over 20 MiB, or pasted text over 100000 characters | Reject input with reason and recovery guidance | Initial configurable limits; no claim of universal support |
| A08 | User stages an arbitrary URL | Store URL metadata; explain fetching needs backend or pasted content | Browser does not pretend cross-origin fetching succeeded |
| A09 | User stages local PDF or TXT/MD | Allow actual local reader preview when supported | Preview is not extraction/analysis success |
| A10 | User stages DOCX | Show awaiting extraction and offer pasted-text alternative | No raw binary displayed as extracted text |
| A11 | Unknown fields or malformed result | Validate necessary structure/references; surface invalid-response error for unsafe required data | No successful result with dangling source references |
| A12 | Any required evidence quote is absent from the canonical source-text snapshot | Remove the sourced candidate with an inspectable reason | A quote present in canonical text but lacking viewer geometry is retained as a quote card under E17 |
| A13 | Gap has evidence or is labelled Sourced | Reject malformed finding | Gaps are AI suggestions about reviewed text only |
| A14 | Source failed or content was unprocessed | Exclude failed source from reviewed counts and describe unread content | Never count unread charts/images as covered evidence |
| A15 | Sample fixture loaded | 3 reviewed sources, 9 suggested topics, 6 covered topics, 8 retained findings, 2 rejected candidates | Exact fixture totals to be checked against original sample text |
| A16 | Sample finding breakdown | 2 corroborated findings (age and citizenship separately), 1 conflict, 1 outdated, 1 single-source, 3 gaps | 5 sourced findings and 3 AI-suggested gaps |
| A17 | Sample evidence totals shown | 8 accepted evidence records across 5 sourced findings; quote count and finding count have separate labels | Reused quote per finding counts as a separate record |
| A18 | Sample rejected candidates shown | 2 removed findings with missing-quote explanations; no invented quotes in accepted results | 10 candidates = 8 retained + 2 removed |
| A19 | Sample income-document context/question | Reply cites certificate requirement and Form 16/ITR alternative; label possible conflict and explain uncertainty | Never decide eligibility |
| A20 | Sample deadline context/question | Reply distinguishes 2026 official date, undated end-of-November wording, and 2025 blog cycle | No current deadline inferred from the user's clock |
| A21 | Unrecognized question/context | This sample demo has no prepared answer to that question | Unrecognized is not evidence of absence; only fixture-checked missing topics may use not-found wording |
| A22 | Check against other sources | One row per other reviewed source with supports / possible conflict / not found; validate any attached quote | Not-found rows have no fabricated evidence |
| A23 | Named sample stage or reply fails | Show Retry and preserve source inputs | Failure simulation must be explicitly a test/demo state |
| A24 | Valid future live adapter substituted | UI consumes same concepts without ingestion/model code inside presentation components | HTTP schema and auth need review when backend enters scope |
| A25 | Publication date absent | Preserve null/unknown and display currency uncertainty | Do not fabricate a date or assume old content |
| A26 | Trust badge is supplied, inferred, or manually assigned | Preserve that origin as metadata | No factual authenticity guarantee from a hostname guess |
| A27 | Zero sources remain readable | Return source-reading failure with recovery information; no findings, summary, gaps, or coverage result | Do not imply an empty corpus was meaningfully reviewed |
| A28 | Exactly one source remains readable | Return an explicit partial result; cited summary/single-source observations may remain, but corroboration/conflict findings and cross-source chat comparison are suppressed | Any gap wording is scoped to the text of the one reviewed source |
| A29 | Structured summary contains citations | Apply canonical quote-presence and source-revision validation to each sourced summary statement | Unsupported statements are removed or separately identified as AI suggestions |

## Pipeline logging

Each implemented stage emits structured entry/exit/error records with request/analysis/source IDs, source-set revision, mode, stage, input/output references and counts, duration, and status. Quote checks include source/finding IDs, match outcome, and reason codes. Sample stages explicitly record simulation. Diagnostics do not dump uploaded documents, selected passages, full source URLs with query strings, or credentials.

Future Python fetching/extraction/comparison/quote-validation stages must preserve these boundaries and return provenance rather than only an answer string. No backend stage is claimed to exist in this milestone.

## Edge cases that must be covered

- Cancellation at completion, retries after failures, simultaneous chat/run requests, source removal, and stale replies.
- Invalid numeric scores/confidence values, duplicate IDs, nonexistent source/topic/finding references, mismatched source revisions, and empty source text.
- Partial source failures and unavailable storage; object URLs should be released when their files are removed or the workspace unmounts.
- Keep generated fixture counts internally consistent rather than copying illustrative numbers from reference screenshots/spec examples.

## Explicitly out of scope

- Implementing a backend, crawling arbitrary sites, access-control bypass, choosing an LLM, running jeff/GLiFormer, or deploying OCR.
- Semantic truth/entailment guarantees. Quote validation confirms textual presence, not correctness of interpretation.

## Status

- [x] Drafted
- [x] Reviewed by a human -- 31 October 2026; user authorized implementation
- [ ] Implementation matches this contract
- [ ] Golden tests exist for every behavior case above
