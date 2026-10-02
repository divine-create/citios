const fs = require('fs');
const file = 'lib/actions/logistics-operations.ts';
let content = fs.readFileSync(file, 'utf8');

const target = "    const { job, assignment } = await authorizeAndGetAssignment(tx, params.deliveryJobId, params.providerId, params.driverProfileId);";
const replacement = "    try {\n      const { job, assignment } = await authorizeAndGetAssignment(tx, params.deliveryJobId, params.providerId, params.driverProfileId);";

const targetEnd = "    return { event, job: updatedJob };\n  });";
const replacementEnd = "    return { event, job: updatedJob };\n    } catch (e: any) {\n      if (params.idempotencyKey) {\n        // Re-read to see if another transaction completed it\n        const existingEvents = await db.orm.public.DeliveryTrackingEvent.where({\n          providerId: params.providerId,\n          deliveryJobId: params.deliveryJobId,\n          idempotencyKey: params.idempotencyKey\n        }).all();\n        if (existingEvents.length > 0) {\n          const existingJobs = await db.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();\n          return { event: existingEvents[0], job: existingJobs[0] };\n        }\n      }\n      throw e;\n    }\n  });";

content = content.replace(target, replacement).replace(targetEnd, replacementEnd);
fs.writeFileSync(file, content);
