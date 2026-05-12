// Supabase Edge Function — generates weekly_review for the just-finished week.
// Triggered by pg_cron every Monday 07:00 Europe/Paris (cron uses UTC; adjust at install).
//
// Verdict rules:
//   on_track : weekly delta in [-0.9, -0.5] kg (or refeed safety zone in S1)
//   retard   : delta > -0.4 kg
//   avance   : delta < -1.0 kg  (à surveiller — déshydratation Eliquis)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:laurent.fontaine@ascenzia.fr";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

interface Payload {
  user_id?: string;
  week_start?: string | null;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function previousMonday(now = new Date()): Date {
  // Monday of the week that JUST FINISHED.
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 sun .. 6 sat
  // distance back to Monday of THIS week
  const backToThisMonday = (dow + 6) % 7;
  d.setDate(d.getDate() - backToThisMonday - 7);
  return d;
}

function avg(vals: number[]) {
  if (!vals.length) return null;
  return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

function classify(delta: number): "on_track" | "retard" | "avance" {
  if (delta > -0.4) return "retard";
  if (delta < -1.0) return "avance";
  return "on_track";
}

function adjustments(verdict: string, deviations: number, ketonesAvg: number | null): string {
  const out: string[] = [];
  if (verdict === "retard") {
    out.push("Audit déclencheur des écarts.");
    out.push("Vérifier hydratation (3 L/j) et électrolytes.");
    if (ketonesAvg != null && ketonesAvg < 0.5) out.push("Cétones < 0,5 — recheck glucides cachés (sauces, légumes féculents).");
  }
  if (verdict === "avance") {
    out.push("Pertes >1 kg/sem — surveiller TA matin et signes de déshydratation (Eliquis).");
    out.push("Augmenter sel à 5 g et eau à 3,5 L si vertiges.");
  }
  if (deviations >= 3) out.push(`${deviations} écarts cette semaine — audit cause (stress / sommeil / social).`);
  if (!out.length) out.push("Maintenir le cap, prochaine étape : refeed dimanche structuré.");
  return out.join(" ");
}

Deno.serve(async (req) => {
  const body: Payload = await req.json().catch(() => ({}));
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  let userIds: string[];
  if (body.user_id) {
    userIds = [body.user_id];
  } else {
    const { data: profiles } = await sb.from("profile").select("id");
    userIds = (profiles ?? []).map((p) => p.id);
  }

  const weekStart = body.week_start
    ? new Date(body.week_start + "T00:00:00")
    : previousMonday();
  const weekStartIso = isoDate(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndIso = isoDate(weekEnd);

  const previousStart = new Date(weekStart);
  previousStart.setDate(previousStart.getDate() - 7);

  const out: unknown[] = [];

  for (const userId of userIds) {
    const [{ data: thisWeek }, { data: lastWeek }, { data: trainings }] = await Promise.all([
      sb.from("daily_log")
        .select("log_date, weight_kg, waist_cm, ketones_mmol, energy_10, sleep_hours, sleep_quality_10, deviation")
        .eq("user_id", userId)
        .gte("log_date", weekStartIso)
        .lte("log_date", weekEndIso),
      sb.from("daily_log")
        .select("weight_kg")
        .eq("user_id", userId)
        .gte("log_date", isoDate(previousStart))
        .lt("log_date", weekStartIso),
      sb.from("training_log")
        .select("log_date, completed")
        .eq("user_id", userId)
        .gte("log_date", weekStartIso)
        .lte("log_date", weekEndIso),
    ]);

    const weights = (thisWeek ?? []).map((r) => r.weight_kg).filter((v): v is number => v != null);
    const ketones = (thisWeek ?? []).map((r) => r.ketones_mmol).filter((v): v is number => v != null);
    const energies = (thisWeek ?? []).map((r) => r.energy_10).filter((v): v is number => v != null);
    const sleeps = (thisWeek ?? []).map((r) => r.sleep_hours).filter((v): v is number => v != null);
    const deviations = (thisWeek ?? []).filter((r) => r.deviation).length;
    const sessionsDone = (trainings ?? []).filter((t) => t.completed).length;
    const sessionsPlanned = 4;

    const weightAvg = avg(weights);
    const lastWeightAvg = avg((lastWeek ?? []).map((r) => r.weight_kg).filter((v): v is number => v != null));
    const weightDelta =
      weightAvg != null && lastWeightAvg != null ? +(weightAvg - lastWeightAvg).toFixed(1) : null;

    const mondayWaist = (thisWeek ?? []).find((r) => r.log_date === weekStartIso)?.waist_cm ?? null;
    const lastMondayWaist =
      (lastWeek ?? []).find((r: { waist_cm?: number | null }) => "waist_cm" in r)?.waist_cm ?? null;
    const waistDelta = mondayWaist != null && lastMondayWaist != null ? mondayWaist - lastMondayWaist : null;

    const verdict = weightDelta != null ? classify(weightDelta) : "on_track";
    const adjText = adjustments(verdict, deviations, avg(ketones));

    const { data: review } = await sb
      .from("weekly_review")
      .upsert(
        {
          user_id: userId,
          week_start: weekStartIso,
          weight_avg_kg: weightAvg,
          weight_delta_kg: weightDelta,
          waist_cm: mondayWaist,
          waist_delta_cm: waistDelta,
          ketones_avg: avg(ketones),
          sessions_done: sessionsDone,
          sessions_planned: sessionsPlanned,
          deviations,
          sleep_avg_h: avg(sleeps),
          energy_avg_10: avg(energies),
          verdict,
          adjustments: adjText,
        },
        { onConflict: "user_id,week_start" },
      )
      .select()
      .single();

    out.push(review);

    // Notify
    const { data: subs } = await sb
      .from("push_subscription")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (subs?.length) {
      const payload = JSON.stringify({
        title: `Bilan S-1 prêt`,
        body: `Δ ${weightDelta ?? "?"} kg · Verdict: ${verdict.toUpperCase()}`,
        url: "/weekly",
      });
      for (const s of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            await sb.from("push_subscription").delete().eq("endpoint", s.endpoint);
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ reviews: out }), {
    headers: { "Content-Type": "application/json" },
  });
});
