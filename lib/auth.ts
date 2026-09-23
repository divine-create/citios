import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import _CredentialsProvider from "next-auth/providers/credentials";
const CredentialsProvider = ((_CredentialsProvider as any).default || _CredentialsProvider) as typeof _CredentialsProvider;
import { db } from "@/src/prisma/db";
import { resolvePersonByEmail, findPersonByIdentifier } from "@/lib/identity";
import { verifyPassword } from "@/lib/password";
import type { OrgMembership } from "@/types/next-auth";

const hasGoogleAuth = !!(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID !== "mock-client-id" &&
  !process.env.GOOGLE_CLIENT_ID.includes("mock")
);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    ...(hasGoogleAuth
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const normalizedInput = credentials.email.trim();
        // Support finding user by either email or phone
        const dbPerson = await findPersonByIdentifier(normalizedInput);
        if (!dbPerson) {
          return null;
        }

        const account = await db.orm.public.Account
          .where({ personId: dbPerson.id })
          .all()
          .first();

        if (!account || !account.isActive || !account.passwordHash) {
          return null;
        }

        const isValid = await verifyPassword(credentials.password, account.passwordHash);
        if (!isValid) {
          return null;
        }

        // Get primary email for session/jwt, fallback to identifier if needed
        const emailIdent = await db.orm.public.PersonIdentifier
          .where({ personId: dbPerson.id, type: 'EMAIL' })
          .all()
          .first();

        const userEmail = emailIdent?.normalizedValue || `${dbPerson.id}@cityconnect.local`;

        return {
          id: dbPerson.id,
          email: userEmail,
          name: `${dbPerson.firstName} ${dbPerson.lastName}`.trim() || 'Resident',
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      const lookupEmail = user?.email || token?.email;
      if (lookupEmail && (user || trigger === "update")) {
        try {
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
                const org = organizations.find((o: any) => o.id === member.organizationId);
                
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
            token.onboardingComplete = residentProfile?.onboardingComplete ?? false;
          }
        } catch (error) {
          console.error("Error resolving RBAC roles:", error);
          token.role = token.role ?? "RESIDENT";
          token.memberships = token.memberships ?? [];
          token.isCourier = token.isCourier ?? false;
        }
      }

      // Refresh this flag for existing sessions as onboarding can be completed
      // after the JWT was issued. Middleware relies on it before rendering a
      // protected page such as /profile.
      if (!user && token.personId) {
        try {
          const residentProfile = await db.orm.public.ResidentProfile
            .where({ personId: token.personId as string })
            .all()
            .first();
          token.onboardingComplete = residentProfile?.onboardingComplete ?? false;
        } catch (error) {
          console.error("Error refreshing onboarding status:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.personId = token.personId as string | undefined;
        session.user.role = token.role;
        session.user.memberships = token.memberships ?? [];
        session.user.isCourier = !!token.isCourier;
        session.user.onboardingComplete = (token.onboardingComplete as boolean | undefined) ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Route all auth errors to /login to avoid Server Component render crash on /api/auth/error
  },
};
