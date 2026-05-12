"use client";

import { AlertTriangle, Phone, X } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SafetyAlert } from "@/lib/safety";

interface SafetyBannerProps {
  alerts?: SafetyAlert[];
  doctorPhone?: string | null;
}

export function SafetyBanner({ alerts = [], doctorPhone }: SafetyBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const red = alerts.filter((a) => a.level === "red");
  const amber = alerts.filter((a) => a.level === "amber");
  const show = !dismissed && (red.length > 0 || amber.length > 0);

  return (
    <>
      {show && (
        <div
          className={`mx-3 mt-3 rounded-lg border p-3 text-sm ${
            red.length
              ? "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200"
              : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              {[...red, ...amber].map((a) => (
                <p key={a.code}>{a.message}</p>
              ))}
            </div>
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setDismissed(true)}
              className="opacity-70 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <Dialog>
        <DialogTrigger asChild>
          <button className="mx-3 mt-2 block w-[calc(100%-1.5rem)] rounded-md bg-red-600/10 px-3 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-600/20 dark:text-red-300">
            ⚠ Urgence Eliquis — critères STOP
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Urgence Eliquis</DialogTitle>
            <DialogDescription>STOP et médecin immédiat si l'un de ces signes :</DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-5 text-sm">
            <li>Vertiges persistants ou syncope</li>
            <li>Palpitations</li>
            <li>Saignement anormal (gencives, hématurie, selles noires)</li>
            <li>TA &lt; 11/6 ou &gt; 15/9</li>
            <li>Perte &gt; 2 kg en 7 jours</li>
          </ul>
          <div className="mt-2 flex gap-2">
            <Button asChild variant="destructive" className="flex-1">
              <a href="tel:15">
                <Phone className="size-4" />
                Appeler le 15
              </a>
            </Button>
            {doctorPhone && (
              <Button asChild variant="outline" className="flex-1">
                <a href={`tel:${doctorPhone}`}>
                  <Phone className="size-4" />
                  Médecin
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
