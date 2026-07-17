import { motion } from "framer-motion";
import { brand, gradients } from "@/theme";
import { pulseGlow } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { AnalysisStageStatus } from "./AnalysisStage";

/**
 * AnalysisVisual — the same orbiting-constellation language as Hero's
 * HeroVisual, but data-driven instead of purely ambient: one satellite
 * node per analysis stage, and each node's brightness reflects that
 * stage's real status (pending/active/complete). The center orb
 * represents the repository itself; the whole assembly still slowly
 * rotates for ambient life, but *what's lit up* is meaningful here, not
 * just decorative — this is the visual payoff of the "repository becomes
 * a living graph" idea, reused deliberately rather than reinvented.
 */

const NODE_COLORS = [brand.coral, brand.mint, brand.amber, brand.magenta, brand.violet];
const RADIUS = 110;

interface AnalysisVisualProps {
  stageCount: number;
  statusFor: (index: number) => AnalysisStageStatus;
}

export function AnalysisVisual({ stageCount, statusFor }: AnalysisVisualProps) {
  const reduceMotion = usePrefersReducedMotion();

  const nodes = Array.from({ length: stageCount }, (_, index) => {
    const angle = (index / stageCount) * Math.PI * 2 - Math.PI / 2;
    return {
      x: Math.round(RADIUS * Math.cos(angle)),
      y: Math.round(RADIUS * Math.sin(angle)),
      color: NODE_COLORS[index % NODE_COLORS.length],
      status: statusFor(index),
    };
  });

  return (
    <div aria-hidden="true" className="relative h-[220px] w-[220px] sm:h-[260px] sm:w-[260px]">
      <motion.div
        className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ backgroundImage: gradients.warm }}
        {...pulseGlow({ minOpacity: 0.8, maxOpacity: 1, scaleRange: [0.95, 1.05], duration: 2.4, reduceMotion })}
      />

      <div className="animate-spin-slow absolute inset-0">
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="-140 -140 280 280" aria-hidden="true">
          {nodes.map((node, index) => (
            <line
              key={index}
              x1={0}
              y1={0}
              x2={node.x}
              y2={node.y}
              stroke={node.color}
              strokeWidth={1.5}
              strokeOpacity={node.status === "pending" ? 0.12 : node.status === "active" ? 0.5 : 0.35}
              className="transition-[stroke-opacity] duration-500"
            />
          ))}
        </svg>

        {nodes.map((node, index) => (
          <div
            key={index}
            className="absolute left-1/2 top-1/2 flex h-3.5 w-3.5 items-center justify-center rounded-full transition-opacity duration-500"
            style={{
              transform: `translate(calc(-50% + ${node.x}px), calc(-50% + ${node.y}px))`,
              backgroundColor: node.color,
              opacity: node.status === "pending" ? 0.25 : 1,
              boxShadow: node.status === "pending" ? "none" : `0 0 ${node.status === "active" ? 16 : 10}px ${node.color}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
