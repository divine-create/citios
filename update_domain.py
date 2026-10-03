import re

def modify_domain():
    with open('lib/actions/logistics-domain.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix Idempotency
    old_create = """export async function createDeliveryJob(params: {
  providerId: string;
  sourceType: any;
  sourceId: string;
  idempotencyKey: string;
  dropoffAddress: string;
}) {
  return await db.transaction(async (tx) => {
    const existing = await tx.DeliveryJob.findUnique({
      where: {
        providerId_idempotencyKey: {
          providerId: params.providerId,
          idempotencyKey: params.idempotencyKey,
        },
      },
    });

    if (existing) {
      if (existing.sourceType !== params.sourceType || existing.sourceId !== params.sourceId) {
        throw new LogisticsDomainError('Idempotency conflict: Different payload provided for same key');
      }
      return existing; // Return safely on identical request
    }

    return await tx.DeliveryJob.create({
      data: {
        providerId: params.providerId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        idempotencyKey: params.idempotencyKey,
        dropoffAddress: params.dropoffAddress,
        status: 'REQUESTED',
      },
    });
  });
}"""
    
    new_create = """export async function createDeliveryJob(params: {
  providerId: string;
  sourceType: any;
  sourceId: string;
  idempotencyKey: string;
  dropoffAddress: string;
}) {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx.DeliveryJob.findUnique({
        where: {
          providerId_idempotencyKey: {
            providerId: params.providerId,
            idempotencyKey: params.idempotencyKey,
          },
        },
      });

      if (existing) {
        if (existing.sourceType !== params.sourceType || existing.sourceId !== params.sourceId) {
          throw new LogisticsDomainError('Idempotency conflict: Different payload provided for same key');
        }
        return existing;
      }

      return await tx.DeliveryJob.create({
        data: {
          providerId: params.providerId,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          idempotencyKey: params.idempotencyKey,
          dropoffAddress: params.dropoffAddress,
          status: 'REQUESTED',
        },
      });
    });
  } catch (error: any) {
    if (error.code === 'P2002' || error.message?.includes('Unique constraint failed') || error.code?.includes('23505') || error.name === 'PrismaClientKnownRequestError') {
      // Race condition hit: concurrent create with same key
      const existing = await db.orm.public.DeliveryJob.findUnique({
        where: {
          providerId_idempotencyKey: {
            providerId: params.providerId,
            idempotencyKey: params.idempotencyKey,
          },
        },
      });
      if (existing) {
        if (existing.sourceType !== params.sourceType || existing.sourceId !== params.sourceId) {
          throw new LogisticsDomainError('Idempotency conflict: Different payload provided for same key');
        }
        return existing;
      }
    }
    throw error;
  }
}"""
    content = content.replace(old_create, new_create)

    # 2. Fix assignDelivery
    old_assign = """export async function assignDelivery(params: {
  deliveryJobId: string;
  driverProfileId: string;
  vehicleId?: string;
  providerId: string;
}) {
  return await db.transaction(async (tx) => {
    const job = await tx.DeliveryJob.findUnique({ where: { id: params.deliveryJobId } });
    if (!job) throw new LogisticsDomainError('DeliveryJob not found');

    if (job.providerId !== params.providerId) {
      throw new LogisticsDomainError('Provider isolation violation: Job does not belong to provider');
    }

    const driver = await tx.LogisticsDriverProfile.findUnique({ where: { id: params.driverProfileId } });
    if (!driver) throw new LogisticsDomainError('Driver not found');
    
    if (driver.providerId !== params.providerId) {
      throw new LogisticsDomainError('Provider isolation violation: Driver does not belong to provider');
    }

    if (params.vehicleId) {
      const vehicle = await tx.LogisticsVehicle.findUnique({ where: { id: params.vehicleId } });
      if (!vehicle) throw new LogisticsDomainError('Vehicle not found');
      if (vehicle.providerId !== params.providerId) {
        throw new LogisticsDomainError('Provider isolation violation: Vehicle does not belong to provider');
      }
    }

    // Check for concurrency: One active assignment per job
    const activeJobAssignments = await tx.DeliveryAssignment.findMany({
      where: {
        deliveryJobId: params.deliveryJobId,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });

    if (activeJobAssignments.length > 0) {
      throw new LogisticsDomainError('Concurrency error: Job already has an active assignment');
    }

    // Check for concurrency: One active assignment per driver
    const activeDriverAssignments = await tx.DeliveryAssignment.findMany({
      where: {
        driverProfileId: params.driverProfileId,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });

    if (activeDriverAssignments.length > 0) {
      throw new LogisticsDomainError('Concurrency error: Driver already has an active assignment');
    }

    // Create the assignment
    const assignment = await tx.DeliveryAssignment.create({
      data: {
        deliveryJobId: params.deliveryJobId,
        driverProfileId: params.driverProfileId,
        vehicleId: params.vehicleId,
        status: 'PENDING',
      },
    });

    // Optionally update job status to ASSIGNED if needed, but transition logic should be used.
    // We will leave transition to be explicitly called, or do it here:
    // await tx.DeliveryJob.update({ where: { id: params.deliveryJobId }, data: { status: 'ASSIGNED' } });

    return assignment;
  });
}"""

    new_assign = """export async function assignDelivery(params: {
  deliveryJobId: string;
  driverProfileId: string;
  vehicleId?: string;
  providerId: string;
}) {
  return await db.transaction(async (tx) => {
    // 1. Lock the parent entities to serialize concurrent requests and prevent races
    const job = await tx.DeliveryJob.update({
      where: { id: params.deliveryJobId },
      data: { status: { set: undefined } } // Dummy update to lock the row in Postgres
    });
    if (!job) throw new LogisticsDomainError('DeliveryJob not found');

    const driver = await tx.LogisticsDriverProfile.update({
      where: { id: params.driverProfileId },
      data: { personId: { set: undefined } } // Dummy update to lock
    });
    if (!driver) throw new LogisticsDomainError('Driver not found');

    let vehicle = null;
    if (params.vehicleId) {
      vehicle = await tx.LogisticsVehicle.update({
        where: { id: params.vehicleId },
        data: { status: { set: undefined } } // Dummy update to lock
      });
      if (!vehicle) throw new LogisticsDomainError('Vehicle not found');
    }

    // 2. Provider isolation checks
    if (job.providerId !== params.providerId) {
      throw new LogisticsDomainError('Provider isolation violation: Job does not belong to provider');
    }
    if (driver.providerId !== params.providerId) {
      throw new LogisticsDomainError('Provider isolation violation: Driver does not belong to provider');
    }
    if (vehicle && vehicle.providerId !== params.providerId) {
      throw new LogisticsDomainError('Provider isolation violation: Vehicle does not belong to provider');
    }
    if (vehicle && vehicle.status !== 'ACTIVE') {
      throw new LogisticsDomainError('Vehicle not available');
    }

    // 3. Concurrency checks: One active assignment per job
    const activeJobAssignments = await tx.DeliveryAssignment.findMany({
      where: {
        deliveryJobId: params.deliveryJobId,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });
    if (activeJobAssignments.length > 0) {
      throw new LogisticsDomainError('Concurrency error: Job already has an active assignment');
    }

    // Check for concurrency: One active assignment per driver
    const activeDriverAssignments = await tx.DeliveryAssignment.findMany({
      where: {
        driverProfileId: params.driverProfileId,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });
    if (activeDriverAssignments.length > 0) {
      throw new LogisticsDomainError('Concurrency error: Driver already has an active assignment');
    }

    // Check for concurrency: One active assignment per vehicle
    if (params.vehicleId) {
      const activeVehicleAssignments = await tx.DeliveryAssignment.findMany({
        where: {
          vehicleId: params.vehicleId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
      });
      if (activeVehicleAssignments.length > 0) {
        throw new LogisticsDomainError('Concurrency error: Vehicle already has an active assignment');
      }
    }

    // 4. Create the assignment
    return await tx.DeliveryAssignment.create({
      data: {
        deliveryJobId: params.deliveryJobId,
        driverProfileId: params.driverProfileId,
        vehicleId: params.vehicleId,
        status: 'PENDING',
      },
    });
  });
}"""
    content = content.replace(old_assign, new_assign)

    with open('lib/actions/logistics-domain.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    modify_domain()
