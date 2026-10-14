import { db } from '@/src/prisma/db';
import { handleFailedRetailPayment } from '@/lib/actions/citypay';
import { notifyPerson } from '@/lib/notify';

export interface SettlePaymentOptions {
  paymentId: string;
  providerReference?: string;
  providerEventId?: string;
  eventType?: string;
  rawPayload?: any;
}

/**
 * Authoritative, idempotent settlement of a successful payment in CityOS.
 * Can be called by incoming Webhook Gateway or by synchronous verifyOrderPayment.
 * Guarantees exactly-once settlement with row locks and ledger accounting.
 */
export async function settleSuccessfulPayment(options: SettlePaymentOptions) {
  const { paymentId, providerReference, providerEventId, eventType, rawPayload } = options;

  return await db.transaction(async (tx: any) => {
    // 1. Acquire row lock on payment to serialize concurrent events / callbacks
    await tx.execute(
      db.raw.sql`SELECT id FROM "payment" WHERE id = ${paymentId} FOR UPDATE`.affectedCount().build()
    );

    const payment = await tx.orm.public.Payment.where({ id: paymentId }).all().first();
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    // Idempotency: if already completed, exit cleanly
    if (payment.status === 'COMPLETED') {
      return { status: 'already_processed', paymentId };
    }

    if (payment.status !== 'PENDING') {
      return { status: `ignored_status_${payment.status.toLowerCase()}`, paymentId };
    }

    // 2. Record PaymentEvent if providerEventId is supplied
    if (providerEventId) {
      const existingEvt = await tx.orm.public.PaymentEvent.where({ providerEventId }).all().first();
      if (existingEvt) {
        return { status: 'already_processed', paymentId };
      }
      await tx.orm.public.PaymentEvent.create({
        paymentId: payment.id,
        providerEventId,
        type: eventType || 'charge.success',
        payload: rawPayload ? (typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload)) : '{}',
      });
    }

    // 3. Update RetailOrder if attached
    let personId: string | null = null;
    let targetOrgId: string | null = null;

    if (payment.retailOrderId) {
      const retailOrder = await tx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).all().first();
      if (retailOrder) {
        targetOrgId = retailOrder.organizationId;
        await tx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).update({
          status: 'CONFIRMED',
          fulfillmentStatus: 'PROCESSING',
        });

        // Resolve personId for notification
        if (retailOrder.customerDataId) {
          const cust = await tx.orm.public.CustomerData.where({ id: retailOrder.customerDataId }).all().first();
          if (cust && cust.relationshipId) {
            const rel = await tx.orm.public.Relationship.where({ id: cust.relationshipId }).all().first();
            if (rel) personId = rel.personId;
          }
        }
      }
    }

    // 4. Update RestaurantOrder if attached
    if (payment.restaurantOrderId) {
      const restOrder = await tx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).all().first();
      if (restOrder) {
        targetOrgId = restOrder.organizationId;
        await tx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).update({
          status: 'PREPARING',
          paymentStatus: 'COMPLETED',
          paidAt: (globalThis as any).Temporal.Now.instant(),
        });

        // Resolve personId for notification
        if (restOrder.customerDataId) {
          const cust = await tx.orm.public.CustomerData.where({ id: restOrder.customerDataId }).all().first();
          if (cust && cust.relationshipId) {
            const rel = await tx.orm.public.Relationship.where({ id: cust.relationshipId }).all().first();
            if (rel) personId = rel.personId;
          }
        }
      }
    }

    // 5. Merchant Settlement & Ledger Accounting
    let targetWallet = null;

    if (payment.reference && payment.reference.startsWith('WAL-')) {
      // Resident Wallet Funding
      const parts = payment.reference.split('-');
      if (parts.length >= 3) {
        const walletId = parts.slice(1, -2).join('-');
        targetWallet = await tx.orm.public.Wallet.where({ id: walletId }).all().first();
      }
    } else if (targetOrgId) {
      // Merchant Organization Settlement
      targetWallet = await tx.orm.public.Wallet.where({ organizationId: targetOrgId }).all().first();
      if (!targetWallet) {
        targetWallet = await tx.orm.public.Wallet.create({
          organizationId: targetOrgId,
          balance: 0,
          currency: payment.currency || 'NGN',
        });
      }
    }

    if (targetWallet) {
      let transactionRecord = null;
      if (payment.transactionId) {
        transactionRecord = await tx.orm.public.Transaction.where({ id: payment.transactionId }).all().first();
        if (transactionRecord) {
          await tx.orm.public.Transaction.where({ id: payment.transactionId }).update({ status: 'COMPLETED' });
        }
      }
      
      if (!transactionRecord) {
        transactionRecord = await tx.orm.public.Transaction.create({
          reference: payment.reference || `TX-${payment.id.slice(0, 8)}`,
          status: 'COMPLETED',
          description: `Online settlement ${payment.reference || payment.id}`,
        });
        await tx.orm.public.Payment.where({ id: payment.id }).update({ transactionId: transactionRecord.id });
      }

      await tx.orm.public.LedgerEntry.create({
        walletId: targetWallet.id,
        transactionId: transactionRecord.id,
        amount: payment.amount,
        currency: targetWallet.currency,
      });

      const creditWalletPlan = db.raw.sql`
        UPDATE "wallet" 
        SET balance = balance + ${payment.amount} 
        WHERE id = ${targetWallet.id}
      `.affectedCount().build();
      await tx.execute(creditWalletPlan);
    }

    // 6. Update Payment status to COMPLETED
    await tx.orm.public.Payment.where({ id: payment.id }).update({
      status: 'COMPLETED',
      providerReference: providerReference || payment.providerReference || undefined,
    });

    // 7. Fire-and-forget Resident Notification
    if (personId) {
      try {
        await notifyPerson(personId, {
          type: payment.restaurantOrderId ? 'FOOD_ORDER_CONFIRMED' : 'RETAIL_ORDER_CONFIRMED',
          title: 'Payment Confirmed',
          body: `Payment of ₦${payment.amount.toLocaleString()} confirmed. Order is now processing.`,
          href: '/orders',
        });
      } catch (notifyErr) {
        console.warn('[PaymentSettlement] Notification warning:', notifyErr);
      }
    }

    return { status: 'success', paymentId: payment.id };
  });
}

/**
 * Authoritative settlement for a failed or declined payment in CityOS.
 */
export async function settleFailedPayment(options: {
  paymentId: string;
  providerEventId?: string;
  eventType?: string;
  rawPayload?: any;
  reason?: string;
}) {
  const { paymentId, providerEventId, eventType, rawPayload, reason } = options;

  return await db.transaction(async (tx: any) => {
    await tx.execute(
      db.raw.sql`SELECT id FROM "payment" WHERE id = ${paymentId} FOR UPDATE`.affectedCount().build()
    );

    const payment = await tx.orm.public.Payment.where({ id: paymentId }).all().first();
    if (!payment) throw new Error(`Payment not found: ${paymentId}`);

    if (payment.status !== 'PENDING') {
      return { status: `ignored_status_${payment.status.toLowerCase()}`, paymentId };
    }

    if (providerEventId) {
      const existingEvt = await tx.orm.public.PaymentEvent.where({ providerEventId }).all().first();
      if (existingEvt) {
        return { status: 'already_processed', paymentId };
      }
      await tx.orm.public.PaymentEvent.create({
        paymentId: payment.id,
        providerEventId,
        type: eventType || 'charge.failed',
        payload: rawPayload ? (typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload)) : '{}',
      });
    }

    await tx.orm.public.Payment.where({ id: payment.id }).update({ status: 'FAILED' });

    if (payment.retailOrderId) {
      await handleFailedRetailPayment(tx, payment.retailOrderId);
    }

    if (payment.restaurantOrderId) {
      await tx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).update({
        status: 'CANCELLED',
        paymentStatus: 'FAILED',
      });
    }

    if (payment.transactionId) {
      await tx.orm.public.Transaction.where({ id: payment.transactionId }).update({ status: 'FAILED' });
    }

    return { status: 'failed_settled', paymentId: payment.id };
  });
}
