"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/queries";
import { MEAL_TYPES, type MealType } from "@/lib/protocol";
import { HF, HFCard } from "@/components/hf";

function isMealType(value: string): value is MealType {
  return MEAL_TYPES.some((m) => m.value === value);
}

const MEAL_TINT: Record<MealType, string> = {
  petit_dej: HF.green,
  dejeuner: HF.indigo,
  collation: HF.yellow,
  refeed: HF.orange,
  rupture_jeune: HF.red,
};

export default function MealPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const validType = isMealType(type) ? type : null;
  const label = validType ? MEAL_TYPES.find((m) => m.value === validType)?.label ?? "Repas" : "Repas";
  const tint = validType ? MEAL_TINT[validType] : HF.indigo;

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
      try {
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
      } catch {
        /* stub */
      }
    })();
  }, [supabase, validType]);

  if (!validType) {
    return (
      <div style={{ padding: "20px", color: HF.label2 }} className="hf-subhead">
        Type de repas inconnu.
      </div>
    );
  }

  async function save() {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/meal/" + type);
        return;
      }
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
      router.push("/");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "4px 20px 24px" }}>
      {/* Header */}
      <div style={{ paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="hf-footnote" style={{ color: HF.label2 }}>Repas</div>
          <div className="hf-largeTitle" style={{ marginTop: 2 }}>{label}</div>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: HF.fill,
            color: HF.label,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>

      {/* État */}
      <HFCard style={{ marginTop: 14 }} padding="14px 16px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="hf-headline">Repas pris</div>
            <div className="hf-caption" style={{ color: HF.label2 }}>Tap si OK, off si sauté</div>
          </div>
          <IOSToggle checked={taken} onChange={setTaken} />
        </div>
        <div style={{ height: 0.5, background: HF.separator, margin: "12px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="hf-headline" style={{ color: deviation ? HF.orange : HF.label }}>Écart au protocole</div>
            <div className="hf-caption" style={{ color: HF.label2 }}>Hors keto, hors fenêtre, alcool, sucre…</div>
          </div>
          <IOSToggle checked={deviation} onChange={setDeviation} />
        </div>
        {deviation && (
          <textarea
            placeholder="Détail de l'écart"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={2}
            style={{
              marginTop: 10,
              width: "100%",
              background: `${HF.orange}14`,
              color: HF.label,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${HF.orange}33`,
              fontSize: 15,
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        )}
      </HFCard>

      {/* Macros */}
      <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
        MACROS (OPTIONNEL)
      </div>
      <HFCard style={{ marginTop: 8 }} padding="12px 14px">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <MacroField label="Protéines" unit="g" value={protein} onChange={setProtein} />
          <MacroField label="Légumes" unit="g" value={veggies} onChange={setVeggies} />
          <MacroField label="Gluc nets" unit="g" value={carbs} onChange={setCarbs} />
        </div>
      </HFCard>

      {/* Notes */}
      <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
        NOTES
      </div>
      <HFCard style={{ marginTop: 8 }} padding="10px 12px">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optionnel"
          style={{
            width: "100%",
            background: "transparent",
            color: HF.label,
            border: "none",
            fontSize: 15,
            resize: "vertical",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
      </HFCard>

      <button
        type="button"
        onClick={save}
        disabled={submitting}
        style={{
          marginTop: 22,
          width: "100%",
          background: tint,
          color: "white",
          padding: "14px",
          borderRadius: 14,
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: -0.4,
          border: "none",
          boxShadow: `0 2px 8px ${tint}40`,
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}

function MacroField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="hf-caption" style={{ color: HF.label2 }}>
        {label} <span className="hf-tnum" style={{ color: HF.label3 }}>{unit}</span>
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: HF.fill,
          color: HF.label,
          padding: "8px 10px",
          borderRadius: 10,
          border: "none",
          fontSize: 16,
          fontVariantNumeric: "tabular-nums",
        }}
      />
    </label>
  );
}

function IOSToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 51,
        height: 31,
        borderRadius: 999,
        background: checked ? HF.green : HF.fill,
        position: "relative",
        border: "none",
        padding: 0,
        flexShrink: 0,
        transition: "background .15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 27,
          height: 27,
          background: "white",
          borderRadius: "50%",
          boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
          transition: "left .18s",
        }}
      />
    </button>
  );
}
