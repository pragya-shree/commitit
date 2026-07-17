import { motion } from "framer-motion";
import { brand } from "@/theme";
import { floating, pulseGlow } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * FloatingParticles — small glowing dots drifting and twinkling in the
 * background, composed from two existing presets rather than one
 * hand-rolled animation: an outer element drifts vertically via
 * `floating()`, an inner element pulses opacity/scale via `pulseGlow()`.
 * Nesting two presets like this (instead of merging their `animate`
 * objects by hand) keeps both reusable exactly as defined elsewhere.
 *
 * A fixed, hand-authored layout (not randomized positions) — curated
 * placement reads as intentional and avoids the occasional bad overlap
 * random generation can produce; positions stay identical across
 * renders instead of reshuffling.
 */

interface Particle {
  top: string;
  left: string;
  size: number;
  color: string;
  floatDistance: number;
  floatDuration: number;
  floatDelay: number;
  glowDuration: number;
  glowDelay: number;
}

const particles: Particle[] = [
  { top: "14%", left: "22%", size: 4, color: brand.coral, floatDistance: 18, floatDuration: 7, floatDelay: 0, glowDuration: 3.5, glowDelay: 0 },
  { top: "22%", left: "78%", size: 3, color: brand.mint, floatDistance: 14, floatDuration: 8, floatDelay: 0.6, glowDuration: 4, glowDelay: 0.4 },
  { top: "38%", left: "12%", size: 5, color: brand.violet, floatDistance: 20, floatDuration: 9, floatDelay: 1.2, glowDuration: 3.2, glowDelay: 0.8 },
  { top: "46%", left: "88%", size: 3, color: brand.amber, floatDistance: 12, floatDuration: 6.5, floatDelay: 0.3, glowDuration: 3.8, glowDelay: 1.1 },
  { top: "58%", left: "36%", size: 4, color: brand.magenta, floatDistance: 16, floatDuration: 7.5, floatDelay: 1.8, glowDuration: 4.2, glowDelay: 0.2 },
  { top: "68%", left: "64%", size: 3, color: brand.cyan, floatDistance: 14, floatDuration: 8.5, floatDelay: 0.9, glowDuration: 3.6, glowDelay: 1.4 },
  { top: "78%", left: "20%", size: 5, color: brand.coral, floatDistance: 20, floatDuration: 6, floatDelay: 2.1, glowDuration: 4.4, glowDelay: 0.6 },
  { top: "84%", left: "82%", size: 3, color: brand.violet, floatDistance: 12, floatDuration: 7.8, floatDelay: 1.5, glowDuration: 3.4, glowDelay: 1.7 },
  { top: "10%", left: "52%", size: 3, color: brand.mint, floatDistance: 16, floatDuration: 8.2, floatDelay: 0.5, glowDuration: 4, glowDelay: 0.9 },
  { top: "90%", left: "48%", size: 4, color: brand.amber, floatDistance: 18, floatDuration: 7.2, floatDelay: 1.9, glowDuration: 3.7, glowDelay: 0.3 },
];

export function FloatingParticles() {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="absolute inset-0">
      {particles.map((particle, index) => (
        <motion.div
          key={index}
          className="absolute"
          style={{ top: particle.top, left: particle.left }}
          {...floating({
            distance: particle.floatDistance,
            duration: particle.floatDuration,
            delay: particle.floatDelay,
            reduceMotion,
          })}
        >
          <motion.div
            className="rounded-full"
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 4}px ${particle.color}`,
            }}
            {...pulseGlow({
              duration: particle.glowDuration,
              delay: particle.glowDelay,
              reduceMotion,
            })}
          />
        </motion.div>
      ))}
    </div>
  );
}
