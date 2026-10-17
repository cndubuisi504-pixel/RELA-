# rela. — design system

The whole visual layer is driven by CSS variables in `app/globals.css`.
Change a token once and every screen follows. No component hard-codes a colour,
radius or shadow.

## Colour

Brand palette (from the supplied identity sheet):

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--primary` | `#FF6D29` flame | `#FF6D29` | Primary action, brand accents |
| `--primary-ink` | `#161316` | `#161316` | Text *on* a primary button (6.6:1) |
| `--cocoa` | `#453027` | — | Deep neutral, small labels |
| `--canvas` | `#FAFBF6` paper | `#161316` ink | Page background |
| `--surface` | `#FFFFFF` | `#201B18` | Cards, sheets, inputs |
| `--surface-2` | `#F3F0E7` | `#2A2421` | Inset panels, skeletons |
| `--ink` | `#161316` | `#FAFBF6` | Primary text |
| `--ink-2` | `#5E564E` | `#BABABA` | Secondary text |
| `--ink-3` | `#6E655C` | `#8E8681` | Tertiary text, meta |
| `--border` | `#E7E1D5` | `#332B26` | Hairlines |
| `--accent-text` | `#B4430F` | `#FF9A66` | Links and text-only actions |

Status colours are always paired with an icon **and** a label — never colour alone:

| State | Foreground | Background |
| --- | --- | --- |
| Success / paid | `--success` | `--success-bg` |
| Warning / due soon | `--warning` | `--warning-bg` |
| Danger / overdue | `--danger` | `--danger-bg` |

Flame is reserved for action and brand. It is never used to mean "warning", so
an orange button can never be mistaken for a status.

### Logo gradient

`--grad-mark` runs gold `#D9B96A` → `#F39B3F` → flame `#FF6D29` → burnt `#C94B1A`.
The gold start was darkened from the artwork's `#F2EBD1` so the top of the mark
stays visible on the light canvas. The gradient appears **only** in the Rela mark.

## Typography

- **Satoshi** (self-hosted, 400/500/700) — headings, UI, body.
  Closest freely licensed match to Neue Montreal; swap the files in `app/fonts/`
  if you buy the Neue Montreal licence, nothing else changes.
- **Inter** (self-hosted) — numbers only, via the `.num` class, so money aligns
  in tabular figures.

| Class | Size | Where |
| --- | --- | --- |
| `.h-display` | clamp 2.55 → 4.35rem, −0.042em | Hero and page titles |
| `.h-section` | clamp 1.9 → 2.9rem, −0.036em | Section headings |
| `.lede` | 1.02 → 1.16rem | Intro paragraphs |
| `.eyebrow` | 12px, 0.14em, uppercase | Section labels |
| `.num` | Inter, tabular | Any amount of money |

> Name headings `.h-section`, never `.h-2` — that collides with Tailwind's
> height utility and silently collapses the element to 8px.

## Space, radius, motion

- 8px spacing scale (Tailwind defaults align).
- Radii: `999px` buttons, `1rem` inputs, `1.25–1.5rem` cards, `2rem+` panels.
- Touch targets: minimum 44px. `min-h-11` on every interactive row or link.
- Motion: 180ms for state, 420ms for entrances, `cubic-bezier(.2,.8,.2,1)`.
  All of it is disabled under `prefers-reduced-motion`.

## Components

| Component | File | Notes |
| --- | --- | --- |
| `RelaMark`, `Wordmark`, `Logo`, `BrandDefs` | `components/branding/Logo.tsx` | SVG mark; never shipped as a raster |
| `ThemeToggle` | `components/branding/ThemeToggle.tsx` | Writes `rela-theme` to localStorage |
| `Header`, `Footer` | `components/landing/` | Public chrome |
| `Hero`, `DocumentVisual` | `components/landing/` | The receipt is real HTML, not an image |
| `OneForAll` | `components/landing/OneForAll.tsx` | Closed stack ↔ three cards; button + keyboard |
| `Pricing` | `components/landing/Pricing.tsx` | Egg-shaped tall panels, stacking on mobile |
| `CtaBand` | `components/landing/CtaBand.tsx` | Ink panel with flame bloom |
| `EarlyAccess` | `components/landing/EarlyAccess.tsx` | Temporary gate until auth ships |
| `LegalShell` | `components/legal/LegalShell.tsx` | Terms / privacy layout |

## Money

Every amount is an integer number of kobo (`₦1,000.00 = 100000`).
Use `formatKobo()` and `parseNairaToKobo()` from `lib/money.ts`. Never use
floats, and never format money inline in a component.

## Accessibility rules that are already enforced

- Contrast: every text/background pair passes WCAG AA (verified in `qa/a11y.mjs`).
- Visible focus ring on all interactive elements (`:focus-visible`, 2px flame).
- Skip-to-content link is the first tab stop.
- Status uses icon + label + colour.
- Icons are `aria-hidden`; buttons carry text or `aria-label`.
- Headings never skip levels; one `<h1>` per page.
- `prefers-reduced-motion` disables every transition and animation.

Run `node qa/a11y.mjs` (with the dev server up) to re-check contrast, landmarks,
heading order, target sizes and accessible names.
