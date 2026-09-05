---
name: railean-dataviz
description: Visual language distilled from georgerailean.com (AI-driven interfaces, dashboards, data visualization). Use when the user asks for that site's style, for "dashboard / HUD / data-viz" polish, glass panels on dark canvases, big KPI numerals, pill controls, metadata bands, oversized uppercase section titles, or says 用 George Railean 那种风格 / 像那个作品集一样. Apply to web UI, product mockups, and 3D/graph views.
---

# Railean data-viz language

Reference: https://www.georgerailean.com/ (Webflow site) and its portfolio pieces
(Hyperfab AR, AG.Drone, Datamonitor Healthcare, Medical Devices, Common Voice,
Grid.ai, Smart Streets). Treat the reference as evidence for a grammar. Never
copy its wording, logo, imagery, or exact layouts.

The site has two registers that must be kept apart:

1. **Portfolio chrome** — white, quiet, geometric, almost no color.
2. **Product surfaces** — dark, dense, glassy dashboards with one electric accent.

Chrome frames; product performs. Most "AI dashboard" work that looks cheap
mixes the two (dark glass everywhere). Do not.

## 1. Portfolio chrome (page level)

| Token | Value | Note |
|---|---|---|
| ground | `#FFFFFF` | pure white, not off-white |
| text | `#000000` headings, `#333333` / `#434D53` body | |
| hairline | `#DDDDDD`, panels `#EEEEEE` / `#FAFAFA` | |
| accent (rare) | electric blue `#444CFF`, magenta `#CF0EDD` | one per page, usually inside imagery |
| display font | **Unbounded** (wide geometric), 400 for names, 700 for section titles | fallback: Space Grotesk, Syne |
| body font | **Lato** 16px, line-height 1.6 | fallback: Inter, system |
| section title | 56px / 1.2, UPPERCASE ("MY WORK") | one per section |
| oversized word | 192px / 1.25, UPPERCASE ("BLOG") | one per page, as a page-wide object |
| hero statement | 40–48px, sentence case, weight 700, max 14 words | left column |
| radius | pills `999px`; cards `8px` / `.5rem`; imagery `16–20px` | nothing in between |
| shadow | none on chrome; cards at most `0 2px 5px rgba(0,0,0,.2)` | |
| motion | `transition: all .2s–.3s`; reveal-on-scroll (opacity 0→1, y 24→0, 400ms) | no springs, no bounce |

Layout recipes (recombine, don't trace):

- **Hero split**: left = name (24px, weight 400) + statement (40–48px) + pill CTA; right = a dark 16:10 visual (video loop or product shot) with rounded corners. Ratio ≈ 45 / 55.
- **Nav**: small logo mark left; on the right one black pill CTA (uppercase, letter-spacing .08em, 12–13px) + hamburger. Nothing else.
- **Category chip row**: label "Categories" in body text, then outlined pills (1px `#DDD`, 6px 12px, 13px). Active chip = black fill.
- **Work grid**: 2 columns, image-first cards, title 24px weight 700 under the image, hover = image scale 1.02 over 300ms.
- **Metadata band** (inside product pieces): a single row of tiny uppercase labels (10–11px, letter-spacing .1em, muted) each above a value (14–16px), separated by thin vertical rules. Example: DIGITAL STUDIO / DESIGN PROJECT / GOAL / YEAR.
- **Closing CTA**: one giant two-line question ("Are you ready / to begin?") at 60px + one pill.

## 2. Product surfaces (dashboards, HUDs, data viz)

| Token | Value |
|---|---|
| canvas | `#0B0D12` → `#14161C` (near-black with a cold cast), never pure black behind data |
| panel | `rgba(255,255,255,.05)` fill, `1px rgba(255,255,255,.08)` border, `backdrop-filter: blur(16–24px)`, radius 11–16px |
| gridline | `1px rgba(255,255,255,.06)`; map regions `#1E2129` on `#0F1116` |
| primary text | `#F2F3F5`; secondary `#8F9599`; micro-labels `#6B7078` |
| single accent | choose one per product: blue `#2F7BFF` / orange `#F26B1D` / green `#22C55E` for "live" |
| delta pills | `+0.2%` on `rgba(239,68,68,.18)` red or `rgba(34,197,94,.18)` green, 10px, radius 4px |
| KPI numeral | 36–56px, weight 600, tabular-nums, tight tracking; unit/label 12px muted underneath |
| control | segmented pill (dark track, lit segment), toggles with tiny state dots |
| bubble map | translucent accent circles, `1px` stroke, area ∝ value, centered dot |
| chart lines | 1.5px, accent; area fills at 12% alpha; no gradients steeper than that |
| device frame | tablet/monitor bezel `#1A1B1F` with 24–32px radius; product photography with a single hard rim light |

Composition rules for product surfaces:

- One hero number per panel. Everything else is smaller than it by ≥3×.
- Left rail = list/table (dense, 12–13px rows, zebra-free, hairline dividers); right = the map or chart taking ≥60% width.
- Header strip carries filters as labeled dropdowns: label 10px muted above value 13px. Same "metadata band" idiom as the chrome.
- Glass is a material for *panels over imagery*. On a flat dark canvas, use borders, not blur.
- Depth comes from one blurred colored shape behind the frame (`filter: blur(40px)` blob in the accent), never from drop shadows on cards.
- Motion: values count up (600ms), lines draw in (800ms ease-out), panels fade+rise on mount (300ms, 40ms stagger). Loops only for "live" indicators.

## 2b. The four reference screens the user picked (highest weight)

The user singled out these portfolio pieces. When in doubt, match these, not the homepage.

**A. Robodog — light operations map** (warehouse floor plan)
- Light register can also be a *product* surface: ground `#F7F8FA`, canvas with a faint dot grid, panels pure white with 16px radius and a 1px `#E6E8EC` border, no shadow.
- Left icon rail (48px wide, 8 monochrome line icons, active = filled dark chip). Top bar = logo · wide search pill · one gradient action chip · one black pill CTA · avatar.
- Floor plan drawn in *desaturated pastels*: slate-blue racks `#B8C7DC`, mint zones `#7FC9A5`, sand lanes `#F1DCB3`, route lines 1px `#9AA3AE`, active route in green `#3BAF7A`. Nothing saturated except status dots (red alert).
- Info cards are compact: label + value inline ("Battery level: 32%") inside a 1px bordered chip, 13px. One product photo (device on white, top-lit) inside the card.
- Numerals on the map (`96 234 178`) in 16px muted gray — the map is annotated like a blueprint.

**B. CyberDefend — dark globe HUD**
- Canvas `#0A1017` with a subtle starfield; a large 3D object (globe) sits center-right and *behind* the UI; geodesic wireframe overlay at 20% white; one red hazard marker.
- Panels: `rgba(20,28,36,.72)` + `backdrop-filter: blur(16px)`, 12px radius, 1px `rgba(255,255,255,.08)`. Panels hug the edges (top-left camera card, bottom strip of four panels); the middle stays empty for the object.
- Top center = segmented pill nav with a live dot on the active tab. Right = round dial control (compass) with tick marks.
- Type: Outfit/Lexend-like geometric sans; section labels 11px uppercase letter-spacing .12em `#8A97A6`; hero numerals 28–32px (`9k km/h`) with unit in 14px muted.
- Charts: a bright cyan line with additive glow over dark, dozens of thin ghost lines behind it; table rows 44px with tiny bar-meters.
- Timestamps in mono-ish (`T08:39:16.52Z`, `21-11-02T 13:43:18`).

**C. Factory flow — dark green operations board**
- Canvas `#0D1512` with dot grid; the whole board is a rounded 28px "device" floating over a blurred photo of the real factory (`filter: blur(20px)`, desaturated).
- One accent = lime `#7CF23A`, used for: the logo mark, the active machine block on the mini-map, the area chart fill, and section icons. Category colors for process steps (blue/green/amber/red) are *muted* fills at ~35% alpha with a white label.
- Top bar is a timeline ruler (10:05 … 11:10) with colored event dots. Right column = stacked KPI cards, each: icon-in-ring · 12px label · 20px value + unit.
- Flow diagram: node blocks 128×80, 8px radius, connected by 1px rails with small square ports; parallel "lines" stacked with generous 120px gaps.

**D. EFT energy — dark 3D city map**
- Canvas near-black `#07090E`; the map is a dark relief with cool blue landmass `#1B2540`; data drawn as *light*: radial arcs, particle streams, cone spikes, ring gauges in cyan/violet/amber at low alpha with additive glow.
- Left = dense KPI column (cards 12px radius, `#121620`, 1px `#1F2433`): one 28px hero numeral per card (`1,039 MWh`) with 11px labels; small ring gauges (59% 28% 13%) in three hues; sparkline charts with dotted markers.
- Bottom-right = two pill actions (Copilot, Simulate) with tiny icons, dark fill, 1px border.
- Hue system: cyan `#39D2C0` production, violet `#8B7CF6` distribution, amber `#F5B63A` cost, rose `#F06A7A` alert — four semantic hues at ≤70% saturation, never as flat fills, only as strokes, glows and gauge arcs.

Common DNA across A–D:
1. A big spatial object (map / globe / flow / 3D city) owns ≥60% of the screen; UI panels are pinned to edges and *never* cover its center.
2. Panels are quiet containers: 12–16px radius, 1px border, either white-on-light or glass-on-dark. Content inside is label-over-value, 11px/20–28px.
3. Data itself carries the color; chrome is gray. On dark, data glows (additive blend, low alpha strokes). On light, data is desaturated pastel.
4. Every screen has a top bar with a segmented or pill control and exactly one primary pill button.
5. Icons: 1.5px line icons in rounded-square chips (36–44px), one family.

## 3. Do / Don't

Do:
- Keep the chrome monochrome so the product visual is the only saturated thing on screen.
- Use uppercase + letter-spacing for anything under 13px; sentence case for anything over 24px.
- Put real-looking numbers in mockups (7,736,534 not 1234567); tabular figures.
- Frame product UI inside a device or a rounded 16:10 viewport with a dark blurred blob behind it.
- Give every panel a 1px border before considering a shadow.

Don't:
- Purple-to-blue gradients, neon on black, rainbow legends.
- Dark glass on the marketing/portfolio layer.
- More than one accent color per product surface.
- Rounded corners between 20px and 999px (either a card or a pill).
- Decorative particles, scanlines, or "cyber" grids without data behind them.

## 4. Applying it to 副脑 (this repo)

Keep the current paper / carbon / cobalt system for the light chrome (it already matches register 1). Use register 2 only where a "product surface" appears:

- **Dark theme** = the product register: canvas `#0F1116`, panels as glass over the star chart, cobalt `#7D96E4` as the single accent.
- **Debate HUD** → metadata band: ROUND / TURNS / TOKENS / STATUS as label-over-value cells with vertical rules.
- **Card scores** → one hero numeral (total, 48px) with the three sub-scores as 12px label-over-value; delta pill for saved state.
- **保守 ↔ 疯狂** → segmented pill instead of a range slider when in dark theme.
- **Brain chips** → outlined pills, active = filled.
- **Star chart hit state** → hit stars get the accent, everything else drops to `#1E2129`; halo = the blurred blob idiom.
- **HUD layout (from A–D)** → the star chart owns the center; capture becomes a top search pill; the skeleton/result card and brain list become edge-pinned panels (left rail of icons + one panel), the debate HUD a bottom strip of label-over-value cells; brains as ring gauges (碎片数 / 命中数); constellation lines drawn as glowing additive strokes in dark mode.

## 5. Asset ledger (read, never copy)

- Site CSS: `https://cdn.prod.website-files.com/689c821bf8e4131b49b4ea03/css/georgerailean.webflow.shared.c708e4df6.min.css`
- Fonts loaded: Unbounded 300–700, Lato 100–900, Montserrat Alternates 300–700 (unused on home).
- Measured: body 16px Lato; H2 24px/400 (name), 56px/700 (sections), 192px/700 (BLOG); H3 24px/700; H1 60.8px/700 (closing CTA).
- Radii in use: 999px, 100px, 20px, 16px, 11px, 8px, 4px, 2px. Shadows: `0 2px 5px #0003`, `0 10px 16px -3px #14151a14`.
- Effects: `backdrop-filter: blur(1rem | 3.2rem)`, `filter: blur(40px)` on a background blob, `filter: saturate(0%)` on logos.

## 6. Liquid glass rules (from Apple's Liquid Glass guidance, applied to web)

- Glass is a **navigation-layer** material: top bar controls, the icon rail, search pill, breadcrumb pill, chips, secondary pills, popovers and sheets. **Never on content** (transcripts, cards, lists, text blocks) — those are solid surfaces (`--surface`) so they stay readable.
- Glass must have something to sample: the map is full-bleed under the controls; a glass strip over a flat background is pointless.
- Nearby glass shares one container (the rail is one glass pill holding its buttons); avoid glass nested in glass.
- Recipe: translucent fill, `blur(24px) saturate(170%)`, 1px top highlight + 1px bottom shade inset, faint top-left specular sheen, 999px pills / 20px panels.
- Interactive glass gives physical feedback: scale .96 and a brightness lift on press.
- `prefers-reduced-transparency: reduce` collapses every glass surface to solid.
- The one primary action stays solid accent, not glass, so it remains the only "button" on screen.
