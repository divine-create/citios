export { default } from "next-auth/middleware";

// Coarse gate: must be signed in to reach any admin/provider/courier surface.
// Fine-grained checks (which vertical, which org) run per-page via
// lib/rbac.ts, since that needs a DB lookup that can't happen at the edge.
// `/school/student` (a resident route) is deliberately excluded from the
// `/school/*` matcher below.
export const config = {
  matcher: [
    "/admin/:path*",
    "/hotel/:path*",
    "/grocery/:path*",
    "/events/:path*",
    "/school/admin/:path*",
    "/school/counselor/:path*",
    "/school/finance/:path*",
    "/school/registrar/:path*",
    "/school/teacher/:path*",
    "/courier/:path*",
  ],
};
