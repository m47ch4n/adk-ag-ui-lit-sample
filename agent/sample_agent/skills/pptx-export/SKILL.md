---
name: pptx-export
description: >-
  PPTX export procedure using Marp CLI.
  Use when the user wants to download or export their slides as a PowerPoint file.
  Covers the export command, prerequisites, and known limitations.
---

# PPTX Export Guide

## Prerequisites

- Node.js and npm installed on the server
- `@marp-team/marp-cli` installed globally or as a project dependency
- For editable PPTX: LibreOffice Impress must be installed

## Export Command

### Standard PPTX (image-based, high fidelity)
```bash
npx @marp-team/marp-cli input.md --pptx -o output.pptx
```

### Editable PPTX (experimental, requires LibreOffice)
```bash
npx @marp-team/marp-cli input.md --pptx --pptx-editable -o output.pptx
```

## Pre-Export Checklist

Before exporting, verify:
1. Frontmatter has `marp: true`
2. All image URLs are accessible (absolute URLs or local paths)
3. Custom CSS is applied via `style` directive in frontmatter
4. Slide count and content are finalized

## Known Limitations

- Standard PPTX: Slides are PNG screenshots — text is not editable
- Editable PPTX: Experimental feature, visual fidelity may differ from HTML preview
- Editable PPTX: Requires LibreOffice Impress on the server
- Custom fonts may not render correctly in PPTX
- Animated elements are not supported in PPTX output

## Fallback Strategy

If LibreOffice is unavailable, fall back to standard (image-based) PPTX.
Inform the user that the exported file will have high visual fidelity but
text will not be editable in PowerPoint.
