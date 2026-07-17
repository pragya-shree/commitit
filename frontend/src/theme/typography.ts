/**
 * Typography tokens.
 *
 * Three roles, deliberately: a characterful display face used with
 * restraint (headlines, big numbers), a quieter body face for everything
 * readable, and a mono face for anything that represents code, file
 * paths, or raw data — so the product visibly speaks "developer tool"
 * wherever it shows real repository content.
 */

export const fontFamily = {
  display: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
  body: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", monospace',
} as const;

/** Type scale, in rem. Matches the `text-*` sizes exposed in Tailwind via `@theme`. */
export const fontSize = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
  "5xl": "3rem",
  "6xl": "3.75rem",
  "7xl": "4.5rem",
  "8xl": "6rem",
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const letterSpacing = {
  tight: "-0.03em",
  snug: "-0.015em",
  normal: "0em",
  wide: "0.04em",
} as const;

export const lineHeight = {
  none: 1,
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.65,
} as const;
