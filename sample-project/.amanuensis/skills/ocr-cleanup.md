---
id: ocr-cleanup
name: OCR De-Hyphenation & Scan Artifact Recovery
description: Reconstructs words broken by end-of-line hyphens in scanned PDFs and fixes common OCR ligature artifacts.
trigger: always
enabled: true
---

## Skill: OCR Artifact & Hyphenation Recovery
- Join words split across scan line-breaks (e.g., `trans- lation` → `translation`).
- Ignore stray OCR margin noise or isolated page numbers unless part of a heading.
- Preserve footnote markers (`[1]`, `†`, `*`) in their exact syntactic position.
