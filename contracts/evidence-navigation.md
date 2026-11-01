# Contract: evidence location and passage navigation

## Purpose

Locate quoted evidence in the displayed source without changing what the source says, then connect findings, citations, and user-selected passages to that location. This component does not decide whether a claim is true or two claims are logically contradictory.

## Inputs

- Canonical source text with a stable source ID/revision, optionally split into PDF pages or structured reader blocks.
- An evidence quote, source ID/revision, optional original-text character offsets, page, block ID, and start hint.
- Rendered text-layer spans or reader text nodes with an index map back to canonical text.
- A retained finding ID/category or a user selection inside the active source reader.

### Offset convention

All character offsets are source-wide, zero-based UTF-16 code-unit offsets into the exact `canonicalText` snapshot identified by the source revision. Ranges are half-open: start inclusive, end exclusive. The snapshot is provided explicitly; the frontend does not silently rebuild a different canonical string from PDF spans or raw Markdown. Page/block ranges and viewer text are mapped into that snapshot. Page-local/block-local offsets from a parser must be converted before use. A Python backend using Unicode code-point indices must convert them to this convention at the adapter boundary. Supplementary Unicode characters occupy two UTF-16 code units.

## Outputs

- A located original-text range and available page/geometry, or an explicit missing/ambiguous/unavailable result.
- Status-colored highlight rectangles/marks, citation navigation targets, and selection contexts that retain source provenance.
- Match diagnostics that distinguish quote existence from currently available highlight geometry.

## Behavior cases (input -> expected output)

| # | Input | Expected output | Notes |
| --- | --- | --- | --- |
| E01 | Quote exactly present | Return original half-open text offsets for the matching passage | Use the source revision shown to the user |
| E02 | Whitespace/newline differs | Locate only if the full quote matches after permitted normalization | Preserve case, original offsets, and quoted display |
| E03 | Curly quotes, common ligatures, soft hyphens, or typographic dash equivalents differ | Match after deterministic normalization with an original-offset map | No number/date/unit substitutions |
| E04 | A word wraps as require- followed by a newline and ments | Match requirements and map to the original wrapped span | Do not strip ordinary intra-line hyphens |
| E05 | Quote differs only in a number, year, amount, negation, or unit | Return no exact-normalized match | A 90 percent token overlap is insufficient |
| E06 | A fuzzy candidate resembles the quote | Treat it only as a candidate for review; never count it as quote-matched or highlight it as sourced | Deliberate tightening of reference brief |
| E07 | Valid character offsets point to normalized full quote | Prefer those offsets | Offsets alone are never trusted |
| E08 | Offsets are negative, out of range, reversed, stale, or point to another phrase | Reject offsets and try deterministic quote location in the current source | Do not clamp to unrelated text |
| E09 | Same quote appears repeatedly | Honor valid source/page/block/offset hints; otherwise use first match at or after start hint and disclose repeated occurrence | No match after hint returns no result |
| E10 | Evidence references a page but quote is on a neighboring page | Search hinted page, neighbors, then remaining pages; record actual page | Never claim the hinted page was matched when it was not |
| E11 | PDF quote spans multiple text-layer spans or lines | Draw one overlay rectangle per rendered range fragment; navigate to it | Do not modify PDF text-layer content |
| E12 | Reader quote spans inline emphasis or links | Locate across text nodes and preserve document structure | Rendered/raw Markdown offsets are distinct |
| E13 | PDF zoom changes or page rerenders | Recompute rectangles in the current page coordinate space | No stale geometry |
| E14 | Quote is located but its PDF page has not rendered yet | Navigate/render page, then highlight when geometry exists | Quote match and render state are separate |
| E15 | PDF has no selectable text layer | Show no-selectable-text notice and evidence cards without fabricated geometry | OCR is future backend work |
| E16 | Evidence quote is absent from extracted canonical text | Exclude that sourced finding from accepted results and record why | Summary/chat citations undergo equivalent checks |
| E17 | Quote exists in canonical extraction but cannot be aligned to the viewer | Retain inspectable quote card with Exact phrase not located in document view note; do not invent a highlight | Distinct from absent source evidence |
| E18 | User selects at least 3 characters inside active reader | Show passage toolbar within the target interaction budget of 100ms | Actual budget must be measured in browser |
| E19 | Selection is outside reader, inside an input/dialog/sidebar, or shorter than 3 characters | Show no passage toolbar | Source-reader containment required |
| E20 | Selection crosses multiple PDF pages or reader blocks | Capture selected text and each known location without inventing a single page; use first known location for navigation | Preserve source ID |
| E21 | Selection exceeds 1500 characters | Trim without splitting a Unicode character; visibly label truncation | Context retains original known location |
| E22 | User already has five quote chips | Refuse sixth with a clear limit message; preserve existing chips | No silent replacement |
| E23 | User sends contexts with empty question | Use Explain this passage and tell me what to verify | No submission when both question and context are empty |
| E24 | User clears selection, presses Escape, clicks elsewhere, or scrolls it out of view | Dismiss toolbar without losing already-added chips | Clicking toolbar must not erase context before capture |
| E25 | User selects text across an existing highlight | Preserve native selection and offer passage actions | A drag is not treated as a finding click |
| E26 | Sent selection is shown again in reader | Dotted annotation underline links back to message without hiding finding highlight | Stable source revision required |
| E27 | Touch selection near edge | Keep toolbar in view and away from native selection handles; preserve native context menu | Browser interaction check required |
| E28 | Source is removed/replaced while context or citation exists | Mark context unavailable and prevent navigation into another source | Never reuse a source ID for changed content |
| E29 | Source contains no evidence for an expected topic | Gap is AI suggestion, evidence array empty, no highlight | Absence is scoped to reviewed readable text |
| E30 | Two sources contain the same words but different source IDs | Navigate only within the cited source ID/revision | No corpus-wide fallback masquerading as source evidence |
| E31 | Quote changes case in units/symbols, such as 5 mW versus 5 MW | Reject the changed quote as an exact-normalized match | Case folding is deliberately excluded, even for prose |
| E32 | Quote follows a supplementary Unicode character in canonical text | Return source-wide UTF-16 offsets and highlight the correct original range | Do not apply Python code-point offsets unchanged |

## Edge cases that must be covered

- Empty quote/text, all-whitespace quote, overlapping marks, nonbreaking spaces, currency symbols, punctuation, and repeated phrases.
- Unicode normalization that changes string length; original offsets must remain correct.
- Text present in alt text or an unprocessed chart/table cannot satisfy source-text evidence requirements.
- Cancellation, source revision changes, detached DOM ranges, incomplete page rendering, and selection spanning text outside the reader.
- App state remains usable when a quote cannot be highlighted.

## Explicitly out of scope

- Factual verification, semantic entailment, contradiction reasoning, OCR, document extraction, or choosing which source is authoritative.
- A quote being present does not establish that a finding accurately interprets it; provenance checks and semantic confidence are separate.

## Verification plan

An independent testing pass will add hand-reviewed golden cases for normalization, original offsets, differing numbers/negation, repeated phrases, invalid offsets, and source isolation. Browser checks must exercise real rendered multi-line PDF text and a real external document, in addition to the fictional sample workflow. Existing golden cases must remain frozen.

## Status

- [x] Drafted
- [x] Reviewed by a human -- 31 October 2026; user authorized implementation
- [ ] Implementation matches this contract
- [ ] Golden tests exist for every behavior case above
