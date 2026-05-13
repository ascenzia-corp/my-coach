"use client";

export interface HFBarChartProps {
  w?: number;
  h?: number;
  values: number[];
  color?: string;
  goal?: number;
}

// Compact bar chart. Last bar full opacity, others 0.55. Optional dashed
// goal line. Mirrors hifi-kit.jsx HFBarChart.
export function HFBarChart({ w = 130, h = 42, values, color = "#0A84FF", goal }: HFBarChartProps) {
  if (!values.length) return <svg width={w} height={h} aria-hidden="true" />;
  const max = Math.max(...values, goal ?? 0);
  if (max <= 0) return <svg width={w} height={h} aria-hidden="true" />;
  const bw = w / values.length;
  return (
    <svg width={w} height={h} style={{ display: "block" }} aria-hidden="true">
      {goal !== undefined && (
        <line
          x1={0}
          x2={w}
          y1={h - (goal / max) * (h - 4) - 2}
          y2={h - (goal / max) * (h - 4) - 2}
          stroke="var(--hf-label3)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      )}
      {values.map((v, i) => {
        const bh = Math.max(2, (Math.max(0, v) / max) * (h - 6));
        return (
          <rect
            key={i}
            x={i * bw + bw * 0.18}
            y={h - bh - 2}
            width={bw * 0.64}
            height={bh}
            rx={Math.min(bw * 0.32, 4)}
            fill={color}
            opacity={i === values.length - 1 ? 1 : 0.55}
          />
        );
      })}
    </svg>
  );
}
