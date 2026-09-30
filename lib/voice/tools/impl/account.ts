import { VoiceToolDefinition } from '../../core/policy';
import { db } from '@/src/prisma/db';
import { fetchMyOrders } from '@/app/actions/orders';
import { getVoiceContext, pushRecentEntity } from '../../core/context';

export const getProfile: VoiceToolDefinition = {
  name: 'account.get_profile', aliases: ['get_profile'],
  description: 'Get resident profile and interests.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: { type: "object", properties: {} },
  execute: async (args, session) => {
    const person = await db.orm.public.Person.where({ id: session.user.personId }).all().first();
    const profile = await db.orm.public.ResidentProfile.where({ personId: session.user.personId }).all().first();

    if (!person) return { ok: false, error: { code: 'NOT_FOUND', message: 'Profile not found.' } };

    return {
      ok: true,
      data: {
        firstName: person.firstName,
        lastName: person.lastName,
        interests: profile?.interests ? JSON.parse(profile.interests) : []
      }
    };
  }
};

export const getOrderStatus: VoiceToolDefinition = {
  name: 'get_order_status',
  description: 'Get status of recent or specific orders.',
  domain: 'commerce',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      order_id: { type: "string", description: "Optional specific order ID. If omitted, returns recent orders." }
    }
  },
  execute: async (args, session) => {
    const orders = await fetchMyOrders();
    const ctx = await getVoiceContext(session.user.personId);
    
    // Resolve order ID from context if not explicitly provided but conversation implies it
    let targetOrderId = args.order_id;
    if (!targetOrderId && ctx.activeOrder) {
      targetOrderId = ctx.activeOrder.id;
    }
    
    if (targetOrderId && typeof targetOrderId === 'string') {
      const matchRetail = orders.retail?.find((o: any) => o.id === targetOrderId || (o.ref && o.ref === targetOrderId));
      const matchRestaurant = orders.restaurant?.find((o: any) => o.id === targetOrderId || (o.ref && o.ref === targetOrderId));
      const order = matchRetail || matchRestaurant;
      
      if (!order) return { ok: false, error: { code: 'NOT_FOUND', message: 'Order not found or does not belong to you.' } };
      
      return {
        ok: true,
        data: {
          reference: order.ref || order.id.split('-')[0].toUpperCase(),
          status: order.status,
          totalAmount: order.totalAmount || order.total,
          merchant: order.org?.name || order.merchant || 'Unknown'
        }
      };
    }

    const recentRetail = (orders.retail || []).slice(0, 2);
    const recentRestaurant = (orders.restaurant || []).slice(0, 2);
    const combined = [...recentRetail, ...recentRestaurant].map((o: any) => ({
      id: o.id,
      reference: o.ref || o.id.split('-')[0].toUpperCase(),
      status: o.status,
      totalAmount: o.totalAmount || o.total,
      merchant: o.org?.name || o.merchant || 'Unknown'
    }));

    if (combined.length > 0) {
      await pushRecentEntity(session.user.personId, {
        type: 'ORDER',
        id: combined[0].id,
        label: combined[0].reference
      });
    }

    return { ok: true, data: combined.slice(0, 3) };
  }
};


import { rememberPreference as dbRemember, forgetPreference as dbForget, listPreferences as dbListPreferences } from '../../intelligence/memory';

export const rememberPreference: VoiceToolDefinition = {
  name: 'account.remember_preference',
  description: 'Store a resident\'s preference or routine.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string', enum: ['PREFERENCE', 'ROUTINE', 'ACCESSIBILITY', 'FOOD_PREFERENCE', 'SHOPPING_PREFERENCE', 'LOCATION_PREFERENCE', 'NOTIFICATION_PREFERENCE'] },
      key: { type: 'string', description: 'A short, stable identifier for this memory, e.g. seating' },
      value: { type: 'string', description: 'The value of the preference, e.g. outdoor' }
    },
    required: ['category', 'key', 'value']
  },
  execute: async (args, session) => {
    return await dbRemember(session.user.personId, args.category, args.key, args.value);
  }
};

export const forgetPreference: VoiceToolDefinition = {
  name: 'account.forget_preference',
  description: 'Forget a resident\'s previously saved preference.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      key: { type: 'string' }
    },
    required: ['category', 'key']
  },
  execute: async (args, session) => {
    return await dbForget(session.user.personId, args.category, args.key);
  }
};

export const listPreferences: VoiceToolDefinition = {
  name: 'account.list_preferences',
  description: 'List all explicitly saved preferences and routines for the resident.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Optional filter by category' }
    }
  },
  execute: async (args, session) => {
    return await dbListPreferences(session.user.personId, args.category);
  }
};

import { createReminder, cancelReminder, listReminders as getReminders } from '../../intelligence/reminders';

export const setReminder: VoiceToolDefinition = {
  name: 'account.set_reminder',
  description: 'Create a reminder for the resident. Can be time-based or event-based.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      dueAt: { type: 'string', description: 'ISO string of the time to remind, if time-based' },
      entityType: { type: 'string', description: 'e.g. ORDER, DELIVERY, SERVICE' },
      entityReference: { type: 'string', description: 'The ID to watch if event-based' }
    },
    required: ['title']
  },
  execute: async (args, session) => {
    return await createReminder(
      session.user.personId, 
      args.title, 
      args.description, 
      args.dueAt ? (globalThis as any).Temporal.Instant.from(args.dueAt) : undefined,
      args.entityType,
      args.entityReference
    );
  }
};

export const cancelReminderTool: VoiceToolDefinition = {
  name: 'account.cancel_reminder',
  description: 'Cancel an existing reminder.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: 'object',
    properties: {
      reminderId: { type: 'string' }
    },
    required: ['reminderId']
  },
  execute: async (args, session) => {
    return await cancelReminder(session.user.personId, args.reminderId);
  }
};

export const listRemindersTool: VoiceToolDefinition = {
  name: 'account.list_reminders',
  description: 'List active reminders for the resident.',
  domain: 'account',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: { type: 'object' },
  execute: async (args, session) => {
    return await getReminders(session.user.personId, 'PENDING');
  }
};
