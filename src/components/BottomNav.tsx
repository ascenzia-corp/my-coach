"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HF } from "@/components/hf";

const ACCENT = HF.red; // FAB + active tab tint (validé : rouge systemRed)

interface TabSpec {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const TABS_LEFT: TabSpec[] = [
  {
    href: "/",
    label: "Aujourd'hui",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13" cy="13" r="10" />
        <path d="M13 7v6l4 2" />
      </svg>
    ),
  },
  {
    href: "/charts",
    label: "Progrès",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19V8M9 19v-7M14 19V5M19 19v-9M3 22h20" />
      </svg>
    ),
  },
];

const TABS_RIGHT: TabSpec[] = [
  {
    href: "/protocol",
    label: "Protocole",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="16" height="20" rx="2" />
        <path d="M9 8h8M9 12h8M9 16h5" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Moi",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13" cy="9" r="4.5" />
        <path d="M4 22c0-5 4-8 9-8s9 3 9 8" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Tab({ tab, on }: { tab: TabSpec; on: boolean }) {
  return (
    <Link
      href={tab.href}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        paddingTop: 8,
        color: on ? ACCENT : HF.label2,
      }}
    >
      <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {tab.icon}
      </div>
      <span style={{ fontSize: 10, fontWeight: on ? 600 : 500, letterSpacing: 0, lineHeight: 1 }}>
        {tab.label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        paddingBottom: "max(22px, env(safe-area-inset-bottom))",
        background: "linear-gradient(to top, rgba(0,0,0,0.95) 60%, rgba(0,0,0,0))",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      <div style={{ height: 0.5, background: HF.separator }} />
      <div
        style={{
          maxWidth: 448, // matches max-w-md
          margin: "0 auto",
          display: "flex",
          alignItems: "stretch",
          padding: "0 8px",
          position: "relative",
          height: 56,
        }}
      >
        {TABS_LEFT.map((t) => (
          <Tab key={t.href} tab={t} on={isActive(pathname, t.href)} />
        ))}

        {/* Central FAB slot */}
        <div style={{ flex: 1, position: "relative" }}>
          <Link
            href="/log/morning"
            aria-label="Saisie rapide"
            style={{
              position: "absolute",
              top: -22,
              left: "50%",
              transform: "translateX(-50%)",
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: ACCENT,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "0 6px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), 0 4px 16px rgba(255,59,48,0.32)",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26">
              <path d="M13 6v14M6 13h14" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        {TABS_RIGHT.map((t) => (
          <Tab key={t.href} tab={t} on={isActive(pathname, t.href)} />
        ))}
      </div>
    </nav>
  );
}
