import { forwardRef, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/utils/cn";

/**
 * PageContainer — the horizontal-rhythm primitive. Centers content and
 * applies consistent, responsive side padding so nothing in the app ever
 * hand-rolls `max-w-* mx-auto px-*` again. `Section` composes this by
 * default; use it directly when you need the width constraint without
 * Section's vertical spacing/scroll-reveal behavior.
 */

export type ContainerSize = "narrow" | "default" | "wide" | "full";

const containerSizeClasses: Record<ContainerSize, string> = {
  /** Prose-width — long-form text, forms, anything that shouldn't stretch full-width. */
  narrow: "max-w-3xl",
  /** The standard content width for most sections. */
  default: "max-w-7xl",
  /** For wide layouts — dashboards, multi-column grids. */
  wide: "max-w-[1600px]",
  /** No width constraint, padding only — for content that manages its own width (e.g. a full-bleed background). */
  full: "max-w-none",
};

interface PageContainerProps extends ComponentPropsWithoutRef<"div"> {
  /** Renders as a different element/tag — e.g. "main", "header". Defaults to "div". */
  as?: ElementType;
  size?: ContainerSize;
  children: ReactNode;
}

export const PageContainer = forwardRef<HTMLElement, PageContainerProps>(
  ({ as: Component = "div", size = "default", className, children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12", containerSizeClasses[size], className)}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

PageContainer.displayName = "PageContainer";
