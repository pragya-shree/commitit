import { useRef, type MouseEvent, type RefObject } from "react";
import { useMotionValue, useSpring, type MotionValue } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { transition } from "@/theme";

/**
 * Magnetic hover — the pointer "pulls" an element slightly toward
 * itself within a small radius. Unlike the other presets in this
 * module, this can't be a static variant: it has to read live pointer
 * position, so it's a hook instead.
 *
 * Usage:
 * ```tsx
 * const { ref, x, y, onMouseMove, onMouseLeave } = useMagneticHover();
 * <motion.button ref={ref} style={{ x, y }} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} />
 * ```
 *
 * Automatically disabled under `prefers-reduced-motion` — pointer move
 * events simply stop updating the offset, so the element stays put.
 */

interface MagneticHoverOptions {
  /** Fraction (0–1) of the pointer's offset from center that the element follows. */
  strength?: number;
  /** Maximum pull distance in px, regardless of pointer distance. */
  max?: number;
}

interface MagneticHoverResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  onMouseMove: (event: MouseEvent<T>) => void;
  onMouseLeave: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function useMagneticHover<T extends HTMLElement = HTMLElement>({
  strength = 0.35,
  max = 16,
}: MagneticHoverOptions = {}): MagneticHoverResult<T> {
  const ref = useRef<T>(null);
  const reduceMotion = usePrefersReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: transition.springSoft.stiffness, damping: transition.springSoft.damping });
  const y = useSpring(rawY, { stiffness: transition.springSoft.stiffness, damping: transition.springSoft.damping });

  function onMouseMove(event: MouseEvent<T>) {
    if (reduceMotion || !ref.current) return;

    const bounds = ref.current.getBoundingClientRect();
    const offsetX = event.clientX - (bounds.left + bounds.width / 2);
    const offsetY = event.clientY - (bounds.top + bounds.height / 2);

    rawX.set(clamp(offsetX * strength, -max, max));
    rawY.set(clamp(offsetY * strength, -max, max));
  }

  function onMouseLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return { ref, x, y, onMouseMove, onMouseLeave };
}
