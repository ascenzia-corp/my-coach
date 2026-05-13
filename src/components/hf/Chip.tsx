import type { CSSProperties, ReactNode } from "react";

export interface HFChipProps {
  children: ReactNode;
  tint?: string;
  style?: CSSProperties;
}

export function HFChip({ children, tint, style }: HFChipProps) {
  const bg = tint ? `${tint}22` : "var(--hf-fill)";
  const fg = tint ?? "var(--hf-label)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: -0.08,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
