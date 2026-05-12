"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { TARGETS } from "@/lib/protocol";

interface Counter {
  key: "water_l" | "salt_g" | "magnesium_mg" | "potassium_g";
  label: string;
  unit: string;
  step: number;
  decimals: number;
  target: number;
}

const COUNTERS: Counter[] = [
  { key: "water_l", label: "Eau", unit: "L", step: 0.25, decimals: 2, target: TARGETS.hydration_l },
  { key: "salt_g", label: "Sel", unit: "g", step: 0.5, decimals: 1, target: TARGETS.salt_g_max },
  { key: "magnesium_mg", label: "Magnésium", unit: "mg", step: 100, decimals: 0, target: TARGETS.magnesium_mg },
  { key: "potassium_g", label: "Potassium", unit: "g", step: 0.25, decimals: 2, target: TARGETS.potassium_g_max },
];

type Values = Record<Counter["key"], number>;

export default function HydrationPage() {
  const router = useRouter();
  const supabase = createClient();
  const today = todayIso();
  const [values, setValues] = useState<Values>({ water_l: 0, salt_g: 0, magnesium_mg: 0, potassium_g: 0 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: row } = await supabase
        .from("daily_log")
        .select("water_l, salt_g, magnesium_mg, potassium_g")
        .eq("user_id", user.id)
        .eq("log_date", today)
        .maybeSingle();
      if (row) {
        setValues({
          water_l: row.water_l ?? 0,
          salt_g: row.salt_g ?? 0,
          magnesium_mg: row.magnesium_mg ?? 0,
          potassium_g: row.potassium_g ?? 0,
        });
      }
    })();
  }, [supabase, today]);

  function bump(key: Counter["key"], step: number) {
    setValues((v) => ({ ...v, [key]: Math.max(0, +(v[key] + step).toFixed(2)) }));
  }

  async function save() {
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("daily_log")
      .upsert({ user_id: user.id, log_date: today, ...values }, { onConflict: "user_id,log_date" });
    setSubmitting(false);
    router.push("/");
  }

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Hydratation</h1>
        <p className="text-xs text-zinc-500">3 L d&apos;eau minimum — non négociable sous Eliquis.</p>
      </header>

      {COUNTERS.map((c) => {
        const v = values[c.key];
        const pct = Math.min(100, (v / c.target) * 100);
        const reached = v >= c.target;
        return (
          <Card key={c.key}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{c.label}</span>
                <span className={cn("text-sm tabular-nums", reached ? "text-green-600" : "text-zinc-500")}>
                  {v.toFixed(c.decimals)} / {c.target} {c.unit}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={cn("h-full", reached ? "bg-green-600" : "bg-zinc-950 dark:bg-zinc-50")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" size="icon" onClick={() => bump(c.key, -c.step)}>
                  <Minus className="size-4" />
                </Button>
                <span className="text-xl font-semibold tabular-nums">{v.toFixed(c.decimals)}</span>
                <Button type="button" variant="outline" size="icon" onClick={() => bump(c.key, c.step)}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button onClick={save} className="w-full" size="lg" disabled={submitting}>
        {submitting ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
