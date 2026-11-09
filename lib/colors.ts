import type { CSSProperties } from "react";
import type { ColorKey } from "./types";

// Muted "book-cloth" hues. Components mix them with the page colours
// (see `.tone` in globals.css) so each works in light and dark mode.
export const CATEGORY_COLORS: Record<ColorKey, { label: string; hex: string }> = {
  claret: { label: "Claret", hex: "#9b2c3e" },
  indigo: { label: "Indigo", hex: "#4152a8" },
  sage: { label: "Sage", hex: "#4c7a59" },
  ochre: { label: "Ochre", hex: "#a97618" },
  teal: { label: "Teal", hex: "#1d7a80" },
  plum: { label: "Plum", hex: "#7c3f8d" },
  slate: { label: "Slate", hex: "#526273" },
  terracotta: { label: "Terracotta", hex: "#b4532a" },
  olive: { label: "Olive", hex: "#6b7a26" },
  rose: { label: "Rose", hex: "#b2466d" },
  navy: { label: "Navy", hex: "#24497a" },
  copper: { label: "Copper", hex: "#99592a" },
};

export const COLOR_KEYS = Object.keys(CATEGORY_COLORS) as ColorKey[];

export function isColorKey(value: unknown): value is ColorKey {
  return typeof value === "string" && value in CATEGORY_COLORS;
}

/** Inline style that feeds a category colour into the `.tone` utilities. */
export function toneStyle(color: ColorKey | undefined | null): CSSProperties {
  const hex = CATEGORY_COLORS[color ?? "slate"]?.hex ?? CATEGORY_COLORS.slate.hex;
  return { "--c": hex } as CSSProperties;
}
