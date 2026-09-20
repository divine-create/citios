import { NextResponse } from "next/server";
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";

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
// `/site/<slug>` ?" no auth involved, this is a public page. The apex domain
// is configurable since it differs between local dev and production; unset
// falls back to `localhost` so subdomains work out of the box in dev (modern
// browsers resolve `*.localhost` to 127.0.0.1 automatically).
const APEX_DOMAIN = process.env.NEXT_PUBLIC_APEX_DOMAIN || "localhost";

function microsite_rewrite(req: NextRequestWithAuth): NextResponse | null {
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

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const rewrite = microsite_rewrite(req);
    if (rewrite) return rewrite;

    const isProtected = isProtectedPath(req.nextUrl.pathname);
    const token = req.nextauth.token;

    // New users: if logged in but haven't finished onboarding, send to /welcome
    const skipOnboarding =
      req.nextUrl.pathname.startsWith('/welcome') ||
      req.nextUrl.pathname.startsWith('/api/') ||
      req.nextUrl.pathname.startsWith('/school/login') ||
      req.nextUrl.pathname === '/';
    if (token && token.onboardingComplete === false && !skipOnboarding) {
      const url = req.nextUrl.clone();
      url.pathname = '/welcome';
      return NextResponse.redirect(url);
    }

    if (isProtected && !token) {
      const url = req.nextUrl.clone();
      
      // Dynamic sign-in page routing per vertical
      if (req.nextUrl.pathname.startsWith("/school")) {
        url.pathname = "/school/login";
      } else {
        // App sign-in page
        url.pathname = "/login";
      }
      
      url.searchParams.set("callbackUrl", req.nextUrl.href);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // By returning true here, we bypass NextAuth's default redirect logic
      // and let our middleware function above handle the redirect dynamically
      // based on the requested URL.
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|school/login).*)"],
};
