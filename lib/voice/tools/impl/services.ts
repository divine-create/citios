import { VoiceToolDefinition } from '../../core/policy';
import { db } from '@/src/prisma/db';
import { requestServiceJob, fetchMyServiceJobs } from '@/app/actions/service';
import { getVoiceContext, updateVoiceContext, pushRecentEntity } from '../../core/context';


export const searchServices: VoiceToolDefinition = {
  name: 'search_services',
  description: 'Search for available CityOS services (e.g. plumbers, streetlights).',
  domain: 'services',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The service to search for." }
    }
  },
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
  domain: 'services',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: { type: "object", properties: {} },
  execute: async (args, session) => {
    const jobs = await fetchMyServiceJobs();
    return { ok: true, data: jobs.slice(0, 5) };
  }
};

export const prepareServiceRequest: VoiceToolDefinition = {
  name: 'prepare_service_request',
  description: 'Prepares a service request. Collects notes/details before confirmation.',
  domain: 'services',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      service_id: { type: "string", description: "Optional. The service ID." },
      notes: { type: "string", description: "Optional notes for the service professional." }
    }
  },
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

    const { startWorkflow } = await import('../../core/context');
    await startWorkflow(session.user.personId, confirmationId, {
      workflowId: confirmationId,
      action: 'confirm_service_request',
      domain: 'services',
      confirmationId: confirmationId,
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
      contextData: { pendingServiceNotes: args.notes || '', pendingServiceId: serviceId }
    });
    
    await updateVoiceContext(session.user.personId, {
      taskState: { status: 'AWAITING_CONFIRMATION', currentWorkflowId: confirmationId }
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
  domain: 'services',
  riskLevel: 'irreversible',
  requiresConfirmation: true,
  requiresAuthentication: true,
  orchestrationEligible: false,
  inputSchema: {
    type: "object",
    properties: {
      confirmation_id: { type: "string", description: "Optional. The confirmation ID." }
    }
  },
  execute: async (args, session) => {
    const { endWorkflow } = await import('../../core/context');
    const ctx = await getVoiceContext(session.user.personId);
    let confirmationId = args.confirmation_id;

    let workflow = null;
    if (!confirmationId && ctx.activeWorkflows) {
      for (const key of Object.keys(ctx.activeWorkflows)) {
        if (ctx.activeWorkflows[key].action === 'confirm_service_request') {
          confirmationId = ctx.activeWorkflows[key].confirmationId;
          workflow = ctx.activeWorkflows[key];
          break;
        }
      }
    } else if (confirmationId && ctx.activeWorkflows) {
       workflow = ctx.activeWorkflows[confirmationId];
    }

    if (!confirmationId || !workflow) {
      return { ok: false, error: { code: 'INVALID_CONFIRMATION', message: 'Invalid or expired confirmation ID.' } };
    }

    // ATOMIC CONSUMPTION to prevent race conditions for activeWorkflows
    const plan = db.raw.sql`
      UPDATE "VoiceContext"
      SET data = jsonb_set(data, '{activeWorkflows}', (data->'activeWorkflows') - ${confirmationId}::text)
      WHERE "personId" = ${session.user.personId}
        AND data->'activeWorkflows' ? ${confirmationId}
    `.affectedCount().build();
    const consume = await db.runtime().execute(plan);
    
    if (consume.affectedRows === 0) {
      return { ok: false, error: { code: 'INVALID_CONFIRMATION', message: 'Confirmation already processed or invalid.' } };
    }

    const serviceId = workflow.contextData?.pendingServiceId;
    const notes = workflow.contextData?.pendingServiceNotes;

    if (!serviceId) return { ok: false, error: { code: 'INVALID_STATE', message: 'No pending service found in context.' } };

    // Use existing server action to execute
    const res = await requestServiceJob({ serviceId, notes });

    await updateVoiceContext(session.user.personId, {
      taskState: { status: 'COMPLETED' }
    });

    return { ok: true, data: { message: 'Service request submitted successfully.', reference: res.jobId.split('-')[0].toUpperCase() } };
  }
};
