import { db } from '@/src/prisma/db';
import { getPaymentAdapter } from '@/lib/payments/factory';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireMembership } from '@/lib/actions/tenant';

export async function requestPayout(organizationId: string, amount: number, provider: string, idempotencyKey: string) {
  if (!organizationId || typeof organizationId !== 'string') {
    throw new Error('Invalid organizationId');
  }
  if (!amount || typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
    throw new Error('Invalid payout amount: must be positive number');
  }
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    throw new Error('Invalid idempotencyKey');
  }

  // Strict server-side authentication and authorization enforcement
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.personId) {
    throw new Error('UNAUTHORIZED: Valid authenticated session required');
  }
  await requireMembership(organizationId, ['OWNER', 'FINANCE', 'ADMIN']);

  return await db.transaction(async (tx) => {
    const existingPayout = await tx.orm.public.Payout.where({ idempotencyKey }).select('id', 'organizationId', 'status').all().first();
    if (existingPayout) {
      if (existingPayout.organizationId !== organizationId) throw new Error('Idempotency collision across orgs');
      return existingPayout;
    }

    const wallet = await tx.orm.public.Wallet.where({ organizationId }).select('id', 'balance', 'currency').all().first();

    if (!wallet) throw new Error('Wallet not found for organization');
    if (wallet.balance < amount) throw new Error('Insufficient available payable balance');

    const updatePlan = db.raw.sql`UPDATE "wallet" SET balance = balance - ${amount} WHERE id = ${wallet.id} AND balance >= ${amount}`.affectedCount().build();
    const rowsCount: any = await tx.execute(updatePlan);

    if (rowsCount.affectedRows === 0) {
      throw new Error('Concurrent modification or insufficient balance');
    }

    const payout = await tx.orm.public.Payout.select('id', 'status').create({
      organizationId,
      amount,
      currency: wallet.currency,
      provider,
      idempotencyKey,
      status: 'PROCESSING'
    });

    const txn = await tx.orm.public.Transaction.select('id').create({
      status: 'COMPLETED',
      description: `Merchant Payout initiated (${payout.id})`
    });

    await tx.orm.public.LedgerEntry.select('id').create({
      walletId: wallet.id,
      transactionId: txn.id,
      amount: -amount,
      currency: wallet.currency
    });

    return payout;
  });
}
