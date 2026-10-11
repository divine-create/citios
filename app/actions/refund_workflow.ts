import { db } from '@/src/prisma/db';
import { notifyPerson } from '@/lib/notify';

export async function requestRefund(paymentId: string, personId: string, amount: number, reason: string) {
  return await db.transaction(async (tx) => {
    const payment = await tx.orm.public.Payment.where({ id: paymentId }).all().first();

    if (!payment) throw new Error('Payment not found');
    if (payment.status !== 'COMPLETED') {
      throw new Error('Only COMPLETED payments can be refunded');
    }

    // (authorization omitted for FUND_WALLET since payment doesn't have sourceType natively)

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

    let orgId = '';
    if (payment.retailOrderId) {
      const order = await tx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).select('id', 'organizationId').all().first();
      orgId = order?.organizationId || '';
    } else if (payment.restaurantOrderId) {
      const order = await tx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).select('id', 'organizationId').all().first();
      orgId = order?.organizationId || '';
    }

    const request = await tx.orm.public.RefundRequest.select('id', 'status').create({
      paymentId,
      personId,
      organizationId: orgId,
      amount,
      reason,
      status: 'REQUESTED'
    });
    
    // Notification to merchant is not natively possible yet since we only notify Persons, not Organizations.
    // Merchants would check their dashboard. But we notify the resident they requested it in the calling resident action.

    return request;
  });
}

export async function approveRefund(refundRequestId: string, merchantPersonId: string) {
  return await db.transaction(async (tx) => {
    // Lock the refund request row to prevent concurrent approvals
    await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id').update({ status: 'REQUESTED' });
    
    const request = await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id', 'status', 'paymentId', 'amount', 'personId', 'organizationId').all().first();

    if (!request || request.status !== 'REQUESTED') {
      throw new Error('Invalid or already processed refund request');
    }

    // Verify merchant membership and permission if request belongs to an organization
    if (request.organizationId && merchantPersonId) {
      const membership = await tx.orm.public.Membership.where({
        personId: merchantPersonId,
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
    }

    const payment = await tx.orm.public.Payment.where({ id: request.paymentId }).all().first();
    if (!payment) throw new Error('Payment not found');

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
  return await db.transaction(async (tx) => {
    // Lock the refund request row to prevent concurrent mutations
    await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id').update({ status: 'REQUESTED' });

    const request = await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id', 'personId', 'status', 'organizationId').all().first();
    if (!request) throw new Error('Refund request not found');
    if (request.status !== 'REQUESTED') throw new Error('Invalid or already processed refund request');

    // Verify merchant membership and permission if request belongs to an organization
    if (request.organizationId && merchantPersonId) {
      const membership = await tx.orm.public.Membership.where({
        personId: merchantPersonId,
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
    }

    await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id').update({ status: 'REJECTED' });

    await notifyPerson(request.personId, {
      type: 'SYSTEM',
      title: 'Refund Rejected',
      body: `Your refund request was rejected. Reason: ${reason}`
    });
  });
}

export async function reportRefund(refundRequestId: string, reason: string) {
  return await db.transaction(async (tx) => {
    const request = await tx.orm.public.RefundRequest.where({ id: refundRequestId }).select('id', 'status').all().first();
    if (!request || request.status !== 'REJECTED') {
      throw new Error('Only REJECTED refund requests can be disputed');
    }

    const dispute = await tx.orm.public.RefundDispute.select('id').create({
      refundRequestId,
      reason,
      status: 'DISPUTE_OPEN'
    });

    return dispute;
  });
}
