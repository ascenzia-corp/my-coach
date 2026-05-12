"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/queries";
import { MEAL_TYPES, type MealType } from "@/lib/protocol";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function isMealType(value: string): value is MealType {
  return MEAL_TYPES.some((m) => m.value === value);
}

export default function MealPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const validType = isMealType(type) ? type : null;
  const label = validType ? MEAL_TYPES.find((m) => m.value === validType)?.label : "Repas";

  const [taken, setTaken] = useState(true);
  const [deviation, setDeviation] = useState(false);
  const [protein, setProtein] = useState<string>("");
  const [veggies, setVeggies] = useState<string>("");
  const [carbs, setCarbs] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!validType) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: row } = await supabase
        .from("meal_log")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", todayIso())
        .eq("meal_type", validType)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (row) {
        setTaken(!!row.taken);
        setDeviation(!!row.deviation);
        setProtein(row.protein_g != null ? String(row.protein_g) : "");
        setVeggies(row.veggies_g != null ? String(row.veggies_g) : "");
        setCarbs(row.net_carbs_g != null ? String(row.net_carbs_g) : "");
        setDetail(row.deviation_detail ?? "");
        setNotes(row.notes ?? "");
      }
    })();
  }, [supabase, validType]);

  if (!validType) {
    return <div className="p-4 text-sm text-red-600">Type de repas inconnu.</div>;
  }

  async function save() {
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("meal_log").insert({
      user_id: user.id,
      log_date: todayIso(),
      meal_type: validType!,
      taken,
      deviation,
      deviation_detail: deviation ? detail || null : null,
      protein_g: protein ? Number(protein) : null,
      veggies_g: veggies ? Number(veggies) : null,
      net_carbs_g: carbs ? Number(carbs) : null,
      notes: notes || null,
    });
    setSubmitting(false);
    router.push("/");
  }

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
      </header>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="taken">Repas pris</Label>
            <Switch id="taken" checked={taken} onCheckedChange={setTaken} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="dev">Écart au protocole</Label>
            <Switch id="dev" checked={deviation} onCheckedChange={setDeviation} />
          </div>
          {deviation && (
            <Textarea
              placeholder="Détail de l'écart"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Macros (optionnel)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Protéines (g)</Label>
              <Input type="number" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Légumes (g)</Label>
              <Input type="number" inputMode="numeric" value={veggies} onChange={(e) => setVeggies(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Gluc nets (g)</Label>
              <Input type="number" inputMode="numeric" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <Button onClick={save} className="w-full" size="lg" disabled={submitting}>
        {submitting ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
