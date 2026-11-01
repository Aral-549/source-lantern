> Scope correction, 31 October 2026: the user clarified that scholarships are fictional test data only. The product serves general research questions. This supersedes student-only positioning in the historical planning below.

# Digital Dark Spot: research scrapbook landing

## Five-line brief

1. Subject and job: help a student understand the source-review workflow and open the workspace before checking scholarship requirements.
2. The move: a research scrapbook connects two real sample quote scraps to a handwritten question, then turns the uncertainty into a notebook checklist.
3. The real thing: exact income-document excerpts from the existing fictional scholarship fixture, its earlier-cycle note, and actual verification actions.
4. Accent source: the workspace's blue annotation ink on warm paper; tape and paper are neutral materials rather than additional brand colors.
5. Type pair: self-hosted Gochi Hand for short handwritten comments, with the existing IBM Plex Sans for body/controls; source excerpts retain the workspace's Source Serif 4 reading face.

## Verified repository reference

The user explicitly requires `Aral-549/Des1gn` as the only reference for text treatment, typography, visual details and motion. The landing implementation follows that constraint. Product-specific Digital Dark Spot copy is original; reference photographs and unrelated branding are not copied.

Local checkout: `C:/Users/h3r0/Downloads/Des1gn`.

Verified Git remote: `https://github.com/Aral-549/Des1gn.git`.

Reference commit: `35cb74ee3bcf8e6b1edfe44058b6a1cf8f25a966`. The checkout has existing changes in `.gitignore` and `README.md`; no files in that repository were edited during this research.

| Reference | Concrete element to adapt |
| --- | --- |
| [Claude scrapbook](https://github.com/Aral-549/Des1gn/blob/35cb74ee3bcf8e6b1edfe44058b6a1cf8f25a966/Designs/claude-scrapbook/index.html) | Gochi Hand comments, clipped tape, torn lower edges, paper scraps rotated a few degrees, notebook checklist and receipt |
| [Claude sketchbook](https://github.com/Aral-549/Des1gn/blob/35cb74ee3bcf8e6b1edfe44058b6a1cf8f25a966/Designs/claude-sketchbook/index.html) | Quiet graphite construction lines, SVG underlines and handwritten labels; readable text stays distinct from illustration |
| [Style atlas: Scrapbook entry](https://github.com/Aral-549/Des1gn/blob/35cb74ee3bcf8e6b1edfe44058b6a1cf8f25a966/Design/style-atlas/index.html#L1010) | Explicitly recommends an evidence board of proof links/screenshots, facts set clearly and comments handwritten; avoid rotated long text and crowding |
| [Undefault lessons](https://github.com/Aral-549/Des1gn/blob/35cb74ee3bcf8e6b1edfe44058b6a1cf8f25a966/Design/undefault/LESSONS.md) | `sketchbook-page`, `marker-underline`, and `handwritten-annotation` moves |

Exact local source paths:

- `C:/Users/h3r0/Downloads/Des1gn/Designs/claude-scrapbook/index.html`
- `C:/Users/h3r0/Downloads/Des1gn/Designs/claude-sketchbook/index.html`
- `C:/Users/h3r0/Downloads/Des1gn/Design/style-atlas/index.html`
- `C:/Users/h3r0/Downloads/Des1gn/Design/undefault/AGENT-RULES.md`
- `C:/Users/h3r0/Downloads/Des1gn/Design/undefault/LESSONS.md`

The two Claude prototypes are self-contained HTML/CSS/SVG; they have no accompanying local raster assets. A related reference screenshot was inspected at `C:/Users/h3r0/Downloads/Des1gn/Design/web-research/sites/juanmnl.com/desk.jpg`: generous white space, handwritten notes, and overlapping pinned photos. The handwritten CTA-arrow reference was inspected at `C:/Users/h3r0/Downloads/Des1gn/Design/web-research/sites/humblytics.com/desk.jpg`. These screenshots are research references, not images to insert into the product.

## Proposed page

- A compact navigation bar with the Digital Dark Spot wordmark and Open workspace.
- A large, readable headline about seeing what sources leave out; one hand-drawn underline and a short handwritten margin note point to the actual example.
- A staggered evidence board: an official-guideline scrap, a listing scrap and an earlier-cycle note. Each is explicitly fictional and uses existing source text.
- A notebook-style verification checklist shows the result of comparing sources. It uses real actions from the existing fixture, not invented accuracy claims or testimonials.
- One short explanation of the source -> evidence -> next-check flow, followed by a repeat workspace CTA and a clear sample/live limitation.

Primary material tokens: paper `#F6F4EE`, graphite `#15171C`, pencil `#4B5059`, neutral tape `#E7DFCE`, rule `#DDD8CE`, annotation blue `#315CCC`. Status language remains explicit. Shadows only imply a sheet floating over another sheet. Body paragraphs remain upright; only short scraps may rotate up to 3 degrees. No flashing impact frames, continuous wobble, sound, custom cursor, required dragging, or seven-family ransom typography from the source prototype.

Use original semantic HTML and small CSS/SVG shapes for tape, torn edges and annotations. Self-host the one added handwriting font. No remote scripts, stock-paper images, portfolio screenshots, or unrelated Claude/Anthropic branding.

## Routes and handoff

- `/`: the proposed landing page.
- `/workspace`: the existing Anara-inspired reader workspace, preserved as a direct entry.
- Open workspace -> `/workspace` without starting an analysis.
- Try scholarship demo -> `/workspace?demo=scholarship`, which runs the named sample exactly once per entry and keeps its fictional-source label.

This is an extension to the approved workspace, not a redesign of its three-pane reader. The user explicitly approved the new landing contract on 31 October 2026; route and UI implementation are authorized.

## Validation after approval

Check semantic navigation with mouse/keyboard, direct route loads, demo cancellation and back/forward behavior, 1440px and 390px layouts, reduced motion, font fallback, and the existing real-PDF reader integration. Run the existing golden tests/build after changing route entry points. Add new regression cases for any bugs found without modifying frozen expectations.

## Status

Drafted from verified local references on 31 October 2026. Human review completed; implementation authorized. The reference-research pass made no route or implementation changes.
