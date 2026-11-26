# DESIGN.md — Design System & Screens

Extracted from the mockups in `assets/images/`:

| File | Screen |
|------|--------|
| `image.png` | Home — "Today's picks" grid |
| `image(1).png` | Home — category view ("Electronics") |
| `image(2).png` | Create — choose listing type |
| `image(3).png` | Create — form + live preview |
| `image(4).png` | Listing detail + message seller |

## Visual language

Facebook Marketplace: a pale gray-blue canvas, white rounded cards, a single
blue accent, generous radii, and a 4 px spacing grid. No gradients, no heavy
shadows — elevation is a 1 px border plus a small shadow on hover.

## Tokens (Tailwind v4 `@theme` in `src/app/globals.css`)

```css
@theme {
  --color-canvas: #edf0f5;      /* page background */
  --color-surface: #ffffff;     /* cards, sidebar */
  --color-border: #ccd0d5;
  --color-text: #1c1e21;
  --color-text-muted: #65676b;
  --color-fb: #1877f2;          /* primary */
  --color-fb-hover: #166fe5;
  --color-fb-soft: #e7f0fd;     /* selected category chip */
  --radius-card: 1rem;
  --radius-control: 0.5rem;
}
```

- **Typography:** Geist via `next/font/google` (CSS var `--font-sans`), system
  fallback. The mockup's rounded display face is a mockup artifact; Geist is the
  shadcn default and keeps the build neutral.
- **Spacing:** 4 px base grid; card gap 16 px; screen padding 16–24 px.
- **Radius:** cards 16 px, inputs/buttons 8–12 px, pills 999 px.
- **Focus:** visible ring in `--color-fb` on every interactive element.

## App shell

- Fixed **left sidebar** (288 px) + scrolling **main** area.
- Sidebar: blue circular "F" logo + "Marketplace" wordmark, then a "Categories"
  label and the 19-category vertical nav. Active category = `--color-fb-soft`
  background + blue text.
- Header/top-right: decorative mail, bell, and profile icons (out of scope).
- Mobile: sidebar collapses to a top bar with a hamburger drawer; the grid goes
  to 1–2 columns.

## Screens

### Home (`/`)

- Section heading: "Today's picks" by default, or the category name when a
  category is selected (`/?category=<slug>`).
- Optional search input (bonus).
- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
  2xl:grid-cols-5`, gap 16 px, newest first.
- **Listing card:** square photo (`aspect-square`, `object-cover`, rounded-2xl,
  1 px border), bold price, title clamped to 2 lines, muted location. Whole card
  links to `/item/[id]`; hover raises the shadow.

### Create (`/create`)

Two panes.

- Left panel (320 px): close (×), logo, "Create new listing" heading, a
  "Choose listing type" select, and the rows "Your listings" / "Seller help".
- Main: "Choose listing type" heading + four cards — **Item for sale**, Create
  multiple listings, Vehicle for sale, Home for sale or rent.
- Only **Item for sale** is enabled → `/create/item`. The other three are
  disabled with an "Unavailable" note (out of scope).

### Create item (`/create/item`)

Three columns on desktop, stacked on mobile.

- **Left (form):** "Add photos" dropzone, Title, Price, Email, Description, and
  a primary **Next** button.
- **Center (preview):** "Preview" label + large square photo that updates as the
  user picks an image.
- **Right (summary):** Title, Price, "Listed 1 hour ago in `<location>`", and a
  "Seller Information" block showing the seller (email, since there is no name
  field in scope).

### Listing detail (`/item/[id]`)

- **Left:** large photo (square/4:3, rounded-2xl).
- **Right rail:** title, price, "Listed 1 hour ago in `<location>`", "Seller
  Information" + seller, then "Send seller a message" label, a textarea
  (placeholder "I want to buy your bike!"), and a primary **Send** button.

## States

- **Loading:** skeleton cards in the grid; spinner on the detail/form.
- **Empty:** short message + guidance (e.g. "No listings yet — be the first to
  post one.").
- **Error:** inline alert with a retry action; form data is preserved.
- **Success:** inline confirmation, `aria-live="polite"`; the message form
  clears after send.

## Accessibility

- Every input has a visible `<label>` (or `aria-label`).
- Icons are `aria-hidden` unless they are the only label.
- Real `<button>` elements with disabled states while submitting.
- Focus-visible rings; text contrast ≥ 4.5:1.
- Images use `alt` derived from the listing title.
- Animations respect `prefers-reduced-motion`.

## Component inventory (shadcn)

`button`, `card`, `input`, `textarea`, `label`, `badge`, `select`, `separator`,
`skeleton`, `dialog` (mobile nav), `dropdown-menu` (top-right icons). Add more
only when a screen needs them.
