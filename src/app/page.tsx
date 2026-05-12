import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PROGRAM_START_ISO, PROGRAM_DURATION_DAYS, TRAINING_PLAN } from "@/lib/protocol";
import { daysBetween, formatDate, formatKg, formatCm, formatDelta } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/MetricCard";
import { LineChartTrend } from "@/components/LineChartTrend";
import { SafetyBanner } from "@/components/SafetyBanner";
import { Plus } from "lucide-react";
import { evaluateAll } from "@/lib/safety";

export const dynamic = "force-dynamic";

function isoWeekday(d: Date) {
  return ((d.getDay() + 6) % 7) + 1;
}

function todayIsoFromDate(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = new Date();
  const todayIso = todayIsoFromDate(today);
  const dayIndex = Math.max(1, daysBetween(PROGRAM_START_ISO, today) + 1);
  const remaining = Math.max(0, PROGRAM_DURATION_DAYS - dayIndex);

  let weightToday: number | null = null;
  let waistToday: number | null = null;
  let weight7: { date: string; value: number | null }[] = [];
  let waist4: { date: string; value: number | null }[] = [];
  let energy14: { date: string; value: number | null }[] = [];
  let ketonesAvg: number | null = null;
  let energyAvg: number | null = null;
  let baseline = { weight: 97, waist: 108 };
  let doctorPhone: string | null = null;
  let morningDone = false;
  let pendingPing: { slot_label: string; scheduled_at: string; deep_link: string | null; title: string } | null = null;
  let alerts: ReturnType<typeof evaluateAll> = [];

  if (user) {
    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const since28 = new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10);
    const since14 = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);

    const [{ data: logs }, { data: prof }, { data: ping }] = await Promise.all([
      supabase
        .from("daily_log")
        .select("log_date, weight_kg, waist_cm, ketones_mmol, energy_10, hunger_10, sleep_quality_10, deviation, bp_morning_sys, bp_morning_dia")
        .eq("user_id", user.id)
        .gte("log_date", since30)
        .order("log_date", { ascending: true }),
      supabase
        .from("profile")
        .select("baseline_weight_kg, baseline_waist_cm, doctor_phone")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("ping_log")
        .select("ping_slot, scheduled_at")
        .eq("user_id", user.id)
        .is("acknowledged_at", null)
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (prof) {
      baseline = { weight: prof.baseline_weight_kg, waist: prof.baseline_waist_cm };
      doctorPhone = prof.doctor_phone;
    }

    const todayRow = logs?.find((r) => r.log_date === todayIso);
    morningDone = !!todayRow?.weight_kg;
    weightToday = todayRow?.weight_kg ?? null;
    waistToday = todayRow?.waist_cm ?? null;

    const last7 = (logs ?? []).filter((r) => r.log_date >= new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10));
    weight7 = last7.map((r) => ({ date: r.log_date.slice(5), value: r.weight_kg }));
    waist4 = (logs ?? []).filter((r) => r.waist_cm != null && r.log_date >= since28).map((r) => ({ date: r.log_date.slice(5), value: r.waist_cm }));
    energy14 = (logs ?? []).filter((r) => r.log_date >= since14).map((r) => ({ date: r.log_date.slice(5), value: r.energy_10 }));

    const ketones7 = last7.map((r) => r.ketones_mmol).filter((v): v is number => v != null);
    if (ketones7.length) ketonesAvg = +(ketones7.reduce((a, b) => a + b, 0) / ketones7.length).toFixed(1);
    const energy7 = last7.map((r) => r.energy_10).filter((v): v is number => v != null);
    if (energy7.length) energyAvg = +(energy7.reduce((a, b) => a + b, 0) / energy7.length).toFixed(1);

    if (ping) {
      const { data: sched } = await supabase
        .from("notification_schedule")
        .select("title, deep_link")
        .eq("user_id", user.id)
        .eq("slot_label", ping.ping_slot)
        .maybeSingle();
      if (sched) {
        pendingPing = { ...ping, slot_label: ping.ping_slot, deep_link: sched.deep_link, title: sched.title };
      }
    }

    // Safety
    const sevenDaysAgoRow = logs?.find((r) => r.log_date === new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10));
    const deviationsLast7Days = (logs ?? [])
      .filter((r) => r.log_date >= new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10))
      .filter((r) => r.deviation).length;
    const sleepStreak = (logs ?? [])
      .slice(-3)
      .map((r) => r.sleep_quality_10)
      .filter((v): v is number => v != null);

    alerts = evaluateAll({
      bp:
        todayRow?.bp_morning_sys != null && todayRow?.bp_morning_dia != null
          ? { sys: todayRow.bp_morning_sys, dia: todayRow.bp_morning_dia }
          : undefined,
      weight:
        weightToday != null && sevenDaysAgoRow?.weight_kg != null
          ? { today: weightToday, sevenDaysAgo: sevenDaysAgoRow.weight_kg }
          : undefined,
      deviationsLast7Days,
      lastThreeNightsQuality: sleepStreak,
    });
  }

  const hour = today.getHours();
  const showMorningCta = !morningDone && hour < 12;
  const planned = TRAINING_PLAN[isoWeekday(today)];

  return (
    <>
      <SafetyBanner alerts={alerts} doctorPhone={doctorPhone} />

      <div className="space-y-4 p-4">
        <header>
          <p className="text-xs uppercase tracking-wider text-zinc-500">{formatDate(today)}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Jour {dayIndex} sur {PROGRAM_DURATION_DAYS}
          </h1>
          <div className="mt-2 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-1.5 rounded-full bg-zinc-950 dark:bg-zinc-50"
              style={{ width: `${Math.min(100, (dayIndex / PROGRAM_DURATION_DAYS) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">{remaining} jours restants</p>
        </header>

        {showMorningCta && (
          <Card>
            <CardContent className="flex items-center justify-between pt-4">
              <div>
                <p className="font-medium">Pesée matin non saisie</p>
                <p className="text-xs text-zinc-500">À faire avant 9h00.</p>
              </div>
              <Button asChild>
                <Link href="/log/morning">Saisir</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            href="/log/morning"
            title="Poids"
            value={formatKg(weightToday ?? null)}
            delta={weightToday != null ? formatDelta(weightToday - baseline.weight, "kg") : null}
            deltaTone={weightToday != null && weightToday - baseline.weight < 0 ? "positive" : "neutral"}
            hint="vs T0"
          />
          <MetricCard
            href="/log/morning"
            title="Tour de taille"
            value={formatCm(waistToday)}
            delta={waistToday != null ? formatDelta(waistToday - baseline.waist, "cm") : null}
            deltaTone={waistToday != null && waistToday - baseline.waist < 0 ? "positive" : "neutral"}
            hint="vs T0"
          />
          <MetricCard
            href="/log/morning"
            title="Cétones (avg 7j)"
            value={ketonesAvg != null ? `${ketonesAvg.toFixed(1)} mmol/L` : "—"}
            hint="cible ≥ 0,5"
          />
          <MetricCard
            href="/log/evening"
            title="Énergie (avg 7j)"
            value={energyAvg != null ? `${energyAvg.toFixed(1)} /10` : "—"}
          />
        </div>

        {pendingPing && (
          <Card>
            <CardHeader>
              <CardTitle>Prochaine action</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between pt-0">
              <div>
                <p className="text-sm font-medium">{pendingPing.title}</p>
                <p className="text-xs text-zinc-500">{new Date(pendingPing.scheduled_at).toLocaleTimeString("fr-FR")}</p>
              </div>
              {pendingPing.deep_link && (
                <Button asChild>
                  <Link href={pendingPing.deep_link}>Ouvrir</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {planned && (
          <Card>
            <CardHeader>
              <CardTitle>Séance du jour</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between pt-0">
              <div>
                <p className="text-sm">{planned.label}</p>
                <p className="text-xs text-zinc-500">{planned.duration_min} min</p>
              </div>
              <Button asChild variant="outline">
                <Link href="/training">Détail</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Poids — 7 jours</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartTrend data={weight7} />
          </CardContent>
        </Card>

        {waist4.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>TT — 4 semaines</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChartTrend data={waist4} unit="cm" />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Énergie — 14 jours</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartTrend data={energy14} domain={[0, 10]} color="#16a34a" />
          </CardContent>
        </Card>
      </div>

      <Link
        href="/log/morning"
        aria-label="Saisie rapide"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white shadow-xl dark:bg-zinc-50 dark:text-zinc-950"
      >
        <Plus className="size-6" />
      </Link>
    </>
  );
}
