'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getResidentActivityDetail } from '@/lib/resident-activity/compose';
import { notifyPerson } from '@/lib/notify';

export async function createSupportCase(input: {
  sourceType: string;
  sourceId: string;
  category: string;
  description: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');
  
  const detail = await getResidentActivityDetail(session.user.personId, input.sourceType, input.sourceId);
  if (!detail) throw new Error('Resource not found or unauthorized');

  const merchantId = detail.merchantId || null;

  const existing = await db.orm.public.SupportCase.where({
    personId: session.user.personId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    category: input.category,
  }).all().first();
  if (existing) return existing.id; // Idempotent return

  const supportCase = await db.orm.public.SupportCase.create({
    personId: session.user.personId,
    organizationId: merchantId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    category: input.category,
    description: input.description,
    status: 'OPEN',
    priority: 'MEDIUM'
  });

  await notifyPerson(session.user.personId, {
    type: 'SYSTEM',
    title: 'Support Case Created',
    body: `Your issue regarding ${detail.headline} has been received.`,
  });

  return supportCase.id;
}

export async function requestRefund(input: {
  sourceType: string;
  sourceId: string;
  reason: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');
  
  const detail = await getResidentActivityDetail(session.user.personId, input.sourceType, input.sourceId);
  if (!detail) throw new Error('Resource not found or unauthorized');

  let paymentId: string | null = null;
  if (input.sourceType === 'RETAIL_ORDER') {
    const p = await db.orm.public.Payment.where({ retailOrderId: input.sourceId }).all().first();
    paymentId = p?.id || null;
  } else if (input.sourceType === 'RESTAURANT_ORDER') {
    const p = await db.orm.public.Payment.where({ restaurantOrderId: input.sourceId }).all().first();
    paymentId = p?.id || null;
  } else if (input.sourceType === 'SERVICE_JOB') {
    // Payment relations for Service Jobs are not fully implemented natively yet.
    paymentId = null;
  }

  if (!paymentId) throw new Error('No payment found for this order');

  const payment = await db.orm.public.Payment.where({ id: paymentId }).all().first();
  if (!payment) throw new Error('Payment not found');
  
  if (payment.amount <= payment.refundedAmount) {
     throw new Error('Payment already fully refunded');
  }

  const existingReq = await db.orm.public.RefundRequest.where({ 
    paymentId, 
  }).all();

  const activeReq = existingReq.find((r: any) => r.status === 'REQUESTED' || r.status === 'APPROVED');
  if (activeReq) throw new Error('Refund already requested');

  const req = await db.orm.public.RefundRequest.create({
    paymentId,
    personId: session.user.personId,
    organizationId: detail.merchantId || '',
    amount: payment.amount - payment.refundedAmount,
    reason: input.reason,
    status: 'REQUESTED'
  });

  await notifyPerson(session.user.personId, {
    type: 'SYSTEM',
    title: 'Refund Requested',
    body: `Your refund request for ${detail.headline} is under review.`,
  });

  return req.id;
}
