import type { CSSProperties, ReactNode } from "react";

export interface HFCardProps {
  children: ReactNode;
  padding?: number | string;
  style?: CSSProperties;
  className?: string;
  color?: string;
}

export function HFCard({ children, padding = 16, color, style, className }: HFCardProps) {
  const pad = typeof padding === "number" ? `${padding}px` : padding;
  return (
    <div
      className={["hf-card", className].filter(Boolean).join(" ")}
      style={{ padding: pad, background: color ?? "var(--hf-surface)", ...style }}
    >
      {children}
    </div>
  );
}
