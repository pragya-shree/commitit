import { motion } from "framer-motion";
import { Braces, FileCode, Folder, GitBranch, Hash, Terminal, type LucideIcon } from "lucide-react";
import { floating } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * FloatingCodeIcons — faint, drifting code/repository glyphs that read
 * as atmospheric texture rather than UI. Kept at low opacity and a
 * gentle rotation so they never compete with real content layered on
 * top of the background; this is the visual cue that the "living
 * universe" this product builds is made of code.
 */

interface CodeIcon {
  icon: LucideIcon;
  top: string;
  left: string;
  size: number;
  rotation: number;
  opacity: number;
  floatDistance: number;
  floatDuration: number;
  floatDelay: number;
}

const codeIcons: CodeIcon[] = [
  { icon: Braces, top: "18%", left: "86%", size: 28, rotation: -8, opacity: 0.16, floatDistance: 16, floatDuration: 9, floatDelay: 0 },
  { icon: GitBranch, top: "30%", left: "6%", size: 24, rotation: 6, opacity: 0.14, floatDistance: 14, floatDuration: 10, floatDelay: 1.2 },
  { icon: Terminal, top: "50%", left: "92%", size: 26, rotation: -4, opacity: 0.15, floatDistance: 18, floatDuration: 8.5, floatDelay: 0.7 },
  { icon: FileCode, top: "72%", left: "10%", size: 30, rotation: 10, opacity: 0.13, floatDistance: 16, floatDuration: 9.5, floatDelay: 2 },
  { icon: Folder, top: "86%", left: "70%", size: 24, rotation: -6, opacity: 0.14, floatDistance: 12, floatDuration: 7.5, floatDelay: 1.6 },
  { icon: Hash, top: "8%", left: "40%", size: 22, rotation: 4, opacity: 0.12, floatDistance: 14, floatDuration: 8, floatDelay: 0.4 },
];

export function FloatingCodeIcons() {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="absolute inset-0">
      {codeIcons.map(({ icon: Icon, top, left, size, rotation, opacity, floatDistance, floatDuration, floatDelay }, index) => (
        <motion.div
          key={index}
          className="absolute text-ink"
          style={{ top, left, opacity, rotate: rotation }}
          {...floating({ distance: floatDistance, duration: floatDuration, delay: floatDelay, reduceMotion })}
        >
          <Icon width={size} height={size} strokeWidth={1.5} aria-hidden="true" />
        </motion.div>
      ))}
    </div>
  );
}
