# Contract: image and scanned-page OCR

## Purpose

Extract real text from images and scanned PDF pages, preserving the original and recognition uncertainty. OCR makes text inspectable; it does not understand the meaning of a chart or prove a finding.

## Inputs

- PNG/JPEG/WebP image files or rendered PDF pages, source/project IDs, revisions, language and cancellation signal.
- Tesseract.js worker assets and model; PDF.js renders PDF pages before OCR.

## Outputs

- Recognized text, confidence, page/word bounding boxes where available, OCR progress and explicit failure states.
- Canonical text snapshots distinguished from human-checked transcription, with provenance to the original page/image.

## Behavior cases (input -> expected output)

| # | Input | Expected output | Notes |
| --- | --- | --- | --- |
| O01 | Upload a supported image | Automatically read the image as part of source preparation; preserve the original | No mock recognized text |
| O02 | Upload a file needing recognition | Automatically lazy-load local worker/model, report real progress and allow cancel | Initial English model; first download clearly described |
| O03 | Recognition succeeds | Display searchable/selectable text beside original, confidence and OCR label | Persist with source/project revision |
| O04 | A scanned PDF has no text layer | Automatically render and recognize those pages, including unopened sources | Tesseract does not directly parse PDFs |
| O05 | A PDF already has selectable text | Automatically reuse native text and recognize image-only pages; avoid a separate OCR action | Avoid needless whole-document OCR |
| O06 | Low-confidence or empty recognition | Explain uncertain/no text; provide retry and manual correction | Do not silently mark analyzed |
| O07 | Cancel or switch projects during recognition | Terminate/ignore old work; do not commit to another project | Release workers/resources |
| O08 | Engine/model download or decoding fails | Recoverable error with retry | No success label or fabricated content |
| O09 | Navigate an OCR citation | Open original image/page and available matching geometry | Quote presence is in OCR output, not a fidelity guarantee |
| O10 | Image contains chart, diagram or table | OCR may expose labels/text; mark visual relationships unassessed | No invented chart interpretation |
| O11 | User corrects extracted text | Create a new text revision and invalidate old evidence locations | Keep original file |
| O12 | Oversized/corrupt/unsupported file | Explicit limits/error before expensive processing | Start with 20 MiB files, per-page rendering limits |
| O13 | Source now has recognized text | Replace blanket text-only warning with accurate per-item processing status | Retain unprocessed visual-content notices |

## Edge cases that must be covered

- Rotation, poor contrast, multilingual input, no text, partial PDF OCR, stale worker callbacks and unavailable storage.
- Never send document bytes to an OCR service; browser-local recognition in this first implementation.
- Structured stage entry/exit/error logs contain IDs/counts/status, not document text or pixels.

## Explicitly out of scope

- Guaranteed accuracy, semantic chart understanding, handwriting guarantees, hosted GPU models and live AI comparison of custom files.

## Status

- [x] Drafted
- [x] Reviewed by a human -- explicit approval, 31 October 2026
- [ ] Implementation matches this contract
- [ ] Golden tests exist for every behavior case above

## User-directed refinement — 31 October 2026

Automatic preparation is authorized by: "dont put a separate option for ocr ... same for pdf and any file thats uploaded". Every supported uploaded source is queued without requiring the reader to be open. Failures expose Retry reading and cancellation; completed files do not expose a separate OCR tool. Preparation is not labelled completed AI analysis while the live analysis adapter is unavailable. Removing a source or switching projects cancels/invalidates obsolete work.
