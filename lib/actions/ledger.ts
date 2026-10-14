import { db } from '@/src/prisma/db';
import { requireMembership } from '@/lib/actions/tenant';

export class LedgerDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerDomainError';
  }
}

export type LedgerEntryInput = {
  walletId: string;
  amount: number;
  currency: string;
  notes?: string;
};

export type RecordDoubleEntryParams = {
  description: string;
  reference?: string;
  entries: LedgerEntryInput[];
};

/**
 * Executes an atomic double-entry ledger transaction.
 * Strictly asserts that the sum of all entries equals zero (Balanced Books).
 * Atomically updates all participating wallet balances inside a single transaction.
 */
export async function recordDoubleEntryTransaction(params: RecordDoubleEntryParams) {
  if (!params.entries || params.entries.length < 2) {
    throw new LedgerDomainError('Double-entry transaction requires at least 2 entries');
  }

  // Sum check (within epsilon for floating point representation)
  const total = params.entries.reduce((sum, e) => sum + e.amount, 0);
  if (Math.abs(total) > 0.001) {
    throw new LedgerDomainError(`Ledger entries do not balance to zero (discrepancy: ${total})`);
  }

  return await db.transaction(async (tx: any) => {
    // 1. Fetch and validate all wallets
    const walletMap = new Map<string, any>();
    for (const entry of params.entries) {
      if (entry.amount === 0) {
        throw new LedgerDomainError('Ledger entry amount cannot be zero');
      }

      if (!walletMap.has(entry.walletId)) {
        const wallets = await tx.orm.public.Wallet.where({ id: entry.walletId }).all();
        const wallet = wallets[0];
        if (!wallet) throw new LedgerDomainError(`Wallet ${entry.walletId} not found`);
        walletMap.set(entry.walletId, wallet);
      }

      const wallet = walletMap.get(entry.walletId);
      if (wallet.currency !== entry.currency) {
        throw new LedgerDomainError(
          `Currency mismatch for wallet ${entry.walletId}: wallet is ${wallet.currency}, entry is ${entry.currency}`
        );
      }
    }

    // 2. Create Transaction
    const transaction = await tx.orm.public.Transaction.create({
      status: 'COMPLETED',
      reference: params.reference || null,
      description: params.description,
    });

    // 3. Create Entries and update Wallet Balances
    const createdEntries = [];
    for (const entry of params.entries) {
      const le = await tx.orm.public.LedgerEntry.create({
        walletId: entry.walletId,
        transactionId: transaction.id,
        amount: Number(entry.amount.toFixed(2)),
        currency: entry.currency,
      });
      createdEntries.push(le);

      const currentWallet = walletMap.get(entry.walletId);
      const newBalance = Number((currentWallet.balance + entry.amount).toFixed(2));
      
      await tx.orm.public.Wallet.where({ id: entry.walletId }).update({
        balance: newBalance,
      });

      // Update cached balance in memory
      currentWallet.balance = newBalance;
    }

    return { transaction, entries: createdEntries };
  });
}

/**
 * Reconciles a wallet's reported balance against the authoritative sum of all its ledger entries.
 */
export async function reconcileWalletBalance(walletId: string) {
  const wallets = await db.orm.public.Wallet.where({ id: walletId }).all();
  const wallet = wallets[0];
  if (!wallet) throw new LedgerDomainError('Wallet not found');

  const entries = await db.orm.public.LedgerEntry.where({ walletId }).all();
  const ledgerSum = entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const roundedSum = Number(ledgerSum.toFixed(2));
  const roundedBalance = Number(Number(wallet.balance).toFixed(2));

  const discrepancy = Number(Math.abs(roundedBalance - roundedSum).toFixed(2));
  const isBalanced = discrepancy === 0;

  return {
    walletId,
    reportedBalance: roundedBalance,
    ledgerSum: roundedSum,
    isBalanced,
    discrepancy,
    entryCount: entries.length,
  };
}

/**
 * Generates an authoritative merchant accounting statement.
 * Strictly verifies actor membership and tenant organization isolation.
 */
export async function getMerchantAccountingStatement(organizationId: string) {
  // Security boundary: caller must be OWNER, FINANCE, or ADMIN of the organization
  await requireMembership(organizationId, ['OWNER', 'FINANCE', 'ADMIN']);

  const wallets = await db.orm.public.Wallet.where({ organizationId }).all();
  const wallet = wallets[0];
  if (!wallet) throw new LedgerDomainError('Organization wallet not found');

  const entries = await db.orm.public.LedgerEntry.where({ walletId: wallet.id }).all();

  let grossEarnings = 0;
  let feesDeducted = 0;
  let refundsDeducted = 0;
  let payoutsDeducted = 0;

  for (const e of entries) {
    const amt = Number(e.amount);
    if (amt > 0) {
      grossEarnings += amt;
    } else {
      // Analyze category or aggregate debits
      feesDeducted += Math.abs(amt);
    }
  }

  const reconciliation = await reconcileWalletBalance(wallet.id);

  return {
    organizationId,
    walletId: wallet.id,
    currency: wallet.currency,
    currentBalance: Number(wallet.balance),
    grossEarnings: Number(grossEarnings.toFixed(2)),
    totalDebits: Number(feesDeducted.toFixed(2)),
    isBalanced: reconciliation.isBalanced,
    discrepancy: reconciliation.discrepancy,
    entryCount: entries.length,
  };
}

/**
 * Performs a comprehensive ledger audit across all organization wallets.
 */
export async function auditOrganizationLedger(organizationId: string) {
  await requireMembership(organizationId, ['OWNER', 'FINANCE', 'ADMIN']);

  const wallets = await db.orm.public.Wallet.where({ organizationId }).all();
  const results = [];

  for (const wallet of wallets) {
    const audit = await reconcileWalletBalance(wallet.id);
    results.push(audit);
  }

  const allBalanced = results.every((r) => r.isBalanced);
  const totalDiscrepancy = results.reduce((sum, r) => sum + r.discrepancy, 0);

  return {
    organizationId,
    allBalanced,
    totalDiscrepancy,
    walletsAudited: results.length,
    wallets: results,
  };
}
