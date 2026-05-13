import { createClient } from "@/lib/supabase/server";
import { evaluateAll, type SafetyAlert } from "@/lib/safety";
import { SAFETY_THRESHOLDS } from "@/lib/protocol";
import { HF, HFCard, HFDot } from "@/components/hf";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ParamSpec {
  label: string;
  value: string;
  unit: string;
  bounds: string;
  status: "ok" | "warn" | "out";
  tint: string;
  iconKey: "tension" | "perte" | "cetones" | "pouls";
}

function buildParams(
  bpSys: number | null,
  bpDia: number | null,
  loss7d: number | null,
  ketonesToday: number | null,
): ParamSpec[] {
  const params: ParamSpec[] = [];

  const sysBoundsLabel = `${SAFETY_THRESHOLDS.bp_sys_min} – ${SAFETY_THRESHOLDS.bp_sys_max}`;
  const diaBoundsLabel = `${SAFETY_THRESHOLDS.bp_dia_min} – ${SAFETY_THRESHOLDS.bp_dia_max}`;

  if (bpSys != null) {
    let st: ParamSpec["status"] = "ok";
    if (bpSys < SAFETY_THRESHOLDS.bp_sys_min || bpSys > SAFETY_THRESHOLDS.bp_sys_max) st = "out";
    else if (bpSys < SAFETY_THRESHOLDS.bp_sys_min + 5 || bpSys > SAFETY_THRESHOLDS.bp_sys_max - 5) st = "warn";
    params.push({
      label: "Tension systolique",
      value: String(bpSys),
      unit: "mmHg",
      bounds: sysBoundsLabel,
      status: st,
      tint: HF.red,
      iconKey: "tension",
    });
  }
  if (bpDia != null) {
    let st: ParamSpec["status"] = "ok";
    if (bpDia < SAFETY_THRESHOLDS.bp_dia_min || bpDia > SAFETY_THRESHOLDS.bp_dia_max) st = "out";
    else if (bpDia < SAFETY_THRESHOLDS.bp_dia_min + 3 || bpDia > SAFETY_THRESHOLDS.bp_dia_max - 3) st = "warn";
    params.push({
      label: "Tension diastolique",
      value: String(bpDia),
      unit: "mmHg",
      bounds: diaBoundsLabel,
      status: st,
      tint: HF.red,
      iconKey: "tension",
    });
  }
  if (loss7d != null) {
    const max = SAFETY_THRESHOLDS.weight_loss_red_kg_7d;
    let st: ParamSpec["status"] = "ok";
    const abs = Math.abs(loss7d);
    if (loss7d < -max) st = "out";
    else if (loss7d < -(max - 0.5)) st = "warn";
    params.push({
      label: "Perte / 7 jours",
      value: `${loss7d < 0 ? "−" : "+"}${abs.toFixed(1).replace(".", ",")}`,
      unit: "kg",
      bounds: `max ${max.toFixed(1).replace(".", ",")}`,
      status: st,
      tint: st === "ok" ? HF.green : st === "warn" ? HF.orange : HF.red,
      iconKey: "perte",
    });
  }
  if (ketonesToday != null) {
    let st: ParamSpec["status"] = "ok";
    if (ketonesToday > 5) st = "out";
    else if (ketonesToday > 4.5) st = "warn";
    params.push({
      label: "Cétones",
      value: ketonesToday.toFixed(1).replace(".", ","),
      unit: "mmol/L",
      bounds: "max 5,0",
      status: st,
      tint: HF.orange,
      iconKey: "cetones",
    });
  }

  return params;
}

export default async function SafetyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);
  let bpSys: number | null = null;
  let bpDia: number | null = null;
  let weightToday: number | null = null;
  let weight7DaysAgo: number | null = null;
  let ketonesToday: number | null = null;
  let lastCheck: string | null = null;
  let doctorPhone: string | null = null;
  let alerts: SafetyAlert[] = [];

  if (user) {
    try {
      const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
      const [{ data: logs }, { data: prof }] = await Promise.all([
        supabase
          .from("daily_log")
          .select(
            "log_date, weight_kg, ketones_mmol, bp_morning_sys, bp_morning_dia, sleep_quality_10, deviation, created_at",
          )
          .eq("user_id", user.id)
          .gte("log_date", since)
          .order("log_date", { ascending: true }),
        supabase
          .from("profile")
          .select("doctor_phone")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      doctorPhone = prof?.doctor_phone ?? null;

      const todayRow = logs?.find((r) => r.log_date === today);
      const sevenDaysAgoIso = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
      const sevenAgoRow = logs?.find((r) => r.log_date === sevenDaysAgoIso);
      bpSys = todayRow?.bp_morning_sys ?? null;
      bpDia = todayRow?.bp_morning_dia ?? null;
      weightToday = todayRow?.weight_kg ?? null;
      weight7DaysAgo = sevenAgoRow?.weight_kg ?? null;
      ketonesToday = todayRow?.ketones_mmol ?? null;
      lastCheck = todayRow?.created_at ?? null;

      const deviationsLast7Days = (logs ?? [])
        .filter((r) => r.log_date >= new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10) && r.deviation)
        .length;
      const sleepStreak = (logs ?? [])
        .slice(-3)
        .map((r) => r.sleep_quality_10)
        .filter((v): v is number => v != null);

      alerts = evaluateAll({
        bp: bpSys != null && bpDia != null ? { sys: bpSys, dia: bpDia } : undefined,
        weight:
          weightToday != null && weight7DaysAgo != null
            ? { today: weightToday, sevenDaysAgo: weight7DaysAgo }
            : undefined,
        deviationsLast7Days,
        lastThreeNightsQuality: sleepStreak,
      });
    } catch {
      // env-stub or query failure — render the empty calm state
    }
  }

  const loss7d =
    weightToday != null && weight7DaysAgo != null ? weightToday - weight7DaysAgo : null;
  const params = buildParams(bpSys, bpDia, loss7d, ketonesToday);
  const reds = alerts.filter((a) => a.level === "red");
  const ambers = alerts.filter((a) => a.level === "amber");

  if (reds.length >= 2) {
    return <SafetyCritical alerts={reds} doctorPhone={doctorPhone} />;
  }
  if (reds.length === 1 || ambers.length >= 1) {
    const main = reds[0] ?? ambers[0];
    return <SafetyAlert alert={main} doctorPhone={doctorPhone} bpSys={bpSys} bpDia={bpDia} />;
  }
  return <SafetyCalm params={params} lastCheck={lastCheck} doctorPhone={doctorPhone} />;
}

// ─── CALM ─────────────────────────────────────────────────────────────────
function SafetyCalm({
  params,
  lastCheck,
  doctorPhone,
}: {
  params: ParamSpec[];
  lastCheck: string | null;
  doctorPhone: string | null;
}) {
  const lastCheckLabel = lastCheck
    ? new Date(lastCheck).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <div style={{ padding: "4px 20px 24px" }}>
      <div style={{ paddingTop: 6 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <PillIcon color={HF.green} icon="shield" />
          <span className="hf-footnote" style={{ color: HF.green, fontWeight: 600, letterSpacing: 0.4 }}>
            SOUS SURVEILLANCE · ELIQUIS
          </span>
        </div>
        <div className="hf-largeTitle" style={{ marginTop: 2 }}>Sécurité</div>
      </div>

      <HFCard
        style={{ marginTop: 14, background: "rgba(52,199,89,0.08)" }}
        padding="20px 18px"
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: HF.green,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(52,199,89,0.32)",
              flexShrink: 0,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 14l5 5 11-13" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div className="hf-title3" style={{ color: HF.green }}>
              {params.length > 0 ? "Tout est dans la norme" : "Aucune donnée à surveiller"}
            </div>
            <div className="hf-subhead" style={{ color: HF.label2, marginTop: 2 }}>
              {params.length > 0
                ? `${params.length} paramètre${params.length > 1 ? "s" : ""} surveillé${params.length > 1 ? "s" : ""}`
                : "Saisis tes mesures pour activer la surveillance"}
              {lastCheckLabel && ` · dernière vérif ${lastCheckLabel}`}
            </div>
          </div>
        </div>
      </HFCard>

      {params.length > 0 && (
        <>
          <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
            VOS PARAMÈTRES SURVEILLÉS
          </div>
          <HFCard padding={0} style={{ marginTop: 8 }}>
            {params.map((p, i) => (
              <div key={p.label}>
                <ParamRow p={p} />
                {i < params.length - 1 && <Sep indent={60} />}
              </div>
            ))}
          </HFCard>
        </>
      )}

      <ContactCard doctorPhone={doctorPhone} />
    </div>
  );
}

// ─── ALERT ────────────────────────────────────────────────────────────────
function SafetyAlert({
  alert,
  doctorPhone,
  bpSys,
  bpDia,
}: {
  alert: SafetyAlert;
  doctorPhone: string | null;
  bpSys: number | null;
  bpDia: number | null;
}) {
  const tint = alert.level === "red" ? HF.red : HF.orange;
  const headerLabel = alert.level === "red" ? "ALERTE ACTIVE" : "VIGILANCE";
  const stamp = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const isBP = alert.code === "bp_out_of_range" && bpSys != null && bpDia != null;
  const bannerTitle = (() => {
    switch (alert.code) {
      case "bp_out_of_range":
        return "Tension hors bornes";
      case "rapid_weight_loss":
        return "Perte rapide détectée";
      case "frequent_deviations":
        return "Trop d'écarts cette semaine";
      case "poor_sleep_streak":
        return "Sommeil dégradé";
      default:
        return "Vigilance";
    }
  })();

  return (
    <div style={{ padding: "4px 20px 24px" }}>
      <div style={{ paddingTop: 6 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <PillIcon color={tint} icon="warn" />
          <span className="hf-footnote" style={{ color: tint, fontWeight: 600, letterSpacing: 0.4 }}>
            {headerLabel} · {stamp}
          </span>
        </div>
        <div className="hf-largeTitle" style={{ marginTop: 2 }}>Sécurité</div>
      </div>

      <HFCard
        style={{
          marginTop: 14,
          background: alert.level === "red" ? "rgba(255,59,48,0.10)" : "rgba(255,149,0,0.10)",
          border: `1px solid ${tint}55`,
        }}
        padding="16px 16px 14px"
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              flexShrink: 0,
              background: tint,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 12px ${tint}55`,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l10 18H2z" />
              <path d="M12 10v5M12 18v.5" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div className="hf-title3" style={{ color: tint }}>{bannerTitle}</div>
            <div className="hf-body" style={{ marginTop: 4 }}>
              {isBP ? (
                <>
                  <span className="hf-tnum" style={{ fontWeight: 700 }}>
                    {bpSys} / {bpDia}
                  </span>{" "}
                  mmHg · au-dessus de ta borne{" "}
                  <span className="hf-tnum">
                    {SAFETY_THRESHOLDS.bp_sys_max} / {SAFETY_THRESHOLDS.bp_dia_max}
                  </span>
                </>
              ) : (
                alert.message
              )}
            </div>
          </div>
        </div>
      </HFCard>

      <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
        QUE FAIRE MAINTENANT
      </div>
      <HFCard padding={0} style={{ marginTop: 8 }}>
        <StepRow n={1} title="Reste assis, respire calmement" sub="5 min avant la prochaine mesure" />
        <Sep indent={56} />
        <StepRow n={2} title="Refais une mesure dans 15 min" sub="puis re-saisis-la dans l'app" current />
        <Sep indent={56} />
        <StepRow
          n={3}
          title={`Si ${alert.level === "red" ? "encore hors bornes" : "ça persiste"} → appelle ton médecin`}
          sub="ne pas attendre le RDV"
        />
      </HFCard>

      {doctorPhone && (
        <a
          href={`tel:${doctorPhone}`}
          style={{
            marginTop: 14,
            display: "flex",
            width: "100%",
            borderRadius: 14,
            background: HF.red,
            color: "white",
            padding: "14px",
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: -0.4,
            boxShadow: "0 4px 14px rgba(255,59,48,0.32)",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4a2 2 0 012-2h2l1.5 5L9 9c1 2.5 3.5 5 6 6l2-2.5 5 1.5v2a2 2 0 01-2 2 18 18 0 01-14-14z" />
          </svg>
          Appeler le médecin
        </a>
      )}

      <a
        href="tel:15"
        style={{
          marginTop: 8,
          display: "flex",
          width: "100%",
          borderRadius: 14,
          background: HF.fill,
          color: HF.label,
          padding: "12px",
          fontSize: 15,
          fontWeight: 500,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        SAMU · 15
      </a>
    </div>
  );
}

// ─── CRITICAL ─────────────────────────────────────────────────────────────
function SafetyCritical({
  alerts,
  doctorPhone,
}: {
  alerts: SafetyAlert[];
  doctorPhone: string | null;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "radial-gradient(120% 60% at 50% 0%, #2A0808 0%, #100303 70%) #1A0606",
        display: "flex",
        flexDirection: "column",
        padding: "0 0 32px",
        color: "white",
        marginTop: -110, // offset the layout main pb to fill the viewport
        paddingBottom: 130,
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 32 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: HF.red,
            boxShadow:
              "0 0 0 8px rgba(255,59,48,0.18), 0 0 0 24px rgba(255,59,48,0.08), 0 0 28px rgba(255,59,48,0.6)",
          }}
        />
      </div>

      <div style={{ padding: "24px 28px 0", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: HF.red, textTransform: "uppercase" }}>
          ALERTE CRITIQUE
        </div>
        <div className="hf-title1" style={{ marginTop: 8, color: "white", fontSize: 32, lineHeight: 1.1 }}>
          Plusieurs signaux
          <br />
          au-dessus des bornes
        </div>
      </div>

      <div style={{ padding: "24px 20px 0" }}>
        {alerts.slice(0, 2).map((a) => (
          <CritMetric key={a.code} alert={a} />
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: "0 20px 22px" }}>
        <div style={{ marginBottom: 12, color: "rgba(255,255,255,0.7)", textAlign: "center", fontSize: 15 }}>
          Arrête le jeûne et contacte un médecin maintenant
        </div>
        {doctorPhone && (
          <a
            href={`tel:${doctorPhone}`}
            style={{
              display: "flex",
              width: "100%",
              borderRadius: 14,
              background: HF.red,
              color: "white",
              padding: "16px",
              fontSize: 17,
              fontWeight: 600,
              boxShadow: "0 4px 18px rgba(255,59,48,0.5)",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4a2 2 0 012-2h2l1.5 5L9 9c1 2.5 3.5 5 6 6l2-2.5 5 1.5v2a2 2 0 01-2 2 18 18 0 01-14-14z" />
            </svg>
            Appeler le médecin
          </a>
        )}
        <a
          href="tel:15"
          style={{
            display: "flex",
            width: "100%",
            borderRadius: 14,
            background: "rgba(255,255,255,0.12)",
            color: "white",
            padding: "14px",
            fontSize: 16,
            fontWeight: 500,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          SAMU · 15
        </a>

        <Link
          href="/"
          style={{
            display: "flex",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 999,
            padding: "6px",
            alignItems: "center",
            gap: 10,
            color: "white",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9h12M11 5l4 4-4 4" />
            </svg>
          </div>
          <div style={{ flex: 1, color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
            Glisser pour acquitter
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────
function PillIcon({ color, icon }: { color: string; icon: "shield" | "warn" }) {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: `${color}22`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon === "shield" ? (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 1L1.5 2.5v3.2C1.5 8.5 3.5 10.5 6 11c2.5-.5 4.5-2.5 4.5-5.3V2.5L6 1z" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 1l5 9H1z" />
        </svg>
      )}
    </div>
  );
}

function Sep({ indent = 60 }: { indent?: number }) {
  return <div style={{ height: 0.5, background: HF.separator, marginLeft: indent }} />;
}

function ParamRow({ p }: { p: ParamSpec }) {
  const statusColor = p.status === "ok" ? HF.green : p.status === "warn" ? HF.orange : HF.red;
  const statusLabel = p.status === "ok" ? "OK" : p.status === "warn" ? "limite" : "hors zone";
  return (
    <div style={{ display: "flex", padding: "13px 16px", gap: 12, alignItems: "center" }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          flexShrink: 0,
          background: `${p.tint}1F`,
          color: p.tint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MetricIcon kind={p.iconKey} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="hf-subhead">{p.label}</div>
        <div className="hf-caption hf-tnum" style={{ color: HF.label2 }}>
          dans la zone {p.bounds} {p.unit}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div className="hf-numBig hf-tnum" style={{ fontSize: 18 }}>
          {p.value}
          <span className="hf-footnote" style={{ color: HF.label2, marginLeft: 2 }}>{p.unit}</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 1 }}>
          <HFDot color={statusColor} size={6} />
          <span className="hf-caption2" style={{ color: statusColor, fontWeight: 600 }}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function MetricIcon({ kind }: { kind: ParamSpec["iconKey"] }) {
  switch (kind) {
    case "tension":
      return (
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 16s-6-4-6-9a4 4 0 016-3 4 4 0 016 3c0 5-6 9-6 9z" />
        </svg>
      );
    case "perte":
      return (
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 14l5-5 3 3 4-4M14 8h2v2" />
        </svg>
      );
    case "cetones":
      return (
        <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor">
          <path d="M9 2c2 3 4 5 4 8a4 4 0 11-8 0c0-3 2-5 4-8z" />
        </svg>
      );
    case "pouls":
      return (
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9h3l2-4 3 8 2-4h4" />
        </svg>
      );
  }
}

function StepRow({ n, title, sub, current }: { n: number; title: string; sub: string; current?: boolean }) {
  return (
    <div style={{ display: "flex", padding: "12px 16px", gap: 12, alignItems: "center" }}>
      <div
        className="hf-tnum"
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          flexShrink: 0,
          background: current ? HF.orange : HF.fill,
          color: current ? "white" : HF.label,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 14,
          boxShadow: current ? `0 0 0 4px ${HF.orange}26` : "none",
        }}
      >
        {n}
      </div>
      <div style={{ flex: 1 }}>
        <div className="hf-headline">{title}</div>
        <div className="hf-subhead" style={{ color: HF.label2 }}>{sub}</div>
      </div>
      {current && (
        <div
          style={{
            padding: "3px 8px",
            borderRadius: 999,
            background: `${HF.orange}1A`,
            color: HF.orange,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.3,
          }}
        >
          EN COURS
        </div>
      )}
    </div>
  );
}

function ContactCard({ doctorPhone }: { doctorPhone: string | null }) {
  if (!doctorPhone) return null;
  return (
    <HFCard style={{ marginTop: 22 }} padding="14px 16px">
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: `${HF.blue}1F`,
            color: HF.blue,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4a2 2 0 012-2h2l1.5 5L9 9c1 2.5 3.5 5 6 6l2-2.5 5 1.5v2a2 2 0 01-2 2 18 18 0 01-14-14z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hf-headline">Médecin de garde</div>
          <div className="hf-subhead hf-tnum" style={{ color: HF.label2 }}>{doctorPhone}</div>
        </div>
        <a
          href={`tel:${doctorPhone}`}
          style={{
            background: HF.blue,
            color: "white",
            padding: "7px 14px",
            borderRadius: 18,
            fontSize: 14,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          Appeler
        </a>
      </div>
    </HFCard>
  );
}

function CritMetric({ alert }: { alert: SafetyAlert }) {
  const label = alert.code === "bp_out_of_range" ? "TENSION" : alert.code === "rapid_weight_loss" ? "PERTE" : alert.code.toUpperCase();
  return (
    <div
      style={{
        padding: "14px 18px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,59,48,0.35)",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.8,
          color: HF.red,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div className="hf-body" style={{ marginTop: 6, color: "white" }}>{alert.message}</div>
    </div>
  );
}
