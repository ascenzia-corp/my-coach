"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/queries";
import { QuickInput } from "@/components/QuickInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  energy_10: z.number().min(0).max(10),
  hunger_10: z.number().min(0).max(10),
  sleep_hours: z.number().min(2).max(12).nullable().optional(),
  sleep_quality_10: z.number().min(0).max(10).nullable().optional(),
  bp_evening_sys: z.number().min(70).max(220).nullable().optional(),
  bp_evening_dia: z.number().min(40).max(140).nullable().optional(),
  deviation: z.boolean().default(false),
  deviation_detail: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function EveningPage() {
  const router = useRouter();
  const supabase = createClient();
  const today = todayIso();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { energy_10: 7, hunger_10: 4, sleep_hours: 7, sleep_quality_10: 6, deviation: false },
  });

  const deviation = watch("deviation");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: row } = await supabase
        .from("daily_log")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", today)
        .maybeSingle();
      if (row) {
        if (row.energy_10 != null) setValue("energy_10", row.energy_10);
        if (row.hunger_10 != null) setValue("hunger_10", row.hunger_10);
        if (row.sleep_hours != null) setValue("sleep_hours", row.sleep_hours);
        if (row.sleep_quality_10 != null) setValue("sleep_quality_10", row.sleep_quality_10);
        if (row.bp_evening_sys != null) setValue("bp_evening_sys", row.bp_evening_sys);
        if (row.bp_evening_dia != null) setValue("bp_evening_dia", row.bp_evening_dia);
        if (row.deviation) setValue("deviation", row.deviation);
        if (row.deviation_detail) setValue("deviation_detail", row.deviation_detail);
      }
    })();
  }, [supabase, today, setValue]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("daily_log")
      .upsert(
        {
          user_id: user.id,
          log_date: today,
          energy_10: values.energy_10,
          hunger_10: values.hunger_10,
          sleep_hours: values.sleep_hours ?? null,
          sleep_quality_10: values.sleep_quality_10 ?? null,
          bp_evening_sys: values.bp_evening_sys ?? null,
          bp_evening_dia: values.bp_evening_dia ?? null,
          deviation: values.deviation,
          deviation_detail: values.deviation ? values.deviation_detail || null : null,
        },
        { onConflict: "user_id,log_date" },
      );
    setSubmitting(false);
    if (!error) router.push("/");
  }

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Check-in soir</h1>
        <p className="text-xs text-zinc-500">Extinction écrans 22h.</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardContent className="space-y-5 pt-4">
            <Controller
              control={control}
              name="energy_10"
              render={({ field }) => (
                <QuickInput label="Énergie /10" value={field.value} onChange={field.onChange} min={0} max={10} />
              )}
            />
            <Controller
              control={control}
              name="hunger_10"
              render={({ field }) => (
                <QuickInput label="Faim /10" value={field.value} onChange={field.onChange} min={0} max={10} />
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sommeil prévu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Controller
              control={control}
              name="sleep_hours"
              render={({ field }) => (
                <QuickInput label="Heures" value={field.value ?? 7} onChange={field.onChange} min={3} max={10} step={0.5} decimals={1} unit="h" />
              )}
            />
            <Controller
              control={control}
              name="sleep_quality_10"
              render={({ field }) => (
                <QuickInput label="Qualité /10" value={field.value ?? 6} onChange={field.onChange} min={0} max={10} />
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tension soir (optionnel)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Controller
              control={control}
              name="bp_evening_sys"
              render={({ field }) => (
                <QuickInput label="Sys" value={field.value ?? 130} onChange={field.onChange} min={90} max={180} unit="mmHg" />
              )}
            />
            <Controller
              control={control}
              name="bp_evening_dia"
              render={({ field }) => (
                <QuickInput label="Dia" value={field.value ?? 80} onChange={field.onChange} min={50} max={120} unit="mmHg" />
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dev">Écart aujourd&apos;hui ?</Label>
              <Controller
                control={control}
                name="deviation"
                render={({ field }) => (
                  <Switch id="dev" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            {deviation && (
              <Controller
                control={control}
                name="deviation_detail"
                render={({ field }) => (
                  <Textarea
                    placeholder="Détail de l'écart (déclencheur, contexte, contenu)"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
