'use server';

import { db } from '../../src/prisma/db';
import { LogisticsDomainError } from './logistics-domain';
import { assertProviderAccess } from './logistics-tenant';
import { resolveTrustedDeliveryDistance } from '../mapping/distance-resolver';
import type { GeoPoint } from '../mapping/types';
import { Money } from './logistics-money';

export async function calculateDeliveryQuote(params: {
  deliveryJobId: string;
  providerId: string;
  distanceKm: number;
  weightKg?: number;
  priority?: boolean;
  idempotencyKey?: string;
}) {
  const { deliveryJobId, providerId, distanceKm, weightKg = 0, priority = false, idempotencyKey } = params;

  if (idempotencyKey) {
    const existingQuotes = await db.orm.public.DeliveryQuote.where({ providerId, idempotencyKey }).all();
    const existing = existingQuotes[0];
    if (existing) {
      if (existing.deliveryJobId !== deliveryJobId) {
        throw new LogisticsDomainError(`Quote conflict: Idempotency key ${idempotencyKey} already used for a different request.`);
      }
      return existing;
    }
  }

  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 2000) {
    throw new LogisticsDomainError(`Invalid delivery distance: ${distanceKm}. Distance must be a positive finite number.`);
  }

  const jobs = await db.orm.public.DeliveryJob.where({ id: deliveryJobId }).all();
  const job = jobs[0];
  if (!job) throw new LogisticsDomainError('DeliveryJob not found');

  const allRules = await db.orm.public.DeliveryPricingRule.where({ providerId }).all();
  const activeRules = allRules.filter(r => r.isActive).sort((a, b) => b.version - a.version);
  const rule = activeRules[0];
  if (!rule) throw new LogisticsDomainError('No active pricing rules found for provider');

  const base = Money.fromMajor(rule.baseFee as string);
  const perKm = Money.fromMajor(rule.perKmRate as string);
  const distanceCharge = perKm.multiply(distanceKm);
  
  const perKg = Money.fromMajor(rule.perKgRate as string);
  const weightCharge = perKg.multiply(weightKg);

  const priorityCharge = priority ? Money.fromMajor(rule.prioritySurcharge as string) : Money.fromMinor(0);
  
  const subtotal = base.add(distanceCharge).add(weightCharge).add(priorityCharge);
  
  const tax = Money.fromMinor(0);
  const total = subtotal.add(tax);

  const quote = await db.orm.public.DeliveryQuote.create({
    deliveryJobId,
    providerId,
    status: 'CALCULATED',
    pricingVersion: rule.version,
    currency: rule.currency,
    baseCharge: base.toMajorString(),
    distanceCharge: distanceCharge.toMajorString(),
    weightCharge: weightCharge.toMajorString(),
    serviceCharge: priorityCharge.toMajorString(),
    subtotal: subtotal.toMajorString(),
    tax: tax.toMajorString(),
    total: total.toMajorString(),
    idempotencyKey
  });

  return quote;
}

/**
 * Calculates a delivery quote using trusted server-side road routing or explicit Calabar estimates.
 * Enforces geographic serviceability in Calabar Municipal and Calabar South.
 */
export async function quoteDeliveryRoute(params: {
  deliveryJobId: string;
  providerId: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  weightKg?: number;
  priority?: boolean;
  idempotencyKey?: string;
  allowFallbackEstimate?: boolean;
}) {
  const resolution = await resolveTrustedDeliveryDistance(params.pickup, params.dropoff, {
    allowFallbackEstimate: params.allowFallbackEstimate,
  });

  if (!resolution.success || !resolution.distanceKm) {
    throw new LogisticsDomainError(
      resolution.error || 'Failed to determine trusted delivery distance for route in Calabar.'
    );
  }

  const quote = await calculateDeliveryQuote({
    deliveryJobId: params.deliveryJobId,
    providerId: params.providerId,
    distanceKm: resolution.distanceKm,
    weightKg: params.weightKg,
    priority: params.priority,
    idempotencyKey: params.idempotencyKey,
  });

  return {
    quote,
    routingTier: resolution.tier,
    routingProvider: resolution.provider,
    distanceKm: resolution.distanceKm,
    durationMinutes: resolution.durationMinutes,
    serviceability: resolution.serviceability,
    notes: resolution.notes,
  };
}

export async function offerQuote(quoteId: string, providerId: string) {
  return await db.transaction(async (ctx: any) => {
    const plan = ctx.sql.public.deliveryQuote
      .update({ status: 'OFFERED' })
      .where((f: any, fns: any) => fns.and(
        fns.eq(f.id, quoteId),
        fns.eq(f.providerId, providerId),
        fns.eq(f.status, 'CALCULATED')
      ))
      .build();

    const result = await ctx.execute(plan);
    if (result.affectedRows === 0) {
      throw new LogisticsDomainError('Invalid transition: quote not found or not in CALCULATED state');
    }
    
    const qs = await ctx.orm.public.DeliveryQuote.where({ id: quoteId }).all();
    return qs[0];
  });
}

export async function acceptQuote(quoteId: string, providerId: string) {
  return await db.transaction(async (ctx: any) => {
    const quotePlan = ctx.sql.public.deliveryQuote
      .update({ status: 'ACCEPTED' })
      .where((f: any, fns: any) => fns.and(
        fns.eq(f.id, quoteId),
        fns.eq(f.providerId, providerId),
        fns.eq(f.status, 'OFFERED')
      ))
      .build();

    const quoteResult = await ctx.execute(quotePlan);
    if (quoteResult.affectedRows === 0) {
      const qs2 = await ctx.orm.public.DeliveryQuote.where({ id: quoteId, providerId }).all();
      const q = qs2[0];
      if (q && q.status === 'EXPIRED') {
        throw new LogisticsDomainError('Cannot accept an expired quote');
      }
      throw new LogisticsDomainError('Invalid transition: quote not found or not in OFFERED state');
    }

    const qs3 = await ctx.orm.public.DeliveryQuote.where({ id: quoteId }).all();
    const quote = qs3[0];

    const jobPlan = ctx.sql.public.deliveryJob
      .update({ status: 'PRICED' })
      .where((f: any, fns: any) => fns.and(
        fns.eq(f.id, quote!.deliveryJobId),
        fns.eq(f.status, 'REQUESTED')
      ))
      .build();
    
    const jobResult = await ctx.execute(jobPlan);
    if (jobResult.affectedRows === 0) {
      throw new LogisticsDomainError('DeliveryJob is not in REQUESTED state');
    }

    return quote;
  });
}

export async function expireQuote(quoteId: string, providerId: string) {
  return await db.transaction(async (ctx: any) => {
    const plan = ctx.sql.public.deliveryQuote
      .update({ status: 'EXPIRED' })
      .where((f: any, fns: any) => fns.and(
        fns.eq(f.id, quoteId),
        fns.eq(f.providerId, providerId),
        fns.in(f.status, ['CALCULATED', 'OFFERED'])
      ))
      .build();

    const result = await ctx.execute(plan);
    if (result.affectedRows === 0) {
      throw new LogisticsDomainError('Invalid transition: quote not found or already terminal');
    }
    
    const qs4 = await ctx.orm.public.DeliveryQuote.where({ id: quoteId }).all();
    return qs4[0];
  });
}

export async function getProviderPricingRules(providerId: string) {
  await assertProviderAccess(providerId, ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER', 'FINANCE']);
  const rules = await db.orm.public.DeliveryPricingRule.where({ providerId }).all();
  rules.sort((a, b) => b.version - a.version);
  return rules;
}

export async function updatePricingRule(params: {
  providerId: string;
  baseFee: number;
  perKmRate: number;
  perKgRate?: number;
  prioritySurcharge?: number;
  currency?: string;
}) {
  await assertProviderAccess(params.providerId, ['OWNER', 'ADMIN']);
  return await db.transaction(async (tx: any) => {
    const allRules = await tx.orm.public.DeliveryPricingRule.where({ providerId: params.providerId }).all();
    for (const r of allRules) {
      if (r.isActive) {
        await tx.orm.public.DeliveryPricingRule.where({ id: r.id }).update({ isActive: false });
      }
    }

    const nextVersion = allRules.length + 1;
    const newRule = await tx.orm.public.DeliveryPricingRule.create({
      providerId: params.providerId,
      version: nextVersion,
      currency: params.currency || 'NGN',
      baseFee: params.baseFee.toFixed(2),
      perKmRate: params.perKmRate.toFixed(2),
      perKgRate: (params.perKgRate || 0).toFixed(2),
      prioritySurcharge: (params.prioritySurcharge || 0).toFixed(2),
      isActive: true,
    });

    return newRule;
  });
}
