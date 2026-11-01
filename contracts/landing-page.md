# Contract: scrapbook landing and workspace entry

## Purpose

Introduce Source Lantern through a research scrapbook grounded only in the user's Des1gn repository and direct people into the existing source-review workspace for any research topic. Scholarships are sample data only. Delegate all document rendering, findings, analysis and checklist operation to the already-reviewed workspace modules.

## Inputs

- A visit to `/`, `/workspace`, or `/workspace?demo=scholarship`.
- Prepared fictional scholarship source excerpts and verification actions from the existing sample fixture.
- Keyboard/pointer navigation, viewport size, reduced-motion preference and font availability.
- Existing workspace state and cancellable sample-analysis adapter.

## Outputs

- A readable scrapbook landing with real sample artifacts, handwritten annotations and an original Source Lantern identity.
- Functional direct workspace and sample-demo entry links.
- Existing three-pane workspace behavior preserved at `/workspace`.

## Behavior cases (input -> expected output)

| # | Input | Expected output | Notes |
| --- | --- | --- | --- |
| L01 | Visit `/` | Show the scrapbook landing with clear product purpose, source-review artifacts and workspace CTA | No login or external redirect |
| L02 | Visit `/workspace` directly | Show the existing new-analysis workspace without automatically starting a run | Reader layout and contracts remain applicable |
| L03 | Activate Open workspace | Navigate to `/workspace` using a real semantic link | Keyboard and open-in-new-tab behavior work |
| L04 | Activate Try scholarship demo | Navigate to `/workspace?demo=scholarship` and start the named prepared demo exactly once for that entry | Do not loop on rerender or duplicate effects |
| L05 | Load an unknown `demo` query value | Show the normal workspace with recoverable guidance; do not run an arbitrary scenario | No query text becomes executable content |
| L06 | Cancel a deep-linked sample run | Stop progress and stay in a usable workspace; the same query must not immediately restart it | Existing cancellation contract applies |
| L07 | Landing shows source scraps | Use exact excerpts from the existing fixture, with fictional-sample labels and recognizable source names | Prepared examples are not live research |
| L08 | Landing shows potential conflict or missing information | Keep hedged wording and distinguish quoted facts from handwritten AI suggestions | No verified/true/guaranteed claims |
| L09 | Landing shows a verification checklist preview | Use existing sample verification actions and label the preview | Do not suggest those actions were performed |
| L10 | Landing example counts are displayed | Derive counts from the current sample fixture or omit them | Do not duplicate stale illustrative totals |
| L11 | Desktop layout at 1440px | Show the actual evidence board in the opening section alongside a readable headline and CTA | Decoration supports the product artifacts |
| L12 | Phone layout at 390px or 360px | Reflow scraps into a readable stack; keep controls reachable and avoid horizontal page scroll | Long source text remains upright, body text at least 16px |
| L13 | User navigates with keyboard | Visible focus, semantic heading order, labelled links, and no action that requires dragging or hover | Decorative SVG/tape is hidden from accessibility APIs |
| L14 | Reduced motion is enabled | Show all content immediately without continuous wobble, flashing, custom-cursor motion or drawn-stroke delay | No content depends on animation finishing |
| L15 | Handwriting font is unavailable | Fallback typography leaves all text readable and layout usable | Gochi Hand is self-hosted; no runtime font service required |
| L16 | User opens the workspace after viewing the landing | Retain the calm Anara-inspired three-pane layout and evidence/checklist functionality | Scrapbook decoration does not enter the reader |
| L17 | Browser back/forward changes entry routes | Show the matching page without a stale late sample response replacing a newer workspace session | Existing request/revision guards remain active |
| L18 | Any source-repository example is adapted | Use its paper/tape/annotation moves with Source Lantern content and identity | No unrelated Claude/Anthropic copy, images, marks or remote scripts |
| L19 | Sample PDFs are regenerated or deployed | Visible sample copy and PDF metadata use Source Lantern | Generated public assets must not retain retired product names |

## Edge cases that must be covered

- Repeated CTA activation, React development effect replay, cancelled demo entry, reload and back/forward navigation.
- Existing pane/checklist preferences, absent fonts, long source titles, narrow screens and large text zoom.
- No sample excerpt is presented as a real organization's current application notice; source provenance and uncertainty remain visible.
- Decorative tape, rotated scraps and torn edges must not obscure text, intercept links or clip focus indicators.

## Explicitly out of scope

- Changing the analysis/evidence model, live scraping, backend/model integration, deployment, accounts, collaboration or new document formats.
- Porting every animation or interaction from the reference prototypes; no sound, custom cursor, flashing impact layer or required drag interaction.
- Replacing the existing workspace design with a scrapbook reader.

## Status

- [x] Drafted
- [x] Reviewed by a human -- 31 October 2026; explicit approval of the scrapbook landing contract
- [ ] Implementation matches this contract
- [ ] Golden tests exist for every behavior case above
