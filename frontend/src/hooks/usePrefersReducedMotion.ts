import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getInitialSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Tracks the user's `prefers-reduced-motion` OS/browser setting, live —
 * updates if they change it without reloading the page.
 *
 * A global CSS safety net already collapses animation/transition
 * durations to ~0 in `index.css`. This hook is for the cases that need
 * more than "make it instant": continuous/looping decorative motion
 * (drifting gradient blobs, orbiting particles) that should simply not
 * run at all for reduced-motion users, rather than flash through a
 * near-zero-duration loop.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(getInitialSnapshot);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(QUERY);
    const handleChange = () => setPrefersReduced(mediaQueryList.matches);

    handleChange();
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, []);

  return prefersReduced;
}
