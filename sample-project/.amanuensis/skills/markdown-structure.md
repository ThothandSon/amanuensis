---
id: markdown-structure
name: Markdown Tables, Citations & LaTeX Preservation
description: Activates whenever a segment contains GFM tables, academic citations, or mathematical notation.
trigger: markdown_or_math
enabled: true
---

## Skill: Structured Markdown & Formula Preservation
- Preserve pipe `|` column counts in Markdown tables.
- Never translate LaTeX math identifiers inside `$...$` or `$$...$$`.
- Keep bibliographic keys (`[@smith2024]`) untouched.
