// HF design tokens — Apple Health × Tesla × Google sobre.
// Mirror of hifi-kit.jsx, exposed as TS constants for inline styles.
// Color CSS variables live in src/app/globals.css.

export const HF = {
  bg: "var(--hf-bg)",
  surface: "var(--hf-surface)",
  surfaceAlt: "var(--hf-surface-alt)",
  label: "var(--hf-label)",
  label2: "var(--hf-label2)",
  label3: "var(--hf-label3)",
  separator: "var(--hf-separator)",
  fill: "var(--hf-fill)",
  fill2: "var(--hf-fill2)",

  green: "#34C759",
  blue: "#0A84FF",
  orange: "#FF9500",
  red: "#FF3B30",
  indigo: "#5856D6",
  pink: "#FF2D55",
  yellow: "#FFCC00",
  gray: "#8E8E93",
} as const;

export type HFTint = "green" | "blue" | "orange" | "red" | "indigo" | "pink" | "yellow" | "gray";

export function tintHex(t: HFTint): string {
  return HF[t];
}

// 12% alpha background for icon containers / state pills (e.g. "1F" hex suffix).
export function tintBg(t: HFTint, alpha = 0x1f): string {
  const hex = HF[t].replace("#", "");
  const a = alpha.toString(16).padStart(2, "0");
  return `#${hex}${a}`;
}
