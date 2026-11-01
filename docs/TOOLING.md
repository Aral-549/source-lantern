# Tool choices for a later backend

Reviewed against primary repositories/documentation on 31 October 2026. These are capability-based recommendations, not measured performance comparisons on this project's inputs. None of these services or packages has been installed or integrated yet.

## Proposed minimum stack

**Scrapling for supplied URLs and Docling for structured document extraction**, behind the typed frontend adapter. Preserve original files, canonical text, document item IDs, page numbers, source revisions, and any available geometry so a finding can link back to its evidence.

| Tool | Documented fit | Decision |
| --- | --- | --- |
| [Scrapling](https://github.com/D4Vinci/Scrapling) | Python HTTP/browser fetching, adaptive selectors, crawling, Markdown output; BSD-3-Clause | First web-ingestion candidate. Begin with HTTP, then use rendering when necessary. Base install does not include all browser/fetcher extras. |
| [Docling](https://github.com/docling-project/docling) | PDF, Office formats including DOCX/PPTX/XLSX, HTML/images; OCR/layout and structured output; MIT code, separately licensed models | First document-ingestion candidate. Retain structured JSON alongside Markdown. CPU/GPU options need input-specific testing. |
| [MarkItDown](https://github.com/microsoft/markitdown) | Broad document-to-Markdown conversion aimed at text-analysis use; MIT | Optional format fallback if Docling leaves a concrete gap. Markdown alone is not enough for precise visual source navigation. |
| [jeff](https://github.com/logan-markewich/jeff) | Self-hosted Jev-style choice/score/noul API, MIT | Defer. Consider routing/coarse classification later; do not make it the authority deciding evidence or contradictions. |
| [DeepSeek-OCR](https://github.com/deepseek-ai/DeepSeek-OCR) | Model-based OCR; official examples depend on CUDA/PyTorch and GPU-specific setup | Optional later fallback. No claim that it is universally the fastest PDF parser. |
| [DeepSeek-OCR-2](https://github.com/deepseek-ai/DeepSeek-OCR-2) | Official successor linked by the original project; Apache-2.0 repository | Evaluate only when GPU availability and troublesome real documents are known. |

## Corrections to the pasted tool transcript

- Scrapling is the likely dictated name, rather than Scraply. Its documented anti-bot features do not guarantee every page is accessible. Login-required/blocked pages need clear failures and paste/upload alternatives.
- jeff is a real open-source Jev API implementation, but its README reports weaker reasoning results and unfavorable CPU economics for its measured setup. Those results do not establish performance for this application.
- jeff's README says 400M, while the current [GLiFormer checkpoint card](https://huggingface.co/knowledgator/gliformer-large-v1) describes 575.6M parameters and Apache-2.0 weights. The frontend should not depend on a hardcoded model size.
- DeepSeek-OCR speed claims depend on hardware, batching, document layout, and extraction quality. OCR is unnecessary for already selectable text unless a particular parser fails.
- No single converter establishes support for every format. Announce support only after testing actual inputs and error paths.
- The research workspace reference is [anara.com](https://anara.com/). [anara.ai](https://anara.ai/) describes a separate enterprise software product.

## Citation preservation

Docling's [document reference](https://docling-project.github.io/docling/reference/docling_document/) describes provenance with page numbers, bounding boxes, and character spans. The proposed adapter should preserve that information. This is an implementation recommendation derived from the model, not a guarantee that every extracted item has perfect geometry.

Canonical extraction and displayed content may differ. Preserve source revisions, validate quotes against canonical text, and independently align to the viewer. An exact quote that cannot be highlighted needs an honest quote-card fallback. A missing quote cannot be counted as checked evidence.

## Decisions needed only when live processing starts

- Cloud provider and available RAM/CPU/GPU.
- Hosted model endpoint versus local model serving, credentials, latency budget, and cost limits.
- Real source examples with scanned pages, tables, slides, and conflicting statements.
- Storage/retention expectations for uploaded documents and network access rules for fetching URLs.
- Parser success rate and quote-location quality measured on these examples.

Avoid installing several overlapping crawlers or converters before a concrete missing capability justifies them.
