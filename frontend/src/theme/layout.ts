/**
 * Spacing, radius, shadow, blur, and z-index tokens.
 *
 * Spacing follows Tailwind's default 4px rhythm — not redeclared here,
 * just documented, since `p-4`/`gap-6`/etc already do the right thing.
 * What *does* need a single source of truth is anything that isn't a
 * built-in Tailwind scale: our specific radii, glow shadows, blur steps,
 * and the app-wide z-index order (easy to get wrong once background,
 * nav, panels, and modals are all layered).
 */

/** 4px base spacing rhythm, exposed for JS contexts (e.g. animation offsets) that need a number, not a class. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

export const radius = {
  sm: "0.5rem",
  md: "0.875rem",
  lg: "1.25rem",
  xl: "1.75rem",
  "2xl": "2.5rem",
  full: "9999px",
} as const;

/**
 * Glow shadows are this product's signature elevation — soft, colored,
 * diffuse, instead of a neutral drop shadow. Neutral shadows still exist
 * for cases where a glow would be too loud (e.g. small UI chrome).
 */
export const shadow = {
  sm: "0 2px 8px -2px rgba(13, 8, 23, 0.4)",
  md: "0 8px 24px -6px rgba(13, 8, 23, 0.5)",
  lg: "0 20px 48px -12px rgba(13, 8, 23, 0.6)",
  glowCoral: "0 0 60px -12px rgba(255, 107, 82, 0.55)",
  glowMagenta: "0 0 60px -12px rgba(255, 79, 163, 0.5)",
  glowViolet: "0 0 60px -12px rgba(139, 92, 246, 0.5)",
  glowMint: "0 0 60px -12px rgba(47, 230, 184, 0.45)",
} as const;

export const blur = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "40px",
  "2xl": "80px",
} as const;

/**
 * App-wide stacking order. Import this instead of picking an arbitrary
 * z-index — every layered surface (background, ambient decoration, page
 * content, sticky nav, overlays, toasts) should resolve to one of these.
 */
export const zIndex = {
  background: 0,
  decoration: 10,
  content: 20,
  stickyNav: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
} as const;
