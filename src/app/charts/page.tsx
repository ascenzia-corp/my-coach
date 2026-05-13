"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HF, HFCard, HFChip, HFLineChart, HFBarChart, type HFLineChartPoint } from "@/components/hf";
import { TARGETS } from "@/lib/protocol";

type PeriodKey = "1S" | "1M" | "3M" | "6M" | "1A";

const PERIOD_DAYS: Record<PeriodKey, number> = {
  "1S": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1A": 365,
};

const PERIOD_TITLE: Record<PeriodKey, string> = {
  "1S": "1 semaine",
  "1M": "1 mois",
  "3M": "3 mois",
  "6M": "6 mois",
  "1A": "1 année",
};

interface Row {
  log_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  ketones_mmol: number | null;
  bp_morning_sys: number | null;
  bp_morning_dia: number | null;
  energy_10: number | null;
  water_l: number | null;
}

interface Profile {
  target_weight_kg: number;
  baseline_weight_kg: number;
}

function fmt1(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(1).replace(".", ",");
}

function fmt0(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return Math.round(v).toString();
}

function lastValid<T>(rows: Row[], key: keyof Row): T | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i][key];
    if (v != null) return v as unknown as T;
  }
  return null;
}

function firstValid<T>(rows: Row[], key: keyof Row): T | null {
  for (const r of rows) {
    const v = r[key];
    if (v != null) return v as unknown as T;
  }
  return null;
}

function avg(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function trendPoints(rows: Row[], key: keyof Row, fallback?: number): HFLineChartPoint[] {
  const out: HFLineChartPoint[] = [];
  let last = fallback;
  for (const r of rows) {
    const v = r[key] as number | null | undefined;
    if (v != null) {
      out.push({ y: v });
      last = v;
    } else if (last != null) {
      out.push({ y: last });
    }
  }
  return out;
}

function lastNValues(rows: Row[], key: keyof Row, n: number): number[] {
  const out: number[] = [];
  for (let i = rows.length - 1; i >= 0 && out.length < n; i--) {
    const v = rows[i][key] as number | null | undefined;
    if (v != null) out.unshift(v);
  }
  return out;
}

export default function ChartsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [period, setPeriod] = useState<PeriodKey>("1M");
  const [rows, setRows] = useState<Row[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
        const [{ data: logs }, { data: prof }] = await Promise.all([
          supabase
            .from("daily_log")
            .select(
              "log_date, weight_kg, waist_cm, ketones_mmol, bp_morning_sys, bp_morning_dia, energy_10, water_l",
            )
            .eq("user_id", user.id)
            .gte("log_date", since)
            .order("log_date", { ascending: true }),
          supabase
            .from("profile")
            .select("target_weight_kg, baseline_weight_kg")
            .eq("id", user.id)
            .maybeSingle(),
        ]);
        if (cancelled) return;
        if (logs) setRows(logs as Row[]);
        if (prof) setProfile(prof as Profile);
      } catch {
        // env stub or anon user — leave defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const days = PERIOD_DAYS[period];
  const periodRows = useMemo(() => {
    if (!rows.length) return [];
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    return rows.filter((r) => r.log_date >= cutoff);
  }, [rows, days]);

  // ─── Weight hero
  const weightToday = lastValid<number>(periodRows, "weight_kg");
  const weightPeriodStart = firstValid<number>(periodRows, "weight_kg");
  const weightAllStart = profile?.baseline_weight_kg ?? firstValid<number>(rows, "weight_kg");
  const weightDelta =
    weightToday != null && weightPeriodStart != null ? weightToday - weightPeriodStart : null;
  const weightCumDelta =
    weightToday != null && weightAllStart != null ? weightToday - weightAllStart : null;
  const targetWeight = profile?.target_weight_kg ?? 82;
  const progressPct =
    weightToday != null && weightAllStart != null && weightAllStart > targetWeight
      ? Math.max(
          0,
          Math.min(
            100,
            ((weightAllStart - weightToday) / (weightAllStart - targetWeight)) * 100,
          ),
        )
      : 0;
  const weightPoints = trendPoints(periodRows, "weight_kg", weightPeriodStart ?? undefined);

  // ─── Ketones
  const ketonesToday = lastValid<number>(periodRows, "ketones_mmol");
  const ketones7 = lastNValues(rows, "ketones_mmol", 7);
  const ketones7avg = avg(ketones7);
  const inKetose = ketonesToday != null && ketonesToday >= 0.5;
  const ketonePoints = trendPoints(periodRows, "ketones_mmol", ketonesToday ?? undefined);

  // ─── Tension / eau / TT / énergie
  const bpSysToday = lastValid<number>(periodRows, "bp_morning_sys");
  const bpDiaToday = lastValid<number>(periodRows, "bp_morning_dia");
  const bpSys7 = lastNValues(rows, "bp_morning_sys", 7);

  const waterToday = lastValid<number>(periodRows, "water_l");
  const water7 = lastNValues(rows, "water_l", 7);

  const waistToday = lastValid<number>(periodRows, "waist_cm");
  const waist7Points = trendPoints(periodRows.slice(-7), "waist_cm", waistToday ?? undefined);
  const waist7 = lastNValues(rows, "waist_cm", 7);
  const waistDelta = waist7.length >= 2 ? waist7[waist7.length - 1] - waist7[0] : null;

  const energyToday = lastValid<number>(periodRows, "energy_10");
  const energy7 = lastNValues(rows, "energy_10", 7);
  const energy7avg = avg(energy7);

  const monthLabels = useMemo(() => buildMonthLabels(periodRows, period), [periodRows, period]);

  return (
    <div style={{ padding: "4px 20px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 4 }}>
        <div>
          <div className="hf-footnote" style={{ color: HF.label2 }}>Progrès</div>
          <div className="hf-largeTitle" style={{ marginTop: 2 }}>{PERIOD_TITLE[period]}</div>
        </div>
        <Link
          href="/settings"
          aria-label="Réglages"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: HF.fill,
            color: HF.label,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5h10M5 8h6M7 11h2" />
          </svg>
        </Link>
      </div>

      {/* Period segmented control */}
      <div
        role="tablist"
        style={{
          marginTop: 12,
          background: HF.fill,
          borderRadius: 10,
          padding: 2,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 0,
        }}
      >
        {(Object.keys(PERIOD_DAYS) as PeriodKey[]).map((p) => {
          const active = p === period;
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPeriod(p)}
              style={{
                padding: "5px 0",
                textAlign: "center",
                borderRadius: 8,
                background: active ? HF.surface : "transparent",
                color: HF.label,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                boxShadow: active ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Weight hero card */}
      <HFCard style={{ marginTop: 14 }} padding="14px 16px 6px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: HF.green, textTransform: "uppercase" }}>
              POIDS
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
              <span className="hf-numHuge hf-tnum" style={{ fontSize: 38 }}>{fmt1(weightToday)}</span>
              <span className="hf-subhead hf-tnum" style={{ color: HF.label2 }}>kg</span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
              {weightDelta != null && (
                <span style={{ color: weightDelta < 0 ? HF.green : weightDelta > 0 ? HF.red : HF.label2, fontSize: 14, fontWeight: 600 }}>
                  {weightDelta < 0 ? "↓" : weightDelta > 0 ? "↑" : "→"} {Math.abs(weightDelta).toFixed(1).replace(".", ",")} kg
                </span>
              )}
              <span className="hf-footnote" style={{ color: HF.label2 }}>· obj. {fmt1(targetWeight)}</span>
            </div>
          </div>
          {weightCumDelta != null && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              <HFChip tint={HF.green} style={{ background: HF.green + "1A" }}>
                <span style={{ color: HF.green, fontWeight: 600 }}>
                  {weightCumDelta < 0 ? "−" : "+"}{Math.abs(weightCumDelta).toFixed(1).replace(".", ",")} kg
                </span>
              </HFChip>
              <div className="hf-footnote hf-tnum" style={{ color: HF.label2 }}>cumul</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 10 }}>
          {weightPoints.length > 1 ? (
            <HFLineChart w={296} h={130} points={weightPoints} color={HF.green} fill dots />
          ) : (
            <EmptyChart h={130} />
          )}
          {monthLabels.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: HF.label2,
                fontSize: 11,
                padding: "0 2px",
              }}
              className="hf-tnum"
            >
              {monthLabels.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
          )}
        </div>
        {/* Progress to goal */}
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: `0.5px solid ${HF.separator}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="hf-caption" style={{ color: HF.label2 }}>Vers {fmt1(targetWeight)} kg</span>
            <span className="hf-caption hf-tnum" style={{ color: HF.label }}>{Math.round(progressPct)}%</span>
          </div>
          <div style={{ height: 6, background: HF.fill, borderRadius: 3, overflow: "hidden", position: "relative" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.max(0, Math.min(100, progressPct))}%`,
                background: `linear-gradient(to right, ${HF.green}, ${HF.green}CC)`,
                borderRadius: 3,
              }}
            />
          </div>
        </div>
      </HFCard>

      {/* Ketones card */}
      <HFCard style={{ marginTop: 12 }} padding="14px 16px 8px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: HF.orange, textTransform: "uppercase" }}>
              CÉTONES
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
              <span className="hf-numHuge hf-tnum" style={{ fontSize: 32 }}>{fmt1(ketonesToday)}</span>
              <span className="hf-subhead" style={{ color: HF.label2 }}>mmol/L</span>
            </div>
            <div
              className="hf-caption"
              style={{ color: inKetose ? HF.green : HF.label2, marginTop: 2, fontWeight: 500 }}
            >
              {inKetose ? "en cétose" : "sous le seuil"}
              {ketones7avg != null && ` · moy. ${fmt1(ketones7avg)}`}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          {ketonePoints.length > 1 ? (
            <HFLineChart w={296} h={70} points={ketonePoints} color={HF.orange} fill dots showAxis={false} />
          ) : (
            <EmptyChart h={70} />
          )}
        </div>
      </HFCard>

      {/* Row 1: TA + Eau */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <HFCard padding="12px 14px">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: HF.red, textTransform: "uppercase" }}>
            TENSION
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
            <span className="hf-numBig hf-tnum" style={{ fontSize: 22 }}>{fmt0(bpSysToday)}</span>
            <span className="hf-subhead hf-tnum" style={{ color: HF.label2 }}>/{fmt0(bpDiaToday)}</span>
          </div>
          <div className="hf-caption hf-tnum" style={{ color: HF.label2, marginBottom: 6 }}>
            {bpSys7.length > 0 ? `moy. 7j · ${fmt0(avg(bpSys7))}` : "—"}
          </div>
          {bpSys7.length > 0 ? (
            <HFBarChart w={130} h={42} values={bpSys7} color={HF.red} goal={140} />
          ) : (
            <EmptyChart h={42} />
          )}
        </HFCard>
        <HFCard padding="12px 14px">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: HF.blue, textTransform: "uppercase" }}>
            EAU
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
            <span className="hf-numBig hf-tnum" style={{ fontSize: 22 }}>{fmt1(waterToday)}</span>
            <span className="hf-subhead hf-tnum" style={{ color: HF.label2 }}>L</span>
          </div>
          <div
            className="hf-caption hf-tnum"
            style={{
              color: waterToday != null && waterToday >= TARGETS.hydration_l ? HF.green : HF.orange,
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            obj. {fmt1(TARGETS.hydration_l)} L
          </div>
          {water7.length > 0 ? (
            <HFBarChart w={130} h={42} values={water7} color={HF.blue} goal={TARGETS.hydration_l} />
          ) : (
            <EmptyChart h={42} />
          )}
        </HFCard>
      </div>

      {/* Row 2: TT + Énergie */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <HFCard padding="12px 14px">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: HF.indigo, textTransform: "uppercase" }}>
            TOUR DE TAILLE
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
            <span className="hf-numBig hf-tnum" style={{ fontSize: 22 }}>{fmt0(waistToday)}</span>
            <span className="hf-subhead hf-tnum" style={{ color: HF.label2 }}>cm</span>
          </div>
          <div
            className="hf-caption"
            style={{
              color: waistDelta != null && waistDelta < 0 ? HF.green : HF.label2,
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            {waistDelta == null ? "—" : `${waistDelta < 0 ? "↓" : "↑"} ${Math.abs(waistDelta).toFixed(0)} cm / 7j`}
          </div>
          {waist7Points.length > 1 ? (
            <HFLineChart w={130} h={42} points={waist7Points} color={HF.indigo} fill showAxis={false} />
          ) : (
            <EmptyChart h={42} />
          )}
        </HFCard>
        <HFCard padding="12px 14px">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: HF.yellow, textTransform: "uppercase" }}>
            ÉNERGIE
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
            <span className="hf-numBig hf-tnum" style={{ fontSize: 22 }}>{fmt1(energyToday)}</span>
            <span className="hf-subhead hf-tnum" style={{ color: HF.label2 }}>/10</span>
          </div>
          <div className="hf-caption" style={{ color: HF.label2, marginBottom: 6, fontWeight: 500 }}>
            {energy7avg != null ? `moy. ${fmt1(energy7avg)} /10` : "—"}
          </div>
          {energy7.length > 0 ? (
            <HFBarChart w={130} h={42} values={energy7} color={HF.yellow} goal={7} />
          ) : (
            <EmptyChart h={42} />
          )}
        </HFCard>
      </div>

      {/* Voir aussi : Bilan hebdo + Photos */}
      <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
        VOIR AUSSI
      </div>
      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Link href="/weekly" style={{ color: HF.label }}>
          <HFCard padding="14px 16px" style={{ height: "100%" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${HF.blue}1F`,
                color: HF.blue,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 4v3M16 4v3" />
              </svg>
            </div>
            <div className="hf-headline" style={{ marginTop: 10 }}>Bilan hebdo</div>
            <div className="hf-caption" style={{ color: HF.label2, marginTop: 2 }}>
              récap lundi · 7 h
            </div>
          </HFCard>
        </Link>
        <Link href="/photos" style={{ color: HF.label }}>
          <HFCard padding="14px 16px" style={{ height: "100%" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${HF.pink}1F`,
                color: HF.pink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 7h3l1.5-2h5L16 7h3a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </div>
            <div className="hf-headline" style={{ marginTop: 10 }}>Photos</div>
            <div className="hf-caption" style={{ color: HF.label2, marginTop: 2 }}>
              face · profil · dos
            </div>
          </HFCard>
        </Link>
      </div>
    </div>
  );
}

function EmptyChart({ h }: { h: number }) {
  return (
    <div
      style={{
        height: h,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: HF.label3,
      }}
      className="hf-caption"
    >
      pas encore de données
    </div>
  );
}

function buildMonthLabels(rows: Row[], period: PeriodKey): string[] {
  if (rows.length === 0) return [];
  if (period === "1S") return ["lun.", "jeu.", "dim."];
  const months = ["jan", "fév", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const monthIdx = parseInt(r.log_date.slice(5, 7), 10) - 1;
    const lbl = months[monthIdx];
    if (lbl && !seen.has(lbl)) {
      seen.add(lbl);
      out.push(lbl);
    }
  }
  // Limit to 4 evenly-distributed labels max
  if (out.length > 4) {
    const step = Math.max(1, Math.floor(out.length / 4));
    return out.filter((_, i) => i % step === 0).slice(0, 4);
  }
  return out;
}
