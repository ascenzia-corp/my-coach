"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationPermission() {
  const [status, setStatus] = useState<NotificationPermission | "unsupported" | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
    } else {
      setStatus(Notification.permission);
    }
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setStatus(perm);
      if (perm !== "granted") {
        setMessage("Permission refusée par iOS. Réglages → MyCoach → Notifications.");
        return;
      }
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        setMessage("VAPID public key absente.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!r.ok) {
        setMessage("Erreur enregistrement subscription.");
        return;
      }
      setMessage("Notifications activées.");
    } catch (e) {
      setMessage(`Erreur: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const r = await fetch("/api/push/test", { method: "POST" });
      setMessage(r.ok ? "Push test envoyé." : "Échec push test.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <div className="h-10" />;

  if (status === "unsupported") {
    return (
      <p className="text-sm text-zinc-500">
        Notifications non supportées sur ce navigateur. Sur iOS : ajouter à l&apos;écran d&apos;accueil via Safari.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={enable} disabled={busy}>
          <BellRing className="size-4" />
          {status === "granted" ? "Réenregistrer" : "Activer les notifications"}
        </Button>
        {status === "granted" && (
          <Button variant="outline" onClick={sendTest} disabled={busy}>
            Envoyer un push test
          </Button>
        )}
      </div>
      {message && <p className="text-xs text-zinc-500">{message}</p>}
    </div>
  );
}
