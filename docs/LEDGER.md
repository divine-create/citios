# Financial Engine: Ledger

## Overview
A financial platform cannot rely solely on the `balance` float column of the `Wallet` table. A true double-entry ledger is required to maintain trust, auditability, and historical accuracy.

## The Principle of Double-Entry
Every financial event in CityConnect must have at least two legs: a debit and a credit of equal value.
The sum of all balances across the entire platform (including a central "System Treasury" wallet) must always equal zero.

## Target Architecture Guidelines
1. **System Wallets:** Introduce global system wallets (e.g., `System_Fiat_In`, `System_Fiat_Out`, `System_Revenue`). 
2. **Top-Ups:** When a user deposits $10, credit the User's Wallet $10, and debit the `System_Fiat_In` wallet $10.
3. **Purchases:** When a user pays a business $10, debit the User $10, credit the Business $10. (Optionally, debit User $10, credit Business $9, credit `System_Revenue` $1 for fees).
4. **Immutability:** A `Transaction` row (or Ledger Entry row) must never be updated or deleted once created. Reversals must be executed by appending a new, opposite transaction (a compensating transaction).

## Deriving Balances
While `Wallet.balance` can be cached for fast reads in the UI, the true balance is always derived by summing all incoming and outgoing transactions for that wallet. The system must run periodic background jobs (Reconciliation) to ensure `Wallet.balance == SUM(incoming) - SUM(outgoing)`.
