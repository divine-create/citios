import { db } from '@/src/prisma/db';
import { notifyPerson } from '@/lib/notify';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function requestRefund(paymentId: string, personId: string, amount: number, reason: string) {
  if (!paymentId || typeof paymentId !== 'string') throw new Error('Invalid paymentId');
  if (!amount || typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
    throw new Error('Invalid refund amount: must be positive number');
  }

  // Derive acting identity strictly from session
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.personId) {
    throw new Error('UNAUTHORIZED: Valid session required to request refund');
  }
  // If client provided personId, assert it matches session identity
  if (personId && personId !== session.user.personId) {
    throw new Error('FORBIDDEN: Cannot request refund for another person');
  }
  const callerPersonId = session.user.personId;

  return await db.transaction(async (tx) => {
    const payment = await tx.orm.public.Payment.where({ id: paymentId }).all().first();

    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'COMPLETED') {
      throw new Error('Only COMPLETED payments can be refunded');
    }

    // Validate that caller is authorized against the original payment / payer
    let orgId = '';
    let authorizedPayerPersonId: string | null = null;

    if (payment.retailOrderId) {
      const order = await tx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).select('id', 'organizationId', 'customerDataId').all().first();
      orgId = order?.organizationId || '';
      if (order?.customerDataId) {
        const customer = await tx.orm.public.CustomerData.where({ id: order.customerDataId }).select('personId').all().first();
        authorizedPayerPersonId = customer?.personId || null;
      }
    } else if (payment.restaurantOrderId) {
      const order = await tx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).select('id', 'organizationId', 'customerDataId').all().first();
      orgId = order?.organizationId || '';
      if (order?.customerDataId) {
        const customer = await tx.orm.public.CustomerData.where({ id: order.customerDataId }).select('personId').all().first();
        authorizedPayerPersonId = customer?.personId || null;
      }
    }

    if (authorizedPayerPersonId && authorizedPayerPersonId !== callerPersonId) {
      throw new Error('FORBIDDEN: Requester is not the original payer of this order');
    }

    // Lock payment row to prevent concurrent refund overdraw
    await tx.orm.public.Payment.where({ id: paymentId }).select('id').update({ status: payment.status });

    const refundRequests = await tx.orm.public.RefundRequest.where({ paymentId }).select('id', 'amount', 'status').all();

    let totalProcessingOrCompleted = 0;
    for (const r of refundRequests) {
      if (r.status === 'REQUESTED' || r.status === 'APPROVED') {
        totalProcessingOrCompleted += r.amount;
      }
    }

    if (totalProcessingOrCompleted + amount > payment.amount) {
      throw new Error('Refund amount exceeds payment amount limit');
    }

    const request = await tx.orm.public.RefundRequest.select('id', 'status').create({
      paymentId,
      personId: callerPersonId,
      organizationId: orgId,
      amount,
      reason,
      status: 'REQUESTED'
    });
    
    return request;
  });
}

export async function approveRefund(refundRequestId: string, merchantPersonId?: string) {
  if (!refundRequestId || typeof refundRequestId !== 'string') {
    throw new Error('Invalid refundRequestId');
  }

  // Derive acting identity strictly from authenticated server session
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.personId) {
    throw new Error('UNAUTHORIZED: Authentication required to approve refund');
  }
  if (merchantPersonId && merchantPersonId !== session.user.personId) {
    throw new Error('FORBIDDEN: Identity mismatch with authenticated session');
  }
  const actingPersonId = session.user.personId;

  return await db.transaction(async (tx) => {
    // Lock the refund request row to prevent concurrent approvals
    await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id').update({ status: 'REQUESTED' });
    
    const request = await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id', 'status', 'paymentId', 'amount', 'personId', 'organizationId').all().first();

    if (!request || request.status !== 'REQUESTED') {
      throw new Error('Invalid or already processed refund request');
    }

    if (!request.organizationId) {
      throw new Error('FORBIDDEN: Cannot approve refund without valid organization relationship');
    }

    // Authoritative server-side membership check inside transaction
    const membership = await tx.orm.public.Membership.where({
      personId: actingPersonId,
      organizationId: request.organizationId
    }).all().first();

    if (!membership) {
      throw new Error(`FORBIDDEN: User does not belong to organization ${request.organizationId}`);
    }

    const roles = await tx.orm.public.MembershipRole.where({ membershipId: membership.id }).all();
    const hasAuth = roles.some((r: any) => ['OWNER', 'ADMIN', 'FINANCE', 'MANAGER'].includes(r.role));
    if (!hasAuth) {
      throw new Error('FORBIDDEN: Insufficient role to approve refund');
    }

    const payment = await tx.orm.public.Payment.where({ id: request.paymentId }).all().first();
    if (!payment) throw new Error('Payment not found');

    // Prevent refund overdraw under concurrent approvals
    const existingRefunds = await tx.orm.public.Refund.where({ paymentId: request.paymentId }).all();
    const totalRefunded = existingRefunds.reduce((sum: number, ref: any) => sum + (ref.status !== 'FAILED' ? ref.amount : 0), 0);
    if (totalRefunded + request.amount > payment.amount) {
      throw new Error('Total approved refunds exceed payment captured amount');
    }

    await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id').update({ status: 'APPROVED' });

    const refund = await tx.orm.public.Refund.select('id', 'status').create({
      paymentId: request.paymentId,
      amount: request.amount,
      currency: payment.currency,
      status: 'PROCESSING'
    });

    await notifyPerson(request.personId, {
      type: 'PAYMENT',
      title: 'Refund Approved',
      body: `Your refund request for ${request.amount} ${payment.currency} has been approved and is processing.`
    });

    return refund;
  });
}

export async function rejectRefund(refundRequestId: string, reason: string, merchantPersonId?: string) {
  if (!refundRequestId || typeof refundRequestId !== 'string') {
    throw new Error('Invalid refundRequestId');
  }

  // Derive acting identity strictly from authenticated server session
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.personId) {
    throw new Error('UNAUTHORIZED: Authentication required to reject refund');
  }
  if (merchantPersonId && merchantPersonId !== session.user.personId) {
    throw new Error('FORBIDDEN: Identity mismatch with authenticated session');
  }
  const actingPersonId = session.user.personId;

  return await db.transaction(async (tx) => {
    // Lock the refund request row to prevent concurrent mutations
    await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id').update({ status: 'REQUESTED' });

    const request = await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id', 'personId', 'status', 'organizationId').all().first();
    if (!request) throw new Error('Refund request not found');
    if (request.status !== 'REQUESTED') throw new Error('Invalid or already processed refund request');

    if (!request.organizationId) {
      throw new Error('FORBIDDEN: Cannot reject refund without valid organization relationship');
    }

    // Authoritative server-side membership check inside transaction
    const membership = await tx.orm.public.Membership.where({
      personId: actingPersonId,
      organizationId: request.organizationId
    }).all().first();

    if (!membership) {
      throw new Error(`FORBIDDEN: User does not belong to organization ${request.organizationId}`);
    }

    const roles = await tx.orm.public.MembershipRole.where({ membershipId: membership.id }).all();
    const hasAuth = roles.some((r: any) => ['OWNER', 'ADMIN', 'FINANCE', 'MANAGER'].includes(r.role));
    if (!hasAuth) {
      throw new Error('FORBIDDEN: Insufficient role to reject refund');
    }

    await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id').update({ status: 'REJECTED' });

    await notifyPerson(request.personId, {
      type: 'SYSTEM',
      title: 'Refund Rejected',
      body: `Your refund request was rejected. Reason: ${reason}`
    });

    return { success: true };
  });
}

export async function reportRefund(refundRequestId: string, reason: string) {
  return await db.transaction(async (tx) => {
    const request = await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id', 'status').all().first();
    if (!request || request.status !== 'REJECTED') {
      throw new Error('Only REJECTED refund requests can be disputed');
    }

    const dispute = await tx.orm.public.RefundDispute.select('id', 'status').create({
      refundRequestId,
      reason,
      status: 'DISPUTE_OPEN'
    });

    return dispute;
  });
}

export async function resolveRefundDispute(disputeId: string, resolution: 'RESOLVED_REFUND' | 'RESOLVED_UPHELD', notes?: string) {
  return await db.transaction(async (tx) => {
    const dispute = await tx.orm.public.RefundDispute.where({ id: disputeId }).select('id', 'refundRequestId', 'status').all().first();
    if (!dispute) throw new Error('Dispute not found');
    if (dispute.status !== 'DISPUTE_OPEN') throw new Error('Dispute is not open');

    await tx.orm.public.RefundDispute.where({ id: disputeId }).select('id').update({
      status: resolution,
    });

    if (resolution === 'RESOLVED_REFUND') {
      const req = await tx.orm.public.RefundRequest.where({ id: dispute.refundRequestId }).all().first();
      if (req) {
        await tx.orm.public.RefundRequest.where({ id: req.id }).select('id').update({ status: 'APPROVED' });
        const payment = await tx.orm.public.Payment.where({ id: req.paymentId }).all().first();
        if (payment) {
          await tx.orm.public.Refund.select('id', 'status').create({
            paymentId: payment.id,
            amount: req.amount,
            currency: payment.currency,
            status: 'PROCESSING'
          });
          await notifyPerson(req.personId, {
            type: 'PAYMENT',
            title: 'Dispute Resolved — Refund Approved',
            body: `Your dispute was resolved in your favor. A refund of ${req.amount} ${payment.currency} has been approved.`
          });
        }
      }
    } else {
      const req = await tx.orm.public.RefundRequest.where({ id: dispute.refundRequestId }).all().first();
      if (req) {
        await notifyPerson(req.personId, {
          type: 'SYSTEM',
          title: 'Dispute Resolved — Merchant Upheld',
          body: `Your dispute review has concluded. The original rejection was upheld: ${notes || 'No additional notes'}`
        });
      }
    }

    return { success: true, status: resolution };
  });
}

