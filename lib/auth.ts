import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/src/prisma/db";
import { resolvePersonByEmail, findPersonByEmail } from "@/lib/identity";
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
                // In dev, accept password '1234' for any email and fetch their actual DB person
                const dbPerson = await findPersonByEmail(credentials.email);
                if (dbPerson) {
                  return { id: dbPerson.id, email: (credentials.email as string).toLowerCase(), name: `${dbPerson.firstName} ${dbPerson.lastName}` };
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
    async jwt({ token, user, trigger }) {
      const lookupEmail = user?.email || token?.email;
      if (lookupEmail && (user || trigger === "update")) {
        try {
          // Canonical Person resolution (provisions Person + PersonIdentifier
          // on first sign-in). The email comes from the server session, never
          // from client input.
          const dbPerson = await resolvePersonByEmail(
            lookupEmail as string,
            user?.name ?? (token?.name as string | undefined) ?? null,
          );

          if (dbPerson) {
            let account = await db.orm.public.Account.where({ personId: dbPerson.id }).all().first();
            if (!account) {
              account = await db.orm.public.Account.create({ personId: dbPerson.id, isActive: true });
            }

            // Ensure ResidentProfile exists; create one on first sign-in
            let residentProfile = await db.orm.public.ResidentProfile
              .where({ personId: dbPerson.id }).all().first();
            if (!residentProfile) {
              residentProfile = await db.orm.public.ResidentProfile.create({
                personId: dbPerson.id,
              });
            }

            const [orgMembers, gigProfile] = await Promise.all([
              db.orm.public.Membership.where({ personId: dbPerson.id }).all(),
              db.orm.public.GigWorkerProfile.where({ personId: dbPerson.id }).all().first(),
            ]);

            let memberships: OrgMembership[] = [];
            if (orgMembers.length > 0) {
              const organizations = await db.orm.public.Organization.all();
              
              for (const member of orgMembers) {
                const roles = await db.orm.public.MembershipRole.where({ membershipId: member.id }).all();
                const org = organizations.find((o) => o.id === member.organizationId);
                
                if (org && roles.length > 0) {
                  memberships.push({
                    organizationId: member.organizationId,
                    organizationType: org.type as OrgMembership["organizationType"],
                    role: roles[0].role as OrgMembership["role"],
                  });
                }
              }
            }

            token.personId = dbPerson.id;
            token.memberships = memberships;
            token.isCourier = !!gigProfile;
            token.role = memberships.length > 0 ? "PROVIDER" : gigProfile ? "COURIER" : "RESIDENT";
            token.onboardingComplete = residentProfile.onboardingComplete ?? false;
          }
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
        session.user.personId = token.personId as string | undefined;
        session.user.role = token.role;
        session.user.memberships = token.memberships ?? [];
        session.user.isCourier = !!token.isCourier;
        session.user.onboardingComplete = (token.onboardingComplete as boolean | undefined) ?? false;
      }
      return session;
    },
  },
  // If we want a custom sign-in page later, we define it here:
  // pages: {
  //   signIn: '/login',
  // }
};
