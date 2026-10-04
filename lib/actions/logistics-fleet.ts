import { db } from '@/src/prisma/db';

export async function getFleetAndDrivers(providerId: string) {
  const vehicles = await db.orm.public.LogisticsVehicle.where({ providerId }).all();
  
  const drivers = await db.orm.public.LogisticsDriverProfile.where({ providerId }).include({ person: true, currentVehicle: true } as any).all();

  return { vehicles, drivers };
}
