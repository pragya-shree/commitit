import type { ExplanationObject } from "@/services/api";
import type { NodeExplanation } from "./types";

/**
 * Derives a NodeExplanation from the backend's real ExplanationObject
 * (POST /repository/{id}/explanation).
 *
 * What's real: `summary`, the responsibilities list (from
 * `function_explanations`), `relatedFiles` (from `file_explanations`),
 * and `keyRelationships` (from `dependency_explanations`) are all
 * genuine backend output for the specific question asked.
 *
 * What's *not* real: the backend has no "purpose" field distinct from
 * its overview text, so `purpose` reuses `architecture_overview` — a
 * legitimate substitute (it does describe how this part fits the
 * architecture), not a fabrication. `technologies` is left empty; the
 * backend doesn't do framework/technology detection at all (it's a
 * structural Python code analyzer, not a package-manifest scanner), so
 * there's nothing honest to put there — AIExplanationPanel only renders
 * that section when the list is non-empty, so it simply doesn't appear
 * for backend-sourced explanations rather than showing a fake or empty
 * section.
 */

const MAX_LIST_ITEMS = 6;

export function mapExplanationToNodeExplanation(nodeId: string, title: string, explanation: ExplanationObject): NodeExplanation {
  return {
    nodeId,
    title,
    summary: explanation.summary,
    purpose: explanation.architecture_overview,
    responsibilities: explanation.function_explanations.slice(0, MAX_LIST_ITEMS).map((fn) => `${fn.name} — ${fn.explanation}`),
    relatedFiles: explanation.file_explanations.slice(0, MAX_LIST_ITEMS).map((file) => ({
      path: file.path,
      description: file.explanation,
    })),
    technologies: [],
    keyRelationships: explanation.dependency_explanations.slice(0, MAX_LIST_ITEMS).map((dep) => ({
      targetNodeId: dep.symbol,
      label: dep.explanation,
    })),
  };
}