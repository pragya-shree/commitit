import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/animations";
import { transition as motionTransition, brand } from "@/theme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ExplanationHeader } from "./ExplanationHeader";
import { ExplanationCard } from "./ExplanationCard";
import { RelatedFiles } from "./RelatedFiles";
import { TypingIndicator } from "./TypingIndicator";
import { EmptyExplanationState } from "./EmptyExplanationState";
import type { NodeExplanation } from "./types";

/**
 * AIExplanationPanel — a glass drawer sliding in from the right,
 * showing structured knowledge about whatever node is currently
 * selected in RepositoryUniverse. Deliberately not a chat interface:
 * there's no message history, no input box, just the current node's
 * explanation appearing as if it surfaced directly from the graph.
 *
 * Future backend integration point: `explanation` is the only data this
 * component needs — a real integration swaps `mockExplanationData`
 * (looked up by whatever composes this panel, e.g. UniversePage) for a
 * live call to the Context Builder / Explanation Engine, keyed by the
 * same node id the graph already uses. Nothing in this component or its
 * children needs to change for that swap.
 *
 * Uses the `glass-panel` utility class directly rather than the
 * GlassPanel component — GlassPanel applies one uniform border-radius to
 * every corner, which is wrong for an edge-anchored drawer (the two
 * corners flush against the viewport edge shouldn't round). Reusing the
 * same underlying CSS utility keeps the surface visually consistent with
 * every other glass component without forcing GlassPanel's API to do
 * something it isn't shaped for.
 */

interface AIExplanationPanelProps {
  open: boolean;
  explanation: NodeExplanation | null;
  /** Accent color for the header dot/glow — typically the selected node's brand color. */
  accentColor?: string;
  onClose: () => void;
}

const REVEAL_DELAY_MS = 550;

export function AIExplanationPanel({ open, explanation, accentColor = brand.coral, onClose }: AIExplanationPanelProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [isRevealing, setIsRevealing] = useState(false);
  const lastNodeIdRef = useRef<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Briefly show TypingIndicator whenever the selected node actually
  // changes (not on every re-render) — sells the "knowledge emerging"
  // feeling on each switch without being slow enough to annoy.
  useEffect(() => {
    if (!explanation || explanation.nodeId === lastNodeIdRef.current) return;
    lastNodeIdRef.current = explanation.nodeId;
    setIsRevealing(true);
    const timeout = window.setTimeout(() => setIsRevealing(false), REVEAL_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [explanation]);

  useEffect(() => {
    if (!open) {
      lastNodeIdRef.current = null;
      return;
    }
    closeButtonRef.current?.focus();
  }, [open]);

  // Escape-to-close — a lightweight nod to dialog semantics without
  // implementing full focus-trapping, which felt disproportionate for a
  // frontend-only mock experience.
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
            className="fixed inset-0 z-40 bg-void-950/20"
            onClick={onClose}
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduceMotion ? 1 : 0 }}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Repository node explanation"
            className="glass-panel fixed inset-y-0 right-0 z-50 flex w-full flex-col rounded-l-2xl sm:w-[420px]"
            initial={{ x: reduceMotion ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : "100%" }}
            transition={motionTransition.springSoft}
          >
            <div className="flex flex-1 flex-col overflow-hidden p-6">
              {explanation ? (
                <>
                  <ExplanationHeader
                    title={explanation.title}
                    accentColor={accentColor}
                    onClose={onClose}
                    closeButtonRef={closeButtonRef}
                  />

                  <div className="flex-1 overflow-y-auto pt-6">
                    {isRevealing ? (
                      <TypingIndicator />
                    ) : (
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
}
