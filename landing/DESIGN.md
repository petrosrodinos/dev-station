---
name: Delitip
description: A confident fintech-adjacent tipping platform where every dollar's path is visible.
colors:
  ink-charcoal: "#181A1B"
  electric-lime: "#C8F169"
  paper-offwhite: "#F7F7F2"
  brand-50: "#F4FBE6"
  brand-100: "#EAF7CC"
  brand-200: "#DCF0A3"
  brand-300: "#D2EC88"
  brand-400: "#CDF47A"
  brand-700: "#9FBF3E"
  brand-800: "#6B8429"
  brand-900: "#3F4F18"
  rating-amber: "#F59E0B"
  signal-red: "#DC2626"
  signal-red-dark: "#EF4444"
  neutral-line: "#E4E4E7"
  neutral-line-dark: "#27272A"
  neutral-fill: "#F4F4F5"
  neutral-muted: "#71717A"
  neutral-faint: "#A1A1AA"
  neutral-surface: "#FAFAFA"
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 5vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
  frame: "36px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.electric-lime}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.brand-700}"
  button-inverse:
    backgroundColor: "{colors.ink-charcoal}"
    textColor: "{colors.paper-offwhite}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
  button-ghost:
    backgroundColor: "{colors.neutral-fill}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  badge-positive:
    backgroundColor: "{colors.brand-50}"
    textColor: "{colors.brand-800}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-neutral:
    backgroundColor: "{colors.neutral-fill}"
    textColor: "{colors.neutral-muted}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  card:
    backgroundColor: "#FFFFFF"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  icon:
    textColor: "{colors.ink-charcoal}"
    size: "20px"
---

# Design System: Delitip

## Overview

**Creative North Star: "The Transparent Ledger"**

Delitip's visual world reads like an honest financial record, not a generic tipping widget. Every surface — the customer's phone screen, the employee's payout card, the owner's dashboard — is built to make one thing visible at a glance: exactly where the money went, and to whom. Receipts carry reference numbers. Dashboards pair every stat with a time window and a sample size. Settlement states ("Settled", "On Shift", "100% Direct") are stated, not implied.

The palette does the heavy lifting: a near-black ink surface for anything serious (the business's own brand, security, payouts) against a single electric-lime accent that appears only where something good is happening — an active state, a rising number, a completed action. Rounded, generous geometry (16–40px radii, phone-frame device mockups) keeps the fintech confidence from feeling cold or corporate; nothing in the system uses a hard, square corner.

Confirmed anti-reference: this is not playful or gamified fintech. Recognition moments (compliment tags, badges) stay warm, but they use icon-based tags rather than emoji, and nothing about money, security, or settlement status softens into cuteness.

**Implementation:** built on shadcn/ui (Base UI primitives) over Tailwind v4, with [lucide-react](https://lucide.dev) as the icon set. `globals.css` carries this document's palette as two layers: every color above is a static Tailwind primitive (`--color-electric-lime`, `--color-brand-700`, `--color-ink-charcoal`, `--color-signal-red`, …), directly usable as utilities (`bg-electric-lime`, `text-brand-800`). shadcn's semantic roles (`--background`, `--primary`, `--destructive`, etc.) then reference those primitives via `var()` rather than repeating literal hex, so light/dark mode and any future re-theming only ever touch one source of truth. shadcn's default component variants (`default` → primary lime, `secondary`/`ghost` → neutral fill, `destructive` → signal red) already speak this system without per-component overrides. `--radius` is set to `1rem` specifically so shadcn's derived scale lines up with this document's Shapes scale (`lg` = 16px, `3xl` ≈ 36px).

**Key Characteristics:**
- One accent, used sparingly: lime marks "this is active / this is good," never a background fill for large surfaces.
- Money and status are always stated exactly — amount, timestamp, reference ID — never rounded or implied.
- Flat, bordered surfaces in light mode; ambient lime glow (not shadow) for depth on dark surfaces.
- Aggressively rounded geometry throughout — no sharp corners anywhere in the system.
- A recurring "phone-frame" device mockup is the system's signature way of showing the customer experience inside a business or marketing surface.

## Colors

A two-color system — near-black ink and electric lime — carried by a warm off-white canvas and a standard neutral (zinc) scale for text and borders; one semantic amber is reserved exclusively for star ratings.

### Primary
- **Electric Lime** (`#C8F169`): the single accent. Marks primary actions (buttons), active/selected states, "good news" deltas (positive percentage changes, live indicators), and the one recurring signature effect — a soft blurred glow behind dark panels. Used on distinctly less than a fifth of any given screen.

### Secondary
- **Ink Charcoal** (`#181A1B`): the brand's dark register. Used for the header/nav chrome, inverse buttons, and full dark panels (dashboards' embedded previews, the auth screen's brand column, employee payout cards). Reads as "this is delitip.com speaking," distinct from a customer's own business branding.

### Tertiary
- **Rating Amber** (`#F59E0B`): reserved exclusively for star ratings and review scores. Never used for buttons, brand chrome, or status — its only job is signaling review sentiment (★ 4.9).

### Semantic
- **Signal Red** (`#DC2626`, `#EF4444` in dark mode): the system's only error/danger color — failed payments, disputes, destructive confirmations (PRODUCT.md §26 Refunds and Disputes). Not present in the original mockups; added when wiring shadcn's `destructive` variant, since a real payments product needs one. Used as sparingly as lime — a red fill or red text is always a genuine failure or irreversible action, never a warning-adjacent nudge.

### Neutral
- **Paper Offwhite** (`#F7F7F2`): the default page background — warmer than pure white, keeps long dashboard sessions from feeling clinical.
- **Neutral Line** (`#E4E4E7` light / `#27272A` dark, Tailwind zinc-200 / zinc-800): the standard hairline border for cards, inputs, and dividers.
- **Neutral Fill** (`#F4F4F5`, zinc-100): the flat fill for ghost/secondary buttons, neutral badges, and inactive pill-track backgrounds — one step darker than Neutral Surface, used wherever a click target (not just a recessed panel) needs a visible bounded shape.
- **Neutral Muted** (`#71717A`, zinc-500): secondary body text, captions, table body copy.
- **Neutral Faint** (`#A1A1AA`, zinc-400): tertiary text — timestamps, placeholder copy, disabled states; also the muted-text color inside dark charcoal panels.
- **Neutral Surface** (`#FAFAFA`, zinc-50): recessed backgrounds inside cards (input fields, list rows, the "transparency notice" strip) — not a click target, only ever a passive background.

### Named Rules
**The One Accent Rule.** Lime never fills a large surface. It marks a button, a selected state, a positive delta, or a single glow — never a section background.

**The Exact-Money Rule.** Any figure tied to a transaction (tip amount, payout, fee) is rendered in full precision with its currency symbol — never rounded, abbreviated, or replaced with a vague adjective.

## Typography

**Body & Display Font:** Plus Jakarta Sans (with `system-ui, sans-serif` fallback) — used at every weight from 300 to 800, for every role. There is no second typeface; hierarchy comes entirely from size and weight.

**Character:** A single geometric sans carried across extremes of scale and weight — the same letterforms run from a 60px hero headline down to a 10px table-header label — reinforcing that dashboard and marketing surfaces are one continuous system, not two products bolted together.

### Hierarchy
- **Display** (800, `clamp(1.875rem, 5vw, 3.75rem)`, 1.12 line-height): marketing hero headlines only.
- **Headline** (800, `clamp(1.25rem, 2vw, 2.25rem)`, 1.2): section titles, dashboard page titles, auth screen headings.
- **Title** (700, 14px, 1.3): card headers, employee names, component titles.
- **Body** (400–600, 12px, 1.6): the dominant text size across the entire system — dashboard copy, descriptions, table rows. Deliberately small and dense; this is an operating-console typescale, not an editorial one.
- **Label** (700, 11px, 1.4, uppercase, 0.08em tracking): eyebrows, table headers, micro-metadata (timestamps, kickers).

**Mono (reference codes only):** Geist Mono, loaded alongside Plus Jakarta Sans purely for transaction/receipt identifiers (`#DLT-8942`) and the employee PIN field — never for headings, body copy, or labels.

### Named Rules
**The One Typeface Rule.** Plus Jakarta Sans carries every role. Introducing a second family breaks the system — the one exception is the mono face, scoped exclusively to reference codes.

## Layout

Content sits in a `max-w-7xl` container for marketing surfaces, `max-w-6xl` for the employee portal, and `max-w-5xl` for the auth screen and single-column tools (the tip calculator). Dashboards use a fixed `w-64` sidebar against a fluid main column, with `p-4` to `p-8` responsive padding scaling up with viewport.

The customer-facing tipping flow is always presented inside a fixed-width (`~390–400px`) rounded device frame, centered on the page — even in a desktop browser — so the "this is what your customer sees on their phone" framing never breaks.

Card grids follow two ratios: 4-up KPI tiles (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) for stat overviews, and a 2:1 split (`lg:grid-cols-3`, one section spanning 2) for a primary content block beside a secondary feed or summary panel. Spacing runs on Tailwind's default 4px-based scale, most commonly landing on 8/12/16/24px gaps.

## Elevation & Depth

The system is flat by default: light surfaces (cards, inputs, tables) sit on a hairline `1px` border with at most a barely-there `shadow-xs` — there is no drop-shadow language for ordinary resting state. Depth on dark charcoal surfaces comes instead from a soft, blurred lime glow (a large, low-opacity, heavily blurred circle) placed behind or within the panel — an ambient signature effect rather than a structural shadow. Stronger shadows (`shadow-lg` through `shadow-2xl`, including colored `shadow-lime/30` glows under primary buttons) are reserved for genuinely elevated or floating states: modals, the primary CTA button, a hovered/lifted card, or a popover.

### Shadow Vocabulary
- **Resting** (`shadow-xs` or none): default state for cards, inputs, list rows.
- **Ambient glow** (large blurred radial shape, `blur-3xl`, ~15–20% opacity, electric lime): the only "depth" cue on dark charcoal panels.
- **Lifted** (`shadow-lg`–`shadow-2xl`, optionally `shadow-lime/30` under primary CTAs): modals, primary buttons, the hero device-frame mockup, floating cards.

### Named Rules
**The Glow-Not-Shadow Rule.** Depth on a dark (charcoal) surface is conveyed with a blurred color glow, never a drop shadow. Drop shadows are reserved for light-surface elevation only.

## Shapes

Corners are aggressively and consistently rounded — `12px`–`16px` for buttons and inputs, `16px`–`24px` for cards, and custom `36px`–`40px` radii for the outer "device frame" containers that simulate a phone screen. Pills (`rounded-full`) are used for every badge, status tag, and toggle. Borders are always a single hairline (`1px`), usually at reduced opacity (`/80`) against zinc-200 in light contexts or zinc-800 in dark ones. No component in the system uses a sharp (0px) corner.

shadcn's `--radius` base is set to `1rem` (16px) so its derived scale lands on this system's values: `radius-lg` (16px) matches Cards exactly, `radius-md` (~12.8px) and `radius-sm` (~9.6px) round to the Button/Input values, and `radius-3xl` (~35px) matches the device-frame radius.

## Components

### Buttons
- **Shape:** rounded, `12px`–`24px` depending on size; pill-shaped for compact chip-style actions.
- **Primary:** electric-lime fill, ink-charcoal text, bold weight, `shadow-lg shadow-lime/30` glow; darkens to `brand-700` on hover.
- **Inverse (secondary):** ink-charcoal fill, offwhite text — used for a second-priority action alongside a primary lime button (e.g. "Pay with Card" beside "Pay with Apple Pay").
- **Ghost/Tertiary:** `neutral-fill` (zinc-100) fill, ink-charcoal or muted text — low-emphasis actions, "Sign In," "See All Reviews."

### Badges / Tags
- **Positive:** `brand-50` background, `brand-700`/`brand-800` text, thin `brand-200`/`brand-300` border — recognition tags, "Settled," positive deltas.
- **Neutral:** `neutral-fill` (zinc-100) background, muted text — informational tags, off-shift status, secondary metadata.
- Recognition/compliment tags use short icon+word labels (e.g. a lightning-bolt icon + "Fast Service") rather than emoji, keeping the warm register without breaking the system's overall sobriety.

### Icons
lucide-react is the system's only icon set, replacing both the mockups' hand-drawn inline SVGs and their emoji tags. Icons are line/stroke style at `stroke-width: 2` (matching the weight already used throughout the mockups' inline SVGs), sized `16px` inline with body text and `20px` in buttons, nav items, and badges. Icons inherit `currentColor` — they take the lime, charcoal, or muted tone of their surrounding text/surface rather than carrying a fixed color of their own, except the single lime dot/pulse used as a live-status indicator.

### Cards / Containers
- **Corner style:** `16px`–`24px` radius.
- **Background:** white on the offwhite page background; charcoal for dark/embedded-preview panels.
- **Shadow strategy:** flat with hairline border (see Elevation & Depth); no resting shadow beyond `shadow-xs`.
- **Border:** `1px`, zinc-200 at `/80` opacity.
- **Internal padding:** `16px`–`32px` depending on density (dashboard tiles run tighter; standalone cards like the QR card run looser).

### Inputs / Fields
- **Style:** `12px` radius, hairline zinc-200 border, subtle recessed `neutral-surface` background (not pure white) to visually separate it from the card it sits in.
- **Focus:** a `2px` lime ring, no border-color change — the ring is the only focus signal.
- **Password fields:** always pair with an inline visibility-toggle icon at the right edge.

### Navigation
- **Sidebar:** vertical list, rounded-`12px` item backgrounds. Active item gets a `brand-50` background, `brand-800` text, and a lime-tinted icon; inactive items are muted text on transparent background with a `neutral-fill` hover state.
- **Mode/role switcher (pill track):** a rounded track (dark or `neutral-fill`) containing two toggle buttons; the active option gets a solid lime (or white, in light contexts) fill, the inactive one stays muted text with no fill.

### Tables
- **Header:** `neutral-surface` background, muted uppercase label-scale text, hairline bottom border.
- **Rows:** divided by hairline borders, body-scale text, bold weight reserved for the primary identifying column (name, amount).
- **Status cells:** right-aligned pill badges using the positive/neutral badge styles above.

### Device Frame (signature component)
A rounded (`36px`–`40px`), bordered container that frames the customer-facing tipping flow as if it were a physical phone screen — used both embedded in marketing pages and as a standalone prototype view. This framing device is what visually declares "this part of the product is the customer's experience," and should be reused any time the customer flow is shown inside a business- or employee-facing surface.

### QR / Personal Link Card
A small charcoal-framed tile containing a white inset with a pixel-grid pattern, always paired with a shareable link/handle beneath it. Signals "this is your personal, scannable access point" consistently across the employee and business surfaces.

## Do's and Don'ts

### Do:
- **Do** treat lime as a rare signal for "active, positive, or primary" — never a section background.
- **Do** state every financial figure exactly, with a time window or sample size attached (`$3,420.50` next to `428 tips, past 7 days`, not just a bare number).
- **Do** use the blurred lime glow for depth on charcoal surfaces instead of a drop shadow.
- **Do** keep every corner rounded — buttons, cards, inputs, device frames, badges alike.
- **Do** represent recognition/compliment tags with a small icon and a short label, not emoji.
- **Do** pull every icon from lucide-react at `stroke-width: 2`, sized 16–20px, colored via `currentColor`.

### Don't:
- **Don't** introduce blue, or any generic corporate-SaaS palette, into primary chrome — lime-on-charcoal is the deliberate departure from that look.
- **Don't** use emoji as the primary vehicle for compliment tags, badges, or status — replace with a lucide-react icon + label.
- **Don't** mix icon sets. Any icon that isn't in lucide's set should be recreated as a custom SVG in the same stroke style, not pulled from a second library.
- **Don't** let playful or gamified treatments (confetti, cartoon mascots, bouncy animation) into money-, security-, or settlement-related surfaces — those stay sober and exact even where recognition surfaces can be warmer.
- **Don't** use a sharp (0px) corner anywhere in the system.
- **Don't** drop dashboard body text below the established 11–12px floor; the system is already dense.
