"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayIso, isoDaysAgo } from "@/lib/queries";
import { TRAINING_PLAN } from "@/lib/protocol";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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

export default function TrainingPage() {
  const router = useRouter();
  const supabase = createClient();
  const today = todayIso();
  const day = isoWeekday(new Date(today + "T00:00"));
  const planned = TRAINING_PLAN[day];

  const [completed, setCompleted] = useState(false);
  const [duration, setDuration] = useState<string>(planned ? String(planned.duration_min) : "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [week, setWeek] = useState<WeekRow[]>([]);

  useEffect(() => {
    (async () => {
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
    })();
  }, [supabase, today]);

  async function save() {
    if (!planned) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("training_log").insert({
      user_id: user.id,
      log_date: today,
      session_type: planned.type,
      completed,
      duration_min: duration ? Number(duration) : null,
      notes: notes || null,
    });
    setSubmitting(false);
    router.push("/");
  }

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Séance du jour</h1>
        {planned ? (
          <p className="text-sm text-zinc-500">{planned.label} — {planned.duration_min} min prévues.</p>
        ) : (
          <p className="text-sm text-zinc-500">Repos.</p>
        )}
      </header>

      {planned && (
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="done">Réalisée</Label>
              <Switch id="done" checked={completed} onCheckedChange={setCompleted} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dur">Durée (min)</Label>
              <Input id="dur" type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button onClick={save} className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cette semaine</CardTitle>
        </CardHeader>
        <CardContent>
          {week.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune séance enregistrée cette semaine.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {week.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>
                    {s.log_date} — {s.session_type.replace("_", " ")}
                  </span>
                  <Badge variant={s.completed ? "success" : "secondary"}>
                    {s.completed ? "ok" : "à faire"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
