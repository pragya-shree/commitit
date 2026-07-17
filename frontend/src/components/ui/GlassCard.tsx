import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import {
  AnimatedCard,
  type GlassPadding,
  type GlassRadius,
  type GlassVariant,
  type GlowColor,
} from "@/layouts";

/**
 * GlassCard — the generic content-card primitive: title/description/
 * header/footer slots on top of AnimatedCard's surface + motion. This is
 * deliberately the layer that adds "card content structure" that
 * AnimatedCard itself stays free of, so AnimatedCard remains reusable
 * for non-card-shaped content too.
 *
 * Still fully generic — no repository/AI/product-specific fields, just
 * the universal "optional header, optional title+description, body,
 * optional footer" shape any card-based UI needs.
 */

type NativeDivProps = Omit<ComponentPropsWithoutRef<"div">, "title">;

interface GlassCardProps extends NativeDivProps {
  as?: ElementType;
  title?: ReactNode;
  description?: ReactNode;
  /** Custom content above the title/description block (e.g. an icon or badge row). */
  header?: ReactNode;
  footer?: ReactNode;
  /** "hover" lifts slightly on hover (default); "static" has no hover motion. */
  interaction?: "hover" | "static";
  variant?: GlassVariant;
  padding?: GlassPadding;
  radius?: GlassRadius;
  glow?: GlowColor;
  gradientBorder?: boolean;
  children?: ReactNode;
}

export function GlassCard({
  as,
  title,
  description,
  header,
  footer,
  interaction = "hover",
  variant,
  padding,
  radius,
  glow,
  gradientBorder,
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <AnimatedCard
      as={as}
      variant={variant}
      padding={padding}
      radius={radius}
      glow={glow}
      gradientBorder={gradientBorder}
      hoverLift={interaction === "hover"}
      className={className}
      {...props}
    >
      <div className="flex h-full flex-col gap-4">
        {header}

        {(title || description) && (
          <div className="flex flex-col gap-1.5">
            {title && <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>}
            {description && <p className="text-sm leading-relaxed text-ink-dim">{description}</p>}
          </div>
        )}

        {children && <div className="flex-1">{children}</div>}

        {footer && <div className="mt-auto border-t border-white/10 pt-4">{footer}</div>}
      </div>
    </AnimatedCard>
  );
}
