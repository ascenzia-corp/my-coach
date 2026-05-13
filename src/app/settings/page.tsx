"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NotificationPermission } from "@/components/NotificationPermission";
import { HF, HFCard } from "@/components/hf";
import { PROGRAM_START_ISO } from "@/lib/protocol";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { PARIS_TZ } from "@/lib/format";

interface Slot {
  id: string;
  slot_label: string;
  cron_expression: string;
  title: string;
  body: string;
  enabled: boolean;
  deep_link: string | null;
}

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"]; // ISO mon-sun
const ISO_FROM_INDEX = [1, 2, 3, 4, 5, 6, 0]; // map L=mon(1) … D=sun(0)

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

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("Laurent");
  const [doctor, setDoctor] = useState("");
  const [target, setTarget] = useState({ weight: 85, waist: 95, bf: 20 });
  const [baseline, setBaseline] = useState({ weight: 97, waist: 108, bf: 30 });
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwdStatus, setPwdStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState(false);
  const [editingNotifs, setEditingNotifs] = useState(false);
  const today = new Date();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setEmail(user.email ?? "");
        const [{ data: s }, { data: p }, { data: latest }] = await Promise.all([
          supabase.from("notification_schedule").select("*").eq("user_id", user.id).order("slot_label"),
          supabase.from("profile").select("*").eq("id", user.id).maybeSingle(),
          supabase
            .from("daily_log")
            .select("weight_kg")
            .eq("user_id", user.id)
            .not("weight_kg", "is", null)
            .order("log_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        setSlots((s as Slot[]) ?? []);
        if (p) {
          if (p.display_name) setDisplayName(p.display_name);
          setDoctor(p.doctor_phone ?? "");
          setTarget({ weight: p.target_weight_kg, waist: p.target_waist_cm, bf: p.target_bf_pct });
          setBaseline({ weight: p.baseline_weight_kg, waist: p.baseline_waist_cm, bf: p.baseline_bf_pct });
        }
        if (latest?.weight_kg != null) setTodayWeight(latest.weight_kg);
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

  async function saveProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profile")
        .update({
          doctor_phone: doctor || null,
          target_weight_kg: target.weight,
          target_waist_cm: target.waist,
          target_bf_pct: target.bf,
        })
        .eq("id", user.id);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch {
      /* stub */
    }
  }

  async function changePassword() {
    setPwdStatus(null);
    if (newPassword.length < 8) {
      setPwdStatus({ kind: "err", msg: "Au moins 8 caractères." });
      return;
    }
    setPwdSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setPwdSaving(false);
      if (error) {
        setPwdStatus({ kind: "err", msg: error.message });
        return;
      }
      setNewPassword("");
      setPwdStatus({ kind: "ok", msg: "Mot de passe mis à jour." });
    } catch {
      setPwdSaving(false);
      setPwdStatus({ kind: "err", msg: "Erreur." });
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.push("/login");
    }
  }

  async function exportJson() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const tables = ["daily_log", "meal_log", "training_log", "weekly_review", "ping_log"] as const;
      const dump: Record<string, unknown> = {};
      for (const tbl of tables) {
        const { data } = await supabase.from(tbl).select("*").eq("user_id", user.id);
        dump[tbl] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mycoach-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* stub */
    }
  }

  const daysSinceStart = Math.max(
    1,
    Math.floor((today.getTime() - new Date(PROGRAM_START_ISO).getTime()) / 86_400_000) + 1,
  );
  const lostKg = todayWeight != null ? baseline.weight - todayWeight : null;
  const toGoalKg = todayWeight != null ? todayWeight - target.weight : null;
  const startLabel = formatInTimeZone(new Date(PROGRAM_START_ISO), PARIS_TZ, "d MMM yyyy", { locale: fr });

  return (
    <div style={{ padding: "4px 20px 24px" }}>
      <div style={{ paddingTop: 6 }}>
        <div className="hf-footnote" style={{ color: HF.label2 }}>Profil</div>
        <div className="hf-largeTitle" style={{ marginTop: 2 }}>Moi</div>
      </div>

      {/* Identity card */}
      <HFCard style={{ marginTop: 14 }} padding="16px 16px 0">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${HF.green}, ${HF.indigo})`,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--hf-font-round)",
              fontWeight: 700,
              fontSize: 26,
              flexShrink: 0,
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hf-title2">{displayName}</div>
            <div className="hf-subhead hf-tnum" style={{ color: HF.label2, marginTop: 2 }}>
              52 ans · 1,81 m · début {startLabel}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, paddingBottom: 14, borderTop: `0.5px solid ${HF.separator}`, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Stat color={HF.green} value={String(daysSinceStart)} unit="jours" />
          <Stat
            color={HF.green}
            value={lostKg != null ? `${lostKg < 0 ? "+" : "−"}${Math.abs(lostKg).toFixed(1).replace(".", ",")}` : "—"}
            unit="kg perdus"
          />
          <Stat
            color={HF.indigo}
            value={toGoalKg != null ? `${toGoalKg.toFixed(1).replace(".", ",")}` : "—"}
            unit="kg vers obj."
          />
        </div>
      </HFCard>

      {/* PROTOCOLE */}
      <SectionTitle label="PROTOCOLE" />
      <HFCard padding={0} style={{ marginTop: 8 }}>
        <SetRow
          tint={HF.green}
          icon="target"
          title="Objectif poids"
          value={`${target.weight.toFixed(1).replace(".", ",")} kg`}
          onClick={() => setEditingProtocol((v) => !v)}
        />
        <Sep />
        <SetRow
          tint={HF.red}
          icon="phone"
          title="Médecin de garde"
          value={doctor || "non défini"}
          onClick={() => setEditingProtocol((v) => !v)}
        />
        <Sep />
        <SetRow
          tint={HF.indigo}
          icon="clock"
          title="Fenêtre de jeûne"
          value="06:30 → 14:00"
          locked
        />
      </HFCard>
      {editingProtocol && (
        <HFCard style={{ marginTop: 8 }} padding="14px 16px">
          <FieldRow label="Cible poids (kg)" type="number" value={target.weight} step={0.1} onChange={(v) => setTarget({ ...target, weight: v })} />
          <FieldRow label="Cible TT (cm)" type="number" value={target.waist} step={1} onChange={(v) => setTarget({ ...target, waist: v })} />
          <FieldRow label="Téléphone médecin" type="tel" value={doctor} onChange={setDoctor} placeholder="+33…" />
          <button
            type="button"
            onClick={saveProfile}
            style={{
              width: "100%",
              marginTop: 8,
              background: HF.green,
              color: "white",
              padding: "10px",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              border: "none",
            }}
          >
            {profileSaved ? "✓ Enregistré" : "Enregistrer"}
          </button>
        </HFCard>
      )}

      {/* APPLICATION */}
      <SectionTitle label="APPLICATION" />
      <HFCard padding={0} style={{ marginTop: 8 }}>
        <div style={{ padding: "14px 16px" }}>
          <NotificationPermission />
        </div>
        <Sep />
        <SetRow
          tint={HF.orange}
          icon="bell"
          title="Planning des rappels"
          value={`${slots.filter((s) => s.enabled).length}/${slots.length} actifs`}
          onClick={() => setEditingNotifs((v) => !v)}
        />
      </HFCard>
      {editingNotifs && slots.length > 0 && (
        <HFCard padding={0} style={{ marginTop: 8 }}>
          {slots.map((slot, i) => {
            const { hh, mm, days } = parseCron(slot.cron_expression);
            return (
              <div key={slot.id}>
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="hf-headline">{slot.title}</div>
                      <div className="hf-caption" style={{ color: HF.label2 }}>{slot.slot_label}</div>
                    </div>
                    <IOSToggle checked={slot.enabled} onChange={(v) => toggleSlot(slot, v)} />
                  </div>
                  {slot.enabled && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <input
                        type="time"
                        value={`${hh}:${mm}`}
                        onChange={(e) => {
                          const [nh, nm] = e.target.value.split(":");
                          void updateSlotTime(slot, nh, nm, days);
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
                              onClick={() => {
                                const next = active ? days.filter((d) => d !== dowIso) : [...days, dowIso];
                                void updateSlotTime(slot, hh, mm, next);
                              }}
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
                {i < slots.length - 1 && <Sep />}
              </div>
            );
          })}
        </HFCard>
      )}

      {/* DONNÉES */}
      <SectionTitle label="DONNÉES" />
      <HFCard padding={0} style={{ marginTop: 8 }}>
        <SetRow tint={HF.blue} icon="download" title="Exporter (JSON)" onClick={exportJson} value="" />
      </HFCard>

      {/* COMPTE */}
      <SectionTitle label="COMPTE" />
      <HFCard padding={0} style={{ marginTop: 8 }}>
        <div style={{ padding: "12px 16px" }}>
          <div className="hf-subhead" style={{ color: HF.label2, marginBottom: 6 }}>Identifiant</div>
          <div className="hf-headline hf-tnum">{email || "—"}</div>
        </div>
        <Sep />
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="hf-subhead" style={{ color: HF.label2 }}>Nouveau mot de passe</div>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              background: HF.fill,
              color: HF.label,
              padding: "10px 12px",
              borderRadius: 10,
              border: "none",
              fontSize: 16,
            }}
          />
          {pwdStatus && (
            <div
              className="hf-caption"
              style={{ color: pwdStatus.kind === "ok" ? HF.green : HF.red }}
            >
              {pwdStatus.msg}
            </div>
          )}
          <button
            type="button"
            onClick={changePassword}
            disabled={pwdSaving || newPassword.length === 0}
            style={{
              background: HF.blue,
              color: "white",
              padding: "10px",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              opacity: pwdSaving || newPassword.length === 0 ? 0.6 : 1,
              alignSelf: "flex-start",
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            {pwdSaving ? "Mise à jour…" : "Mettre à jour"}
          </button>
        </div>
        <Sep />
        <button
          type="button"
          onClick={logout}
          style={{
            width: "100%",
            background: "transparent",
            color: HF.red,
            padding: "14px 16px",
            border: "none",
            fontSize: 16,
            fontWeight: 600,
            textAlign: "left",
          }}
        >
          Se déconnecter
        </button>
      </HFCard>

      <div className="hf-caption hf-tnum" style={{ textAlign: "center", color: HF.label3, marginTop: 22 }}>
        MyCoach · refonte HIFI
      </div>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
      {label}
    </div>
  );
}

function Sep() {
  return <div style={{ height: 0.5, background: HF.separator, marginLeft: 56 }} />;
}

function Stat({ color, value, unit }: { color: string; value: string; unit: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="hf-numBig hf-tnum" style={{ fontSize: 22, color }}>{value}</div>
      <div className="hf-caption" style={{ color: HF.label2 }}>{unit}</div>
    </div>
  );
}

type IconKey = "target" | "phone" | "clock" | "bell" | "download";

function RowIcon({ icon }: { icon: IconKey }) {
  switch (icon) {
    case "target":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    case "phone":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4a2 2 0 012-2h2l1.5 5L9 9c1 2.5 3.5 5 6 6l2-2.5 5 1.5v2a2 2 0 01-2 2 18 18 0 01-14-14z" />
        </svg>
      );
    case "clock":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </svg>
      );
    case "bell":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 21a2 2 0 004 0" />
        </svg>
      );
    case "download":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />
        </svg>
      );
  }
}

function SetRow({
  tint,
  icon,
  title,
  value,
  onClick,
  locked,
}: {
  tint: string;
  icon: IconKey;
  title: string;
  value: string;
  onClick?: () => void;
  locked?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        display: "flex",
        width: "100%",
        padding: "13px 16px",
        gap: 12,
        alignItems: "center",
        background: "transparent",
        border: "none",
        color: HF.label,
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          flexShrink: 0,
          background: `${tint}1F`,
          color: tint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RowIcon icon={icon} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="hf-subhead">{title}</div>
      </div>
      <div className="hf-subhead hf-tnum" style={{ color: HF.label2 }}>{value}</div>
      {onClick && !locked && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={HF.label3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
          <path d="M5 3l4 4-4 4" />
        </svg>
      )}
      {locked && (
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={HF.label3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
          <rect x="3" y="6" width="8" height="6" rx="1" />
          <path d="M5 6V4a2 2 0 014 0v2" />
        </svg>
      )}
    </Tag>
  );
}

function FieldRow({
  label,
  type,
  value,
  step,
  onChange,
  placeholder,
}: {
  label: string;
  type: "number" | "tel" | "text";
  value: number | string;
  step?: number;
  onChange: (v: never) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
      <span className="hf-caption" style={{ color: HF.label2 }}>{label}</span>
      <input
        type={type}
        value={value as string | number}
        step={step}
        placeholder={placeholder}
        onChange={(e) => {
          const v = type === "number" ? Number(e.target.value) : e.target.value;
          (onChange as (v: number | string) => void)(v);
        }}
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
