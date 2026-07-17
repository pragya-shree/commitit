import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * ExplanationCard — a single labeled content section within the panel
 * (Summary, Purpose, Responsibilities, etc). Deliberately not another
 * glass surface — it lives *inside* AIExplanationPanel's own glass
 * container, and stacking a second full glass treatment on top of the
 * first would look muddy. Just typographic structure and consistent
 * spacing.
 */

interface ExplanationCardProps {
  icon?: LucideIcon;
  label: string;
  children: ReactNode;
}

export function ExplanationCard({ icon: Icon, label, children }: ExplanationCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </div>
      <div className="text-sm leading-relaxed text-ink-dim">{children}</div>
    </div>
  );
}
