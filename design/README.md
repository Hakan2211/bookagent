# Kitapmi design — "Writer's Study"

Reference mockups for the v0.2 redesign live in `mockups/`. They are the source of truth for look & feel;
the implementation tokens live in `src/renderer/styles/globals.css`.

| File | Screen |
| --- | --- |
| `00-design-system.jpg` | Palette, type, components, icons, tokens |
| `01-welcome-library.png` | Welcome / library (books as covers) |
| `02-workspace-dark.png` | Main workspace — Ink (dark) |
| `03-workspace-light.png` | Main workspace — Paper (light) |
| `04-inline-ai-edit.png` | Selection menu (rewrite / tone / custom) |
| `05-change-review.png` | Change review with per-change accept/reject |
| `06-agent-plan.png` | Agent stepper + plan card |
| `07-empty-book.png` | Empty new book onboarding |
| `08-export.png` | Export modal with live preview |
| `09-import-wizard.png` | Import wizard |
| `10-settings.png` | Settings |
| `11-focus-mode.png` | Focus mode |

## Principles

- Literary, calm, restrained. No neon, no purple gradients, no glow, no glass.
- Serif (Newsreader) for headings, manuscript and the AI's voice; Inter only for small UI labels.
- One accent: **Oxblood `#A4473A`**. Status colors are desaturated.
- Hairline borders, soft shadows only on floating surfaces.

## Tokens

**Ink (dark):** base `#121110`, panel `#1A1917`, raised `#23211E`, border `#2E2B27`,
text `#ECE6DA` / `#A39C8F` / `#6F695F`.

**Paper (light):** base `#F6F1E7`, panel `#EFE8DA`, raised `#FFFDF8`, border `#DDD3C2`,
text `#2A2622` / `#6B6358`.

**Status:** Outline `#8A8F98`, Draft `#C49A3C`, Revised `#5B8BA0`, Final `#7A9A6E`.

Radii 6 / 8 / 12px · spacing 8pt scale.
