# Contract: frontend workspace



## Purpose



Present a researcher's selected sources alongside inspectable potential findings and next verification actions for any topic. Scholarships are one fictional test dataset, not the application theme. Delegate evidence matching to `evidence-navigation.md` and analysis responses to `analysis-adapter.md`.



## Inputs



- A research question and 2-6 staged source inputs, with one source consuming one slot.

- A labelled fictional Nova Merit Scholarship 2026 analysis returned by the sample adapter.

- User actions: opening sources, filters, selections, checklist changes, questions, exports, pane resizing, and cancellation.

- Viewport width, reduced-motion preference, and optional stored pane sizes/checklist state.



## Outputs



- An accessible light workspace matching the structure of the user's opened Anara reference, with source navigation, center reader/overview, and Findings / Checklist / Ask panel.

- Explicit sample labels, per-finding provenance and confidence reasons, evidence links, and clearly scoped coverage.

- Downloadable report/checklist Markdown and a clipboard action with a fallback when clipboard access fails.

- User input previews without invented live analysis.



## Behavior cases (input -> expected output)



| # | Input | Expected output | Notes |

| --- | --- | --- | --- |

| W01 | First visit | New-analysis view with question input, source staging, and Try sample demo | No login or marketing page |

| W02 | Try sample demo | Populate the fictional scholarship question and three sample sources; show cancellable staged demo progress | Resolve the reference brief's contradictory instant/staged behavior in favor of staged |

| W03 | Sample progress finishes | Open the source with the most retained findings; keep Overview pinned; open Ask on the right | Ties use source input order; user's Anara reset makes chat the initial assistant view |

| W04 | Sample results visible | Persistent Sample demo: fictional sources for illustration label | Reports and sample replies retain the label |

| W05 | User opens a source | One center tab for that source, with title/type/date/origin metadata and actual readable content | Existing tab is reused |

| W06 | User closes an open source tab | Another open tab or Overview becomes active; source remains in the source list | Overview cannot be closed |

| W07 | User adds sources | Accept HTTP(S) links, PDF/DOCX/TXT/MD files, and pasted text within documented limits | PPTX and other future types are not advertised as working |

| W08 | Empty question, fewer than two sources, more than six sources, or invalid input | Explain the validation issue next to its control and prevent a valid-looking request | Errors have text, not color alone |

| W09 | Valid custom inputs in sample mode | Preview supported input; explain Live analysis is not connected yet | Never substitute sample findings for custom sources |

| W10 | User changes the question or source set after sample analysis | Invalidate association with the old results; clearly require sample reset or a future live run | Do not leave stale results labelled as current |

| W11 | Source could not be extracted | Show reason plus Paste text instead / Upload file recovery actions | A failed source is excluded from reviewed-source counts |

| W12 | Finding selected | Expand/select card and navigate to the corresponding source passage | Multi-source findings expose a source chooser |

| W13 | Highlight clicked without selecting text | Select and reveal its finding in Findings | A real text selection uses the selection toolbar instead |

| W14 | Gap finding opened | Show AI suggestion, relevant question/topic, and Not found in the text of N sources reviewed | No manufactured quote or highlight |

| W15 | A source has unread images/tables/charts/pages | Show exactly which content was not analyzed; offer manual-check action | Missing information may be in unread content |

| W16 | User opens conflict comparison | Show both quotes, origins, dates, differing values, and explanation labelled AI suggestion | No source is declared the winner |

| W17 | A conflict score exists | Show it as a signal, not proof, with its scale/reason | Omit the meter if absent; do not invent precision |

| W18 | Filter category with zero findings | Show category-specific empty state and an obvious clear-filter action | Counts derive from actual retained findings |

| W19 | User marks a finding reviewed | Preserve it visibly as reviewed | Do not silently delete evidence |

| W20 | User adds the same finding action to checklist twice | Reuse the existing action and notify the user | Stable finding/action identity prevents duplicates |

| W21 | User checks checklist items | Update grouped priorities, progress, and persisted checks for this analysis | Different analyses do not inherit checks |

| W22 | User exports or copies checklist/report | Produce actual text/Markdown with question, sample label, source references, scope limits, and current checks | Provide manual-copy fallback on failure |

| W23 | Overview coverage is shown | Show 6 of 9 suggested topics covered for the sample; label expected topics AI suggestion | Coverage is not a probability that the answer is correct |

| W24 | User selects a coverage cell | Navigate to its evidence or relevant gap card | No navigation target may be invented |

| W25 | User selects a passage and chooses Ask about this | Capture context, show a removable quote chip, open Ask, focus composer | Matching/selection limits are defined separately |

| W26 | User sends a question with selected context | Show context above the user message and citations on sourced portions of sample reply | Analysis workflow remains primary |

| W27 | Question is outside prepared sample replies | Say This sample demo has no prepared answer to that question | Reserve not-found wording for fixture-checked gaps; unprepared does not mean absent |

| W28 | User chooses Check against other sources | Return one sample comparison row per other reviewed source, with citations only where quotes exist | No citation on a not-found row |

| W29 | User resizes/collapses panes | Preserve usable minimum widths; remember sizes where storage is available | Keyboard-operable resize controls |

| W30 | Viewport 1024-1279px | Collapse sidebar to labelled/tooltip icon rail and narrow assistant pane | Reader stays usable |

| W31 | Viewport below 1024px | Drawer for sidebar; bottom Sources / Reader / Findings / Checklist / Ask navigation | One primary pane visible at a time |

| W32 | Viewport 360px or 390px | No horizontal page scroll; source tables/compare columns may scroll within their own container | Readable text, reachable controls |

| W33 | User navigates with keyboard | Visible focus; labelled icon buttons; Escape closes overlays; finding navigation and Alt+A work | Dialogs trap and restore focus |

| W34 | Reduced motion is enabled | Remove highlight pulse/animated progress transitions without losing status feedback | State changes remain clear |

| W35 | Local storage is unavailable or corrupted | Fall back safely to usable defaults and in-memory checklist state | No startup crash |

| W36 | Library or Search is exposed | List/filter actual loaded sources or search their available text | Do not ship dead navigation or fabricated history |

| W37 | A source trust tier is unknown or inferred | Distinguish supplied/inferred metadata from an independently authenticated official origin | Badge does not imply factual correctness |

| W38 | A source has no date | Show Date unknown; suggest checking currency | Undated does not mean proven outdated |

| W39 | Completed sample Overview opened | Render a structured What the sources say summary of eligibility, required documents, deadline, and amount, with clickable evidence citations and explicit uncertainty where sources differ | Summary is distinct from the coverage map and findings list |

| W40 | No sources remain readable after failures | Show source-reading failure and recovery actions, with no summary, findings, gaps, or coverage score | No not-found claim about zero reviewed sources |

| W41 | Only one source remains readable | Show partial analysis scoped to one source; allow cited summary/single-source observations; suppress corroborated and conflict findings | Coverage is labelled partial; no cross-source comparison is claimed |



## Edge cases that must be covered



- Empty results, long titles/quotes, overlapping findings, duplicate URLs, source removal, and switching analyses with a reply in flight.

- Markdown containing HTML, scripts, unsafe links, or external images. Do not execute raw HTML or automatically treat image alt text as evidence.

- PDF loading/render errors, inaccessible originals, clipboard/download errors, and denied storage.

- At least one multi-line PDF highlight, image-only PDF notice, and unanalyzed-image notice in the sample.

- Every source-derived finding and summary citation obeys the evidence contract; no UI text declares claims verified or true.



## Explicitly out of scope



- Live ingestion/AI calls, backend infrastructure, arbitrary file-format support, accounts, collaboration, web search, deployment, or multilingual UI.

- A UI prototype does not guarantee future parser/model quality.



## Status



- [x] Drafted

- [x] Reviewed by a human -- 31 October 2026; user authorized implementation with Anara-inspired workspace structure

- [ ] Implementation matches this contract

- [ ] Golden tests exist for every behavior case above



## Interaction refinements requested by the user — 31 October 2026

The user's subsequent instruction to copy Anara's UI supersedes the decorative workspace presentation: neutral surfaces, compact single-line project/file navigation, flat document tabs and an adjacent chat panel. Existing finding filters, source provenance, local project persistence and automatic reading remain available. Long names truncate in navigation with their full title accessible; source metadata remains inspectable. Minimum control text remains 16 CSS pixels with regular weight to match the requested reference. The landing page remains under its separate contract.

Clarification: copy the UI structure, not Anara's product. Home exposes upload, note, library and chat actions; Library renders the actual project's files in the center pane and opens a selected file in its reader. Chat remains adjacent on desktop. Custom-source chat shows its unavailable backend state with a disabled composer; it never fabricates answers. The user's 1024-1279px layout now retains compact labelled navigation where space permits, matching the reference; mobile continues using the drawer and dock.

Motion integration: the workspace adapts the user's supplied interaction references without copying their brand assets. Project and file navigation settle on selection; the current-files folder opens its visible sheets on hover/focus; upload paper enters a tray with actual preparation progress; reading/saving dots run only during actual work; the chat monitor runs only while a prepared reply is in flight; the finding selector opens from its trigger; the mobile dock expands from its Tools control. Motion is limited to feedback for an actual state change, lasts 120–650ms except active work indicators, and the reduced-motion preference removes decorative motion while preserving all status text.



The current-files folder shows the actual active project source count/names, opens its library, and reveals paper previews on hover or keyboard focus. Removing an uploaded source removes it from canonical state/counts and animates an inert outgoing row folding away; remaining rows close the space. The action is also reachable by keyboard/touch; reduced motion removes the fold. Busy sidebar dots reflect actual source preparation or pending local saves only. No fabricated teammates or events are introduced.


The user requested a compact category dropdown instead of the wrapped filter grid. The menu preserves actual category counts and empty states; Arrow keys, Home/End and Escape work and focus returns to its trigger. Uploads show a paper sheet entering a folder, real file-reading progress where measurable, and a completion receipt after reading. No fabricated transfer rate/progress is introduced; receipt animation never delays processing.

## Visual-system refinement — 1 November 2026

The desktop workspace uses a Des1gn-derived two-colour system: a tinted charcoal application ground, warm off-white reading text, and cobalt only for the current selection, primary action or keyboard focus. Source material remains visually distinct as a warm paper document inside the dark reader stage. Pane separators are visible, have a generously sized pointer target, work by pointer drag and keyboard arrows, and preserve the existing safe size limits. Small motion communicates selection, menu opening, file preparation and reply arrival only; reduced-motion keeps the same states without travel.

## Source Lantern light-mode refinement — 1 November 2026

The product name is Source Lantern. The workspace uses light mode only: warm paper ground (`#faf8f3`), dark ink (`#14161f`), cobalt (`#1f23c4`) for the current selection and primary action, and no dark application shell or theme toggle. Source documents remain their original appearance. Pane resizing, keyboard access, compact navigation, automatic local reading and motion behavior remain unchanged.
