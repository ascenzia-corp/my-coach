import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let buildStub: BrowserClient | null = null;

export function createClient(): BrowserClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Build-time prerender (SSG) without env vars baked in: return a Proxy stub.
  // Why: pages call createClient() at component body but only use the client
  // inside useEffect / event handlers (never during SSG). A real client would
  // throw at construction; the stub only throws if actually invoked.
  // How to apply: any new client page must keep Supabase calls inside hooks.
  if (!url || !key) {
    if (!buildStub) {
      buildStub = new Proxy({} as BrowserClient, {
        get() {
          throw new Error(
            "Supabase client invoked during prerender — move calls into useEffect or event handlers.",
          );
        },
      });
    }
    return buildStub;
  }
  return createBrowserClient<Database>(url, key);
}
