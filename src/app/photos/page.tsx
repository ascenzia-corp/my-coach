"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/queries";
import { HF, HFCard } from "@/components/hf";
import { PhotoCompare } from "@/components/PhotoCompare";

type Pose = "face" | "profil" | "dos";
const POSES: Pose[] = ["face", "profil", "dos"];
const POSE_LABEL: Record<Pose, string> = { face: "Face", profil: "Profil", dos: "Dos" };
const POSE_TINT: Record<Pose, string> = { face: HF.pink, profil: HF.indigo, dos: HF.blue };

interface Photo {
  id: string;
  log_date: string;
  pose: Pose;
  storage_path: string;
  signedUrl?: string;
}

function monthLabel(iso: string): string {
  const m = parseInt(iso.slice(5, 7), 10);
  const months = ["jan", "fév", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
  return months[m - 1] ?? "";
}

export default function PhotosPage() {
  const supabase = useMemo(() => createClient(), []);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadingPose, setUploadingPose] = useState<Pose | null>(null);
  const [activeCompare, setActiveCompare] = useState<Pose | null>(null);
  const faceRef = useRef<HTMLInputElement>(null);
  const profilRef = useRef<HTMLInputElement>(null);
  const dosRef = useRef<HTMLInputElement>(null);
  const inputRefs: Record<Pose, React.RefObject<HTMLInputElement | null>> = {
    face: faceRef,
    profil: profilRef,
    dos: dosRef,
  };

  async function refresh() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("photo")
        .select("id, log_date, pose, storage_path")
        .eq("user_id", user.id)
        .order("log_date", { ascending: false });
      const list = (data as Photo[]) ?? [];
      const signed = await Promise.all(
        list.map(async (p) => {
          const { data: s } = await supabase.storage.from("photos").createSignedUrl(p.storage_path, 3600);
          return { ...p, signedUrl: s?.signedUrl };
        }),
      );
      setPhotos(signed);
    } catch {
      // env stub
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload(pose: Pose, file: File) {
    setUploadingPose(pose);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUploadingPose(null);
        return;
      }
      const date = todayIso();
      const path = `${user.id}/${date}-${pose}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("photos")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (!upErr) {
        await supabase
          .from("photo")
          .upsert(
            { user_id: user.id, log_date: date, pose, storage_path: path },
            { onConflict: "user_id,log_date,pose" },
          );
        await refresh();
      }
    } finally {
      setUploadingPose(null);
    }
  }

  const latestByPose: Record<Pose, Photo | undefined> = {
    face: photos.find((p) => p.pose === "face"),
    profil: photos.find((p) => p.pose === "profil"),
    dos: photos.find((p) => p.pose === "dos"),
  };
  const t0ByPose: Record<Pose, Photo | undefined> = {
    face: [...photos].reverse().find((p) => p.pose === "face"),
    profil: [...photos].reverse().find((p) => p.pose === "profil"),
    dos: [...photos].reverse().find((p) => p.pose === "dos"),
  };

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const p of photos) {
      const key = p.log_date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [photos]);

  return (
    <div style={{ padding: "4px 20px 24px" }}>
      <div style={{ paddingTop: 6 }}>
        <div className="hf-footnote" style={{ color: HF.label2 }}>Progrès</div>
        <div className="hf-largeTitle" style={{ marginTop: 2 }}>Photos</div>
        <div className="hf-subhead" style={{ color: HF.label2, marginTop: 2 }}>
          {photos.length === 0
            ? "Même éclairage · même lieu · à jeun"
            : `${photos.length} photo${photos.length > 1 ? "s" : ""} · ${groupedByMonth.length} mois`}
        </div>
      </div>

      {/* Capture buttons */}
      <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
        AJOUTER AUJOURD&apos;HUI
      </div>
      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {POSES.map((pose) => (
          <CaptureCard
            key={pose}
            pose={pose}
            tint={POSE_TINT[pose]}
            uploading={uploadingPose === pose}
            hasToday={latestByPose[pose]?.log_date === todayIso()}
            onClick={() => inputRefs[pose].current?.click()}
          />
        ))}
      </div>
      {POSES.map((pose) => (
        <input
          key={pose}
          ref={inputRefs[pose]}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(pose, f);
            e.target.value = "";
          }}
        />
      ))}

      {/* Compare buttons */}
      {POSES.some((pose) => {
        const t0 = t0ByPose[pose];
        const latest = latestByPose[pose];
        return t0 && latest && t0.id !== latest.id;
      }) && (
        <>
          <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
            COMPARER
          </div>
          <HFCard padding={0} style={{ marginTop: 8 }}>
            {POSES.map((pose, idx) => {
              const t0 = t0ByPose[pose];
              const latest = latestByPose[pose];
              const canCompare = !!(t0 && latest && t0.id !== latest.id);
              return (
                <div key={pose}>
                  <button
                    type="button"
                    disabled={!canCompare}
                    onClick={() => setActiveCompare(activeCompare === pose ? null : pose)}
                    style={{
                      display: "flex",
                      width: "100%",
                      padding: "14px 16px",
                      gap: 12,
                      alignItems: "center",
                      background: "transparent",
                      border: "none",
                      color: HF.label,
                      textAlign: "left",
                      cursor: canCompare ? "pointer" : "default",
                      opacity: canCompare ? 1 : 0.4,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        flexShrink: 0,
                        background: `${POSE_TINT[pose]}1F`,
                        color: POSE_TINT[pose],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="6" width="8" height="12" rx="1" />
                        <rect x="13" y="6" width="8" height="12" rx="1" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="hf-subhead">{POSE_LABEL[pose]}</div>
                      <div className="hf-caption hf-tnum" style={{ color: HF.label2 }}>
                        {canCompare && t0 && latest ? `${t0.log_date} → ${latest.log_date}` : "minimum 2 photos requises"}
                      </div>
                    </div>
                    {canCompare && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke={HF.label3}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transform: activeCompare === pose ? "rotate(90deg)" : "rotate(0)" }}
                      >
                        <path d="M5 3l4 4-4 4" />
                      </svg>
                    )}
                  </button>
                  {activeCompare === pose && t0 && latest && t0.signedUrl && latest.signedUrl && (
                    <div style={{ padding: "0 16px 14px" }}>
                      <PhotoCompare
                        beforeSrc={t0.signedUrl}
                        afterSrc={latest.signedUrl}
                        beforeLabel={t0.log_date}
                        afterLabel={latest.log_date}
                      />
                    </div>
                  )}
                  {idx < POSES.length - 1 && <div style={{ height: 0.5, background: HF.separator, marginLeft: 56 }} />}
                </div>
              );
            })}
          </HFCard>
        </>
      )}

      {/* Gallery */}
      <div className="hf-eyebrow" style={{ marginTop: 22, marginLeft: 4, color: HF.label2 }}>
        GALERIE
      </div>
      {photos.length === 0 ? (
        <HFCard style={{ marginTop: 8 }} padding="20px 18px">
          <div className="hf-subhead" style={{ color: HF.label2 }}>
            Pas encore de photos. Capture ta première pose ci-dessus pour démarrer la galerie.
          </div>
        </HFCard>
      ) : (
        groupedByMonth.map(([month, list]) => (
          <div key={month} style={{ marginTop: 12 }}>
            <div className="hf-eyebrow hf-tnum" style={{ color: HF.label3, marginLeft: 4, marginBottom: 6 }}>
              {monthLabel(`${month}-01`).toUpperCase()} {month.slice(0, 4)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {list.map((p) => (
                <div
                  key={p.id}
                  style={{
                    aspectRatio: "3 / 4",
                    overflow: "hidden",
                    borderRadius: 12,
                    background: HF.surfaceAlt,
                    position: "relative",
                  }}
                >
                  {p.signedUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.signedUrl}
                      alt={`${p.pose} ${p.log_date}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      left: 6,
                      top: 6,
                      padding: "2px 7px",
                      borderRadius: 6,
                      background: "rgba(0,0,0,0.55)",
                      color: "white",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: 0.3,
                    }}
                  >
                    {POSE_LABEL[p.pose].toUpperCase()}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      right: 6,
                      bottom: 6,
                      padding: "2px 7px",
                      borderRadius: 6,
                      background: "rgba(0,0,0,0.55)",
                      color: "white",
                      fontSize: 10,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {p.log_date.slice(8, 10)}/{p.log_date.slice(5, 7)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <div className="hf-caption" style={{ textAlign: "center", color: HF.label3, marginTop: 22 }}>
        Stockage privé Supabase · liens signés 1 h
      </div>

      <Link
        href="/"
        style={{
          display: "block",
          textAlign: "center",
          color: HF.blue,
          fontSize: 15,
          fontWeight: 500,
          padding: "12px",
          marginTop: 10,
        }}
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

function CaptureCard({
  pose,
  tint,
  uploading,
  hasToday,
  onClick,
}: {
  pose: Pose;
  tint: string;
  uploading: boolean;
  hasToday: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={uploading}
      style={{
        background: HF.surface,
        borderRadius: 14,
        padding: "16px 10px",
        border: hasToday ? `1.5px solid ${tint}` : "1px solid transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        color: HF.label,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: `${tint}1F`,
          color: tint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {uploading ? (
          <svg width="22" height="22" viewBox="0 0 22 22">
            <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="20">
              <animateTransform attributeName="transform" type="rotate" from="0 11 11" to="360 11 11" dur="0.8s" repeatCount="indefinite" />
            </circle>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 7h3l1.5-2h5L16 7h3a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        )}
      </div>
      <div className="hf-subhead" style={{ fontWeight: 600 }}>{POSE_LABEL[pose]}</div>
      <div className="hf-caption" style={{ color: hasToday ? tint : HF.label2 }}>
        {uploading ? "Upload…" : hasToday ? "✓ aujourd'hui" : "tap pour ajouter"}
      </div>
    </button>
  );
}
