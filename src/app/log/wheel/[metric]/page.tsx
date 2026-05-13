"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/queries";
import { HF, HFCard, HFWheelPicker } from "@/components/hf";

type MetricKey = "weight" | "ketones" | "bp";

interface MetricConfig {
  title: string;
  subtitle: string;
  unit: string;
  tint: string;
  // Two columns. For decimal metrics: ints + decs. For bp: sys + dia.
  columnA: { values: string[]; default: number; width: number };
  columnB: { values: string[]; default: number; width: number };
  separator: "," | "/";
  layoutLabel: string; // how to render the final value
  toRow: (a: number, b: number) => Partial<Record<string, number>>;
  fromRow: (row: Record<string, unknown>) => { a: number; b: number } | null;
  cetoseHint?: boolean;
}

function range(min: number, max: number, step = 1): number[] {
  const out: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

const WEIGHT_INTS = range(60, 130).map((v) => String(v));
const DEC10 = range(0, 9).map((v) => String(v));
const KETO_INTS = range(0, 5).map((v) => String(v));
const SYS = range(80, 200).map((v) => String(v));
const DIA = range(40, 120).map((v) => String(v));

const METRICS: Record<MetricKey, MetricConfig> = {
  weight: {
    title: "Poids",
    subtitle: "matin · à jeun",
    unit: "kg",
    tint: HF.green,
    columnA: { values: WEIGHT_INTS, default: WEIGHT_INTS.indexOf("90"), width: 70 },
    columnB: { values: DEC10, default: 0, width: 50 },
    separator: ",",
    layoutLabel: "kg",
    toRow: (a, b) => ({ weight_kg: a + b / 10 }),
    fromRow: (row) => {
      const v = row.weight_kg as number | null;
      if (v == null) return null;
      const int = Math.floor(v);
      const dec = Math.round((v - int) * 10);
      return { a: WEIGHT_INTS.indexOf(String(int)), b: dec };
    },
  },
  ketones: {
    title: "Cétones",
    subtitle: "matin · à jeun · mmol/L",
    unit: "mmol/L",
    tint: HF.orange,
    columnA: { values: KETO_INTS, default: 1, width: 50 },
    columnB: { values: DEC10, default: 5, width: 50 },
    separator: ",",
    layoutLabel: "mmol/L",
    toRow: (a, b) => ({ ketones_mmol: a + b / 10 }),
    fromRow: (row) => {
      const v = row.ketones_mmol as number | null;
      if (v == null) return null;
      const int = Math.floor(v);
      const dec = Math.round((v - int) * 10);
      return { a: int, b: dec };
    },
    cetoseHint: true,
  },
  bp: {
    title: "Tension",
    subtitle: "au repos · matin · mmHg",
    unit: "mmHg",
    tint: HF.red,
    columnA: { values: SYS, default: SYS.indexOf("122"), width: 70 },
    columnB: { values: DIA, default: DIA.indexOf("78"), width: 70 },
    separator: "/",
    layoutLabel: "mmHg",
    toRow: (a, b) => ({ bp_morning_sys: a, bp_morning_dia: b }),
    fromRow: (row) => {
      const sys = row.bp_morning_sys as number | null;
      const dia = row.bp_morning_dia as number | null;
      if (sys == null || dia == null) return null;
      return { a: SYS.indexOf(String(sys)), b: DIA.indexOf(String(dia)) };
    },
  },
};

function isMetricKey(s: string): s is MetricKey {
  return s === "weight" || s === "ketones" || s === "bp";
}

interface PresetSpec {
  a: number;
  b: number;
  label?: string;
  highlight?: boolean;
}

interface PageProps {
  params: Promise<{ metric: string }>;
}

export default function WheelPage({ params }: PageProps) {
  const { metric } = use(params);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const today = todayIso();

  const cfg = isMetricKey(metric) ? METRICS[metric] : null;
  const [idxA, setIdxA] = useState(cfg?.columnA.default ?? 0);
  const [idxB, setIdxB] = useState(cfg?.columnB.default ?? 0);
  const [presets, setPresets] = useState<PresetSpec[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!cfg) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: rows } = await supabase
          .from("daily_log")
          .select("log_date, weight_kg, ketones_mmol, bp_morning_sys, bp_morning_dia")
          .eq("user_id", user.id)
          .order("log_date", { ascending: false })
          .limit(8);
        if (cancelled) return;
        if (rows && rows.length) {
          const todayRow = rows.find((r) => r.log_date === today);
          if (todayRow) {
            const sel = cfg.fromRow(todayRow as Record<string, unknown>);
            if (sel && sel.a >= 0 && sel.b >= 0) {
              setIdxA(sel.a);
              setIdxB(sel.b);
            }
          }
          const ps: PresetSpec[] = [];
          for (const r of rows.slice(0, 4)) {
            const sel = cfg.fromRow(r as Record<string, unknown>);
            if (sel && sel.a >= 0 && sel.b >= 0) {
              ps.push({
                a: sel.a,
                b: sel.b,
                label: r.log_date === today ? "aujourd'hui" : undefined,
              });
            }
          }
          setPresets(ps.slice(0, 5));
        }
      } catch {
        // env-stub fallback: leave defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cfg, supabase, today]);

  if (!cfg) {
    return (
      <div style={{ padding: "20px", color: HF.label2 }} className="hf-subhead">
        Métrique inconnue. Choisis weight, ketones ou bp.
      </div>
    );
  }

  const aVal = Number(cfg.columnA.values[idxA] ?? cfg.columnA.values[cfg.columnA.default] ?? "0");
  const bVal = Number(cfg.columnB.values[idxB] ?? cfg.columnB.values[cfg.columnB.default] ?? "0");

  const displayValue =
    cfg.separator === ","
      ? `${aVal}${aVal != null ? "," : ""}${cfg.columnB.values[idxB] ?? "0"}`
      : `${aVal}/${bVal}`;
  const inKetoseZone = metric === "ketones" && aVal + bVal / 10 >= 1.5;

  async function onSave() {
    if (!cfg || submitting) return;
    setSubmitting(true);
    try {
      const numericA = metric === "bp" ? aVal : aVal;
      const numericB = metric === "bp" ? bVal : bVal;
      const partial = cfg.toRow(numericA, numericB);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/log/wheel/" + metric);
        return;
      }
      const payload = { user_id: user.id, log_date: today, ...partial };
      const { error } = await supabase
        .from("daily_log")
        .upsert(payload, { onConflict: "user_id,log_date" });
      if (!error) router.push("/");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 24 }}>
      {/* Header iOS navbar */}
      <div
        style={{
          display: "flex",
          padding: "14px 16px 4px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          style={{ background: "transparent", border: "none", color: HF.blue, fontSize: 17, padding: "4px 0" }}
        >
          ← Annuler
        </button>
        <div className="hf-headline">{cfg.title}</div>
        <button
          type="button"
          onClick={onSave}
          disabled={submitting}
          style={{
            background: "transparent",
            border: "none",
            color: HF.blue,
            fontSize: 17,
            fontWeight: 600,
            padding: "4px 0",
            opacity: submitting ? 0.5 : 1,
          }}
        >
          OK
        </button>
      </div>

      <div style={{ padding: "6px 22px 14px" }}>
        <div className="hf-subhead hf-tnum" style={{ color: HF.label2 }}>{cfg.subtitle}</div>
      </div>

      {/* Wheel card */}
      <div style={{ padding: "0 16px" }}>
        <HFCard padding={0} style={{ overflow: "hidden" }}>
          <PickerFrame
            cfg={cfg}
            idxA={idxA}
            idxB={idxB}
            onChangeA={setIdxA}
            onChangeB={setIdxB}
          />
        </HFCard>
      </div>

      {/* Recent presets */}
      {presets.length > 0 && (
        <div style={{ padding: "20px 16px 0" }}>
          <div className="hf-eyebrow" style={{ color: HF.label2, marginBottom: 8 }}>RÉCENT</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {presets.map((p, i) => (
              <PresetChip
                key={i}
                value={
                  cfg.separator === ","
                    ? `${cfg.columnA.values[p.a]},${cfg.columnB.values[p.b]}`
                    : `${cfg.columnA.values[p.a]}/${cfg.columnB.values[p.b]}`
                }
                label={p.label}
                highlight={p.a === idxA && p.b === idxB}
                onClick={() => {
                  setIdxA(p.a);
                  setIdxB(p.b);
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Cétose status */}
      {cfg.cetoseHint && (
        <div style={{ padding: "0 16px 14px" }}>
          <HFCard
            padding="12px 14px"
            style={{ display: "flex", alignItems: "center", gap: 10, background: HF.green + "14" }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: inKetoseZone ? HF.green : HF.gray,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7l3 3 5-6" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div className="hf-subhead" style={{ fontWeight: 600, color: inKetoseZone ? HF.green : HF.label }}>
                {inKetoseZone ? "Cétose nutritionnelle" : "Sous le seuil cétose"}
              </div>
              <div className="hf-caption" style={{ color: HF.label2 }}>
                ≥ 1,5 mmol/L · zone optimale
              </div>
            </div>
          </HFCard>
        </div>
      )}

      {/* Primary action */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={submitting}
          style={{
            border: "none",
            borderRadius: 14,
            background: cfg.tint,
            color: "white",
            padding: "14px",
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: -0.4,
            boxShadow: `0 2px 8px ${cfg.tint}40`,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Enregistrement…" : `Enregistrer · ${displayValue} ${cfg.layoutLabel}`}
        </button>
        <button
          type="button"
          onClick={() => router.push("/log")}
          style={{
            background: "transparent",
            border: "none",
            color: HF.blue,
            fontSize: 15,
            fontWeight: 500,
            padding: "6px",
          }}
        >
          Retour à la dictée
        </button>
      </div>
    </div>
  );
}

function PickerFrame({
  cfg,
  idxA,
  idxB,
  onChangeA,
  onChangeB,
}: {
  cfg: MetricConfig;
  idxA: number;
  idxB: number;
  onChangeA: (i: number) => void;
  onChangeB: (i: number) => void;
}) {
  const rowH = 38;
  const visible = 5;
  const center = Math.floor(visible / 2);
  return (
    <div style={{ position: "relative", height: rowH * visible, overflow: "hidden" }}>
      {/* Center band */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: rowH * center,
          height: rowH,
          background: HF.fill2,
          borderTop: `0.5px solid ${HF.separator}`,
          borderBottom: `0.5px solid ${HF.separator}`,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Fade overlays */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: rowH * center,
          background: "linear-gradient(to bottom, var(--hf-surface), rgba(28,28,30,0))",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: rowH * center,
          background: "linear-gradient(to top, var(--hf-surface), rgba(28,28,30,0))",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          gap: 14,
          position: "relative",
          zIndex: 2,
        }}
      >
        <HFWheelPicker
          values={cfg.columnA.values}
          selectedIndex={idxA}
          onChange={onChangeA}
          width={cfg.columnA.width}
        />
        <span
          className="hf-numHuge hf-tnum"
          style={{ fontSize: cfg.separator === "/" ? 28 : 32, color: HF.label2, marginTop: -2 }}
        >
          {cfg.separator}
        </span>
        <HFWheelPicker
          values={cfg.columnB.values}
          selectedIndex={idxB}
          onChange={onChangeB}
          width={cfg.columnB.width}
        />
        <div className="hf-footnote" style={{ color: HF.label2, marginLeft: 4 }}>{cfg.unit}</div>
      </div>
    </div>
  );
}

function PresetChip({
  value,
  label,
  highlight,
  onClick,
}: {
  value: string;
  label?: string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 12,
        background: highlight ? HF.green + "1A" : HF.fill,
        border: highlight ? `1px solid ${HF.green}` : "1px solid transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: 56,
        color: HF.label,
      }}
    >
      <span className="hf-numBig hf-tnum" style={{ fontSize: 17, color: highlight ? HF.green : HF.label }}>
        {value}
      </span>
      {label && <span className="hf-caption2" style={{ color: HF.label2 }}>{label}</span>}
    </button>
  );
}
