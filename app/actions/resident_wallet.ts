'use server';

import { db } from '@/src/prisma/db';
import { requireAuthenticatedAccount } from '@/lib/actions/tenant';
import { getPaymentAdapter } from '@/lib/payments/factory';
import crypto from 'crypto';

export async function getOrCreateResidentWallet(personIdOverride?: string) {
  let personId = personIdOverride;
  if (!personId) {
    const { person } = await requireAuthenticatedAccount();
    personId = person.id;
  }
  return await db.transaction(async (tx) => {
    let wallet = await tx.orm.public.Wallet.where({ personId }).select('id', 'balance', 'currency', 'personId').all().first();
    if (!wallet) {
      try {
        wallet = await tx.orm.public.Wallet.select('id', 'balance', 'currency', 'personId').create({
          personId,
          balance: 0,
          currency: 'NGN'
        });
      } catch (err: any) {
        if (err.sqlState === '23505' || err.code === '23505' || err.message?.includes('Unique constraint')) {
          const existing = await tx.orm.public.Wallet.where({ personId }).select('id', 'balance', 'currency', 'personId').all().first();
          if (!existing) throw new Error('Failed to recover from concurrent wallet creation');
          return existing;
        }
        throw err;
      }
    }
    return wallet;
  });
}

export async function getResidentWallet(personIdOverride?: string) {
  let personId = personIdOverride;
  if (!personId) {
    const { person } = await requireAuthenticatedAccount();
    personId = person.id;
  }
  const wallet = await db.orm.public.Wallet.where({ personId }).select('id', 'balance', 'currency', 'personId').all().first();
  if (!wallet) return null;

  // Retrieve pending funding amount
  const pendingPayments = await db.orm.public.Payment.where((p: any) => 
    p.status.equals('PENDING') && p.reference.startsWith('WAL-')
  ).select('amount').all();
  
  const pendingAmount = pendingPayments.reduce((acc, p) => acc + p.amount, 0);
  
  return { ...wallet, pendingAmount };
}

export async function createResidentWalletFunding(amount: number, provider: string = 'MONNIFY', personIdOverride?: string) {
  if (amount <= 0) throw new Error('Amount must be positive');
  
  let personId = personIdOverride;
  if (!personId) {
    const { person } = await requireAuthenticatedAccount();
    personId = person.id;
  }
  const wallet = await getOrCreateResidentWallet(personId);
  
  // Use email for payment intent if available
  const personIdentifier = await db.orm.public.PersonIdentifier.where({ personId, type: 'EMAIL' }).select('normalizedValue').all().first();
  const email = personIdentifier?.normalizedValue || 'resident@cityos.com';

  const idempotencyKey = crypto.randomUUID();
  const reference = `WAL-${wallet.id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const providerAdapter = getPaymentAdapter(provider);
  if (!providerAdapter) throw new Error(`Provider ${provider} not supported`);

  return await db.transaction(async (tx) => {
    const payment = await tx.orm.public.Payment.select('id', 'reference').create({
      amount,
      currency: wallet.currency,
      method: 'CARD',
      status: 'PENDING',
      provider,
      reference,
      idempotencyKey
      // Note: Payment schema does not have sourceType and sourceId. Wallet funding is tracked via reference.
    });

    const initResult = await providerAdapter.initializePayment({
      amount,
      currency: wallet.currency,
      reference,
      email,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/wallet/callback?reference=${reference}`
    });

    if (!initResult.success) {
      await tx.orm.public.Payment.where({ id: payment.id }).select('id').update({ status: 'FAILED' });
      throw new Error(initResult.error || 'Failed to initialize provider payment');
    }

    return { paymentId: payment.id, checkoutUrl: initResult.authorizationUrl, reference };
  });
}

export async function getResidentWalletTransactions(page: number = 1, pageSize: number = 20, personIdOverride?: string) {
  const wallet = await getResidentWallet(personIdOverride);
  if (!wallet) return { entries: [], total: 0 };
  
  const offset = (page - 1) * pageSize;
  
  const entries = await db.orm.public.LedgerEntry
    .where({ walletId: wallet.id })
    .orderBy((e) => e.createdAt.desc())
    .limit(pageSize)
    .offset(offset)
    .all();
    
  // get total using count builder
  const total = await db.orm.public.LedgerEntry
    .where({ walletId: wallet.id })
    .count();
    
  return { 
    entries: entries.map((e: any) => ({ 
      ...e, 
      createdAt: e.createdAt ? e.createdAt.toString() : new Date().toISOString() 
    })), 
    total 
  };
}
    


export async function debitResidentWallet(tx: any, personId: string, amount: number, reference: string, description: string) {
  if (amount <= 0) throw new Error('Debit amount must be positive');
  
  const wallet = await tx.orm.public.Wallet.where({ personId }).select('id', 'balance', 'currency').all().first();
  if (!wallet) throw new Error('Insufficient funds: No resident wallet found');
  
  if (wallet.balance < amount) throw new Error('Insufficient funds');
  
  const updatePlan = db.raw.sql`UPDATE "wallet" SET balance = balance - ${amount} WHERE id = ${wallet.id} AND balance >= ${amount}`.affectedCount().build();
  
  let affected = 0;
  try {
    const res = await tx.execute(updatePlan);
    const arr = Array.isArray(res) ? res : (res && typeof res.toArray === 'function' ? res.toArray() : [res]);
    if (arr.length > 0 && typeof arr[0].affectedRows === 'number') {
      affected = arr[0].affectedRows;
    } else if (res && typeof res.affectedRows === 'number') {
      affected = res.affectedRows;
    } else if (res && typeof res.count === 'number') {
      affected = res.count;
    } else {
      // fallback just in case the proxy doesn't decode it standardly
      affected = 1; 
    }
  } catch (err: any) {
    throw new Error('Database error during wallet decrement');
  }
  
  if (affected === 0) {
    throw new Error('Concurrent modification or insufficient funds');
  }
  
  const transactionRecord = await tx.orm.public.Transaction.create({
    reference,
    status: 'COMPLETED',
    description
  });
  
  await tx.orm.public.LedgerEntry.create({
    walletId: wallet.id,
    transactionId: transactionRecord.id,
    amount: -amount,
    currency: wallet.currency
  });
  
  return transactionRecord;
}
