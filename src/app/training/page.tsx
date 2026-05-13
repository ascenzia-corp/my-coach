"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayIso, isoDaysAgo } from "@/lib/queries";
import { TRAINING_PLAN } from "@/lib/protocol";
import { HF, HFCard, HFDot } from "@/components/hf";

type WeekRow = {
  id: string;
  log_date: string;
  session_type: string;
  completed: boolean;
  duration_min: number | null;
};

function isoWeekday(d: Date) {
  return ((d.getDay() + 6) % 7) + 1;
}

const SESSION_TINT: Record<string, string> = {
  push: HF.red,
  pull_jambes: HF.indigo,
  hiit: HF.orange,
  abdos_mobilite: HF.pink,
  tapis: HF.blue,
  marche: HF.green,
  repos: HF.gray,
};

export default function TrainingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const today = todayIso();
  const day = isoWeekday(new Date(today + "T00:00"));
  const planned = TRAINING_PLAN[day];
  const tint = planned ? SESSION_TINT[planned.type] ?? HF.indigo : HF.gray;

  const [completed, setCompleted] = useState(false);
  const [duration, setDuration] = useState<string>(planned ? String(planned.duration_min) : "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [week, setWeek] = useState<WeekRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: rows } = await supabase
          .from("training_log")
          .select("id, log_date, session_type, completed, duration_min")
          .eq("user_id", user.id)
          .gte("log_date", isoDaysAgo(6))
          .order("log_date", { ascending: true });
        setWeek((rows as WeekRow[]) ?? []);
        const todays = rows?.find((r) => r.log_date === today);
        if (todays) {
          setCompleted(todays.completed);
          if (todays.duration_min) setDuration(String(todays.duration_min));
        }
      } catch {
        /* stub */
      }
    })();
  }, [supabase, today]);

  async function save() {
    if (!planned) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/training");
        return;
      }
      await supabase.from("training_log").insert({
        user_id: user.id,
        log_date: today,
        session_type: planned.type,
        completed,
        duration_min: duration ? Number(duration) : null,
        notes: notes || null,
      });
      router.push("/");
    } finally {
      setSubmitting(false);
    }
  }

  const weekDays = ["L", "M", "M", "J", "V", "S", "D"];
  const byWeekday = new Map<number, WeekRow>();
  for (const r of week) {
    const d = isoWeekday(new Date(r.log_date + "T00:00"));
    byWeekday.set(d, r);
  }

  return (
    <div style={{ padding: "4px 20px 24px" }}>
      {/* Header */}
      <div style={{ paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="hf-footnote" style={{ color: HF.label2 }}>Séance du jour</div>
          <div className="hf-largeTitle" style={{ marginTop: 2 }}>
            {planned?.label.split(" ")[0] ?? "Repos"}
          </div>
          <div className="hf-subhead" style={{ color: HF.label2, marginTop: 2 }}>
            {planned ? `${planned.duration_min} min prévues · ${planned.label}` : "Pas de séance prévue"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: HF.fill,
            color: HF.label,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>

      {/* Edit card */}
      {planned && (
        <HFCard style={{ marginTop: 14 }} padding="14px 16px">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="hf-headline">Réalisée</div>
            <IOSToggle checked={completed} onChange={setCompleted} />
          </div>
          <div style={{ height: 0.5, background: HF.separator, margin: "12px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="hf-caption" style={{ color: HF.label2 }}>Durée (min)</span>
              <input
                type="number"
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{
                  background: HF.fill,
                  color: HF.label,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  fontSize: 16,
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="hf-caption" style={{ color: HF.label2 }}>Notes (optionnel)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{
                  background: HF.fill,
                  color: HF.label,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  fontSize: 15,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={submitting}
            style={{
              marginTop: 14,
              width: "100%",
              background: tint,
              color: "white",
              padding: "14px",
              borderRadius: 14,
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: -0.4,
              border: "none",
              boxShadow: `0 2px 8px ${tint}40`,
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </HFCard>
      )}

      {/* Week grid */}
      <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
        CETTE SEMAINE
      </div>
      <HFCard style={{ marginTop: 8 }} padding="14px 16px">
        <div style={{ display: "flex", gap: 6 }}>
          {weekDays.map((label, i) => {
            const iso = i + 1;
            const row = byWeekday.get(iso);
            const plannedDay = TRAINING_PLAN[iso];
            const dayTint = plannedDay ? SESSION_TINT[plannedDay.type] ?? HF.indigo : HF.gray;
            const done = row?.completed;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  background: done ? `${dayTint}1F` : HF.fill,
                  border: done ? `1px solid ${dayTint}33` : "1px solid transparent",
                  padding: "8px 4px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  minHeight: 48,
                  justifyContent: "center",
                }}
              >
                <div className="hf-caption2" style={{ color: done ? dayTint : HF.label2, fontWeight: 600 }}>
                  {label}
                </div>
                {done ? (
                  <HFDot color={dayTint} size={6} />
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: HF.label3 }} />
                )}
              </div>
            );
          })}
        </div>
      </HFCard>

      {/* Planning */}
      <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
        PLANNING DE LA SEMAINE
      </div>
      <HFCard padding={0} style={{ marginTop: 8 }}>
        {Object.entries(TRAINING_PLAN).map(([iso, sess], i, arr) => {
          const iisoNum = parseInt(iso, 10);
          const dayTint = SESSION_TINT[sess.type] ?? HF.indigo;
          const isToday = iisoNum === day;
          return (
            <div key={iso}>
              <div
                style={{
                  display: "flex",
                  padding: "12px 16px",
                  gap: 12,
                  alignItems: "center",
                  background: isToday ? `${dayTint}0E` : "transparent",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: `${dayTint}1F`,
                    color: dayTint,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {weekDays[iisoNum - 1]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="hf-subhead" style={{ fontWeight: isToday ? 600 : 400 }}>{sess.label}</div>
                  <div className="hf-caption hf-tnum" style={{ color: HF.label2 }}>{sess.duration_min} min</div>
                </div>
                {isToday && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      color: dayTint,
                      textTransform: "uppercase",
                    }}
                  >
                    AUJOURD&apos;HUI
                  </div>
                )}
              </div>
              {i < arr.length - 1 && <div style={{ height: 0.5, background: HF.separator, marginLeft: 60 }} />}
            </div>
          );
        })}
      </HFCard>
    </div>
  );
}

function IOSToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 51,
        height: 31,
        borderRadius: 999,
        background: checked ? HF.green : HF.fill,
        position: "relative",
        border: "none",
        padding: 0,
        flexShrink: 0,
        transition: "background .15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 27,
          height: 27,
          background: "white",
          borderRadius: "50%",
          boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
          transition: "left .18s",
        }}
      />
    </button>
  );
}
