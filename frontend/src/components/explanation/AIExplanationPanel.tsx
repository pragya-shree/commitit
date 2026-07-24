import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/animations";
import { transition as motionTransition, brand } from "@/theme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { GradientButton } from "@/components/ui";
import { ExplanationHeader } from "./ExplanationHeader";
import { ExplanationCard } from "./ExplanationCard";
import { RelatedFiles } from "./RelatedFiles";
import { TypingIndicator } from "./TypingIndicator";
import { EmptyExplanationState } from "./EmptyExplanationState";
import type { NodeExplanation } from "./types";

interface AIExplanationPanelProps {
  open: boolean;
  title: string | null;
  explanation: NodeExplanation | null;
  loading?: boolean;
  error?: string | null;
  accentColor?: string;
  onClose: () => void;
  onRetry?: () => void;
}

export const AIExplanationPanel = React.memo(function AIExplanationPanel({
  open,
  title,
  explanation,
  loading = false,
  error = null,
  accentColor = brand.coral,
  onClose,
  onRetry,
}: AIExplanationPanelProps) {
  const reduceMotion = usePrefersReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-void-950/20 sm:hidden"
            onClick={onClose}
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduceMotion ? 1 : 0 }}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Repository node explanation"
            style={{ willChange: "transform, opacity" }}
            className="glass-panel fixed top-20 bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] flex-col rounded-2xl sm:w-[420px]"
            initial={{ x: reduceMotion ? 0 : "110%" }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : "110%" }}
            transition={motionTransition.springSoft}
          >
            <div className="flex flex-1 flex-col overflow-hidden p-6">
              {title ? (
                <>
                  <ExplanationHeader title={title} accentColor={accentColor} onClose={onClose} closeButtonRef={closeButtonRef} />

                  <div className="flex-1 overflow-y-auto pt-6">
                    {loading ? (
                      <TypingIndicator />
                    ) : error ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                        <p className="max-w-[240px] text-sm text-ink-dim">{error}</p>
                        {onRetry && (
                          <GradientButton variant="secondary" size="sm" onClick={onRetry}>
                            Try again
                          </GradientButton>
                        )}
                      </div>
                    ) : explanation ? (
                      <motion.div
                        className="flex flex-col gap-6"
                        variants={staggerContainer({ reduceMotion })}
                        initial="hidden"
                        animate="visible"
                      >
                        <motion.div variants={staggerItem({ reduceMotion })}>
                          <ExplanationCard label="Summary">{explanation.summary}</ExplanationCard>
                        </motion.div>

                        <motion.div variants={staggerItem({ reduceMotion })}>
                          <ExplanationCard label="Purpose">{explanation.purpose}</ExplanationCard>
                        </motion.div>

                        {explanation.responsibilities.length > 0 && (
                          <motion.div variants={staggerItem({ reduceMotion })}>
                            <ExplanationCard label="Responsibilities">
                              <ul className="flex flex-col gap-1.5">
                                {explanation.responsibilities.map((item) => (
                                  <li key={item} className="flex gap-2">
                                    <span className="text-coral">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </ExplanationCard>
                          </motion.div>
                        )}

                        {explanation.technologies.length > 0 && (
                          <motion.div variants={staggerItem({ reduceMotion })}>
                            <ExplanationCard label="Technologies">
                              <div className="flex flex-wrap gap-2">
                                {explanation.technologies.map((tech) => (
                                  <span
                                    key={tech}
                                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-ink-dim"
                                  >
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </ExplanationCard>
                          </motion.div>
                        )}

                        {explanation.keyRelationships.length > 0 && (
                          <motion.div variants={staggerItem({ reduceMotion })}>
                            <ExplanationCard label="Key relationships">
                              <div className="flex flex-wrap gap-2">
                                {explanation.keyRelationships.map((relationship) => (
                                  <span
                                    key={relationship.targetNodeId}
                                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-ink-dim"
                                  >
                                    {relationship.label}
                                  </span>
                                ))}
                              </div>
                            </ExplanationCard>
                          </motion.div>
                        )}

                        {explanation.relatedFiles.length > 0 && (
                          <motion.div variants={staggerItem({ reduceMotion })}>
                            <ExplanationCard label="Related files">
                              <RelatedFiles files={explanation.relatedFiles} />
                            </ExplanationCard>
                          </motion.div>
                        )}
                      </motion.div>
                    ) : (
                      <EmptyExplanationState onClose={onClose} />
                    )}
                  </div>
                </>
              ) : (
                <EmptyExplanationState onClose={onClose} />
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
});