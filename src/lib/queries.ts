import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

export function todayIso(d: Date = new Date()): string {
  // YYYY-MM-DD in local time (we treat Europe/Paris as the user's tz)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

export function isoDaysAgo(n: number, d: Date = new Date()): string {
  const x = new Date(d);
  x.setDate(x.getDate() - n);
  return todayIso(x);
}

export async function getRecentDailyLogs(
  supabase: SupabaseClient<Database>,
  userId: string,
  days = 30,
) {
  const since = isoDaysAgo(days);
  return supabase
    .from("daily_log")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", since)
    .order("log_date", { ascending: true });
}

export async function getDailyLog(
  supabase: SupabaseClient<Database>,
  userId: string,
  logDate: string,
) {
  return supabase
    .from("daily_log")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .maybeSingle();
}

export async function getActiveAlerts(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  return supabase
    .from("error_log")
    .select("severity, type, message, context, created_at")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 36 * 3600 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(10);
}
