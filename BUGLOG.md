# Bug Log

Every entry must have a permanent case in `tests/golden/` before it can be marked resolved. The entries below were found in draft contracts before application code existed. Their contracts have been corrected; their regression vectors are not yet executable tests, so their statuses remain open. Structured runtime pipeline logs are now implemented. Initial specification entries retain their discovery context.

---

## 2026-11-01 -- Generated sample retained retired branding
- **Symptom:** The Source Lantern workspace displayed a fictional PDF page labelled with the retired product name after the visible app chrome had been renamed.
- **Root cause:** The sample fixture and the PDF generator metadata were independently authored; regenerating an unchanged generator reproduced the old identity.
- **Stage/module:** Sample-fixture to public-PDF generation.
- **Regression case added:** `tests/golden/sample-brand-regressions.json` -- case #BRAND-REG-001.
- **Status:** fixed -- pending independent test pass after asset regeneration.

---

## 2026-10-31 -- Unprepared demo questions implied missing source information

- **Symptom:** The draft fallback said Not found in the sources reviewed for any question without a prepared reply, including an age question whose answer exists in the fixture.
- **Root cause:** The adapter specification conflated missing canned-response coverage with missing source evidence; identified by independent contract review.
- **Stage/module:** Sample question adapter and Ask panel; A21/W27.
- **Regression case added:** `tests/golden/demo-regressions.json` -- case #DEMO-REG-001; checked-gap contrast #DEMO-REG-002.
- **Status:** open -- contract corrected; implementation and executable regression verification pending.

## 2026-10-31 -- Quote normalization could change case-sensitive units

- **Symptom:** Case folding permitted 5 mW to match 5 MW despite the contract requiring changed units to be rejected.
- **Root cause:** Blanket case-insensitive matching conflicted with preservation of source meaning; identified by independent contract review.
- **Stage/module:** Evidence normalization; E02/E05/E31.
- **Regression case added:** `tests/golden/evidence-regressions.json` -- case #EV-REG-001.
- **Status:** open -- contract now preserves case; implementation and executable regression verification pending.

## 2026-10-31 -- Evidence offset coordinate system was ambiguous

- **Symptom:** Different conforming implementations could interpret offsets as page-local, source-wide, Unicode code points, or UTF-16 units and highlight different characters.
- **Root cause:** The draft did not specify offset scope, encoding, or end semantics; identified by independent contract review.
- **Stage/module:** Backend adapter to canonical-text/viewer mapping; E01/E07/E32.
- **Regression case added:** `tests/golden/evidence-regressions.json` -- case #EV-REG-002.
- **Status:** open -- contract now specifies source-wide zero-based UTF-16 half-open ranges; implementation and executable regression verification pending.

## 2026-10-31 -- Viewer alignment failure could remove valid quote cards

- **Symptom:** One draft case removed any quote that could not be located, while another retained canonical-text evidence whose viewer geometry was unavailable.
- **Root cause:** Quote absence and unavailable render geometry shared an ambiguous failure description; identified by both independent reviewers.
- **Stage/module:** Analysis validation and evidence presentation; A12/E16/E17.
- **Regression case added:** `tests/golden/evidence-regressions.json` -- cases #EV-REG-003 and #EV-REG-004.
- **Status:** open -- contract now separates canonical absence from viewer alignment; implementation and executable regression verification pending.

## 2026-10-31 -- Structured summary had no acceptance case

- **Symptom:** The workspace contract could be satisfied by a coverage map and finding cards without displaying the challenge's required structured summary.
- **Root cause:** The summary existed in adapter data but not in observable UI acceptance criteria; identified by independent requirements review.
- **Stage/module:** Overview summary; W39/A29.
- **Regression case added:** `tests/golden/demo-regressions.json` -- case #DEMO-REG-005.
- **Status:** open -- contract now requires a cited summary with uncertainty; implementation and executable regression verification pending.

## 2026-10-31 -- Too few readable sources could produce misleading comparisons

- **Symptom:** The draft excluded failed sources from counts but left undefined whether zero/one-readable-source runs could produce gaps, corroboration, or conflicts.
- **Root cause:** Input source minimums were specified, but post-extraction minimum behavior was not; identified by independent requirements review.
- **Stage/module:** Partial analysis and results presentation; A27/A28/W40/W41.
- **Regression case added:** `tests/golden/demo-regressions.json` -- cases #DEMO-REG-003 and #DEMO-REG-004.
- **Status:** open -- zero readable sources now fail; one source is explicitly partial; implementation and executable regression verification pending.

## 2026-10-31 -- Partial tokens accepted as evidence
- **Symptom:** Truncated amounts, years, units and a word inside nonrenewable matched as source evidence.
- **Root cause:** The locator checked substring presence without token boundaries; independent adversarial tests reproduced it.
- **Stage/module:** Canonical quote matching, locateQuote.
- **Regression case added:** `tests/golden/quote-token-regressions.json` -- TOKEN-REG-001 through 005; `tests/golden/quote-boundary-recovery.json` -- TOKEN-REG-006 through 008.
- **Status:** verified -- independent executable regressions pass.

## 2026-10-31 -- PDF canvas rendered without selectable text
- **Symptom:** Five PDF canvases rendered but every text layer was empty, leaving no highlights or selection.
- **Root cause:** Changing text-layer callback identity restarted React-PDF rendering and cleared the layer after state updates.
- **Stage/module:** PDF reader render lifecycle.
- **Regression case added:** `tests/golden/pdf-render-regressions.json` -- PDF-REG-001.
- **Status:** verified -- browser showed five populated text layers and five highlight rectangles, including a two-line conflict quote, after the stable callback fix.

## 2026-10-31 -- Repeated selection jumped to first occurrence
- **Symptom:** Selecting the second Ready captured the first occurrence offsets.
- **Root cause:** Text-only lookup discarded the actual DOM selection occurrence.
- **Stage/module:** Reader selection to canonical context.
- **Regression case added:** `tests/golden/reader-dom-regressions.json` -- DOM-REG-001 and DOM-REG-002.
- **Status:** verified -- independent forward and backward real-DOM tests pass.

## 2026-10-31 -- Navigation lost the selected source identity
- **Symptom:** Coverage cells could open the first finding source instead of the clicked column; duplicate URLs could create phantom tabs; comparison quotes had no source action.
- **Root cause:** Navigation used candidate IDs or first evidence rather than accepted source-specific evidence; comparison rendering omitted the link.
- **Stage/module:** Workspace source navigation and comparison.
- **Regression case added:** `tests/golden/ui-regressions.json` -- UI-REG-001 through UI-REG-003.
- **Status:** fixed -- independent static review completed; full browser interaction automation is not claimed.

## 2026-10-31 -- Upload errors and stale reads corrupted input state
- **Symptom:** A rejected read could leave the upload form busy; a late read could repopulate a reset workspace.
- **Root cause:** Missing read error cleanup and session/mounted guards.
- **Stage/module:** Local file preview input pipeline.
- **Regression case added:** `tests/golden/ui-regressions.json` -- UI-REG-005 and UI-REG-006.
- **Status:** fixed -- explicit error cleanup and invalidated read sessions independently reviewed.

## 2026-10-31 -- Passage actions and labels overstated capabilities
- **Symptom:** Copy said every finding had evidence, touch toolbar used mouse placement, and Ask on a custom preview silently hid the attached context.
- **Root cause:** UI did not distinguish sourced findings, touch selection geometry, and missing live chat.
- **Stage/module:** Selection toolbar, scope copy, custom preview actions.
- **Regression case added:** `tests/golden/ui-regressions.json` -- UI-REG-004, UI-REG-007 and UI-REG-008.
- **Status:** fixed -- independent static review completed; touch hardware verification is not claimed.

## 2026-10-31 -- Small source text lacked contrast
- **Symptom:** Finding detail and selected source metadata measured below 4.5:1 contrast.
- **Root cause:** Hardcoded pale foreground colors did not meet the reviewed readability constraint.
- **Stage/module:** Workspace text styles.
- **Regression case added:** `tests/golden/accessibility-regressions.json` -- A11Y-REG-001 and A11Y-REG-002.
- **Status:** verified -- independent stylesheet tests and rendered desktop contrast audit pass.

## 2026-10-31 -- Test dataset became product positioning
- **Symptom:** The landing used before-you-apply copy and a scholarship-first primary action for a general information-gap problem.
- **Root cause:** A sample-audience answer was overextended into the overall product theme.
- **Stage/module:** Landing and new-workspace copy.
- **Regression case added:** `tests/golden/product-scope.json` -- SCOPE-REG-001 and SCOPE-REG-002.
- **Status:** verified -- domain-neutral copy and primary workspace action checked in the browser; scholarship remains explicitly fictional sample content.

## 2026-10-31 -- Project session and persistence races
- **Symptom:** Archived sample entry could replace notes; old queued saves could overwrite the final snapshot; overlapping opens could race.
- **Root cause:** Initialization replaced archived records, cleanup bypassed the save queue, and operations lacked a shared lock.
- **Stage/module:** Project manager.
- **Regression case added:** `tests/golden/project-manager-regressions.json` -- MANAGER-REG-001 through MANAGER-REG-005.
- **Status:** verified -- independent regressions pass.

## 2026-10-31 -- Navigation focus and pinned boundaries
- **Symptom:** Escape lost focus or reopened the flyout; reorder controls could silently do nothing across pinned groups.
- **Root cause:** Focus restoration triggered reveal again, and reorder bounds ignored pin priority.
- **Stage/module:** Project rail, search and mobile dock.
- **Regression case added:** `tests/golden/project-control-regressions.json` -- NAV-REG-001 through NAV-REG-007.
- **Status:** verified -- independent regressions pass.

## 2026-10-31 -- Automatic image eligibility
- **Symptom:** An imageUrl-only source stayed queued indefinitely.
- **Root cause:** Eligibility required a redundant fileUrl even though recognition accepts imageUrl.
- **Stage/module:** Automatic source preparation.
- **Regression case added:** `tests/golden/automatic-preparation-regressions.json` -- AUTO-REG-004; lifecycle cases AUTO-REG-001 through AUTO-REG-006.
- **Status:** verified -- independent regressions and real scanned-page browser recognition pass.

## 2026-10-31 -- OCR provenance and resource guards
- **Symptom:** Invalid page provenance and stale callbacks could survive recognition; worker startup preceded input validation; PDF loading-task handling failed.
- **Root cause:** Missing identity/page guards, callback lifetime checks, early decode validation and loading-task promise handling.
- **Stage/module:** OCR and PDF preparation.
- **Regression case added:** `tests/golden/ocr-regressions.json` -- OCR-REG-001 through OCR-REG-009; `tests/golden/ocr-pdf-resource-regressions.json` -- OCR-REG-010.
- **Status:** verified -- independent regressions, real PDF preparation and scanned-page recognition pass.

## 2026-10-31 -- Project record and readability validation
- **Symptom:** Missing project timestamps/source revisions were accepted; typography overrides missed dialogs or affected PDF glyphs.
- **Root cause:** Incomplete record validation and overbroad or missing typography scopes.
- **Stage/module:** Project storage and readability.
- **Regression case added:** `tests/golden/project-validation-regressions.json` -- PROJECT-REG-009 and PROJECT-REG-010; `tests/golden/readability-regressions.json` -- TYPE-REG-001 through TYPE-REG-004.
- **Status:** verified -- independent regressions pass in the 152-test suite.
