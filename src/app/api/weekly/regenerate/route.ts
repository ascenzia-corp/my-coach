import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { week_start } = (await request.json().catch(() => ({}))) as { week_start?: string };

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anon) {
    return NextResponse.json({ error: "Supabase URL/anon key missing" }, { status: 500 });
  }

  // Forward the caller's session to the Edge Function so RLS-aware queries work.
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session.session?.access_token ?? anon;

  const r = await fetch(`${baseUrl}/functions/v1/generate-weekly-review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: anon,
    },
    body: JSON.stringify({ user_id: user.id, week_start: week_start ?? null }),
  });
  const body = await r.text();
  return new NextResponse(body, { status: r.status, headers: { "Content-Type": "application/json" } });
}
