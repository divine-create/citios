# Financial Engine: Transactions

## Overview
The CityPay financial engine handles the movement of value across the platform. At its core, it is a closed-loop system of Wallets transferring funds to other Wallets via Transactions.

## The Model
```prisma
model Wallet {
  id             String
  balance        Float
  type           WalletType // RESIDENT or ORGANIZATION
  userId         String?    // If RESIDENT
  organizationId String?    // If ORGANIZATION
}

model Transaction {
  id               String
  amount           Float
  currency         String
  status           String   // PENDING, COMPLETED, FAILED
  senderWalletId   String
  receiverWalletId String
}
```

## Internal Value Movement (P2P, P2B, B2B)
Because both residents and businesses possess a `Wallet`, transferring funds within the platform is instantaneous and does not require an external payment gateway.
- **Resident to Business (P2B):** Paying for a ShopOS order, paying a school fee in EduOS, booking a HotelOS room.
- **Business to Resident (B2B/B2P):** Refunding a customer, paying out a gig worker (CityDrive Courier).
- **Resident to Resident (P2P):** Sending funds to a friend.

## Transaction Integrity
- **ACID Properties:** All movements of funds between wallets must occur within a database transaction. If debiting the sender succeeds but crediting the receiver fails, the entire transaction must roll back.
- **Concurrency:** Optimistic concurrency control (or row locking) must be used to prevent race conditions when multiple transactions hit the same wallet simultaneously.
