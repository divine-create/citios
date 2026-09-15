# Financial Engine: Payments

## Overview
While the internal Ledger (Wallets and Transactions) handles closed-loop fund movement, the platform must interface with the outside world to bring funds into the system (Top-Up) and take funds out (Payout/Withdrawal).

## Payment Gateways
The platform acts as a merchant of record or a marketplace facilitator using providers like Stripe or Paystack.

## Inbound Flows (Top-Ups)
When a user adds funds to their Resident Wallet:
1. The user initiates a payment via a gateway (Credit Card, Apple Pay, USSD).
2. The gateway processes the fiat transaction.
3. Upon receiving the gateway's successful webhook, CityConnect mints the equivalent value into the user's `Wallet` (recording an external funding transaction in the Ledger).

## Outbound Flows (Payouts)
When a business (Organization) withdraws their revenue to their bank account:
1. The business requests a payout.
2. CityConnect debits their Organization `Wallet` (internal transaction).
3. CityConnect triggers an API call to the gateway (e.g., Stripe Connect Payouts or Paystack Transfers) to route the fiat funds to the business's linked bank account.

## OS-Specific Payments
Currently, OSs like ShopOS (`RetailOrder.paymentMethod = "CASH" | "CARD"`) track payment states directly. 
**Target Architecture:** Vertical OSs should integrate directly with CityPay. If a customer pays with a credit card at a ShopOS physical POS, the system should either:
A. Route the payment through CityConnect, crediting the Organization's wallet.
B. Record the external transaction as "Settled Externally" so the OS knows the bill is paid, without altering Wallet balances.
