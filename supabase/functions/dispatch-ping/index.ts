// Supabase Edge Function — sends push notifications for a slot.
// Triggered by pg_cron → pg_net every minute slot.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";
import webpush from "https://esm.sh/web-push@3.6.7";

interface Payload {
  slot_label: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:laurent.fontaine@ascenzia.fr";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  const { slot_label } = (await req.json()) as Payload;
  if (!slot_label) return new Response("missing slot_label", { status: 400 });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1. Find enabled schedule entries for that slot (any user — single tenant)
  const { data: schedules, error: schErr } = await sb
    .from("notification_schedule")
    .select("user_id, slot_label, title, body, enabled, deep_link")
    .eq("slot_label", slot_label)
    .eq("enabled", true);
  if (schErr) {
    await sb.from("error_log").insert({
      source: "dispatch-ping",
      type: "schedule_lookup",
      severity: "amber",
      message: schErr.message,
    });
    return new Response(JSON.stringify({ error: schErr.message }), { status: 500 });
  }
  if (!schedules?.length) {
    return new Response(JSON.stringify({ skipped: slot_label }), { status: 204 });
  }

  let total = 0;
  let sent = 0;

  for (const sch of schedules) {
    // 2. Record the ping
    const { data: pingRow } = await sb
      .from("ping_log")
      .insert({
        user_id: sch.user_id,
        ping_slot: slot_label,
        scheduled_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    // 3. Load user's subscriptions
    const { data: subs } = await sb
      .from("push_subscription")
      .select("endpoint, p256dh, auth")
      .eq("user_id", sch.user_id);
    if (!subs?.length) continue;
    total += subs.length;

    const payload = JSON.stringify({
      title: sch.title,
      body: sch.body,
      url: sch.deep_link ?? "/",
      ping_log_id: pingRow?.id,
    });

    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await sb.from("push_subscription").delete().eq("endpoint", s.endpoint);
        } else {
          await sb.from("error_log").insert({
            user_id: sch.user_id,
            source: "dispatch-ping",
            type: "push_send",
            severity: "amber",
            message: (err as Error).message,
            context: { endpoint: s.endpoint, slot_label },
          });
        }
      }
    }
  }

  return new Response(JSON.stringify({ slot_label, sent, total }), {
    headers: { "Content-Type": "application/json" },
  });
});
