import type { DefaultSession } from 'next-auth';

export type OrgType =
  | 'GOVERNMENT'
  | 'SCHOOL'
  | 'HEALTHCARE'
  | 'RETAIL'
  | 'RESTAURANT'
  | 'REAL_ESTATE'
  | 'SERVICES'
  | 'LOGISTICS'
  | 'HOTEL'
  | 'EVENT_ORGANIZER'
  | 'PUBLISHER'
  | 'PHARMACY';

export type OrgRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'TEACHER' | 'DOCTOR' | 'ADMIN' | 'FINANCE' | 'REGISTRAR' | 'COUNSELOR';

export interface OrgMembership {
  organizationId: string;
  organizationType: OrgType;
  role: OrgRole;
}

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      userId?: string;
      role?: 'RESIDENT' | 'PROVIDER' | 'COURIER';
      memberships?: OrgMembership[];
      isCourier?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    role?: 'RESIDENT' | 'PROVIDER' | 'COURIER';
    memberships?: OrgMembership[];
    isCourier?: boolean;
  }
}
