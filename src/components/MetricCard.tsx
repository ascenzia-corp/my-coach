import Link from "next/link";
import { cn } from "@/lib/cn";

interface MetricCardProps {
  title: string;
  value: string;
  delta?: string | null;
  deltaTone?: "positive" | "negative" | "neutral";
  hint?: string;
  className?: string;
  href?: string;
}

export function MetricCard({ title, value, delta, deltaTone = "neutral", hint, className, href }: MetricCardProps) {
  const inner = (
    <>
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{title}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center justify-between text-xs">
        {delta ? (
          <span
            className={cn(
              deltaTone === "positive" && "text-green-600",
              deltaTone === "negative" && "text-red-600",
              deltaTone === "neutral" && "text-zinc-500",
            )}
          >
            {delta}
          </span>
        ) : (
          <span />
        )}
        {hint && <span className="text-zinc-400">{hint}</span>}
      </div>
    </>
  );
  const base = "rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
  if (href) {
    return (
      <Link href={href} className={cn(base, "block active:opacity-70", className)}>
        {inner}
      </Link>
    );
  }
  return <div className={cn(base, className)}>{inner}</div>;
}
