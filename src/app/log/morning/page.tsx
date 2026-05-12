"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { todayIso, isoDaysAgo } from "@/lib/queries";
import { QuickInput } from "@/components/QuickInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  weight_kg: z.number().min(50).max(150),
  ketones_mmol: z.number().min(0).max(8).nullable().optional(),
  bp_morning_sys: z.number().min(70).max(220).nullable().optional(),
  bp_morning_dia: z.number().min(40).max(140).nullable().optional(),
  waist_cm: z.number().min(60).max(160).nullable().optional(),
  notes: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

export default function MorningPage() {
  const router = useRouter();
  const supabase = createClient();
  const today = todayIso();
  const isMonday = new Date(today + "T00:00").getDay() === 1;
  const [warning, setWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { weight_kg: 95, ketones_mmol: 0.8, bp_morning_sys: 130, bp_morning_dia: 80 },
  });

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
        if (row.weight_kg != null) setValue("weight_kg", row.weight_kg);
        if (row.ketones_mmol != null) setValue("ketones_mmol", row.ketones_mmol);
        if (row.bp_morning_sys != null) setValue("bp_morning_sys", row.bp_morning_sys);
        if (row.bp_morning_dia != null) setValue("bp_morning_dia", row.bp_morning_dia);
        if (row.waist_cm != null) setValue("waist_cm", row.waist_cm);
        if (row.notes) setValue("notes", row.notes);
      }
    })();
  }, [supabase, today, setValue]);

  const weight = watch("weight_kg");
  useEffect(() => {
    if (weight == null) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: y } = await supabase
        .from("daily_log")
        .select("weight_kg")
        .eq("user_id", user.id)
        .eq("log_date", isoDaysAgo(1))
        .maybeSingle();
      if (y?.weight_kg != null && Math.abs(weight - y.weight_kg) > 1.5) {
        setWarning(`Saut de ${Math.abs(weight - y.weight_kg).toFixed(1)} kg vs hier — vérifier la mesure ou l'hydratation.`);
      } else {
        setWarning(null);
      }
    })();
  }, [supabase, weight]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    const payload = {
      user_id: user.id,
      log_date: today,
      weight_kg: values.weight_kg,
      ketones_mmol: values.ketones_mmol ?? null,
      bp_morning_sys: values.bp_morning_sys ?? null,
      bp_morning_dia: values.bp_morning_dia ?? null,
      waist_cm: isMonday ? values.waist_cm ?? null : null,
      notes: values.notes || null,
    };
    const { error } = await supabase
      .from("daily_log")
      .upsert(payload, { onConflict: "user_id,log_date" });
    setSubmitting(false);
    if (!error) router.push("/");
  }

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pesée matin</h1>
        <p className="text-xs text-zinc-500">À jeun, vessie vide, avant la douche.</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardContent className="space-y-5 pt-4">
            <Controller
              control={control}
              name="weight_kg"
              render={({ field }) => (
                <QuickInput
                  label="Poids"
                  value={field.value}
                  onChange={field.onChange}
                  min={60}
                  max={120}
                  step={0.1}
                  decimals={1}
                  unit="kg"
                />
              )}
            />
            {errors.weight_kg && <p className="text-sm text-red-600">{errors.weight_kg.message}</p>}
            {warning && (
              <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {warning}
              </p>
            )}
            <Controller
              control={control}
              name="ketones_mmol"
              render={({ field }) => (
                <QuickInput
                  label="Cétones"
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  min={0}
                  max={5}
                  step={0.1}
                  decimals={1}
                  unit="mmol/L"
                />
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tension matin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Controller
              control={control}
              name="bp_morning_sys"
              render={({ field }) => (
                <QuickInput label="Systolique" value={field.value ?? 130} onChange={field.onChange} min={90} max={180} unit="mmHg" />
              )}
            />
            <Controller
              control={control}
              name="bp_morning_dia"
              render={({ field }) => (
                <QuickInput label="Diastolique" value={field.value ?? 80} onChange={field.onChange} min={50} max={120} unit="mmHg" />
              )}
            />
          </CardContent>
        </Card>

        {isMonday && (
          <Card>
            <CardHeader>
              <CardTitle>Tour de taille (lundi)</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                control={control}
                name="waist_cm"
                render={({ field }) => (
                  <QuickInput label="TT" value={field.value ?? 105} onChange={field.onChange} min={70} max={140} unit="cm" />
                )}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <Textarea
                  placeholder="Notes (optionnel)"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
