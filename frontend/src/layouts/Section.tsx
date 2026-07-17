import { forwardRef, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { fadeUp } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PageContainer, type ContainerSize } from "./PageContainer";

/**
 * Section — the vertical-rhythm primitive for stacking major page
 * sections. Wraps its content in a PageContainer by default (so most
 * call sites need nothing but `<Section>...</Section>`) and, unless
 * disabled, fades content up as it scrolls into view using the shared
 * `fadeUp` preset — every section in the app gets this "content is
 * arriving" motion for free, consistently, without repeating variant
 * setup at every call site.
 *
 * The reveal animation lives on an inner `motion.div`, not the outer
 * element — that keeps the outer tag genuinely polymorphic (`as` can be
 * "section", "header", "div", anything) without needing Framer Motion's
 * dynamic-tag machinery, and keeps a plain, ref-forwardable element as
 * the actual landmark/semantic node.
 */

type SectionSpacing = "sm" | "md" | "lg" | "xl";

const spacingClasses: Record<SectionSpacing, string> = {
  sm: "py-12 sm:py-16",
  md: "py-16 sm:py-24",
  lg: "py-24 sm:py-32",
  xl: "py-32 sm:py-40",
};

interface SectionProps extends ComponentPropsWithoutRef<"section"> {
  as?: ElementType;
  /** Vertical padding scale. */
  spacing?: SectionSpacing;
  /** Wrap content in a PageContainer (width constraint + side padding). Default true. */
  container?: boolean;
  /** Width constraint to use when `container` is true. */
  containerSize?: ContainerSize;
  /** Fade content up as it scrolls into view. Default true. */
  animate?: boolean;
  children: ReactNode;
}

export const Section = forwardRef<HTMLElement, SectionProps>(
  (
    {
      as: Component = "section",
      spacing = "md",
      container = true,
      containerSize = "default",
      animate = true,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const reduceMotion = usePrefersReducedMotion();
    const content = container ? <PageContainer size={containerSize}>{children}</PageContainer> : children;

    return (
      <Component ref={ref} className={cn(spacingClasses[spacing], className)} {...props}>
        {animate ? (
          <motion.div
            variants={fadeUp({ reduceMotion })}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {content}
          </motion.div>
        ) : (
          content
        )}
      </Component>
    );
  },
);

Section.displayName = "Section";
