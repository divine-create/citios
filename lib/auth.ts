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
                // In dev, accept password '1234' for any email and fetch their actual DB person
                const lookupEmail = credentials.email.toLowerCase();
                const identifier = await db.orm.public.PersonIdentifier.where({ type: "EMAIL", normalizedValue: lookupEmail }).all().first();
                if (identifier) {
                  const dbPerson = await db.orm.public.Person.where({ id: identifier.personId }).all().first();
                  if (dbPerson) {
                    return { id: dbPerson.id, email: lookupEmail, name: `${dbPerson.firstName} ${dbPerson.lastName}` };
                  }
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
          const emailValue = (lookupEmail as string).toLowerCase();
          let identifier = await db.orm.public.PersonIdentifier.where({ type: "EMAIL", normalizedValue: emailValue }).all().first();
          let dbPerson;

          if (!identifier) {
            const firstName = user?.name?.split(' ')[0] ?? 'Unknown';
            const lastName = user?.name?.split(' ').slice(1).join(' ') || 'User';
            
            dbPerson = await db.orm.public.Person.create({
              firstName,
              lastName
            });

            identifier = await db.orm.public.PersonIdentifier.create({
              personId: dbPerson.id,
              type: "EMAIL",
              normalizedValue: emailValue,
              isVerified: true
            });
          } else {
            dbPerson = await db.orm.public.Person.where({ id: identifier.personId }).all().first();
          }

          if (dbPerson) {
            let account = await db.orm.public.Account.where({ personId: dbPerson.id }).all().first();
            if (!account) {
              account = await db.orm.public.Account.create({ personId: dbPerson.id, isActive: true });
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
      }
      return session;
    },
  },
  // If we want a custom sign-in page later, we define it here:
  // pages: {
  //   signIn: '/login',
  // }
};
