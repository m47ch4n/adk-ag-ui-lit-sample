# Marp Directives Reference

## Global Directives (in frontmatter)

| Directive | Values | Description |
|-----------|--------|-------------|
| `marp` | `true` | Enable Marp rendering |
| `theme` | `default`, `gaia`, `uncover` | Built-in themes |
| `paginate` | `true`, `false` | Show page numbers |
| `header` | string | Header text for all slides |
| `footer` | string | Footer text for all slides |
| `backgroundColor` | CSS color | Default background color |
| `color` | CSS color | Default text color |
| `backgroundImage` | CSS url() | Background image |
| `size` | `16:9`, `4:3` | Slide aspect ratio |
| `math` | `mathjax`, `katex` | Math rendering engine |
| `style` | CSS string | Custom CSS for entire deck |

## Scoped Directives (per-slide, underscore prefix)

Same as global but prefixed with `_` and placed as HTML comments:

```markdown
<!-- _backgroundColor: #000 -->
<!-- _color: #fff -->
<!-- _paginate: false -->
<!-- _header: "" -->
<!-- _footer: "" -->
<!-- _class: special -->
```

## Image Syntax

### Background Images
```
![bg](url)                    Full background
![bg contain](url)            Contain within slide
![bg cover](url)              Cover entire slide (default)
![bg fit](url)                Fit within slide
![bg auto](url)               Original size
![bg left](url)               Left half background
![bg right](url)              Right half background
![bg left:30%](url)           Custom split ratio
![bg right:40%](url)          Custom split ratio
![bg blur:5px](url)           Blur filter
![bg brightness:0.5](url)     Brightness filter
![bg opacity:0.5](url)        Opacity filter
```

### Multiple Backgrounds
```
![bg](url1)
![bg](url2)
```
Renders side by side.

### Inline Images
```
![width:300px](url)           Set width
![height:200px](url)          Set height
![w:300 h:200](url)           Both dimensions
```

## Fragment/Animation

Marp supports `*` prefixed lists for fragment-like behavior:

```markdown
- Item 1
* Item 2 (appears on click in presenter mode)
* Item 3
```

## Presenter Notes

```markdown
<!-- This is a presenter note -->
```

Visible in presenter view, hidden in slides.
