import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/src/prisma/db";
import type { OrgMembership } from "@/types/next-auth";

// Dev-only demo login so the prototype can be exercised across every
// vertical without real Google OAuth. Accepts password "1234" for any email
// that matches an existing User row (e.g. demo@cityconnect.local, seeded
// with OWNER membership everywhere, or a named per-role account like
// principal@cityconnect.local). Never enabled in production.
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
    }),
    ...(process.env.NODE_ENV !== "production"
      ? [
          CredentialsProvider({
            id: "demo",
            name: "Demo Account",
            credentials: {
              email: { label: "Email", type: "text" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              if (credentials?.password === "1234" && credentials?.email) {
                // In dev, accept password '1234' for any email and fetch their actual DB user
                const dbUser = await db.orm.public.User.where({ email: credentials.email }).all().first();
                if (dbUser) {
                  return { id: dbUser.id, email: dbUser.email, name: dbUser.name };
                }
              }
              return null;
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only populated on the initial sign-in. We resolve real RBAC
      // roles once here and cache them on the token so we don't hit the DB on
      // every request. A change to someone's OrganizationMember rows only
      // takes effect the next time they sign in.
      if (user?.email) {
        try {
          let dbUser = await db.orm.public.User.where({ email: user.email }).all().first();

          if (!dbUser) {
            dbUser = await db.orm.public.User.create({
              email: user.email,
              name: user.name ?? undefined,
              image: user.image ?? undefined,
            });
          }

          const [orgMembers, gigProfile] = await Promise.all([
            db.orm.public.OrganizationMember.where({ userId: dbUser.id }).all(),
            db.orm.public.GigWorkerProfile.where({ userId: dbUser.id }).all().first(),
          ]);

          let memberships: OrgMembership[] = [];
          if (orgMembers.length > 0) {
            const organizations = await db.orm.public.Organization.all();
            memberships = orgMembers.map((member) => ({
              organizationId: member.organizationId,
              organizationType: organizations.find((org) => org.id === member.organizationId)?.type as OrgMembership["organizationType"],
              role: member.role as OrgMembership["role"],
            }));
          }

          token.userId = dbUser.id;
          token.memberships = memberships;
          token.isCourier = !!gigProfile;
          token.role = memberships.length > 0 ? "PROVIDER" : gigProfile ? "COURIER" : "RESIDENT";
        } catch (error) {
          console.error("Error resolving RBAC roles:", error);
          token.role = token.role ?? "RESIDENT";
          token.memberships = token.memberships ?? [];
          token.isCourier = token.isCourier ?? false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId;
        session.user.role = token.role;
        session.user.memberships = token.memberships ?? [];
        session.user.isCourier = !!token.isCourier;
      }
      return session;
    },
  },
  // If we want a custom sign-in page later, we define it here:
  // pages: {
  //   signIn: '/login',
  // }
};
