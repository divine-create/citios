'use server';

import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

function compareTemporal(a: any, b: any) {
  try {
    if (a?.createdAt && b?.createdAt) {
      return (globalThis as any).Temporal.Instant.compare(b.createdAt, a.createdAt);
    }
  } catch {}
  return 0;
}

export interface UnifiedCourier {
  id: string;
  driverType: 'GIG' | 'PROVIDER';
  personId: string;
  name: string;
  providerId?: string;
  providerName?: string;
  vehicleType: string;
  licensePlate: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'SUSPENDED';
  rating: number;
  onboardingComplete?: boolean;
  createdAt: string;
}

export async function getHQFleetData(filters: {
  q?: string;
  status?: string;
  type?: string;
  page?: number;
} = {}) {
  await requireSystemAdmin();

  const [
    gigCouriers,
    logisticsDrivers,
    vehicles,
    allJobs,
  ] = await Promise.all([
    db.orm.public.GigWorkerProfile.include('person').all(),
    db.orm.public.LogisticsDriverProfile.include('person').include('provider').include('currentVehicle').all(),
    db.orm.public.LogisticsVehicle.all(),
    db.orm.public.DeliveryJob.include('provider').all(),
  ]);

  // Aggregate metrics
  let onlineCouriers = 0;
  let busyCouriers = 0;
  let offlineCouriers = 0;
  let suspendedCouriers = 0;

  const unifiedList: UnifiedCourier[] = [];

  // 1. Process Gig Couriers (CityDrive)
  for (const gig of gigCouriers) {
    const status: 'ONLINE' | 'OFFLINE' = gig.isOnline ? 'ONLINE' : 'OFFLINE';
    if (status === 'ONLINE') onlineCouriers++;
    else offlineCouriers++;

    unifiedList.push({
      id: gig.id,
      driverType: 'GIG',
      personId: gig.personId,
      name: gig.person ? `${gig.person.firstName} ${gig.person.lastName}`.trim() : 'Unknown Driver',
      vehicleType: gig.vehicleType || 'MOTORCYCLE',
      licensePlate: gig.licensePlate || 'N/A',
      status,
      rating: gig.rating || 5.0,
      createdAt: gig.createdAt?.toString?.() || '',
    });
  }

  // 2. Process Logistics Drivers (LogisticsOS Commercial Providers)
  for (const d of logisticsDrivers) {
    if (d.status === 'ONLINE') onlineCouriers++;
    else if (d.status === 'BUSY') busyCouriers++;
    else if (d.status === 'SUSPENDED') suspendedCouriers++;
    else offlineCouriers++;

    unifiedList.push({
      id: d.id,
      driverType: 'PROVIDER',
      personId: d.personId,
      name: d.person ? `${(d.person as any).firstName || ''} ${(d.person as any).lastName || ''}`.trim() : 'Unknown Driver',
      providerId: d.providerId,
      providerName: (d.provider as any)?.name ? String((d.provider as any).name) : 'Logistics Provider',
      vehicleType: (d.currentVehicle as any)?.type ? String((d.currentVehicle as any).type) : 'CAR',
      licensePlate: (d.currentVehicle as any)?.licensePlate ? String((d.currentVehicle as any).licensePlate) : 'Fleet Pool',
      status: d.status as any,
      rating: 5.0,
      onboardingComplete: d.onboardingComplete,
      createdAt: d.createdAt?.toString?.() || '',
    });
  }

  // Sort unified list newest first
  unifiedList.sort(compareTemporal);

  // Filter couriers
  let filteredCouriers = unifiedList;

  if (filters.q) {
    const qLower = filters.q.toLowerCase();
    filteredCouriers = filteredCouriers.filter(
      (c) =>
        c.name.toLowerCase().includes(qLower) ||
        c.licensePlate.toLowerCase().includes(qLower) ||
        (c.providerName && c.providerName.toLowerCase().includes(qLower)) ||
        c.personId.includes(qLower) ||
        c.id.includes(qLower)
    );
  }

  if (filters.status && filters.status !== 'ALL') {
    filteredCouriers = filteredCouriers.filter((c) => c.status === filters.status);
  }

  if (filters.type && filters.type !== 'ALL') {
    filteredCouriers = filteredCouriers.filter((c) => c.driverType === filters.type);
  }

  // Delivery Jobs metrics
  const activeJobsCount = allJobs.filter((j) =>
    ['REQUESTED', 'CREATED', 'DISPATCHED', 'ASSIGNED', 'AT_PICKUP', 'IN_TRANSIT', 'AT_DROPOFF'].includes(j.status)
  ).length;

  const completedJobsCount = allJobs.filter((j) =>
    ['DELIVERED', 'COMPLETED'].includes(j.status)
  ).length;

  // Recent jobs for the activity feed (newest 15)
  const recentJobs: Array<{
    id: string;
    trackingCode: string;
    providerName: string;
    sourceType: string;
    status: string;
    pickupAddress: string;
    dropoffAddress: string;
    fare: number;
    currency: string;
    createdAt: string;
  }> = [...allJobs]
    .sort(compareTemporal)
    .slice(0, 15)
    .map((j: any) => ({
      id: String(j.id),
      trackingCode: String(j.trackingCode || `TRK-${j.id.slice(0, 8)}`),
      providerName: String(j.provider?.name || 'CityOS Dispatch Pool'),
      sourceType: String(j.sourceType || 'MANUAL'),
      status: String(j.status || 'REQUESTED'),
      pickupAddress: String(j.pickupAddress || 'Calabar Central Distribution'),
      dropoffAddress: String(j.dropoffAddress || 'Destination Point'),
      fare: Number(j.estimatedFare || j.finalFare || 1500),
      currency: String(j.currency || 'NGN'),
      createdAt: j.createdAt?.toString?.() || '',
    }));

  const page = Math.max(1, filters.page || 1);
  const pageSize = 50;
  const paginatedCouriers = filteredCouriers.slice((page - 1) * pageSize, page * pageSize);

  return {
    metrics: {
      totalCouriers: unifiedList.length,
      onlineCouriers,
      busyCouriers,
      offlineCouriers,
      suspendedCouriers,
      totalVehicles: vehicles.length,
      activeJobsCount,
      completedJobsCount,
      totalJobsCount: allJobs.length,
    },
    couriers: paginatedCouriers,
    totalFilteredCouriers: filteredCouriers.length,
    currentPage: page,
    totalPages: Math.ceil(filteredCouriers.length / pageSize),
    recentJobs,
  };
}

export async function setDriverStatus(
  driverId: string,
  newStatus: 'ONLINE' | 'OFFLINE' | 'SUSPENDED'
) {
  await requireSystemAdmin();
  const session = await getServerSession(authOptions);
  const actorPersonId = session?.user?.personId || 'system';

  try {
    const driver = await db.orm.public.LogisticsDriverProfile.where({ id: driverId }).all().first();
    if (!driver) {
      return { error: 'Driver profile not found' };
    }

    await db.transaction(async (tx) => {
      await tx.orm.public.LogisticsDriverProfile.where({ id: driverId }).update({
        status: newStatus as any,
      });

      await tx.orm.public.HQAuditEvent.create({
        actorPersonId: actorPersonId!,
        action: 'DRIVER_STATUS_UPDATED',
        targetType: 'LogisticsDriverProfile',
        targetId: driverId,
        metadata: {
          previousStatus: driver.status,
          newStatus,
          providerId: driver.providerId,
        },
      });
    });

    revalidatePath('/hq/fleet');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update driver status' };
  }
}
