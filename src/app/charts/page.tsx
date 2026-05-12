"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineChartTrend, type TrendPoint } from "@/components/LineChartTrend";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TARGETS } from "@/lib/protocol";

type Range = "7" | "30" | "all";

interface Row {
  log_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  ketones_mmol: number | null;
  bp_morning_sys: number | null;
  bp_morning_dia: number | null;
  energy_10: number | null;
  hunger_10: number | null;
  sleep_hours: number | null;
  sleep_quality_10: number | null;
  water_l: number | null;
  deviation: boolean | null;
}

export default function ChartsPage() {
  const supabase = createClient();
  const [range, setRange] = useState<Range>("30");
  const [rows, setRows] = useState<Row[]>([]);
  const [targetWeight, setTargetWeight] = useState<number>(85);
  const [targetWaist, setTargetWaist] = useState<number>(95);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const since = range === "all"
        ? "2026-05-01"
        : new Date(Date.now() - (range === "7" ? 7 : 30) * 86_400_000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("daily_log")
        .select(
          "log_date, weight_kg, waist_cm, ketones_mmol, bp_morning_sys, bp_morning_dia, energy_10, hunger_10, sleep_hours, sleep_quality_10, water_l, deviation",
        )
        .eq("user_id", user.id)
        .gte("log_date", since)
        .order("log_date", { ascending: true });
      setRows((data as Row[]) ?? []);
      const { data: prof } = await supabase
        .from("profile")
        .select("target_weight_kg, target_waist_cm")
        .eq("id", user.id)
        .maybeSingle();
      if (prof) {
        setTargetWeight(prof.target_weight_kg);
        setTargetWaist(prof.target_waist_cm);
      }
    })();
  }, [supabase, range]);

  const series = useMemo(() => {
    const map = (k: keyof Row): TrendPoint[] =>
      rows.map((r) => ({ date: r.log_date.slice(5), value: (r[k] as number | null) ?? null }));
    return {
      weight: map("weight_kg"),
      waist: rows.filter((r) => r.waist_cm != null).map((r) => ({ date: r.log_date.slice(5), value: r.waist_cm })),
      ketones: map("ketones_mmol"),
      bpSys: map("bp_morning_sys"),
      bpDia: map("bp_morning_dia"),
      energy: map("energy_10"),
      hunger: map("hunger_10"),
      sleepH: map("sleep_hours"),
      sleepQ: map("sleep_quality_10"),
      water: map("water_l"),
    };
  }, [rows]);

  const compliance = useMemo(() => {
    const total = rows.length || 1;
    const deviations = rows.filter((r) => r.deviation).length;
    return Math.round(((total - deviations) / total) * 100);
  }, [rows]);

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Mesures</h1>
        <div className="flex gap-1 rounded-md bg-zinc-100 p-1 dark:bg-zinc-800">
          {(["7", "30", "all"] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={r === range ? "default" : "ghost"}
              onClick={() => setRange(r)}
              className="h-7 px-2 text-xs"
            >
              {r === "all" ? "Tout" : `${r}j`}
            </Button>
          ))}
        </div>
      </header>

      <Tabs defaultValue="weight">
        <TabsList>
          <TabsTrigger value="weight">Poids</TabsTrigger>
          <TabsTrigger value="waist">TT</TabsTrigger>
          <TabsTrigger value="ketones">Cétones</TabsTrigger>
          <TabsTrigger value="bp">TA</TabsTrigger>
          <TabsTrigger value="energy">Énergie</TabsTrigger>
          <TabsTrigger value="sleep">Sommeil</TabsTrigger>
          <TabsTrigger value="hydration">Hydro</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="weight">
          <Card>
            <CardContent className="pt-4">
              <LineChartTrend data={series.weight} target={targetWeight} unit="kg" height={220} showGrid />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waist">
          <Card>
            <CardContent className="pt-4">
              <LineChartTrend data={series.waist} target={targetWaist} unit="cm" height={220} showGrid />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ketones">
          <Card>
            <CardContent className="pt-4">
              <LineChartTrend data={series.ketones} target={TARGETS.ketones_min_mmol} unit="mmol/L" height={220} showGrid />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bp">
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div>
                <p className="text-xs text-zinc-500">Systolique</p>
                <LineChartTrend data={series.bpSys} unit="mmHg" height={140} color="#dc2626" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Diastolique</p>
                <LineChartTrend data={series.bpDia} unit="mmHg" height={140} color="#f59e0b" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="energy">
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div>
                <p className="text-xs text-zinc-500">Énergie /10</p>
                <LineChartTrend data={series.energy} domain={[0, 10]} height={140} color="#16a34a" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Faim /10</p>
                <LineChartTrend data={series.hunger} domain={[0, 10]} height={140} color="#dc2626" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sleep">
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div>
                <p className="text-xs text-zinc-500">Heures</p>
                <LineChartTrend data={series.sleepH} unit="h" height={140} />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Qualité /10</p>
                <LineChartTrend data={series.sleepQ} domain={[0, 10]} height={140} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hydration">
          <Card>
            <CardContent className="pt-4">
              <LineChartTrend data={series.water} target={TARGETS.hydration_l} unit="L" height={220} showGrid />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardContent className="pt-4">
              <p className="text-4xl font-semibold tabular-nums">{compliance}%</p>
              <p className="mt-1 text-sm text-zinc-500">
                {rows.length} jours observés ·{" "}
                {rows.filter((r) => r.deviation).length} écarts
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
