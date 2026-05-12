"use client";

import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuickInputProps {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  decimals?: number;
}

export function QuickInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  decimals = 0,
}: QuickInputProps) {
  const display = value == null ? "" : value.toFixed(decimals);
  const sliderValue = value == null ? (min + max) / 2 : value;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            inputMode="decimal"
            step={step}
            min={min}
            max={max}
            value={display}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) onChange(v);
            }}
            className="h-9 w-24 text-right tabular-nums"
          />
          {unit && <span className="text-sm text-zinc-500">{unit}</span>}
        </div>
      </div>
      <Slider
        value={[sliderValue]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
