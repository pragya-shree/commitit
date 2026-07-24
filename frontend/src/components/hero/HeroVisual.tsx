import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { brand, gradients } from "@/theme";
import { pulseGlow } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * HeroVisual — a purely decorative "constellation": a glowing center
 * orb with satellite nodes slowly orbiting around it, connected by faint
 * lines. This is a teaser for the Repository Universe concept (a
 * repository becoming a living node graph), not the real feature —
 * there's no data here, just an abstract, brand-colored composition that
 * sets the tone before the real graph exists.
 *
 * The orbit rotates as a single group via the existing `animate-spin-slower`
 * CSS utility (transform-only, GPU-composited, already covered by the
 * global reduced-motion CSS rule) — only the center glow's breathing
 * pulse is Framer-driven and needs its own `usePrefersReducedMotion`
 * check. Connecting lines are static (no per-frame cost); all the motion
 * comes from the one rotating transform.
 */

const NODE_COLORS = [brand.coral, brand.mint, brand.amber, brand.magenta, brand.cyan, brand.violet];
const NODE_COUNT = 6;
const RADIUS = 150;

const nodes = Array.from({ length: NODE_COUNT }, (_, index) => {
  const angle = (index / NODE_COUNT) * Math.PI * 2;
  return {
    x: Math.round(RADIUS * Math.cos(angle)),
    y: Math.round(RADIUS * Math.sin(angle)),
    color: NODE_COLORS[index % NODE_COLORS.length],
  };
});

interface HeroVisualProps {
  className?: string;
}

export function HeroVisual({ className }: HeroVisualProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div aria-hidden="true" className={cn("relative h-[320px] w-[320px] sm:h-[380px] sm:w-[380px] lg:h-[440px] lg:w-[440px] xl:h-[480px] xl:w-[480px]", className)}>
      <motion.div
        className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_40px_rgba(255,107,82,0.4)]"
        style={{ backgroundImage: gradients.warm }}
        {...pulseGlow({ minOpacity: 0.75, maxOpacity: 1, scaleRange: [0.94, 1.06], duration: 4, reduceMotion })}
      />

      <div className="animate-spin-slower absolute inset-0">
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="-190 -190 380 380" aria-hidden="true">
          {nodes.map((node, index) => (
            <line key={index} x1={0} y1={0} x2={node.x} y2={node.y} stroke={node.color} strokeOpacity={0.25} strokeWidth={1} />
          ))}
        </svg>

        {nodes.map((node, index) => (
          <div
            key={index}
            className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full"
            style={{
              transform: `translate(calc(-50% + ${node.x}px), calc(-50% + ${node.y}px))`,
              backgroundColor: node.color,
              boxShadow: `0 0 12px ${node.color}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
