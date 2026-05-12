"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Review {
  id: string;
  week_start: string;
  weight_avg_kg: number | null;
  weight_delta_kg: number | null;
  waist_cm: number | null;
  waist_delta_cm: number | null;
  ketones_avg: number | null;
  sessions_done: number | null;
  sessions_planned: number | null;
  deviations: number | null;
  sleep_avg_h: number | null;
  energy_avg_10: number | null;
  verdict: "on_track" | "retard" | "avance" | null;
  adjustments: string | null;
}

const VERDICT_BADGE: Record<NonNullable<Review["verdict"]>, { label: string; variant: "success" | "warning" | "danger" }> = {
  on_track: { label: "ON TRACK", variant: "success" },
  retard:   { label: "RETARD",   variant: "danger" },
  avance:   { label: "AVANCE",   variant: "warning" },
};

export default function WeeklyPage() {
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("weekly_review")
      .select("*")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false });
    setReviews((data as Review[]) ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function regenerate(week_start: string) {
    setBusyId(week_start);
    await fetch("/api/weekly/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start }),
    });
    await load();
    setBusyId(null);
  }

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Bilans hebdomadaires</h1>
      </header>

      {reviews.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun bilan encore. Le premier sera généré lundi 07h00.</p>
      ) : (
        reviews.map((r) => {
          const v = r.verdict ? VERDICT_BADGE[r.verdict] : null;
          return (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Semaine du {r.week_start}</span>
                  {v && <Badge variant={v.variant}>{v.label}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Poids moyen : <strong>{r.weight_avg_kg ?? "—"} kg</strong> (Δ {r.weight_delta_kg ?? "—"})</p>
                <p>TT : <strong>{r.waist_cm ?? "—"} cm</strong> (Δ {r.waist_delta_cm ?? "—"})</p>
                <p>Cétones moyenne : {r.ketones_avg ?? "—"} mmol/L</p>
                <p>Séances : {r.sessions_done ?? 0}/{r.sessions_planned ?? 4}</p>
                <p>Écarts : {r.deviations ?? 0}</p>
                <p>Sommeil moyen : {r.sleep_avg_h ?? "—"} h</p>
                <p>Énergie moyenne : {r.energy_avg_10 ?? "—"} /10</p>
                {r.adjustments && (
                  <p className="mt-2 rounded-md bg-zinc-100 p-2 text-xs dark:bg-zinc-800">
                    <strong>Ajustements&nbsp;:</strong> {r.adjustments}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => regenerate(r.week_start)}
                  disabled={busyId === r.week_start}
                >
                  {busyId === r.week_start ? "Régénération..." : "Régénérer ce bilan"}
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
