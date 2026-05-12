"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const allowed = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL ?? "").toLowerCase();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (allowed && email.toLowerCase() !== allowed) {
      setError("Cet email n'est pas autorisé.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin) + "/auth/callback",
      },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">MyCoach</h1>
          <p className="mt-1 text-sm text-zinc-500">Connexion par lien magique.</p>
        </div>

        {sent ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            Lien envoyé à <strong>{email}</strong>. Ouvrir l&apos;email sur l&apos;iPhone.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="laurent.fontaine@ascenzia.fr"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Envoi..." : "Recevoir un magic link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
