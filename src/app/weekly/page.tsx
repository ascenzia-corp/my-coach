import { createClient } from "@/lib/supabase/server";
import { HF, HFCard, HFChip, HFLineChart } from "@/components/hf";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { PARIS_TZ } from "@/lib/format";
import { RegenerateButton } from "./RegenerateButton";

export const dynamic = "force-dynamic";

interface WeeklyReview {
  id: string;
  week_start: string;
  weight_avg_kg: number | null;
  weight_delta_kg: number | null;
  waist_cm: number | null;
  waist_delta_cm: number | null;
  ketones_avg: number | null;
  sessions_done: number | null;
  sessions_planned: number | null;
  deviations: number | null;
  sleep_avg_h: number | null;
  energy_avg_10: number | null;
  verdict: "on_track" | "retard" | "avance" | null;
  adjustments: string | null;
  created_at: string;
}

interface DayRow {
  log_date: string;
  weight_kg: number | null;
  ketones_mmol: number | null;
  bp_morning_sys: number | null;
  bp_morning_dia: number | null;
  sleep_hours: number | null;
  energy_10: number | null;
}

function fmt1(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(1).replace(".", ",");
}

function fmt0(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return Math.round(v).toString();
}

function isoWeekNumber(dateIso: string): number {
  // ISO-8601 week number for a YYYY-MM-DD date string.
  const d = new Date(`${dateIso}T00:00:00Z`);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function dayIsosFromWeekStart(weekStart: string): string[] {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default async function WeeklyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let reviews: WeeklyReview[] = [];
  let weekRows: DayRow[] = [];

  if (user) {
    try {
      const { data: revData } = await supabase
        .from("weekly_review")
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false });
      reviews = (revData as WeeklyReview[]) ?? [];
      if (reviews[0]) {
        const days = dayIsosFromWeekStart(reviews[0].week_start);
        const { data: logs } = await supabase
          .from("daily_log")
          .select("log_date, weight_kg, ketones_mmol, bp_morning_sys, bp_morning_dia, sleep_hours, energy_10")
          .eq("user_id", user.id)
          .in("log_date", days);
        weekRows = (logs as DayRow[]) ?? [];
      }
    } catch {
      // env-stub fallback
    }
  }

  const latest = reviews[0];
  const olderReviews = reviews.slice(1);

  return (
    <div style={{ padding: "4px 20px 24px" }}>
      <Header latest={latest} />

      {latest ? (
        <>
          <HeroWeightCard review={latest} weekRows={weekRows} />
          <KetoseGrid review={latest} weekRows={weekRows} />
          <CompactStats review={latest} />
          <Adjustments adjustments={latest.adjustments} />
          <RegenerateButton weekStart={latest.week_start} />
        </>
      ) : (
        <HFCard style={{ marginTop: 16 }} padding="20px 18px">
          <div className="hf-headline">Aucun bilan encore</div>
          <div className="hf-subhead" style={{ color: HF.label2, marginTop: 4 }}>
            Le premier bilan sera généré automatiquement le prochain lundi à 7 h 00.
          </div>
        </HFCard>
      )}

      {olderReviews.length > 0 && (
        <>
          <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
            BILANS PRÉCÉDENTS
          </div>
          <HFCard padding={0} style={{ marginTop: 8 }}>
            {olderReviews.map((r, i) => (
              <div key={r.id}>
                <CompactReviewRow review={r} />
                {i < olderReviews.length - 1 && <Sep />}
              </div>
            ))}
          </HFCard>
        </>
      )}
    </div>
  );
}

function Header({ latest }: { latest: WeeklyReview | undefined }) {
  if (!latest) {
    return (
      <div style={{ paddingTop: 6 }}>
        <div className="hf-footnote" style={{ color: HF.label2 }}>Bilan hebdo</div>
        <div className="hf-largeTitle" style={{ marginTop: 2 }}>En attente</div>
      </div>
    );
  }
  const created = new Date(latest.created_at);
  const stamp = formatInTimeZone(created, PARIS_TZ, "EEEE d MMMM · HH'h'mm", { locale: fr });
  const stampCap = stamp.charAt(0).toUpperCase() + stamp.slice(1);
  const week = isoWeekNumber(latest.week_start);
  const measureCount = latest.deviations != null && latest.sessions_done != null
    ? `${latest.sessions_done} séance${(latest.sessions_done ?? 0) > 1 ? "s" : ""}`
    : "";

  return (
    <div style={{ paddingTop: 6 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: HF.green,
            boxShadow: `0 0 0 4px ${HF.green}33`,
          }}
        />
        <div className="hf-footnote" style={{ color: HF.label2 }}>{stampCap}</div>
      </div>
      <div className="hf-largeTitle" style={{ marginTop: 4 }}>Bilan · S{week}</div>
      <div className="hf-subhead" style={{ color: HF.label2, marginTop: 2 }}>
        7 jours{measureCount && ` · ${measureCount}`}
      </div>
    </div>
  );
}

function HeroWeightCard({ review, weekRows }: { review: WeeklyReview; weekRows: DayRow[] }) {
  const points = weekRows
    .filter((r) => r.weight_kg != null)
    .map((r) => ({ y: r.weight_kg as number }));
  const delta = review.weight_delta_kg;
  const verdict = review.verdict;
  const verdictLabel =
    verdict === "avance" ? "Meilleure semaine" : verdict === "on_track" ? "Sur objectif" : verdict === "retard" ? "À ajuster" : null;
  const verdictColor = verdict === "retard" ? HF.orange : HF.green;

  return (
    <HFCard style={{ marginTop: 16, background: "rgba(52,199,89,0.08)" }} padding="18px 18px 12px">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: HF.green, textTransform: "uppercase" }}>
            POIDS
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <span className="hf-numHuge hf-tnum" style={{ fontSize: 44 }}>
              {delta != null ? (delta < 0 ? "−" : "+") + Math.abs(delta).toFixed(1).replace(".", ",") : "—"}
            </span>
            <span className="hf-subhead" style={{ color: HF.label2 }}>kg cette semaine</span>
          </div>
          {review.weight_avg_kg != null && (
            <div className="hf-footnote hf-tnum" style={{ color: HF.label2, marginTop: 2 }}>
              moyenne {fmt1(review.weight_avg_kg)} kg
            </div>
          )}
        </div>
        {verdictLabel && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 14,
                background: verdictColor,
                color: "white",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: -0.1,
              }}
            >
              {verdictLabel}
            </div>
          </div>
        )}
      </div>
      {points.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <HFLineChart w={272} h={66} color={HF.green} fill dots points={points} showAxis={false} />
        </div>
      )}
    </HFCard>
  );
}

function KetoseGrid({ review, weekRows }: { review: WeeklyReview; weekRows: DayRow[] }) {
  const days = dayIsosFromWeekStart(review.week_start);
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const rowsByDay = new Map(weekRows.map((r) => [r.log_date, r] as const));
  const onCount = days.filter((d) => {
    const r = rowsByDay.get(d);
    return r?.ketones_mmol != null && r.ketones_mmol >= 0.5;
  }).length;

  return (
    <>
      <div className="hf-eyebrow" style={{ marginTop: 22, color: HF.label2, marginLeft: 4 }}>EN CÉTOSE</div>
      <HFCard style={{ marginTop: 8 }} padding="14px 16px">
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="hf-numHuge hf-tnum" style={{ fontSize: 30 }}>
            {onCount}
            <span className="hf-subhead" style={{ color: HF.label2 }}> / 7 j</span>
          </span>
          <div style={{ flex: 1 }} />
          {review.ketones_avg != null && (
            <HFChip tint={HF.orange} style={{ background: HF.orange + "1A" }}>
              <span style={{ color: HF.orange, fontWeight: 600 }}>moy. {fmt1(review.ketones_avg)} mmol</span>
            </HFChip>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {days.map((d, i) => {
            const r = rowsByDay.get(d);
            const v = r?.ketones_mmol ?? null;
            const on = v != null && v >= 0.5;
            return (
              <div
                key={d}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  background: on ? HF.orange + "1F" : HF.fill,
                  border: on ? `1px solid ${HF.orange}33` : "1px solid transparent",
                  padding: "8px 4px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <div className="hf-caption2" style={{ color: on ? HF.orange : HF.label2, fontWeight: 600 }}>
                  {labels[i]}
                </div>
                <div className="hf-numBig hf-tnum" style={{ fontSize: 14, color: on ? HF.label : HF.label2 }}>
                  {v != null ? fmt1(v) : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </HFCard>
    </>
  );
}

function CompactStats({ review }: { review: WeeklyReview }) {
  const ttDelta = review.waist_delta_cm;
  const ttBefore = review.waist_cm != null && ttDelta != null ? review.waist_cm - ttDelta : null;
  const sleepH = review.sleep_avg_h;
  return (
    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      <HFCard padding="10px 12px">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: HF.indigo, textTransform: "uppercase" }}>
          TT
        </div>
        <div className="hf-numBig hf-tnum" style={{ fontSize: 19, marginTop: 1 }}>
          {ttDelta == null ? "—" : `${ttDelta < 0 ? "−" : "+"}${Math.abs(ttDelta).toFixed(0)}`}
          <span className="hf-footnote" style={{ color: HF.label2 }}> cm</span>
        </div>
        <div className="hf-caption hf-tnum" style={{ color: HF.label2 }}>
          {ttBefore != null && review.waist_cm != null ? `${fmt0(ttBefore)} → ${fmt0(review.waist_cm)}` : "—"}
        </div>
      </HFCard>
      <HFCard padding="10px 12px">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: HF.red, textTransform: "uppercase" }}>
          Séances
        </div>
        <div className="hf-numBig hf-tnum" style={{ fontSize: 19, marginTop: 1 }}>
          {review.sessions_done ?? 0}
          <span className="hf-footnote" style={{ color: HF.label2 }}>/{review.sessions_planned ?? 6}</span>
        </div>
        <div className="hf-caption" style={{ color: HF.label2 }}>
          {review.deviations != null ? `${review.deviations} écart${(review.deviations ?? 0) > 1 ? "s" : ""}` : "—"}
        </div>
      </HFCard>
      <HFCard padding="10px 12px">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: HF.gray, textTransform: "uppercase" }}>
          Sommeil
        </div>
        <div className="hf-numBig hf-tnum" style={{ fontSize: 19, marginTop: 1 }}>
          {sleepH != null ? formatHours(sleepH) : "—"}
        </div>
        <div className="hf-caption" style={{ color: HF.label2 }}>
          énergie {fmt1(review.energy_avg_10)}/10
        </div>
      </HFCard>
    </div>
  );
}

function formatHours(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h${String(mm).padStart(2, "0")}`;
}

function Adjustments({ adjustments }: { adjustments: string | null }) {
  if (!adjustments) return null;
  const lines = adjustments
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <>
      <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.orange }}>
        À AJUSTER
      </div>
      <HFCard padding={0} style={{ marginTop: 8 }}>
        {lines.map((line, i) => (
          <div key={i}>
            <div style={{ display: "flex", padding: "14px 16px", gap: 12, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: `${HF.orange}1F`,
                  color: HF.orange,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l10 18H2z" />
                  <path d="M12 10v5M12 18v.5" />
                </svg>
              </div>
              <div className="hf-subhead" style={{ flex: 1, paddingTop: 6 }}>{line}</div>
            </div>
            {i < lines.length - 1 && <Sep indent={58} />}
          </div>
        ))}
      </HFCard>
    </>
  );
}

function CompactReviewRow({ review }: { review: WeeklyReview }) {
  const week = isoWeekNumber(review.week_start);
  const delta = review.weight_delta_kg;
  const deltaColor = delta != null && delta < 0 ? HF.green : delta != null && delta > 0 ? HF.red : HF.label2;
  return (
    <div style={{ display: "flex", padding: "14px 16px", gap: 12, alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="hf-headline">Semaine {week}</div>
        <div className="hf-caption hf-tnum" style={{ color: HF.label2 }}>du {review.week_start}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div className="hf-numBig hf-tnum" style={{ fontSize: 18, color: deltaColor }}>
          {delta != null ? `${delta < 0 ? "−" : "+"}${Math.abs(delta).toFixed(1).replace(".", ",")} kg` : "—"}
        </div>
        <div className="hf-caption" style={{ color: HF.label2 }}>
          {review.sessions_done ?? 0}/{review.sessions_planned ?? 6} séances
        </div>
      </div>
    </div>
  );
}

function Sep({ indent = 16 }: { indent?: number }) {
  return <div style={{ height: 0.5, background: HF.separator, marginLeft: indent }} />;
}
