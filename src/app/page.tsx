import { createClient } from "@/lib/supabase/server";
import { PROGRAM_START_ISO, PROGRAM_DURATION_DAYS } from "@/lib/protocol";
import { daysBetween, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date();
  const dayIndex = Math.max(1, daysBetween(PROGRAM_START_ISO, today) + 1);
  const remaining = Math.max(0, PROGRAM_DURATION_DAYS - dayIndex);

  return (
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

      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
          <p>Connecté en tant que {user?.email ?? "—"}.</p>
          <p className="mt-2">Les KPI, mini-charts et CTA seront ajoutés au chunk 2.</p>
        </CardContent>
      </Card>
    </div>
  );
}
