import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// Coarse gate: must be signed in to reach any admin/provider/courier surface.
// Fine-grained checks (which vertical, which org) run per-page via
// lib/rbac.ts, since that needs a DB lookup that can't happen at the edge.
// `/school/student` (a resident route) is deliberately excluded from the
// `/school/*` prefixes below.
const PROTECTED_PREFIXES = [
  "/admin",
  "/hotel",
  "/grocery",
  "/events",
  "/school/admin",
  "/school/counselor",
  "/school/finance",
  "/school/registrar",
  "/school/teacher",
  "/courier",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Microsite subdomain routing (e.g. `your-school.localhost:3001` in dev,
// `your-school.<APEX>` in production) rewrites to the public renderer at
// `/site/<slug>` — no auth involved, this is a public page. The apex domain
// is configurable since it differs between local dev and production; unset
// falls back to `localhost` so subdomains work out of the box in dev (modern
// browsers resolve `*.localhost` to 127.0.0.1 automatically).
const APEX_DOMAIN = process.env.NEXT_PUBLIC_APEX_DOMAIN || "localhost";

function microsite_rewrite(req: NextRequest): NextResponse | null {
  const hostname = (req.headers.get("host") || "").split(":")[0];
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return null;
  if (hostname === APEX_DOMAIN || !hostname.endsWith(`.${APEX_DOMAIN}`)) return null;

  const slug = hostname.slice(0, -(APEX_DOMAIN.length + 1));
  if (!slug) return null;

  const url = req.nextUrl.clone();
  url.pathname = `/site/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export default async function middleware(req: NextRequest) {
  const rewrite = microsite_rewrite(req);
  if (rewrite) return rewrite;

  if (isProtectedPath(req.nextUrl.pathname)) {
    // Delegates to next-auth's own default redirect-to-signin behavior —
    // reused as-is rather than reimplemented, so this preserves exactly
    // what `export { default } from "next-auth/middleware"` did before.
    const authResult = await withAuth(req as any);
    if (authResult) return authResult;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
