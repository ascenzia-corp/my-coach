import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const PARIS_TZ = "Europe/Paris";

export function formatDate(d: Date | string, pattern = "EEEE d MMMM yyyy") {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, pattern, { locale: fr });
}

export function formatKg(v: number | null | undefined) {
  if (v == null) return "—";
  return `${v.toFixed(1).replace(".", ",")} kg`;
}

export function formatCm(v: number | null | undefined) {
  if (v == null) return "—";
  return `${v} cm`;
}

export function formatDelta(v: number | null | undefined, unit = "") {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1).replace(".", ",")}${unit ? " " + unit : ""}`;
}

export function daysBetween(a: Date | string, b: Date | string) {
  const da = typeof a === "string" ? new Date(a) : a;
  const db = typeof b === "string" ? new Date(b) : b;
  const ms = db.getTime() - da.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
