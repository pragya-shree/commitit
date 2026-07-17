import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { staggerContainer, staggerItem } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * SectionHeading — the standard "eyebrow / title / subtitle" block used
 * at the top of a Section. When `animate` is on (the default), the three
 * pieces reveal in a short stagger as they scroll into view, using the
 * same `staggerContainer`/`staggerItem` presets grids of cards use — so
 * a heading followed by a card grid reads as one continuous reveal
 * rather than two independently-timed animations.
 *
 * `titleAs` controls the semantic heading level (defaults to "h2", since
 * this is a *section* heading, not the page's single "h1") independently
 * of any visual styling — content structure and appearance shouldn't be
 * coupled.
 */

interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  /** Reveal the heading with a scroll-triggered stagger. Default true. */
  animate?: boolean;
  /** Semantic heading level for `title`. Default "h2". */
  titleAs?: "h1" | "h2" | "h3";
  /** Render `title` with the warm gradient treatment instead of solid ink. Use sparingly — one gradient headline per page reads as emphasis; several reads as noise. */
  gradientTitle?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  animate = true,
  titleAs: TitleTag = "h2",
  gradientTitle = false,
  className,
}: SectionHeadingProps) {
  const reduceMotion = usePrefersReducedMotion();
  const isCentered = align === "center";

  return (
    <motion.div
      className={cn("flex flex-col gap-3", isCentered ? "items-center text-center" : "items-start text-left", className)}
      variants={animate ? staggerContainer({ reduceMotion }) : undefined}
      initial={animate ? "hidden" : undefined}
      whileInView={animate ? "visible" : undefined}
      viewport={animate ? { once: true, margin: "-60px" } : undefined}
    >
      {eyebrow && (
        <motion.span
          variants={animate ? staggerItem({ reduceMotion }) : undefined}
          className="inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wide text-coral"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral" aria-hidden="true" />
          {eyebrow}
        </motion.span>
      )}

      <motion.div variants={animate ? staggerItem({ reduceMotion }) : undefined}>
        <TitleTag
          className={cn(
            "font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl",
            gradientTitle ? "text-gradient-warm" : "text-ink",
          )}
        >
          {title}
        </TitleTag>
      </motion.div>

      {subtitle && (
        <motion.p
          variants={animate ? staggerItem({ reduceMotion }) : undefined}
          className={cn("max-w-2xl text-base text-ink-dim sm:text-lg", isCentered && "mx-auto")}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
