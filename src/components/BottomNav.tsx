"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, BarChart3, Camera, BookOpen, Home } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/", label: "Aujourd'hui", icon: Home },
  { href: "/charts", label: "Mesures", icon: Calendar },
  { href: "/weekly", label: "Bilans", icon: BarChart3 },
  { href: "/photos", label: "Photos", icon: Camera },
  { href: "/protocol", label: "Protocole", icon: BookOpen },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <ul className="safe-bottom mx-auto flex max-w-md items-stretch justify-between px-2 pt-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-zinc-950 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
