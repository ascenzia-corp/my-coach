"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HF, HFRingsStack } from "@/components/hf";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const allowed = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL ?? "").toLowerCase();
  const [email, setEmail] = useState(allowed);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (allowed && email.toLowerCase() !== allowed) {
      setError("Cet email n'est pas autorisé.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    const next = searchParams.get("next") ?? "/";
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field
        label="Email"
        id="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        required
        value={email}
        onChange={setEmail}
        placeholder="laurent.fontaine@ascenzia.fr"
      />
      <Field
        label="Mot de passe"
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={setPassword}
      />
      {error && (
        <div
          className="hf-caption"
          style={{
            color: HF.red,
            background: `${HF.red}14`,
            border: `1px solid ${HF.red}33`,
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        style={{
          background: HF.green,
          color: "white",
          padding: "14px",
          borderRadius: 14,
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: -0.4,
          border: "none",
          boxShadow: `0 4px 14px ${HF.green}40`,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}

function Field({
  label,
  id,
  type,
  inputMode,
  autoComplete,
  required,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  id: string;
  type: string;
  inputMode?: "email" | "text" | "numeric" | "tel" | "url" | "search" | "none" | "decimal";
  autoComplete?: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span className="hf-caption" style={{ color: HF.label2, marginLeft: 4 }}>{label}</span>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: HF.fill,
          color: HF.label,
          padding: "12px 14px",
          borderRadius: 12,
          border: "none",
          fontSize: 16,
        }}
      />
    </label>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: HF.bg,
      }}
    >
      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Hero */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative", width: 140, height: 140 }}>
            <HFRingsStack
              size={140}
              rings={[
                { stroke: 14, progress: 0.74, color: HF.green },
                { stroke: 14, progress: 0.55, color: HF.blue },
                { stroke: 14, progress: 0.9, color: HF.orange },
              ]}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--hf-font-round)",
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: -0.5,
                color: HF.label,
                textAlign: "center",
              }}
            >
              My
              <br />
              Coach
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="hf-title1">Bonjour Laurent</div>
            <div className="hf-subhead" style={{ color: HF.label2, marginTop: 4 }}>
              Connecte-toi à ton coach personnel.
            </div>
          </div>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <div
          className="hf-caption"
          style={{ textAlign: "center", color: HF.label3 }}
        >
          Keto strict · 16:8 · suivi Eliquis
        </div>
      </div>
    </div>
  );
}
