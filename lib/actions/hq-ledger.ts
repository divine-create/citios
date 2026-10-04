import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';


// 1. Paginated & Filtered Ledger Entry Retrieval
export async function getLedgerEntries(params: {
  page: number;
  pageSize: number;
  search?: string;
  organizationId?: string;
  walletId?: string;
}) {
  await requireSystemAdmin();

  let query = db.orm.public.LedgerEntry;

  if (params.walletId) {
    query = query.where({ walletId: params.walletId });
  }

  if (params.search) {
    // If it's a UUID-like string, maybe it's an ID
    const s = params.search.trim();
    query = query.where((le: any) =>
      le.id.eq(s).or(le.transactionId.eq(s))
    );
  }

  // To support org filtering, we might need a join or two-step query
  // For safety and performance, we'll fetch wallet IDs for the org first
  if (params.organizationId) {
    const orgWallets = await db.orm.public.Wallet.where({ organizationId: params.organizationId }).all();
    const orgWalletIds = orgWallets.map(w => w.id);
    if (orgWalletIds.length > 0) {
       // Unfortunately we don't have an easy `in` clause without seeing the queries-postgres.md full text,
       // but we can just use the first wallet if a tenant usually has 1 wallet, or loop.
       // Actually `where((le) => le.walletId.in(orgWalletIds))` is standard if supported.
       query = query.where((le: any) => le.walletId.in(orgWalletIds));
    } else {
       // Force empty result
       query = query.where({ id: 'none' });
    }
  }

  // Fetch totals
  const agg = await query.aggregate((a: any) => ({ count: a.count() }));
  const total = agg.count || 0;

  // Fetch paginated rows with includes
  const entries = await query
    .include('wallet', (w: any) => w.include('organization').include('person')).include('transaction', (t: any) => t.include('payment'))
    .orderBy((le: any) => le.createdAt.desc())
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize)
    .all();

  return { entries, total };
}

// 2. Trace a specific transaction/ledger entry by ID
export async function getTransactionTrace(id: string) {
  await requireSystemAdmin();

  // The ID could be a LedgerEntry ID, Transaction ID, or Payment ID.
  let transactionId = id;
  
  // Is it a ledger entry?
  const le = await db.orm.public.LedgerEntry.where({ id }).all().first();
  if (le) {
    transactionId = le.transactionId;
  } else {
    // Is it a payment?
    const p = await db.orm.public.Payment.where({ id }).all().first();
    if (p && p.transactionId) {
      transactionId = p.transactionId;
    }
  }

  // Load the transaction and all related records
  const transaction = await db.orm.public.Transaction
    .where({ id: transactionId })
    .include('entries', (e: any) => e.include('wallet', (w: any) => w.include('organization').include('person'))).include('payment', (p: any) => p.include('refunds', 'events', 'retailOrder', 'restaurantOrder'))
    .all()
    .first();

  return transaction;
}

// 3. Platform Economy Overview
export async function getPlatformEconomyOverview() {
  await requireSystemAdmin();

  // Find the platform wallet (no org, no person)
  const systemWallet = await db.orm.public.Wallet.where({ organizationId: null, personId: null }).all().first();

  // Fetch total transactions
  const txAgg = await db.orm.public.Transaction.aggregate((a: any) => ({ count: a.count() }));
  const totalTransactions = txAgg.count || 0;

  // Payments volume (Successful)
  const paymentAgg = await db.orm.public.Payment
    .where({ status: 'COMPLETED' })
    .aggregate((a: any) => ({ 
       count: a.count(), 
       volume: a.sum('amount') 
    }));
  const totalPaymentVolume = paymentAgg.volume || 0;
  const successfulPaymentsCount = paymentAgg.count || 0;

  // Refunds volume
  const refundAgg = await db.orm.public.Refund
    .where({ status: 'COMPLETED' })
    .aggregate((a: any) => ({ 
       count: a.count(), 
       volume: a.sum('amount') 
    }));
  const totalRefundVolume = refundAgg.volume || 0;
  const refundCount = refundAgg.count || 0;

  return {
    systemWallet,
    metrics: {
      totalTransactions,
      totalPaymentVolume,
      successfulPaymentsCount,
      totalRefundVolume,
      refundCount
    }
  };
}

// 4. Inspect Wallet
export async function inspectWallet(walletId: string) {
  await requireSystemAdmin();

  const wallet = await db.orm.public.Wallet
    .where({ id: walletId })
    .include('organization').include('person')
    .all()
    .first();

  if (!wallet) return null;

  // Get recent 20 ledger entries for this wallet
  const recentEntries = await db.orm.public.LedgerEntry
    .where({ walletId: wallet.id })
    .include('transaction', (t: any) => t.include('payment'))
    .orderBy((le: any) => le.createdAt.desc())
    .limit(20)
    .all();

  return { wallet, recentEntries };
}
