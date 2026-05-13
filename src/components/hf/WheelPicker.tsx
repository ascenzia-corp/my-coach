"use client";

import { useEffect, useRef, useState } from "react";

export interface HFWheelPickerProps {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  itemHeight?: number;
  visibleCount?: number;
  width?: number | string;
}

// iOS UIDatePicker-style wheel built on native scroll-snap so iOS Safari
// gets real touch momentum. The 3D perspective effect is computed on scroll
// via requestAnimationFrame; rounded final index emits onChange after the
// scroll settles (snap completes).
export function HFWheelPicker({
  values,
  selectedIndex,
  onChange,
  itemHeight = 38,
  visibleCount = 5,
  width = 56,
}: HFWheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastEmittedRef = useRef<number>(selectedIndex);
  const [scrollTop, setScrollTop] = useState(selectedIndex * itemHeight);
  const center = Math.floor(visibleCount / 2);
  const padHeight = center * itemHeight;

  // Sync incoming selectedIndex → scroll position (e.g. preset taps).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = selectedIndex * itemHeight;
    if (Math.abs(el.scrollTop - target) > 1) {
      el.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [selectedIndex, itemHeight]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(el.scrollTop);
    });
    if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      const idx = Math.round(el.scrollTop / itemHeight);
      const clamped = Math.max(0, Math.min(values.length - 1, idx));
      if (clamped !== lastEmittedRef.current) {
        lastEmittedRef.current = clamped;
        onChange(clamped);
      }
    }, 110);
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        height: visibleCount * itemHeight,
        width,
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        position: "relative",
        touchAction: "pan-y",
      }}
      className="hf-wheel"
    >
      <div style={{ height: padHeight }} aria-hidden="true" />
      {values.map((v, i) => {
        const itemCenter = i * itemHeight + itemHeight / 2;
        const focusCenter = scrollTop + itemHeight / 2;
        const distance = (itemCenter - focusCenter) / itemHeight;
        const absDist = Math.abs(distance);
        const opacity = absDist < 0.5 ? 1 : absDist < 1.5 ? 0.42 : 0.18;
        const fontSize = absDist < 0.5 ? 30 : absDist < 1.5 ? 22 : 18;
        const rotation = Math.max(-36, Math.min(36, distance * 18));
        return (
          <div
            key={i}
            style={{
              height: itemHeight,
              lineHeight: `${itemHeight}px`,
              fontSize,
              fontFamily: "var(--hf-font-round)",
              fontWeight: 600,
              letterSpacing: -0.8,
              fontVariantNumeric: "tabular-nums",
              textAlign: "center",
              color: absDist < 0.5 ? "var(--hf-label)" : "var(--hf-label2)",
              opacity,
              transform: `perspective(200px) rotateX(${rotation}deg)`,
              scrollSnapAlign: "center",
              transition: "font-size .12s, opacity .12s",
            }}
          >
            {v}
          </div>
        );
      })}
      <div style={{ height: padHeight }} aria-hidden="true" />
    </div>
  );
}
