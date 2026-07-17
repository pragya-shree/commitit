import { motion } from "framer-motion";
import { easing } from "@/theme";
import type { ConnectionVisualState } from "./types";

/**
 * RepositoryConnection — a single line between two node positions, plus
 * a small glowing dot that continuously travels along it (the "soft
 * pulse" requirement). The line itself is a static `<line>` (cheap,
 * CSS-transitioned opacity/width only on state change); the traveling
 * dot is the only continuously-animated part, and is skipped entirely
 * under reduced motion rather than just slowed down — a moving dot is
 * literally motion, so it's removed, not softened.
 */

interface RepositoryConnectionProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  state: ConnectionVisualState;
  pulseDuration: number;
  pulseDelay: number;
  reduceMotion: boolean;
}

export function RepositoryConnection({ x1, y1, x2, y2, color, state, pulseDuration, pulseDelay, reduceMotion }: RepositoryConnectionProps) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={state === "active" ? 2 : 1}
        strokeOpacity={state === "dimmed" ? 0.08 : state === "active" ? 0.6 : 0.22}
        className="transition-[stroke-opacity,stroke-width] duration-300"
      />

      {!reduceMotion && (
        <motion.circle
          r={state === "active" ? 3 : 2}
          fill={color}
          animate={{ cx: [x1, x2], cy: [y1, y2], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: pulseDuration,
            delay: pulseDelay,
            repeat: Infinity,
            ease: easing.linear,
            times: [0, 0.15, 0.85, 1],
          }}
        />
      )}
    </g>
  );
}
