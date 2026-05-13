"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/queries";
import type { DailyLogRow } from "@/lib/supabase/types";
import { HF, HFCard, HFChip, HFDot } from "@/components/hf";

// ─── Web Speech API minimal types ─────────────────────────────────────────
// (Not in lib.dom.d.ts for vendor-prefixed flavors.)
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}
type SRConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ─── Transcript parsing (best-effort French) ──────────────────────────────
interface Detection {
  weight?: number;
  ketones?: number;
  sys?: number;
  dia?: number;
}

function parseTranscript(raw: string): Detection {
  const t = raw.toLowerCase();
  const out: Detection = {};

  // Weight: "87 kilos 4" / "87 kg" / "87,4 kg" / "pèse 87 kilo 400"
  const wm = t.match(
    /(\d{2,3})\s*(?:[,.]\s*(\d{1,3}))?\s*(?:kilos?|kg)\s*(\d{1,3})?/,
  );
  if (wm) {
    const int = parseInt(wm[1], 10);
    const dec = wm[2] ?? wm[3] ?? "0";
    const v = parseFloat(`${int}.${dec}`);
    if (v >= 30 && v <= 200) out.weight = v;
  }

  // Ketones: "cétones 1,8" / "cétones 1 virgule 8" / "cétones 1 point 8"
  const km = t.match(/c[ée]tones?\s*(\d)\s*(?:[,.]\s*|\s*virgule\s*|\s*point\s*)?(\d)?/);
  if (km) {
    const int = parseInt(km[1], 10);
    const dec = km[2] ?? "0";
    const v = parseFloat(`${int}.${dec}`);
    if (v >= 0 && v <= 8) out.ketones = v;
  }

  // BP: "tension 122 sur 79"
  const bm = t.match(/(?:tension|t[ae]nsion|ta)\s*(\d{2,3})\s*(?:sur|\/|s)\s*(\d{2,3})/);
  if (bm) {
    const sys = parseInt(bm[1], 10);
    const dia = parseInt(bm[2], 10);
    if (sys >= 70 && sys <= 220 && dia >= 40 && dia <= 140) {
      out.sys = sys;
      out.dia = dia;
    }
  }

  return out;
}

function detectionCount(d: Detection): number {
  let n = 0;
  if (d.weight != null) n++;
  if (d.ketones != null) n++;
  if (d.sys != null && d.dia != null) n++;
  return n;
}

function fmt(value: number, decimals = 1): string {
  return value.toFixed(decimals).replace(".", ",");
}

// ─── Component ────────────────────────────────────────────────────────────
type Status = "idle" | "listening" | "settled" | "saving" | "unsupported";

export default function QuickLogVoicePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const SR = useMemo(() => getSpeechRecognition(), []);

  const [status, setStatus] = useState<Status>(SR ? "idle" : "unsupported");
  const [transcript, setTranscript] = useState("");
  const [detection, setDetection] = useState<Detection>({});
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        // already stopped
      }
    };
  }, []);

  function startListening() {
    if (!SR) return;
    setTranscript("");
    setDetection({});
    setStatus("listening");
    startedAtRef.current = Date.now();
    const rec = new SR();
    rec.lang = "fr-FR";
    // continuous=true lets the user dictate poids + cétones + TA in sequence
    // without Safari cutting at the first silence. User taps mic to stop.
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      const parts: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        parts.push(event.results[i][0].transcript);
      }
      const text = parts.join(" ").trim();
      setTranscript(text);
      setDetection(parseTranscript(text));
      setElapsed((Date.now() - startedAtRef.current) / 1000);
    };
    rec.onerror = () => {
      setStatus(transcript ? "settled" : "idle");
    };
    rec.onend = () => {
      setElapsed((Date.now() - startedAtRef.current) / 1000);
      setStatus((s) => (s === "listening" ? "settled" : s));
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setStatus("unsupported");
    }
  }

  function stopListening() {
    try {
      recRef.current?.stop();
    } catch {
      // already stopped
    }
  }

  async function saveDetection() {
    if (status === "saving") return;
    if (detectionCount(detection) === 0) return;
    setStatus("saving");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/log");
        return;
      }
      const payload: Partial<DailyLogRow> & { user_id: string; log_date: string } = {
        user_id: user.id,
        log_date: todayIso(),
      };
      if (detection.weight != null) payload.weight_kg = detection.weight;
      if (detection.ketones != null) payload.ketones_mmol = detection.ketones;
      if (detection.sys != null && detection.dia != null) {
        payload.bp_morning_sys = detection.sys;
        payload.bp_morning_dia = detection.dia;
      }
      const { error } = await supabase
        .from("daily_log")
        .upsert(payload, { onConflict: "user_id,log_date" });
      if (!error) router.push("/");
      else setStatus("settled");
    } catch {
      setStatus("settled");
    }
  }

  function onMicTap() {
    if (status === "listening") {
      stopListening();
      return;
    }
    if (status === "settled" && detectionCount(detection) > 0) {
      void saveDetection();
      return;
    }
    if (status === "idle" || status === "settled") {
      startListening();
      return;
    }
  }

  const detected = detectionCount(detection);
  const recording = status === "listening";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", paddingBottom: 24 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          padding: "14px 16px 4px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          style={iconBtnStyle}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4l-5 5 5 5" />
          </svg>
        </button>
        <div className="hf-headline">Logger</div>
        <Link href="/" aria-label="Fermer" style={iconBtnStyle}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </Link>
      </div>

      {/* Quote */}
      <div style={{ padding: "20px 22px 0" }}>
        <div className="hf-eyebrow" style={{ color: HF.label2 }}>
          {status === "listening" ? "JE T'ÉCOUTE" : status === "unsupported" ? "VOIX INDISPONIBLE" : status === "settled" && detected > 0 ? "DÉTECTÉ" : "PRÊT À DICTER"}
        </div>
        <div
          className="hf-title1"
          style={{ marginTop: 6, color: HF.label, lineHeight: 1.18 }}
        >
          {status === "unsupported" ? (
            <>«&nbsp;Cette version de Safari ne supporte pas la dictée. Utilise la saisie manuelle ci-dessous.&nbsp;»</>
          ) : transcript ? (
            <ColoredQuote text={transcript} detection={detection} />
          ) : (
            <span style={{ color: HF.label2 }}>«&nbsp;Pèse 87 kilos 4, cétones 1,8, tension 122 sur 79.&nbsp;»</span>
          )}
        </div>
        {(detected > 0 || elapsed > 0) && (
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {detected > 0 && (
              <HFChip>
                <HFDot color={HF.green} size={6} /> {detected} mesure{detected > 1 ? "s" : ""} détectée{detected > 1 ? "s" : ""}
              </HFChip>
            )}
            {elapsed > 0 && <HFChip>{elapsed.toFixed(1).replace(".", ",")} s</HFChip>}
          </div>
        )}
      </div>

      {/* Detected metrics */}
      {detected > 0 && (
        <div style={{ padding: "18px 16px 0" }}>
          <HFCard padding={0}>
            {detection.weight != null && (
              <DetectRow
                tint={HF.green}
                label="Poids"
                value={fmt(detection.weight)}
                unit="kg"
                delta=""
                href="/log/wheel/weight"
              />
            )}
            {detection.weight != null && (detection.ketones != null || (detection.sys != null && detection.dia != null)) && (
              <Sep />
            )}
            {detection.ketones != null && (
              <DetectRow
                tint={HF.orange}
                label="Cétones"
                value={fmt(detection.ketones)}
                unit="mmol/L"
                delta=""
                href="/log/wheel/ketones"
              />
            )}
            {detection.ketones != null && detection.sys != null && detection.dia != null && <Sep />}
            {detection.sys != null && detection.dia != null && (
              <DetectRow
                tint={HF.red}
                label="Tension"
                value={`${detection.sys}/${detection.dia}`}
                unit=""
                delta=""
                href="/log/wheel/bp"
              />
            )}
          </HFCard>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Mic + waveform */}
      <div style={{ padding: "0 22px 38px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Waveform color={HF.green} animate={recording} />
        <button
          type="button"
          onClick={onMicTap}
          disabled={status === "unsupported" || status === "saving"}
          aria-label={recording ? "Arrêter la dictée" : detected > 0 ? "Valider" : "Démarrer la dictée"}
          style={{
            width: 78,
            height: 78,
            borderRadius: "50%",
            background: status === "unsupported" ? HF.fill : HF.green,
            color: "white",
            border: "none",
            boxShadow:
              status === "unsupported"
                ? "none"
                : "0 6px 22px rgba(52,199,89,0.45), 0 1px 3px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: status === "unsupported" || status === "saving" ? 0.55 : 1,
            transform: recording ? "scale(1.06)" : "scale(1)",
            transition: "transform .18s",
          }}
        >
          {recording ? (
            <svg width="22" height="22" viewBox="0 0 22 22">
              <rect x="5" y="5" width="12" height="12" rx="2" fill="white" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="12" y="6" width="8" height="14" rx="4" fill="white" />
              <path d="M8 16a8 8 0 0016 0M16 24v3M12 27h8" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </svg>
          )}
        </button>
        <div className="hf-subhead" style={{ color: HF.label2, textAlign: "center", maxWidth: 280 }}>
          {status === "unsupported"
            ? "Dictée non supportée par ce navigateur."
            : recording
            ? <>Tape pour <strong style={{ color: HF.label }}>arrêter</strong> · re-tape pour redicter</>
            : detected > 0
            ? <>Tape pour <strong style={{ color: HF.label }}>valider</strong> · re-tape pour redicter</>
            : <>Tape pour démarrer la dictée</>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <ManualPill href="/log/wheel/weight" tint={HF.green} label="Poids" />
          <ManualPill href="/log/wheel/ketones" tint={HF.orange} label="Cétones" />
          <ManualPill href="/log/wheel/bp" tint={HF.red} label="Tension" />
        </div>
        <div className="hf-caption" style={{ color: HF.label3, marginTop: -2 }}>
          Saisir manuellement
        </div>
      </div>
    </div>
  );
}

function ManualPill({ href, tint, label }: { href: string; tint: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 999,
        background: `${tint}1A`,
        color: tint,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: -0.1,
      }}
    >
      <HFDot color={tint} size={6} />
      {label}
    </Link>
  );
}

const iconBtnStyle = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: HF.fill,
  color: HF.label,
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
} as const;

function Sep() {
  return <div style={{ height: 0.5, background: HF.separator, marginLeft: 64 }} />;
}

function DetectRow({
  tint,
  label,
  value,
  unit,
  delta,
  href,
}: {
  tint: string;
  label: string;
  value: string;
  unit: string;
  delta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{ display: "flex", padding: "14px 16px", gap: 12, alignItems: "center", color: HF.label }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          flexShrink: 0,
          background: `${tint}1F`,
          color: tint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.4,
        }}
      >
        {label.slice(0, 3).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="hf-subhead" style={{ color: HF.label2 }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span className="hf-numBig hf-tnum" style={{ fontSize: 22 }}>{value}</span>
          {unit && <span className="hf-footnote hf-tnum" style={{ color: HF.label2 }}>{unit}</span>}
        </div>
      </div>
      {delta && <div className="hf-footnote hf-tnum" style={{ color: HF.label2, marginRight: 10 }}>{delta}</div>}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: tint,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6l2 2 4-5" />
        </svg>
      </div>
    </Link>
  );
}

function ColoredQuote({ text, detection }: { text: string; detection: Detection }) {
  // Render the transcript with tint-colored spans around matched substrings.
  // Best effort: lookup the literal numbers and known keywords. Falls back to plain text.
  if (!text) return null;

  const tokens: { from: number; to: number; color: string }[] = [];

  function findAndMark(re: RegExp, color: string) {
    const m = text.match(re);
    if (!m || m.index == null) return;
    tokens.push({ from: m.index, to: m.index + m[0].length, color });
  }

  if (detection.weight != null) findAndMark(/(\d{2,3})\s*(?:[,.]\s*\d{1,3})?\s*(?:kilos?|kg)\s*(?:\d{1,3})?/i, HF.green);
  if (detection.ketones != null) findAndMark(/c[ée]tones?\s*\d(?:\s*(?:[,.]|virgule|point)\s*\d)?/i, HF.orange);
  if (detection.sys != null && detection.dia != null)
    findAndMark(/(?:tension|t[ae]nsion|ta)\s*\d{2,3}\s*(?:sur|\/|s)\s*\d{2,3}/i, HF.red);

  if (tokens.length === 0) return <>«&nbsp;{text}&nbsp;»</>;

  tokens.sort((a, b) => a.from - b.from);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  tokens.forEach((tok, i) => {
    if (cursor < tok.from) parts.push(<span key={`p${i}`}>{text.slice(cursor, tok.from)}</span>);
    parts.push(
      <span key={`m${i}`} style={{ color: tok.color }}>{text.slice(tok.from, tok.to)}</span>,
    );
    cursor = tok.to;
  });
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return <>«&nbsp;{parts}&nbsp;»</>;
}

function Waveform({ color, animate }: { color: string; animate: boolean }) {
  const bars = [4, 8, 14, 22, 30, 38, 32, 22, 16, 10, 18, 28, 34, 26, 18, 10, 6, 14, 22, 30, 24, 14, 8, 4];
  return (
    <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: animate ? h : Math.max(4, h * 0.35),
            borderRadius: 2,
            background: color,
            opacity: 0.55 + (i / bars.length) * 0.45,
            transition: "height .25s ease",
          }}
        />
      ))}
    </div>
  );
}
