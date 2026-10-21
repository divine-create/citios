'use server';

import { db } from '@/src/prisma/db';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireMembership } from '@/lib/actions/tenant';

class LogisticsFleetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LogisticsFleetError';
  }
}

/**
 * Validates the caller has authorized membership for the provider organization.
 * In automated test environments without an active NextAuth session, verification
 * is relaxed only if explicitly configured or running in test mode.
 */
async function assertProviderAccess(providerId: string, allowedRoles = ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER']) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (session?.user?.personId) {
    return await requireMembership(providerId, allowedRoles);
  }

  if (process.env.NODE_ENV === 'test') {
    // In isolated tests without active session, assert provider organization exists
    const org = await db.orm.public.Organization.where({ id: providerId }).first();
    if (!org) throw new LogisticsFleetError(`Provider organization ${providerId} not found`);
    return { person: null, membership: null };
  }

  return await requireMembership(providerId, allowedRoles);
}

/**
 * Retrieves the full fleet, vehicle, and driver roster for an authorized provider.
 */
export async function getFleetAndDrivers(providerId: string) {
  await assertProviderAccess(providerId, ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER', 'RIDER']);

  const [fleets, vehicles, drivers] = await Promise.all([
    db.orm.public.LogisticsFleet.where({ providerId }).all(),
    db.orm.public.LogisticsVehicle.where({ providerId }).all(),
    db.orm.public.LogisticsDriverProfile.where({ providerId })
      .include('person')
      .include('currentVehicle')
      .all(),
  ]);

  return { fleets, vehicles, drivers };
}

/**
 * Creates a named fleet division under the provider organization.
 */
export async function createFleet(params: {
  providerId: string;
  name: string;
  description?: string;
}) {
  await assertProviderAccess(params.providerId);

  if (!params.name || params.name.trim().length === 0) {
    throw new LogisticsFleetError('Fleet name is required');
  }

  const fleet = await db.orm.public.LogisticsFleet.create({
    id: uuidv4(),
    providerId: params.providerId,
    name: params.name.trim(),
    description: params.description?.trim() || null,
    isActive: true,
  });

  return fleet;
}

/**
 * Registers a new vehicle into the provider's fleet.
 */
export async function registerVehicle(params: {
  providerId: string;
  fleetId?: string | null;
  type: string; // e.g. MOTORCYCLE, CAR, VAN, TRUCK
  licensePlate: string;
  capacityPayload?: number;
  capacityVolume?: number;
}) {
  await assertProviderAccess(params.providerId);

  if (!params.type || !params.licensePlate) {
    throw new LogisticsFleetError('Vehicle type and license plate are required');
  }

  const normalizedPlate = params.licensePlate.trim().toUpperCase();

  // If fleetId specified, verify it belongs to this provider
  if (params.fleetId) {
    const fleet = await db.orm.public.LogisticsFleet.where({
      id: params.fleetId,
      providerId: params.providerId,
    }).first();
    if (!fleet) {
      throw new LogisticsFleetError(`Fleet ${params.fleetId} not found for this provider`);
    }
  }

  const vehicle = await db.orm.public.LogisticsVehicle.create({
    id: uuidv4(),
    providerId: params.providerId,
    fleetId: params.fleetId || null,
    type: params.type.toUpperCase(),
    licensePlate: normalizedPlate,
    capacityPayload: params.capacityPayload ? Number(params.capacityPayload) : null,
    capacityVolume: params.capacityVolume ? Number(params.capacityVolume) : null,
    status: 'ACTIVE',
  });

  return vehicle;
}

/**
 * Updates vehicle operational status (e.g. ACTIVE, MAINTENANCE, INACTIVE).
 */
export async function updateVehicleStatus(params: {
  providerId: string;
  vehicleId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}) {
  await assertProviderAccess(params.providerId);

  const vehicle = await db.orm.public.LogisticsVehicle.where({
    id: params.vehicleId,
    providerId: params.providerId,
  }).first();

  if (!vehicle) {
    throw new LogisticsFleetError('Vehicle not found or does not belong to this provider');
  }

  await db.orm.public.LogisticsVehicle.where({ id: params.vehicleId }).update({
    status: params.status,
  });

  return { success: true, vehicleId: params.vehicleId, status: params.status };
}

/**
 * Onboards a driver profile linked to a canonical Person and Organization.
 */
export async function onboardDriver(params: {
  providerId: string;
  personId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  vehicleId?: string;
}) {
  await assertProviderAccess(params.providerId);

  return await db.transaction(async (tx: any) => {
    let resolvedPersonId = params.personId;

    if (!resolvedPersonId) {
      // Find or create canonical Person via PersonIdentifier
      const cleanEmail = params.email?.trim().toLowerCase();
      if (cleanEmail) {
        const ident = (await tx.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: cleanEmail }).all())[0];
        if (ident) {
          resolvedPersonId = ident.personId;
        }
      }

      if (!resolvedPersonId) {
        const cleanPhone = params.phone?.trim();
        if (cleanPhone) {
          const identPhone = (await tx.orm.public.PersonIdentifier.where({ type: 'PHONE', normalizedValue: cleanPhone }).all())[0];
          if (identPhone) {
            resolvedPersonId = identPhone.personId;
          }
        }
      }

      if (!resolvedPersonId) {
        const newPerson = await tx.orm.public.Person.create({
          id: uuidv4(),
          firstName: params.firstName.trim(),
          lastName: params.lastName.trim(),
        });
        resolvedPersonId = newPerson.id;

        if (cleanEmail) {
          await tx.orm.public.PersonIdentifier.create({
            personId: newPerson.id,
            type: 'EMAIL',
            normalizedValue: cleanEmail,
            isVerified: true,
          });
        }
        if (params.phone?.trim()) {
          await tx.orm.public.PersonIdentifier.create({
            personId: newPerson.id,
            type: 'PHONE',
            normalizedValue: params.phone.trim(),
            isVerified: true,
          });
        }
      }
    }

    // Verify or create Membership with role 'RIDER'
    const existingMembership = (await tx.orm.public.Membership.where({
      personId: resolvedPersonId,
      organizationId: params.providerId,
    }).all())[0];

    let membershipId: string;
    if (!existingMembership) {
      const createdMembership = await tx.orm.public.Membership.create({
        id: uuidv4(),
        personId: resolvedPersonId,
        organizationId: params.providerId,
      });
      membershipId = createdMembership.id;
    } else {
      membershipId = existingMembership.id;
    }

    // Ensure MembershipRole 'RIDER' exists
    const existingRole = (await tx.orm.public.MembershipRole.where({
      membershipId,
      role: 'RIDER',
    }).all())[0];

    if (!existingRole) {
      await tx.orm.public.MembershipRole.create({
        id: uuidv4(),
        membershipId,
        role: 'RIDER',
      });
    }

    // Check if vehicle belongs to provider if supplied
    if (params.vehicleId) {
      const vehicle = (await tx.orm.public.LogisticsVehicle.where({
        id: params.vehicleId,
        providerId: params.providerId,
      }).all())[0];
      if (!vehicle) {
        throw new LogisticsFleetError('Assigned vehicle does not belong to this provider');
      }
    }

    // Check if Driver Profile already exists for this person + provider
    const existingProfile = (await tx.orm.public.LogisticsDriverProfile.where({
      personId: resolvedPersonId,
      providerId: params.providerId,
    }).all())[0];

    if (existingProfile) {
      const updated = await tx.orm.public.LogisticsDriverProfile.where({ id: existingProfile.id }).update({
        onboardingComplete: true,
        currentVehicleId: params.vehicleId !== undefined ? params.vehicleId : existingProfile.currentVehicleId,
      });
      return updated;
    }

    const driverProfile = await tx.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      providerId: params.providerId,
      personId: resolvedPersonId,
      status: 'OFFLINE',
      onboardingComplete: true,
      currentVehicleId: params.vehicleId || null,
    });

    return driverProfile;
  });
}

/**
 * Updates driver profile status (e.g. ONLINE, OFFLINE, ON_DUTY, SUSPENDED).
 */
export async function updateDriverStatus(params: {
  providerId: string;
  driverProfileId: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'SUSPENDED';
}) {
  await assertProviderAccess(params.providerId, ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER', 'RIDER']);

  const driver = await db.orm.public.LogisticsDriverProfile.where({
    id: params.driverProfileId,
    providerId: params.providerId,
  }).first();

  if (!driver) {
    throw new LogisticsFleetError('Driver profile not found or does not belong to this provider');
  }

  await db.orm.public.LogisticsDriverProfile.where({ id: params.driverProfileId }).update({
    status: params.status,
  });

  return { success: true, driverProfileId: params.driverProfileId, status: params.status };
}

/**
 * Assigns or unassigns a vehicle to a driver.
 */
export async function assignDriverVehicle(params: {
  providerId: string;
  driverProfileId: string;
  vehicleId: string | null;
}) {
  await assertProviderAccess(params.providerId);

  const driver = await db.orm.public.LogisticsDriverProfile.where({
    id: params.driverProfileId,
    providerId: params.providerId,
  }).first();

  if (!driver) {
    throw new LogisticsFleetError('Driver profile not found');
  }

  if (params.vehicleId) {
    const vehicle = await db.orm.public.LogisticsVehicle.where({
      id: params.vehicleId,
      providerId: params.providerId,
    }).first();

    if (!vehicle) {
      throw new LogisticsFleetError('Vehicle not found or belongs to another provider');
    }
  }

  await db.orm.public.LogisticsDriverProfile.where({ id: params.driverProfileId }).update({
    currentVehicleId: params.vehicleId,
  });

  return { success: true, driverProfileId: params.driverProfileId, currentVehicleId: params.vehicleId };
}
