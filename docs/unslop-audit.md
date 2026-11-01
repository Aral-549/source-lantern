# Unslop pass

## Direction

- Product: a general workspace for finding information gaps, possible conflicts and date uncertainty across supplied sources.
- Character: inquisitive, tactile, exact.
- World: a research desk with source scraps, annotations and a verification notebook.
- Content moment: two exact fictional source quotes with a handwritten question connecting them.
- Signature: blue annotation ink connects a source passage to the next check.

The sole visual/text reference is the user's Des1gn repository. The user explicitly approved the scrapbook direction; no additional style approval was needed. The locally created `unslop` skill adapts the ordered review workflow of [unslop by Damir Sokolovsky](https://github.com/heydamir/unslop), CC BY 4.0, and the existing `unslop-ui` scanner by Carter Johnson.

## Findings and changes

| Pass | Applied result |
| --- | --- |
| Spacing | Full workspace proportions; grouped reader controls and panel actions; landing text and evidence board use separate readable regions |
| Color | Neutral app chrome, warm-paper landing, blue annotation accent; pale text corrected after actual contrast measurements |
| Icons | Existing Lucide family; no emoji UI; decorative paper annotations hidden from accessibility APIs |
| Copy | General information-gap purpose; scholarship-specific wording confined to labelled sample; unsupported live-analysis claims avoided |
| Type | Des1gn's Gochi Hand treatment, IBM Plex Sans controls and Source Serif 4 excerpts; small workspace text enlarged |
| Layout | Paper evidence board in the landing, source-first three-pane reader in the app; phone navigation uses one pane at a time |
| Details | Focus rings, dialogs, loading/error states, explicit custom-source limitations, working download and checklist state |
| Visuals | Exact sample quotes and actual checklist items, not invented accuracy metrics or testimonials |
| Motion | Short feedback and state transitions; no continuous decorative wobble, scroll hijacking or sound; reduced motion respected |

The bundled scanner examined 18 source files and reported no detected patterns. This is a regex diagnostic, not proof of design quality. Browser review separately checked desktop landing/reader, 390px landing/findings/checklist, sample topic switching, demo route entry, checklist progress, and a real Markdown download. Touch hardware behavior and every UI regression vector have not been exhaustively automated.
