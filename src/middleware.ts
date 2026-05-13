import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieItem = { name: string; value: string; options?: CookieOptions };

const PUBLIC_PATHS = ["/login", "/auth/callback"];
const PUBLIC_PREFIXES = ["/api/push/"];

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Preview deploys without Supabase env vars: skip auth entirely so the
  // design preview renders. Visiting protected routes will see the app in
  // its logged-out fallback state (placeholders), which is enough for
  // visual validation.
  if (!url || !key) {
    return NextResponse.next({ request: req });
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(items: CookieItem[]) {
        for (const { name, value } of items) req.cookies.set(name, value);
        response = NextResponse.next({ request: req });
        for (const { name, value, options } of items) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const next = req.nextUrl.clone();
    next.pathname = "/login";
    next.searchParams.set("next", pathname);
    return NextResponse.redirect(next);
  }

  return response;
}

export const config = {
  matcher: [
    // run on every path except static assets, sw and manifest
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png).*)",
  ],
};
