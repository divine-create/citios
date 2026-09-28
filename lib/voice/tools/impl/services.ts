import { VoiceToolDefinition } from '../../policy';
import { db } from '@/src/prisma/db';
import { requestServiceJob, fetchMyServiceJobs } from '@/app/actions/service';
import { getVoiceContext, updateVoiceContext, pushRecentEntity } from '../../context/manager';


export const searchServices: VoiceToolDefinition = {
  name: 'search_services',
  description: 'Search for available CityOS services (e.g. plumbers, streetlights).',
  riskLevel: 'read',
  requiresConfirmation: false,
  execute: async (args, session) => {
    const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';
    
    // We fetch from ServiceCatalogItem
    const services = await db.orm.public.ServiceCatalogItem.all();
    
    const filtered = query ? services.filter((s: any) => 
      s.name.toLowerCase().includes(query) || 
      (s.description || '').toLowerCase().includes(query)
    ) : services;

    const data = filtered.slice(0, 5).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      basePrice: s.basePrice
    }));

    if (data.length > 0) {
      await pushRecentEntity(session.user.personId, {
        type: 'SERVICE',
        id: data[0].id,
        label: data[0].name
      });
    }

    return { ok: true, data };
  }
};

export const getMyServiceRequests: VoiceToolDefinition = {
  name: 'get_my_service_requests',
  description: 'View the resident\'s service requests.',
  riskLevel: 'read',
  requiresConfirmation: false,
  execute: async (args, session) => {
    const jobs = await fetchMyServiceJobs();
    return { ok: true, data: jobs.slice(0, 5) };
  }
};

export const prepareServiceRequest: VoiceToolDefinition = {
  name: 'prepare_service_request',
  description: 'Prepares a service request. Collects notes/details before confirmation.',
  riskLevel: 'read',
  requiresConfirmation: false,
  execute: async (args, session) => {
    let serviceId = args.service_id;
    if (!serviceId) {
      const ctx = await getVoiceContext(session.user.personId);
      if (ctx.recentEntities && ctx.recentEntities.length > 0) {
        const srv = ctx.recentEntities.find(e => e.type === 'SERVICE');
        if (srv) serviceId = srv.id;
      }
    }

    if (!serviceId) return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'Service ID is required.' } };

    const service = await db.orm.public.ServiceCatalogItem.where({ id: serviceId }).all().first();
    if (!service) return { ok: false, error: { code: 'NOT_FOUND', message: 'Service not found.' } };

    const confirmationId = crypto.randomUUID();

    await updateVoiceContext(session.user.personId, {
      pendingAction: {
        action: 'confirm_service_request',
        confirmationId: confirmationId,
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString()
      },
      // Note: we'll cast via any since we didn't add these specific fields to VoiceContextData strictly
      ...({ pendingServiceNotes: args.notes || '', pendingServiceId: serviceId } as any)
    });

    return { 
      ok: true, 
      data: {
        confirmationId,
        serviceName: service.name,
        instruction: `Summarize the request ("${service.name}" with notes "${args.notes || 'none'}") and ask for explicit confirmation.`
      }
    };
  }
};

export const confirmServiceRequest: VoiceToolDefinition = {
  name: 'confirm_service_request',
  description: 'Confirms and actually submits the service request.',
  riskLevel: 'irreversible',
  requiresConfirmation: true,
  execute: async (args, session) => {
    const ctx = await getVoiceContext(session.user.personId);
    let confirmationId = args.confirmation_id;

    if (!confirmationId && ctx.pendingAction?.action === 'confirm_service_request') {
      confirmationId = ctx.pendingAction.confirmationId;
    }

    if (!confirmationId || ctx.pendingAction?.confirmationId !== confirmationId) {
      return { ok: false, error: { code: 'INVALID_CONFIRMATION', message: 'Invalid or expired confirmation ID.' } };
    }

    // ATOMIC CONSUMPTION to prevent race conditions
    // If two concurrent requests hit this, only one will successfully clear the pendingAction.
    const plan = db.raw.sql`
      UPDATE "VoiceContext"
      SET data = data - 'pendingAction' - 'pendingServiceId' - 'pendingServiceNotes'
      WHERE "personId" = ${session.user.personId}
        AND data->'pendingAction'->>'confirmationId' = ${confirmationId}
      RETURNING id;
    `;
    const consume = await db.runtime().execute(plan);
    
    if (!consume || consume.length === 0) {
      return { ok: false, error: { code: 'INVALID_CONFIRMATION', message: 'Confirmation already processed or invalid.' } };
    }

    const srvCtx = ctx as any;
    const serviceId = srvCtx.pendingServiceId;
    const notes = srvCtx.pendingServiceNotes;

    if (!serviceId) return { ok: false, error: { code: 'INVALID_STATE', message: 'No pending service found in context.' } };

    // Use existing server action to execute
    const res = await requestServiceJob({ serviceId, notes });

    return { ok: true, data: { message: 'Service request submitted successfully.', reference: res.jobId.split('-')[0].toUpperCase() } };
  }
};
