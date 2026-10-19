import { NextResponse } from "next/server";
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NIGERIAN_STATES } from "@/lib/data/nigeria";

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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Canonical list of recognized Nigerian cities, states, and LGAs
const KNOWN_CITY_SLUGS = new Set<string>([
  "calabar",
  "lagos",
  "abuja",
  "fct",
  "ibadan",
  "kano",
  "enugu",
  "port-harcourt",
  "ph",
  "benin",
  "uyo",
  "kaduna",
  "owerri",
  "jos",
  "warri",
  "abeokuta",
  "ilorin",
  "akure",
  "asaba",
  "abakaliki",
  "maiduguri",
  "sokoto",
  "zaria",
  "minna",
  "lokoja",
  "yenagoa",
  "yola",
  "jalingo",
  "gusau",
  "birnin-kebbi",
  "dutse",
  "lafia",
  "damaturu",
  "gombe",
]);

// Populate states and LGAs into city slugs
for (const [state, lgas] of Object.entries(NIGERIAN_STATES)) {
  const stateSlug = slugify(state);
  KNOWN_CITY_SLUGS.add(stateSlug);
  for (const lga of lgas) {
    const lgaSlug = slugify(lga);
    KNOWN_CITY_SLUGS.add(lgaSlug);
    KNOWN_CITY_SLUGS.add(`${lgaSlug}-${stateSlug}`);
  }
}

const APEX_DOMAIN = (process.env.NEXT_PUBLIC_APEX_DOMAIN || "localhost").toLowerCase();

function extractSubdomain(req: NextRequestWithAuth): string | null {
  const hostname = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === APEX_DOMAIN ||
    hostname === `www.${APEX_DOMAIN}` ||
    !hostname.endsWith(`.${APEX_DOMAIN}`)
  ) {
    return null;
  }

  const slug = hostname.slice(0, -(APEX_DOMAIN.length + 1)).toLowerCase();
  if (!slug || slug === "www") return null;
  return slug;
}

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const pathname = req.nextUrl.pathname;
    if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
      return NextResponse.next();
    }

    const subdomain = extractSubdomain(req);

    // If subdomain is present and NOT a recognized city, it is an organization/school microsite
    if (subdomain && !KNOWN_CITY_SLUGS.has(subdomain)) {
      const url = req.nextUrl.clone();
      url.pathname = `/site/${subdomain}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }

    const isProtected = isProtectedPath(pathname);
    const token = req.nextauth.token;

    // New users: if logged in but haven't finished onboarding, send to /welcome
    const skipOnboarding =
      pathname.startsWith("/welcome") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/admin/hotel") ||
      pathname.startsWith("/hotel") ||
      pathname.startsWith("/hotel-os") ||
      pathname.startsWith("/business") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/school/login");

    if (token && token.onboardingComplete === false && !skipOnboarding) {
      const url = req.nextUrl.clone();
      url.pathname = "/welcome";
      return NextResponse.redirect(url);
    }

    if (isProtected && !token) {
      const url = req.nextUrl.clone();
      if (pathname.startsWith("/school")) {
        url.pathname = "/school/login";
      } else {
        url.pathname = "/login";
      }
      url.searchParams.set("callbackUrl", req.nextUrl.href);
      return NextResponse.redirect(url);
    }

    // City Subdomain (e.g. calabar.9jalive.online, lagos.9jalive.online)
    if (subdomain && KNOWN_CITY_SLUGS.has(subdomain)) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-city-slug", subdomain);

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // Set cookie for client components, persisting across all subdomains
      response.cookies.set("cc_city", subdomain, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        domain: APEX_DOMAIN === "localhost" ? undefined : `.${APEX_DOMAIN}`,
      });

      return response;
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|school/login).*)"],
};
