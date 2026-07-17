/**
 * NoiseOverlay — a very subtle static grain texture over the whole
 * background, using the `bg-noise` utility already defined in
 * index.css. Purely static (no animation, no per-frame cost) — grain is
 * meant to break up gradient banding and add a tactile, premium feel,
 * not to move.
 */
export function NoiseOverlay() {
  return <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.035]" />;
}
