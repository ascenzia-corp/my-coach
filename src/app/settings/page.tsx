"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotificationPermission } from "@/components/NotificationPermission";

interface Slot {
  id: string;
  slot_label: string;
  cron_expression: string;
  title: string;
  body: string;
  enabled: boolean;
  deep_link: string | null;
}

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

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
  const supabase = createClient();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [email, setEmail] = useState<string>("");
  const [doctor, setDoctor] = useState("");
  const [target, setTarget] = useState({ weight: 85, waist: 95, bf: 20 });
  const [baseline, setBaseline] = useState({ weight: 97, waist: 108, bf: 30 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: s } = await supabase
        .from("notification_schedule")
        .select("*")
        .eq("user_id", user.id)
        .order("slot_label");
      setSlots((s as Slot[]) ?? []);
      const { data: p } = await supabase
        .from("profile")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (p) {
        setDoctor(p.doctor_phone ?? "");
        setTarget({ weight: p.target_weight_kg, waist: p.target_waist_cm, bf: p.target_bf_pct });
        setBaseline({ weight: p.baseline_weight_kg, waist: p.baseline_waist_cm, bf: p.baseline_bf_pct });
      }
    })();
  }, [supabase]);

  async function toggleSlot(slot: Slot, enabled: boolean) {
    setSlots((cur) => cur.map((s) => (s.id === slot.id ? { ...s, enabled } : s)));
    await supabase.from("notification_schedule").update({ enabled }).eq("id", slot.id);
  }

  async function updateSlotTime(slot: Slot, hh: string, mm: string, days: number[]) {
    const cron = buildCron(hh, mm, days);
    setSlots((cur) => cur.map((s) => (s.id === slot.id ? { ...s, cron_expression: cron } : s)));
    await supabase.from("notification_schedule").update({ cron_expression: cron }).eq("id", slot.id);
  }

  async function saveProfile() {
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
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function exportJson() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const tables = ["daily_log", "meal_log", "training_log", "weekly_review", "ping_log"] as const;
    const dump: Record<string, unknown> = {};
    for (const t of tables) {
      const { data } = await supabase.from(t).select("*").eq("user_id", user.id);
      dump[t] = data ?? [];
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mycoach-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>
        <p className="text-xs text-zinc-500">{email}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Notifications push</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationPermission />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {slots.map((slot) => {
            const { hh, mm, days } = parseCron(slot.cron_expression);
            return (
              <div key={slot.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{slot.title}</p>
                    <p className="text-xs text-zinc-500">{slot.slot_label}</p>
                  </div>
                  <Switch checked={slot.enabled} onCheckedChange={(v) => toggleSlot(slot, v)} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input
                    type="time"
                    value={`${hh}:${mm}`}
                    onChange={(e) => {
                      const [nh, nm] = e.target.value.split(":");
                      updateSlotTime(slot, nh, nm, days);
                    }}
                    className="h-8 w-24"
                  />
                  <div className="flex gap-1">
                    {DAY_LABELS.map((label, i) => {
                      const active = days.includes(i);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            const next = active ? days.filter((d) => d !== i) : [...days, i];
                            void updateSlotTime(slot, hh, mm, next);
                          }}
                          className={`h-7 w-7 rounded-md text-[10px] font-medium ${
                            active
                              ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                          }`}
                        >
                          {label[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Cible poids</Label>
              <Input type="number" value={target.weight} step={0.1} onChange={(e) => setTarget({ ...target, weight: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Cible TT</Label>
              <Input type="number" value={target.waist} onChange={(e) => setTarget({ ...target, waist: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Cible MG %</Label>
              <Input type="number" value={target.bf} step={0.1} onChange={(e) => setTarget({ ...target, bf: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Baseline poids</Label>
              <Input value={baseline.weight} disabled />
            </div>
            <div>
              <Label className="text-xs">Baseline TT</Label>
              <Input value={baseline.waist} disabled />
            </div>
            <div>
              <Label className="text-xs">Baseline MG %</Label>
              <Input value={baseline.bf} disabled />
            </div>
          </div>
          <div>
            <Label className="text-xs">Téléphone médecin traitant</Label>
            <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="+33…" />
          </div>
          <Button onClick={saveProfile}>Enregistrer</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={exportJson}>Télécharger toutes mes données (JSON)</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compte</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={logout}>Se déconnecter</Button>
        </CardContent>
      </Card>
    </div>
  );
}
