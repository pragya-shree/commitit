import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind-conflict resolution. Use this instead
 * of raw template strings whenever a component accepts a `className`
 * prop or composes conditional classes, so a later class always wins
 * over an earlier conflicting one (e.g. a consumer's `p-8` overriding a
 * component's default `p-4`) instead of both landing in the DOM.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
