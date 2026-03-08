---
name: marp-design
description: >-
  Marp Markdown syntax and slide design best practices.
  Use when generating or editing slide content in Marp format.
  Covers directives, layout patterns, color schemes, and typography.
  See references/directives.md for detailed directive reference.
---

# Marp Design Guide

## Basic Structure

Every Marp deck starts with a YAML frontmatter:

```markdown
---
marp: true
theme: default
paginate: true
---
```

Slides are separated by `---` on its own line.

## Layout Patterns

### Title Slide
```markdown
---
marp: true
theme: default
---

# Presentation Title
## Subtitle or Author Name

A brief tagline or date
```

### Content Slide with Bullets
```markdown
## Slide Title

- First point — keep it short
- Second point — one idea per bullet
- Third point — three is ideal
```

### Code Slide
Use fenced code blocks. Marp renders them with syntax highlighting:
````markdown
## Implementation

```python
def hello():
    return "world"
```
````

### Image Slides
```markdown
![bg right:40%](image-url)

## Topic

Content beside the image
```

### Split Layout
```markdown
![bg left:50%](image-url)

## Right Side Content

Text appears on the right half
```

## Color & Typography

### Recommended Palettes for LTs

**Dark Professional**: bg `#1a1a2e`, text `#e0e0e0`, accent `#e94560`
**Light Clean**: bg `#ffffff`, text `#2d3436`, accent `#0984e3`
**Warm Creative**: bg `#ffeaa7`, text `#2d3436`, accent `#d63031`

### Applying Styles

Per-slide styling with scoped directives (underscore prefix):
```markdown
<!-- _backgroundColor: #1a1a2e -->
<!-- _color: #e0e0e0 -->
```

Global styling in frontmatter:
```markdown
---
marp: true
backgroundColor: #1a1a2e
color: #e0e0e0
---
```

## Anti-Patterns

- Never use more than 3 bullet points per slide
- Avoid walls of text — if it needs a paragraph, split into multiple slides
- Don't use default theme without customization — always set colors
- Avoid tiny font sizes — if text doesn't fit, the slide has too much content
