import { db } from '../../src/prisma/db';
import { LogisticsDomainError } from './logistics-domain';

export class Money {
  private readonly minorUnits: number;

  private constructor(minorUnits: number) {
    this.minorUnits = Math.round(minorUnits);
  }

  static fromMajor(majorString: string | number): Money {
    const val = typeof majorString === 'string' ? parseFloat(majorString) : majorString;
    return new Money(Math.round(val * 100));
  }

  static fromMinor(minorUnits: number): Money {
    return new Money(minorUnits);
  }

  add(other: Money): Money {
    return new Money(this.minorUnits + other.minorUnits);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.minorUnits * factor));
  }

  toMajorString(): string {
    return (this.minorUnits / 100).toFixed(2);
  }
}

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

  const jobs = await db.orm.public.DeliveryJob.where({ id: deliveryJobId }).all();
  const job = jobs[0];
  if (!job) throw new LogisticsDomainError('DeliveryJob not found');

  // Using in-memory filter since isActive may not support DB level where equality
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
