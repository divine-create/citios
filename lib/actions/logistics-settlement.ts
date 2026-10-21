import { db } from '../../src/prisma/db';
import { LogisticsDomainError } from './logistics-domain';
import { assertProviderAccess } from './logistics-tenant';

export type SettleDeliveryParams = {
  providerId: string;
  deliveryJobId: string;
  idempotencyKey?: string;
};

export async function settleDelivery(params: SettleDeliveryParams) {
  await assertProviderAccess(params.providerId, ['OWNER', 'ADMIN', 'FINANCE', 'MANAGER']);
  return await db.transaction(async (tx: any) => {
    // 1. Fetch Job and validate ownership
    const jobs = await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all();
    const job = jobs[0];
    if (!job) throw new LogisticsDomainError('DeliveryJob not found');
    if (job.providerId !== params.providerId) throw new LogisticsDomainError('Provider isolation violation');
    
    // 2. Validate status
    if (job.status !== 'COMPLETED') {
      throw new LogisticsDomainError(`Cannot settle DeliveryJob in status ${job.status}`);
    }

    // 3. Prevent duplicate settlement
    const existingSettlements = await tx.orm.public.LogisticsSettlement.where({ deliveryJobId: job.id }).all();
    if (existingSettlements.length > 0) {
      if (params.idempotencyKey && existingSettlements[0].idempotencyKey === params.idempotencyKey) {
        return existingSettlements[0];
      }
      throw new LogisticsDomainError('Job already settled');
    }

    // Provider idempotency key deduplication
    if (params.idempotencyKey) {
      const byKey = await tx.orm.public.LogisticsSettlement.where({ providerId: params.providerId, idempotencyKey: params.idempotencyKey }).all();
      if (byKey.length > 0) {
        throw new LogisticsDomainError('Idempotency key conflict');
      }
    }

    // 4. Validate accepted quote
    const quotes = await tx.orm.public.DeliveryQuote.where({ deliveryJobId: job.id, status: 'ACCEPTED' }).all();
    const quote = quotes[0];
    if (!quote) {
      throw new LogisticsDomainError('Cannot settle: No accepted quote found for this delivery');
    }

    // 5. Fetch provider config for platform fee
    const configs = await tx.orm.public.LogisticsSettings.where({ organizationId: params.providerId }).all();
    let platformFeeRate = 0.10; // Default 10%
    if (configs[0] && configs[0].platformFeeRate !== undefined) {
      platformFeeRate = Number(configs[0].platformFeeRate);
    }

    // 6. Calculate amounts in minor units (cents / kobo) to prevent floating-point drift
    const grossMinor = Math.round(Number(quote.total) * 100);
    const feeMinor = Math.round(grossMinor * platformFeeRate);
    const providerMinor = grossMinor - feeMinor;

    const grossAmount = Number((grossMinor / 100).toFixed(2));
    const fees = Number((feeMinor / 100).toFixed(2));
    const providerAmount = Number((providerMinor / 100).toFixed(2));

    // 7. Wallet resolution
    let wallets = await tx.orm.public.Wallet.where({ organizationId: params.providerId }).all();
    let wallet = wallets[0];
    if (!wallet) {
      wallet = await tx.orm.public.Wallet.create({
        organizationId: params.providerId,
        balance: 0.0,
        currency: quote.currency || 'USD'
      });
    } else if (wallet.currency !== quote.currency) {
      throw new LogisticsDomainError('Currency mismatch between quote and provider wallet');
    }

    // 8. Financial Transaction & Ledger side effects
    const transaction = await tx.orm.public.Transaction.create({
      status: 'COMPLETED',
      reference: `SETTLE_DELIVERY_${job.id}`,
      description: `Logistics Settlement for Delivery ${job.id}`
    });

    await tx.orm.public.LedgerEntry.create({
      walletId: wallet.id,
      transactionId: transaction.id,
      amount: providerAmount,
      currency: wallet.currency
    });

    const newBalance = Number((((Number(wallet.balance) * 100) + providerMinor) / 100).toFixed(2));
    await tx.orm.public.Wallet.where({ id: wallet.id }).update({
      balance: newBalance
    });

    // 9. Create Settlement Record
    const settlement = await tx.orm.public.LogisticsSettlement.create({
      providerId: params.providerId,
      deliveryJobId: job.id,
      quoteId: quote.id,
      grossAmount,
      fees,
      providerAmount,
      currency: quote.currency,
      status: 'SETTLED',
      idempotencyKey: params.idempotencyKey || null,
      transactionId: transaction.id,
      settledAt: (globalThis as any).Temporal.Now.instant()
    });

    return settlement;
  });
}

/**
 * Returns settlement overview and financial ledger history for an authorized provider.
 */
export async function getProviderSettlementSummary(providerId: string) {
  await assertProviderAccess(providerId, ['OWNER', 'ADMIN', 'FINANCE']);
  const [settlements, wallet] = await Promise.all([
    db.orm.public.LogisticsSettlement
      .where({ providerId })
      .include('deliveryJob')
      .include('quote')
      .all(),
    db.orm.public.Wallet.where({ organizationId: providerId }).first(),
  ]);

  let totalGross = 0;
  let totalFees = 0;
  let totalNet = 0;

  for (const s of settlements) {
    totalGross += Number(s.grossAmount);
    totalFees += Number(s.fees);
    totalNet += Number(s.providerAmount);
  }

  settlements.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    walletBalance: wallet ? Number(wallet.balance) : 0,
    currency: wallet?.currency || 'NGN',
    totalGross: Number(totalGross.toFixed(2)),
    totalFees: Number(totalFees.toFixed(2)),
    totalNet: Number(totalNet.toFixed(2)),
    settlementCount: settlements.length,
    recentSettlements: settlements.slice(0, 50),
  };
}
