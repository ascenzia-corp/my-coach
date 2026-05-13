"use client";

import { useId } from "react";

export interface HFLineChartPoint {
  y: number;
  label?: string;
}

export interface HFLineChartProps {
  w?: number;
  h?: number;
  points: HFLineChartPoint[];
  color?: string;
  fill?: boolean;
  dots?: boolean;
  showAxis?: boolean;
  yMin?: number;
  yMax?: number;
}

// Smooth Bézier line chart with optional area fill gradient + final-point dot.
// Mirrors hifi-kit.jsx HFLineChart.
export function HFLineChart({
  w = 320,
  h = 130,
  points,
  color = "#34C759",
  fill = true,
  dots = false,
  showAxis = true,
  yMin,
  yMax,
}: HFLineChartProps) {
  const id = useId().replace(/:/g, "");
  const padX = 0;
  const padTop = 6;
  const padBot = showAxis ? 18 : 4;
  if (!points.length) return <svg width={w} height={h} />;

  const ys = points.map((p) => p.y);
  const minY = yMin ?? Math.min(...ys);
  const maxY = yMax ?? Math.max(...ys);
  const range = maxY - minY || 1;
  const px = (i: number) => padX + (i / Math.max(1, points.length - 1)) * (w - padX * 2);
  const py = (v: number) => padTop + (1 - (v - minY) / range) * (h - padTop - padBot);

  let path = `M ${px(0).toFixed(1)} ${py(points[0].y).toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const x0 = px(i - 1);
    const y0 = py(points[i - 1].y);
    const x1 = px(i);
    const y1 = py(points[i].y);
    const cx = (x0 + x1) / 2;
    path += ` C ${cx.toFixed(1)} ${y0.toFixed(1)}, ${cx.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  const fillPath = `${path} L ${px(points.length - 1).toFixed(1)} ${(h - padBot).toFixed(1)} L ${px(0).toFixed(1)} ${(h - padBot).toFixed(1)} Z`;

  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }} aria-hidden="true">
      <defs>
        <linearGradient id={`hfline-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.45} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={fillPath} fill={`url(#hfline-${id})`} />}
      <path d={path} stroke={color} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {dots && (
        <g>
          <circle cx={px(points.length - 1)} cy={py(points[points.length - 1].y)} r="6" fill={color} opacity="0.18" />
          <circle cx={px(points.length - 1)} cy={py(points[points.length - 1].y)} r="3" fill={color} />
          <circle
            cx={px(points.length - 1)}
            cy={py(points[points.length - 1].y)}
            r="3"
            fill="none"
            stroke="var(--hf-surface)"
            strokeWidth="1.5"
          />
        </g>
      )}
    </svg>
  );
}
