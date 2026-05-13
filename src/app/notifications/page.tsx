"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotificationPermission } from "@/components/NotificationPermission";
import { HF, HFCard, HFDot } from "@/components/hf";

interface Slot {
  id: string;
  slot_label: string;
  cron_expression: string;
  title: string;
  body: string;
  enabled: boolean;
  deep_link: string | null;
}

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const ISO_FROM_INDEX = [1, 2, 3, 4, 5, 6, 0];

function parseCron(cron: string): { hh: string; mm: string; days: number[] } {
  const parts = cron.trim().split(/\s+/);
  const [m, h, , , dow] = parts;
  const mm = m.padStart(2, "0");
  const hh = h.padStart(2, "0");
  const days = (() => {
    if (dow === "*") return [0, 1, 2, 3, 4, 5, 6];
    const set = new Set<number>();
    for (const tok of dow.split(",")) {
      if (tok.includes("-")) {
        const [a, b] = tok.split("-").map(Number);
        for (let i = a; i <= b; i++) set.add(i % 7);
      } else {
        set.add(Number(tok) % 7);
      }
    }
    return [...set].sort();
  })();
  return { hh, mm, days };
}

function buildCron(hh: string, mm: string, days: number[]): string {
  const dow = days.length === 7 ? "*" : [...days].sort().join(",");
  return `${parseInt(mm, 10)} ${parseInt(hh, 10)} * * ${dow}`;
}

// Maps slot_label keywords → category tint for visual grouping
function slotTint(slot: Slot): string {
  const label = (slot.slot_label + " " + slot.title).toLowerCase();
  if (label.includes("ceton") || label.includes("cét")) return HF.orange;
  if (label.includes("ta") || label.includes("tension") || label.includes("eliquis") || label.includes("sécurité")) return HF.red;
  if (label.includes("jeûne") || label.includes("jeune") || label.includes("hydra") || label.includes("eau")) return HF.green;
  if (label.includes("bilan") || label.includes("hebdo")) return HF.blue;
  if (label.includes("seance") || label.includes("séance") || label.includes("training")) return HF.pink;
  return HF.indigo;
}

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("notification_schedule")
          .select("*")
          .eq("user_id", user.id)
          .order("cron_expression");
        setSlots((data as Slot[]) ?? []);
      } catch {
        // env-stub
      }
    })();
  }, [supabase]);

  async function toggleSlot(slot: Slot, enabled: boolean) {
    setSlots((cur) => cur.map((s) => (s.id === slot.id ? { ...s, enabled } : s)));
    try {
      await supabase.from("notification_schedule").update({ enabled }).eq("id", slot.id);
    } catch {
      /* stub */
    }
  }

  async function updateSlotTime(slot: Slot, hh: string, mm: string, days: number[]) {
    const cron = buildCron(hh, mm, days);
    setSlots((cur) => cur.map((s) => (s.id === slot.id ? { ...s, cron_expression: cron } : s)));
    try {
      await supabase.from("notification_schedule").update({ cron_expression: cron }).eq("id", slot.id);
    } catch {
      /* stub */
    }
  }

  const enabledCount = slots.filter((s) => s.enabled).length;
  const totalWeekly = slots
    .filter((s) => s.enabled)
    .reduce((sum, s) => {
      const { days } = parseCron(s.cron_expression);
      return sum + days.length;
    }, 0);

  // Build "Une journée type" — today's enabled slots sorted by time
  const todayIso = new Date().getDay(); // 0=sun, 1=mon, ...
  const todaySlots = useMemo(() => {
    return slots
      .filter((s) => s.enabled)
      .map((s) => {
        const { hh, mm, days } = parseCron(s.cron_expression);
        return { slot: s, hh, mm, days, mins: parseInt(hh, 10) * 60 + parseInt(mm, 10) };
      })
      .filter((x) => x.days.includes(todayIso))
      .sort((a, b) => a.mins - b.mins);
  }, [slots, todayIso]);

  return (
    <div style={{ padding: "4px 20px 24px" }}>
      <div style={{ paddingTop: 6 }}>
        <button
          type="button"
          onClick={() => router.back()}
          className="hf-footnote"
          style={{ background: "transparent", border: "none", color: HF.blue, padding: 0 }}
        >
          ← Réglages
        </button>
        <div className="hf-largeTitle" style={{ marginTop: 4 }}>Notifications</div>
      </div>

      {/* Master switch via NotificationPermission */}
      <HFCard style={{ marginTop: 18 }} padding="14px 16px">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              flexShrink: 0,
              background: `${HF.green}1F`,
              color: HF.green,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0112 0v5l2 3H4l2-3z" />
              <path d="M10 19a2 2 0 004 0" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hf-headline">Notifications du coach</div>
            <div className="hf-subhead" style={{ color: HF.label2 }}>
              {enabledCount}/{slots.length} créneaux actifs · {totalWeekly} rappels / semaine
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${HF.separator}` }}>
          <NotificationPermission />
        </div>
      </HFCard>

      {/* Slots */}
      {slots.length > 0 && (
        <>
          <div className="hf-eyebrow" style={{ marginTop: 22, color: HF.label2, marginLeft: 4 }}>
            CRÉNEAUX
          </div>
          <HFCard padding={0} style={{ marginTop: 8 }}>
            {slots.map((slot, i) => {
              const tint = slotTint(slot);
              const { hh, mm, days } = parseCron(slot.cron_expression);
              return (
                <div key={slot.id}>
                  <SlotRow
                    slot={slot}
                    tint={tint}
                    hh={hh}
                    mm={mm}
                    days={days}
                    onToggle={(v) => toggleSlot(slot, v)}
                    onTimeChange={(nh, nm) => updateSlotTime(slot, nh, nm, days)}
                    onDayToggle={(idx) => {
                      const dow = ISO_FROM_INDEX[idx];
                      const next = days.includes(dow) ? days.filter((d) => d !== dow) : [...days, dow];
                      void updateSlotTime(slot, hh, mm, next);
                    }}
                  />
                  {i < slots.length - 1 && (
                    <div style={{ height: 0.5, background: HF.separator, marginLeft: 60 }} />
                  )}
                </div>
              );
            })}
          </HFCard>
        </>
      )}

      {/* Une journée type */}
      {todaySlots.length > 0 && (
        <>
          <div className="hf-eyebrow" style={{ marginTop: 22, color: HF.label2, marginLeft: 4 }}>
            AUJOURD&apos;HUI
          </div>
          <HFCard style={{ marginTop: 8 }} padding="14px 16px">
            {todaySlots.map((x, i) => (
              <div
                key={x.slot.id}
                style={{
                  display: "flex",
                  padding: "6px 0",
                  gap: 14,
                  alignItems: "center",
                  borderBottom: i < todaySlots.length - 1 ? `0.5px solid ${HF.separator}` : "none",
                  marginBottom: i < todaySlots.length - 1 ? 6 : 0,
                  paddingBottom: i < todaySlots.length - 1 ? 12 : 6,
                }}
              >
                <div
                  className="hf-tnum"
                  style={{ fontSize: 13, fontWeight: 600, color: HF.label2, width: 48 }}
                >
                  {x.hh}:{x.mm}
                </div>
                <HFDot color={slotTint(x.slot)} size={8} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="hf-subhead"
                    style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {x.slot.title}
                  </div>
                </div>
              </div>
            ))}
          </HFCard>
        </>
      )}

      {/* Quiet hours (placeholder) */}
      <div className="hf-eyebrow" style={{ marginTop: 22, color: HF.label2, marginLeft: 4 }}>
        NE PAS DÉRANGER
      </div>
      <HFCard style={{ marginTop: 8, opacity: 0.5 }} padding="12px 16px">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="hf-headline">Mode silencieux</div>
            <div className="hf-subhead hf-tnum" style={{ color: HF.label2 }}>
              Bientôt · sauf alertes Eliquis
            </div>
          </div>
        </div>
      </HFCard>

      <div className="hf-caption hf-tnum" style={{ textAlign: "center", color: HF.label3, marginTop: 22 }}>
        Push delivery · Edge function dispatch-ping · cron Europe/Paris
      </div>

      <Link
        href="/settings"
        style={{
          display: "block",
          textAlign: "center",
          color: HF.blue,
          fontSize: 15,
          fontWeight: 500,
          padding: "12px",
          marginTop: 10,
        }}
      >
        Retour aux réglages
      </Link>
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

function SlotRow({
  slot,
  tint,
  hh,
  mm,
  days,
  onToggle,
  onTimeChange,
  onDayToggle,
}: {
  slot: Slot;
  tint: string;
  hh: string;
  mm: string;
  days: number[];
  onToggle: (v: boolean) => void;
  onTimeChange: (hh: string, mm: string) => void;
  onDayToggle: (idx: number) => void;
}) {
  return (
    <div style={{ padding: "13px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            flexShrink: 0,
            background: `${tint}1F`,
            color: tint,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HFDot color={tint} size={10} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hf-headline">{slot.title}</div>
          <div className="hf-caption" style={{ color: HF.label2 }}>{slot.slot_label}</div>
        </div>
        <IOSToggle checked={slot.enabled} onChange={onToggle} />
      </div>
      {slot.enabled && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", paddingLeft: 46 }}>
          <input
            type="time"
            value={`${hh}:${mm}`}
            onChange={(e) => {
              const [nh, nm] = e.target.value.split(":");
              onTimeChange(nh, nm);
            }}
            style={{
              background: HF.fill,
              color: HF.label,
              padding: "6px 10px",
              borderRadius: 8,
              border: "none",
              fontSize: 14,
              fontVariantNumeric: "tabular-nums",
            }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            {DAY_LABELS.map((label, idx) => {
              const dowIso = ISO_FROM_INDEX[idx];
              const active = days.includes(dowIso);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onDayToggle(idx)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: active ? HF.label : HF.fill,
                    color: active ? HF.bg : HF.label2,
                    fontSize: 11,
                    fontWeight: 600,
                    border: "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
