"use client";

import { useId } from "react";

export interface HFRingProps {
  size?: number;
  stroke?: number;
  progress: number;
  color: string;
  track?: string;
}

// Apple Fitness-style activity ring. Stroke with rounded cap, linear gradient
// 100% → 85% opacity, plus a "shine" dot at the head of the progress arc.
export function HFRing({ size = 200, stroke = 22, progress, color, track }: HFRingProps) {
  const id = useId().replace(/:/g, "");
  const trackColor = track ?? `${color}26`; // 0x26 ≈ 15% alpha
  const p = Math.max(0, Math.min(progress, 1));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - p);

  const angle = -90 + p * 360;
  const shineX = size / 2 + r * Math.cos((angle * Math.PI) / 180);
  const shineY = size / 2 + r * Math.sin((angle * Math.PI) / 180);

  return (
    <svg width={size} height={size} style={{ display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id={`hfring-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#hfring-${id})`}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {p > 0.04 && (
        <circle cx={shineX} cy={shineY} r={stroke / 2 - 1.5} fill={color} opacity="0.45" />
      )}
    </svg>
  );
}
