"use client";

import { HFRing } from "./Ring";

export interface HFRingSpec {
  stroke: number;
  progress: number;
  color: string;
}

export interface HFRingsStackProps {
  rings: HFRingSpec[];
  size?: number;
  gap?: number;
}

// Stacked Apple Fitness rings — outer→inner.
export function HFRingsStack({ rings, size = 220, gap = 3 }: HFRingsStackProps) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {rings.map((r, i) => {
        const inset = i * (rings[0].stroke + gap);
        const s = size - inset * 2;
        return (
          <div key={i} style={{ position: "absolute", top: inset, left: inset }}>
            <HFRing size={s} stroke={r.stroke} progress={r.progress} color={r.color} />
          </div>
        );
      })}
    </div>
  );
}
