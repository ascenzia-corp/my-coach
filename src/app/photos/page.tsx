"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoCompare } from "@/components/PhotoCompare";

type Pose = "face" | "profil" | "dos";
const POSES: Pose[] = ["face", "profil", "dos"];

interface Photo {
  id: string;
  log_date: string;
  pose: Pose;
  storage_path: string;
  signedUrl?: string;
}

export default function PhotosPage() {
  const supabase = createClient();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadingPose, setUploadingPose] = useState<Pose | null>(null);
  const inputs = {
    face: useRef<HTMLInputElement>(null),
    profil: useRef<HTMLInputElement>(null),
    dos: useRef<HTMLInputElement>(null),
  };

  async function refresh() {
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
        const { data: signed } = await supabase.storage
          .from("photos")
          .createSignedUrl(p.storage_path, 3600);
        return { ...p, signedUrl: signed?.signedUrl };
      }),
    );
    setPhotos(signed);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload(pose: Pose, file: File) {
    setUploadingPose(pose);
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
        .upsert({ user_id: user.id, log_date: date, pose, storage_path: path }, {
          onConflict: "user_id,log_date,pose",
        });
      await refresh();
    }
    setUploadingPose(null);
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

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Photos</h1>
        <p className="text-xs text-zinc-500">Même éclairage, même lieu, à jeun.</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {POSES.map((pose) => (
          <Card key={pose}>
            <CardContent className="p-2 text-center">
              <input
                ref={inputs[pose]}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(pose, f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => inputs[pose].current?.click()}
                disabled={uploadingPose === pose}
              >
                {uploadingPose === pose ? "Upload..." : pose}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {POSES.map((pose) => {
        const t0 = t0ByPose[pose];
        const latest = latestByPose[pose];
        if (!t0 || !latest || t0.id === latest.id || !t0.signedUrl || !latest.signedUrl) return null;
        return (
          <Card key={"cmp-" + pose}>
            <CardHeader>
              <CardTitle className="capitalize">Comparaison {pose}</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoCompare
                beforeSrc={t0.signedUrl}
                afterSrc={latest.signedUrl}
                beforeLabel={t0.log_date}
                afterLabel={latest.log_date}
              />
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Galerie</CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune photo encore.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <div key={p.id} className="aspect-[3/4] overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                  {p.signedUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.signedUrl} alt={`${p.pose} ${p.log_date}`} className="size-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
