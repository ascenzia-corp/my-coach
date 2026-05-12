"use client";

import { useRef, useState } from "react";

interface PhotoCompareProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function PhotoCompare({ beforeSrc, afterSrc, beforeLabel = "T0", afterLabel = "Aujourd'hui" }: PhotoCompareProps) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterSrc} alt={afterLabel} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beforeSrc} alt={beforeLabel} className="absolute inset-0 h-full w-[100vw] max-w-none object-cover" />
      </div>

      <div className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
        {beforeLabel}
      </div>
      <div className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
        {afterLabel}
      </div>

      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow"
        style={{ left: `calc(${pos}% - 1px)` }}
      />

      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(parseInt(e.target.value, 10))}
        className="absolute inset-x-0 bottom-3 mx-auto block w-[80%] cursor-ew-resize accent-white"
        aria-label="Comparaison avant / après"
      />
    </div>
  );
}
