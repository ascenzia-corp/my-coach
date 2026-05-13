import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

type CookieItem = { name: string; value: string; options?: CookieOptions };
type ServerClient = ReturnType<typeof createServerClient<Database>>;

// Stub server client returned when NEXT_PUBLIC_SUPABASE_* env vars are missing
// (typically Vercel Preview builds). auth.getUser() resolves to { user: null }
// so server components fall back to their logged-out state; any other call
// throws to surface programming errors rather than silently no-op.
function makeStubClient(): ServerClient {
  const throwOnUse = () => {
    throw new Error("Supabase server client unavailable (missing env vars in this environment).");
  };
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    from: throwOnUse,
    rpc: throwOnUse,
    storage: { from: throwOnUse },
  } as unknown as ServerClient;
}

export async function createClient(): Promise<ServerClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return makeStubClient();

  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items: CookieItem[]) {
        try {
          for (const { name, value, options } of items) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — middleware refreshes the session instead.
        }
      },
    },
  });
}

export function createServiceClient(): ServerClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return makeStubClient();
  return createServerClient<Database>(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
