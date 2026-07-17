import { Component, FileCode, Package, Palette, Server, Wrench } from "lucide-react";
import { brand } from "@/theme";
import type { RepositoryUniverseData } from "./types";

/**
 * Mock Repository Universe data — fictional repository, standing in for
 * what a real backend response will eventually provide. Nothing in this
 * file is fetched or computed from an actual repository; see
 * RepositoryUniverse.tsx for how this shape maps to a future API
 * response.
 */
export const mockUniverseData: RepositoryUniverseData = {
  root: { label: "acme/aurora", meta: "TypeScript · 1.2k files" },
  nodes: [
    { id: "src", label: "src", meta: "128 files", color: brand.coral, icon: FileCode },
    { id: "components", label: "components", meta: "96 files", color: brand.violet, icon: Component },
    { id: "lib", label: "lib", meta: "64 files", color: brand.mint, icon: Package },
    { id: "utils", label: "utils", meta: "24 files", color: brand.amber, icon: Wrench },
    { id: "api", label: "api", meta: "40 files", color: brand.magenta, icon: Server },
    { id: "styles", label: "styles", meta: "38 files", color: brand.cyan, icon: Palette },
  ],
  connections: [
    { from: "root", to: "src" },
    { from: "root", to: "components" },
    { from: "root", to: "lib" },
    { from: "root", to: "utils" },
    { from: "root", to: "api" },
    { from: "root", to: "styles" },
    { from: "components", to: "lib" },
    { from: "components", to: "styles" },
    { from: "api", to: "lib" },
    { from: "utils", to: "lib" },
    { from: "src", to: "components" },
    { from: "src", to: "api" },
  ],
};
