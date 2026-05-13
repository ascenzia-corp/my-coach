"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HF } from "@/components/hf";

export function RegenerateButton({ weekStart, compact = false }: { weekStart: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/weekly/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: weekStart }),
      });
      if (!r.ok) {
        const body = await r.text();
        setErr(body || `HTTP ${r.status}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={go}
        disabled={busy}
        style={{
          background: "transparent",
          color: HF.blue,
          border: "none",
          padding: 0,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? "…" : "Régénérer"}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        style={{
          width: "100%",
          background: HF.fill,
          color: HF.label,
          padding: "12px",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: -0.2,
          border: "none",
          cursor: "pointer",
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? "Régénération en cours…" : "Régénérer le bilan"}
      </button>
      {err && (
        <div className="hf-caption" style={{ color: HF.red, marginTop: 6, textAlign: "center" }}>
          {err}
        </div>
      )}
    </div>
  );
}
