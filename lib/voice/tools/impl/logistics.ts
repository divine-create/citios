import { VoiceToolDefinition } from '../../core/policy';
import { getMyDeliveries } from '@/app/actions/logistics';
import { getVoiceContext, pushRecentEntity } from '../../core/context';

export const listMyDeliveries: VoiceToolDefinition = {
  name: 'logistics.list_deliveries', aliases: ['list_my_deliveries'],
  description: "Lists the resident's ongoing or past deliveries and shipments.",
  domain: 'logistics',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {}
  },
  execute: async (args, session) => {
    const deliveries = await getMyDeliveries();
    return { 
      ok: true, 
      data: deliveries.map((d: any) => ({
        id: d.id,
        status: d.status,
        restaurantName: d.restaurantName,
        dropoffAddress: d.dropoffAddress,
        driverName: d.driverName
      })) 
    };
  }
};

export const getDeliveryStatus: VoiceToolDefinition = {
  name: 'logistics.get_delivery_status', aliases: ['get_delivery_status'],
  description: 'Track or check the exact status, ETA, and driver of a specific delivery.',
  domain: 'logistics',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      delivery_id: { type: "string", description: "Optional. The ID of the delivery to track." }
    }
  },
  execute: async (args, session) => {
    let deliveryId = args.delivery_id;

    if (!deliveryId) {
      const deliveries = await getMyDeliveries();
      // Try to find the most recent active one
      const active = deliveries.find((d: any) => d.status !== 'DELIVERED');
      if (active) deliveryId = active.id;
      else if (deliveries.length > 0) deliveryId = deliveries[0].id;
    }

    if (!deliveryId) {
       return { ok: false, error: { code: 'NOT_FOUND', message: 'No active deliveries found.' } };
    }

    // Verify it actually belongs to them
    const deliveries = await getMyDeliveries();
    const delivery = deliveries.find((d: any) => d.id === deliveryId);

    if (!delivery) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Delivery not found or access denied.' } };
    }

    return { 
      ok: true, 
      data: {
        id: delivery.id,
        status: delivery.status,
        restaurantName: delivery.restaurantName,
        dropoffAddress: delivery.dropoffAddress,
        driverName: delivery.driverName,
        message: `The authoritative status is ${delivery.status}. Driver is ${delivery.driverName}. ETA unavailable natively.`
      } 
    };
  }
};
