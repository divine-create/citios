const fs = require('fs');
let c = fs.readFileSync('lib/actions/logistics-operations.ts', 'utf8');

const newComplete = `export async function completeDelivery(params: { 
  deliveryJobId: string; 
  providerId: string; 
  driverProfileId: string; 
  type: string;
  evidenceUrl?: string;
  recipientName?: string;
  notes?: string;
  idempotencyKey?: string; 
  latitude?: number; 
  longitude?: number; 
}) {
  return await db.transaction(async (tx: any) => {
    if (params.idempotencyKey) {
      const existingEvents = await tx.orm.public.DeliveryTrackingEvent.where({
        providerId: params.providerId,
        deliveryJobId: params.deliveryJobId,
        idempotencyKey: params.idempotencyKey
      }).all();
      const existingEvent = existingEvents[0];
      
      if (existingEvent) {
        // Idempotent return
        const existingJobs = await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
        const existingPods = await tx.orm.public.ProofOfDelivery.where({ providerId: params.providerId, idempotencyKey: params.idempotencyKey }).all();
        return { event: existingEvent, job: existingJobs[0], proofOfDelivery: existingPods[0] };
      }
    }

    try {
      const { job, assignment } = await authorizeAndGetAssignment(tx, params.deliveryJobId, params.providerId, params.driverProfileId);

      if (job.status !== 'AT_DROPOFF') {
        throw new LogisticsDomainError(\`Cannot perform DELIVERED from state \${job.status}\`);
      }

      // Check duplicate POD
      const existingPod = await tx.orm.public.ProofOfDelivery.where({ deliveryJobId: params.deliveryJobId }).all();
      if (existingPod.length > 0) {
        throw new LogisticsDomainError('Proof of Delivery already exists for this DeliveryJob');
      }

      // 1. Create ProofOfDelivery
      const pod = await tx.orm.public.ProofOfDelivery.create({
        deliveryJobId: params.deliveryJobId,
        providerId: params.providerId,
        idempotencyKey: params.idempotencyKey,
        type: params.type,
        evidenceUrl: params.evidenceUrl,
        recipientName: params.recipientName,
        notes: params.notes,
        latitude: params.latitude,
        longitude: params.longitude
      });

      // 2. State transition
      const updatedJob = await transitionDeliveryStatus(params.deliveryJobId, 'DELIVERED', params.providerId, tx);

      // 3. Create tracking event
      const event = await tx.orm.public.DeliveryTrackingEvent.create({
        deliveryJobId: params.deliveryJobId,
        eventType: 'DELIVERED',
        providerId: params.providerId,
        driverProfileId: assignment.driverProfileId,
        idempotencyKey: params.idempotencyKey,
        latitude: params.latitude,
        longitude: params.longitude,
        notes: params.notes || 'Delivery completed with Proof of Delivery',
        recordedAt: toTemporal(new Date())
      });

      return { event, job: updatedJob, proofOfDelivery: pod };

    } catch (e: any) {
      if (params.idempotencyKey) {
        const existingEvents = await db.orm.public.DeliveryTrackingEvent.where({
          providerId: params.providerId,
          deliveryJobId: params.deliveryJobId,
          idempotencyKey: params.idempotencyKey
        }).all();
        if (existingEvents.length > 0) {
           const existingJobs = await db.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
           const existingPods = await db.orm.public.ProofOfDelivery.where({ providerId: params.providerId, idempotencyKey: params.idempotencyKey }).all();
           return { event: existingEvents[0], job: existingJobs[0], proofOfDelivery: existingPods[0] };
        }
      }
      throw e;
    }
  });
}`;

c = c.replace(/export async function completeDelivery\([\s\S]*?\n  \}/, newComplete);
fs.writeFileSync('lib/actions/logistics-operations.ts', c);
