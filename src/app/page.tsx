import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TRAINING_PLAN, TARGETS, FEEDING_WINDOW } from "@/lib/protocol";
import { SafetyBanner } from "@/components/SafetyBanner";
import { evaluateAll } from "@/lib/safety";
import { HF, HFCard, HFRingsStack, HFDot } from "@/components/hf";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { PARIS_TZ } from "@/lib/format";

export const dynamic = "force-dynamic";

function isoWeekdayParis(now: Date): number {
  const dow = Number(formatInTimeZone(now, PARIS_TZ, "i"));
  return dow; // 1=lundi, 7=dimanche
}

function parisDateIso(now: Date): string {
  return formatInTimeZone(now, PARIS_TZ, "yyyy-MM-dd");
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Decimal hours in Paris time (e.g. 14h30 → 14.5).
function parisHourDecimal(now: Date): number {
  const h = Number(formatInTimeZone(now, PARIS_TZ, "H"));
  const m = Number(formatInTimeZone(now, PARIS_TZ, "m"));
  return h + m / 60;
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h + (m ?? 0) / 60;
}

function formatHourLabel(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function formatDuration(hours: number): string {
  const total = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

interface FastingState {
  status: "fasting" | "eating";
  progress: number; // 0..1, fraction of fasting target elapsed (or 0 when eating)
  elapsed: number; // hours in current state
  remaining: number; // hours until next phase transition
  nextLabel: string; // e.g. "à 6h30 demain"
  windowLabel: string; // descriptive title
}

function computeFasting(now: Date): FastingState {
  const eatStart = parseHHMM(FEEDING_WINDOW.start); // 6.5
  const eatEnd = parseHHMM(FEEDING_WINDOW.end); // 14.0
  const fastDuration = 24 - (eatEnd - eatStart); // 16.5h
  const nowH = parisHourDecimal(now);

  if (nowH >= eatStart && nowH < eatEnd) {
    const remaining = eatEnd - nowH;
    return {
      status: "eating",
      progress: 0,
      elapsed: nowH - eatStart,
      remaining,
      nextLabel: `à ${formatHourLabel(eatEnd)}`,
      windowLabel: "Fenêtre alimentaire",
    };
  }

  // Fasting: from eatEnd today to eatStart next day (or earlier this morning).
  const elapsed = nowH >= eatEnd ? nowH - eatEnd : 24 - eatEnd + nowH;
  const remaining = fastDuration - elapsed;
  const sameDay = remaining > nowH - eatStart && nowH < eatStart;
  return {
    status: "fasting",
    progress: Math.max(0, Math.min(1, elapsed / fastDuration)),
    elapsed,
    remaining,
    nextLabel: sameDay ? `à ${formatHourLabel(eatStart)}` : `à ${formatHourLabel(eatStart)} demain`,
    windowLabel: "Jeûne",
  };
}

interface AgendaItem {
  key: string;
  time: string; // HH:mm
  hour: number;
  title: string;
  sub: string;
  icon: "scale" | "drop" | "walk" | "meal" | "heart" | "moon";
  tint: string;
  href: string;
  done?: boolean;
}

function buildAgenda(args: {
  nowHour: number;
  morningDone: boolean;
  hydrationOk: boolean;
  weekdayIso: number;
}): AgendaItem[] {
  const session = TRAINING_PLAN[args.weekdayIso];
  const items: AgendaItem[] = [
    {
      key: "weigh-morning",
      time: "06:30",
      hour: 6.5,
      title: "Pesée matin + cétones",
      sub: "à jeun · avant le café",
      icon: "scale",
      tint: HF.green,
      href: "/log/morning",
      done: args.morningDone,
    },
    {
      key: "session",
      time: "10:00",
      hour: 10,
      title: session?.label ?? "Séance",
      sub: session ? `${session.duration_min} min` : "repos",
      icon: "walk",
      tint: HF.indigo,
      href: "/training",
    },
    {
      key: "hydration",
      time: "12:00",
      hour: 12,
      title: "Point hydratation",
      sub: `cible ${TARGETS.hydration_l.toFixed(1)} L · sel + magnésium`,
      icon: "drop",
      tint: HF.blue,
      href: "/log/hydration",
      done: args.hydrationOk,
    },
    {
      key: "lunch",
      time: "12:30",
      hour: 12.5,
      title: "Déjeuner céto",
      sub: `≤ ${TARGETS.net_carbs_g_phase1} g glucides nets`,
      icon: "meal",
      tint: HF.orange,
      href: "/meal",
    },
    {
      key: "weigh-evening",
      time: "20:30",
      hour: 20.5,
      title: "TA du soir + sommeil",
      sub: "avant Eliquis",
      icon: "heart",
      tint: HF.red,
      href: "/log/evening",
    },
  ];

  return items.filter((it) => it.hour > args.nowHour - 0.5 && !it.done);
}

function AgendaRowIcon({ icon }: { icon: AgendaItem["icon"] }) {
  switch (icon) {
    case "walk":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="4" r="1.5" />
          <path d="M11 9l-2 6 3 3 1-4 4 4M7 22l3-7" />
        </svg>
      );
    case "meal":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 3v10a4 4 0 008 0V3M17 3v6a3 3 0 003 3M17 13v8M9 3v3" />
        </svg>
      );
    case "scale":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <path d="M8 11l4-2 4 2" />
          <path d="M12 6V3" />
        </svg>
      );
    case "drop":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3s-6 7-6 11a6 6 0 0012 0c0-4-6-11-6-11z" />
        </svg>
      );
    case "heart":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-4.5-9.5-9C1 8.5 3 5 6.5 5c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 5.5 3.5 4 7-2.5 4.5-9.5 9-9.5 9z" />
        </svg>
      );
    case "moon":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      );
  }
}

function ProchaineEtapeCard({ next }: { next: AgendaItem }) {
  return (
    <HFCard padding="14px 16px">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 11,
            flexShrink: 0,
            background: `${next.tint}1F`,
            color: next.tint,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AgendaRowIcon icon={next.icon} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <div className="hf-headline" style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {next.title}
            </div>
            <div className="hf-footnote hf-tnum" style={{ color: HF.label2 }}>{next.time}</div>
          </div>
          <div className="hf-subhead" style={{ color: HF.label2, marginTop: 2 }}>{next.sub}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <Link
              href={next.href}
              style={{
                background: HF.green,
                color: "white",
                padding: "7px 14px",
                borderRadius: 18,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: -0.2,
              }}
            >
              Logger
            </Link>
            <Link
              href={next.href}
              style={{
                background: HF.fill,
                color: HF.label,
                padding: "7px 14px",
                borderRadius: 18,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Détail
            </Link>
          </div>
        </div>
      </div>
    </HFCard>
  );
}

function AgendaList({ items }: { items: AgendaItem[] }) {
  return (
    <HFCard padding={0}>
      {items.map((it, i) => (
        <div key={it.key}>
          <Link
            href={it.href}
            style={{ display: "flex", padding: "14px 16px", gap: 12, alignItems: "center", color: HF.label }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                flexShrink: 0,
                background: `${it.tint}1F`,
                color: it.tint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AgendaRowIcon icon={it.icon} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div
                  className="hf-headline"
                  style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {it.title}
                </div>
                <div className="hf-footnote hf-tnum" style={{ color: HF.label2 }}>{it.time}</div>
              </div>
              <div className="hf-subhead" style={{ color: HF.label2 }}>{it.sub}</div>
            </div>
            <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${HF.label3}` }} />
          </Link>
          {i < items.length - 1 && <div style={{ height: 0.5, background: HF.separator, marginLeft: 60 }} />}
        </div>
      ))}
    </HFCard>
  );
}

function EliquisStatusCard({
  level,
  message,
}: {
  level: "ok" | "amber" | "red";
  message: string;
}) {
  const tint = level === "ok" ? HF.green : level === "amber" ? HF.orange : HF.red;
  const title =
    level === "ok"
      ? "Sécurité Eliquis · OK"
      : level === "amber"
      ? "Vigilance Eliquis"
      : "Alerte sécurité";
  return (
    <Link href="/safety">
      <HFCard style={{ display: "flex", alignItems: "center", gap: 10 }} padding="12px 14px">
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: `${tint}22`,
            color: tint,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {level === "ok" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7l3 3 5-6" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 2v6M7 11v.5" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hf-subhead" style={{ fontWeight: 600 }}>{title}</div>
          <div className="hf-caption" style={{ color: HF.label2 }}>{message}</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={HF.label3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 3l4 4-4 4" />
        </svg>
      </HFCard>
    </Link>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const todayIso = parisDateIso(now);
  const sevenDaysAgoIso = addDaysIso(todayIso, -7);
  const since14Iso = addDaysIso(todayIso, -14);
  const weekdayIso = isoWeekdayParis(now);
  const nowHour = parisHourDecimal(now);
  const fasting = computeFasting(now);

  // ─── Default values (no auth) ─────────────────────────────────
  let displayName = "Laurent";
  let waterToday = 0;
  let ketonesToday: number | null = null;
  let doctorPhone: string | null = null;
  let morningDone = false;
  let alerts: ReturnType<typeof evaluateAll> = [];

  if (user) {
    const [{ data: logs }, { data: prof }] = await Promise.all([
      supabase
        .from("daily_log")
        .select(
          "log_date, weight_kg, ketones_mmol, water_l, deviation, sleep_quality_10, bp_morning_sys, bp_morning_dia"
        )
        .eq("user_id", user.id)
        .gte("log_date", since14Iso)
        .order("log_date", { ascending: true }),
      supabase
        .from("profile")
        .select("display_name, doctor_phone")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (prof?.display_name) displayName = prof.display_name;
    if (prof?.doctor_phone) doctorPhone = prof.doctor_phone;

    const todayRow = logs?.find((r) => r.log_date === todayIso);
    const sevenDaysAgoRow = logs?.find((r) => r.log_date === sevenDaysAgoIso);

    morningDone = todayRow?.weight_kg != null;
    waterToday = todayRow?.water_l ?? 0;
    ketonesToday = todayRow?.ketones_mmol ?? null;

    const sinceForWeek = addDaysIso(todayIso, -6);
    const deviationsLast7Days = (logs ?? [])
      .filter((r) => r.log_date >= sinceForWeek && r.deviation)
      .length;
    const sleepStreak = (logs ?? [])
      .slice(-3)
      .map((r) => r.sleep_quality_10)
      .filter((v): v is number => v != null);

    alerts = evaluateAll({
      bp:
        todayRow?.bp_morning_sys != null && todayRow?.bp_morning_dia != null
          ? { sys: todayRow.bp_morning_sys, dia: todayRow.bp_morning_dia }
          : undefined,
      weight:
        todayRow?.weight_kg != null && sevenDaysAgoRow?.weight_kg != null
          ? { today: todayRow.weight_kg, sevenDaysAgo: sevenDaysAgoRow.weight_kg }
          : undefined,
      deviationsLast7Days,
      lastThreeNightsQuality: sleepStreak,
    });
  }

  const hydrationOk = waterToday >= TARGETS.hydration_l;
  const waterRing = Math.max(0, Math.min(1, waterToday / TARGETS.hydration_l));
  // Cétones scale: 0 → 2.0 mmol (= ring plein à 2,0).
  const ketonesRing = Math.max(0, Math.min(1, (ketonesToday ?? 0) / 2.0));

  const agenda = buildAgenda({ nowHour, morningDone, hydrationOk, weekdayIso });
  const next = agenda[0];
  const rest = agenda.slice(1);

  // Date header — capitalize French date.
  const dateLabel = formatInTimeZone(now, PARIS_TZ, "EEEE d MMMM", { locale: fr });
  const dateLabelCap = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  // Eliquis status: red > amber > ok.
  const red = alerts.find((a) => a.level === "red");
  const amber = alerts.find((a) => a.level === "amber");
  const eliquisLevel: "ok" | "amber" | "red" = red ? "red" : amber ? "amber" : "ok";
  const eliquisMessage = red
    ? red.message
    : amber
    ? amber.message
    : "Tous les paramètres dans les bornes.";

  return (
    <>
      <SafetyBanner alerts={alerts} doctorPhone={doctorPhone} />

      <div style={{ padding: "4px 20px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 4 }}>
          <div>
            <div className="hf-footnote hf-tnum" style={{ color: HF.label2, textTransform: "capitalize" }}>
              {dateLabelCap}
            </div>
            <div className="hf-largeTitle" style={{ marginTop: 2 }}>Bonjour {displayName}</div>
          </div>
          <Link
            href="/settings"
            aria-label="Profil"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: HF.fill,
              color: HF.label2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Link>
        </div>

        {/* Rings + side stats */}
        <HFCard style={{ marginTop: 14 }} padding="20px 16px 18px">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 178, height: 178, position: "relative", flexShrink: 0 }}>
              <HFRingsStack
                size={178}
                rings={[
                  { stroke: 18, progress: fasting.progress, color: HF.green },
                  { stroke: 18, progress: waterRing, color: HF.blue },
                  { stroke: 18, progress: ketonesRing, color: HF.orange },
                ]}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
              <Stat
                color={HF.green}
                label={fasting.status === "fasting" ? "JEÛNE" : "FENÊTRE"}
                value={formatDuration(fasting.status === "fasting" ? fasting.elapsed : fasting.elapsed)}
                sub={fasting.status === "fasting" ? "/ 16h30" : `/ ${formatDuration(7.5)}`}
              />
              <Stat
                color={HF.blue}
                label="EAU"
                value={`${waterToday.toFixed(1).replace(".", ",")} L`}
                sub={`/ ${TARGETS.hydration_l.toFixed(1).replace(".", ",")} L`}
              />
              <Stat
                color={HF.orange}
                label="CÉTONES"
                value={ketonesToday != null ? ketonesToday.toFixed(1).replace(".", ",") : "—"}
                sub="mmol/L"
              />
            </div>
          </div>
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: `0.5px solid ${HF.separator}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div className="hf-caption" style={{ color: HF.label2 }}>
                {fasting.status === "fasting" ? "Sortie de jeûne" : "Fin de fenêtre"}
              </div>
              <div className="hf-headline hf-tnum">
                {fasting.nextLabel} · dans {formatDuration(fasting.remaining)}
              </div>
            </div>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: HF.fill,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: HF.label2,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3l4 4-4 4" />
              </svg>
            </div>
          </div>
        </HFCard>

        {/* Prochaine étape */}
        {next && (
          <>
            <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
              PROCHAINE ÉTAPE
            </div>
            <div style={{ marginTop: 8 }}>
              <ProchaineEtapeCard next={next} />
            </div>
          </>
        )}

        {/* Reste de la journée */}
        {rest.length > 0 && (
          <>
            <div
              style={{
                display: "flex",
                marginTop: 22,
                marginLeft: 4,
                marginBottom: 8,
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <div className="hf-eyebrow" style={{ color: HF.label2 }}>RESTE DE LA JOURNÉE</div>
              <div className="hf-footnote" style={{ color: HF.label2 }}>
                {rest.length} action{rest.length > 1 ? "s" : ""}
              </div>
            </div>
            <AgendaList items={rest} />
          </>
        )}

        {/* Eliquis status */}
        <div style={{ marginTop: 14 }}>
          <EliquisStatusCard level={eliquisLevel} message={eliquisMessage} />
        </div>
      </div>
    </>
  );
}

function Stat({ color, label, value, sub }: { color: string; label: string; value: string; sub: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <HFDot color={color} size={8} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color, textTransform: "uppercase" }}>
          {label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span className="hf-numBig hf-tnum" style={{ fontSize: 22 }}>{value}</span>
          <span className="hf-footnote hf-tnum" style={{ color: HF.label2 }}>{sub}</span>
        </div>
      </div>
    </div>
  );
}
