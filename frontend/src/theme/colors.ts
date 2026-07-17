/**
 * Color tokens.
 *
 * These are the single source of truth for every hex value used in JS/TS
 * (Framer Motion animated colors, inline SVG fills, canvas-ish gradient
 * math, etc). They intentionally mirror the CSS custom properties defined
 * in `src/index.css` (--color-*) — if you change a value here, change it
 * there too. Components should never hardcode a hex value; import from
 * here (in TS/JS) or use the matching Tailwind utility (in JSX className,
 * e.g. `bg-coral`, `text-mint`).
 *
 * Palette intent: coral/amber/magenta carry the most visual weight as the
 * "warm signature" of the product. Violet supplies depth and shadow, not
 * dominance. Mint reads as "alive/healthy" (used for success and active
 * states). Cyan is a rare accent only — never a primary surface color.
 * Blue is deliberately absent as a dominant hue.
 */

export const voidScale = {
  950: "#0d0817",
  900: "#140c22",
  800: "#1d132e",
  700: "#291b3e",
  600: "#382852",
} as const;

export const brand = {
  coral: "#ff6b52",
  coralLight: "#ff9478",
  amber: "#ffb84d",
  magenta: "#ff4fa3",
  violet: "#8b5cf6",
  violetDeep: "#6d28d9",
  mint: "#2fe6b8",
  cyan: "#22d3ee",
} as const;

export const ink = {
  DEFAULT: "#f5f1ff",
  dim: "#c9bfe0",
  faint: "#8b7fa8",
} as const;

/** Semantic aliases so components describe *intent*, not a specific hue. */
export const semantic = {
  accentPrimary: brand.coral,
  accentSecondary: brand.magenta,
  accentTertiary: brand.violet,
  success: brand.mint,
  info: brand.cyan,
  background: voidScale[950],
  surface: voidScale[800],
  border: voidScale[600],
} as const;

/**
 * Named gradients, expressed as CSS `background-image` values so they can
 * be dropped directly into a `style` prop or interpolated by Framer
 * Motion. Keep new gradients here rather than composing ad hoc ones
 * inline, so the palette stays consistent across the app.
 */
export const gradients = {
  /** The core brand gradient — warm, used for primary CTAs and headline accents. */
  warm: `linear-gradient(100deg, ${brand.coral} 0%, ${brand.magenta} 55%, ${brand.violet} 100%)`,
  /** Softer variant for large background washes. */
  warmSoft: `linear-gradient(135deg, ${brand.coral} 0%, ${brand.amber} 30%, ${brand.magenta} 70%, ${brand.violet} 100%)`,
  /** "Alive" gradient — mint into cyan, used sparingly for active/success accents. */
  alive: `linear-gradient(120deg, ${brand.mint} 0%, ${brand.cyan} 100%)`,
  /** The mesh background wash, layered as multiple radial gradients. */
  mesh: [
    `radial-gradient(45% 40% at 15% 20%, ${brand.coral}55 0%, transparent 70%)`,
    `radial-gradient(50% 45% at 85% 15%, ${brand.violet}4d 0%, transparent 70%)`,
    `radial-gradient(55% 50% at 80% 85%, ${brand.magenta}4a 0%, transparent 70%)`,
    `radial-gradient(40% 40% at 10% 85%, ${brand.mint}3d 0%, transparent 70%)`,
    `radial-gradient(35% 35% at 50% 50%, ${brand.amber}26 0%, transparent 70%)`,
  ].join(", "),
} as const;

export type BrandColor = keyof typeof brand;
