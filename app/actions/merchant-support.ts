'use server';

import { db } from '@/src/prisma/db';
import { requireMembership } from '@/lib/actions/tenant';
import { approveRefund as coreApproveRefund, rejectRefund as coreRejectRefund } from '@/app/actions/refund_workflow';

export async function getMerchantSupportCases(organizationId: string) {
  await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN', 'FINANCE']);
  return await db.orm.public.SupportCase.where({ organizationId }).all();
}

export async function getMerchantSupportCase(organizationId: string, caseId: string) {
  await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN', 'FINANCE']);
  return await db.orm.public.SupportCase.where({ id: caseId, organizationId }).all().first();
}

export async function updateSupportCaseStatus(organizationId: string, caseId: string, status: 'OPEN' | 'IN_REVIEW' | 'WAITING_FOR_RESIDENT' | 'RESOLVED' | 'CLOSED') {
  await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
  
  const supportCase = await db.orm.public.SupportCase.where({ id: caseId, organizationId }).all().first();
  if (!supportCase) throw new Error('Support Case not found');
  
  const currentStatus = supportCase.status;
  
  const allowedTransitions: Record<string, string[]> = {
    'OPEN': ['IN_REVIEW', 'RESOLVED', 'CLOSED'],
    'IN_REVIEW': ['WAITING_FOR_RESIDENT', 'RESOLVED', 'CLOSED'],
    'WAITING_FOR_RESIDENT': ['IN_REVIEW', 'RESOLVED', 'CLOSED'],
    'RESOLVED': ['CLOSED'],
    'CLOSED': [] // Terminal state
  };

  if (!allowedTransitions[currentStatus]?.includes(status)) {
    throw new Error(`Invalid transition from ${currentStatus} to ${status}`);
  }

  await db.orm.public.SupportCase.where({ id: caseId }).update({ status });
  
  // Notification can be handled in a separate concern or here. Let's do it here.
  const { notifyPerson } = await import('@/lib/notify');
  await notifyPerson(supportCase.personId, {
    type: 'SYSTEM',
    title: 'Support Case Updated',
    body: `Your support case status is now ${status}.`,
    href: `/activity/${supportCase.id}` // simplified url
  });
  
  return { success: true };
}

export async function getMerchantRefundRequests(organizationId: string) {
  await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN', 'FINANCE']);
  return await db.orm.public.RefundRequest.where({ organizationId }).all();
}

export async function getMerchantRefundRequest(organizationId: string, requestId: string) {
  await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN', 'FINANCE']);
  return await db.orm.public.RefundRequest.where({ id: requestId, organizationId }).all().first();
}

export async function approveMerchantRefundRequest(organizationId: string, requestId: string) {
  const { person } = await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN', 'FINANCE']);
  
  const req = await db.orm.public.RefundRequest.where({ id: requestId, organizationId }).all().first();
  if (!req) throw new Error('Refund Request not found');
  
  await coreApproveRefund(requestId, person.id);
  
  return { success: true };
}

export async function rejectMerchantRefundRequest(organizationId: string, requestId: string, reason: string) {
  await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN', 'FINANCE']);
  
  const req = await db.orm.public.RefundRequest.where({ id: requestId, organizationId }).all().first();
  if (!req) throw new Error('Refund Request not found');
  
  await coreRejectRefund(requestId, reason);
  
  return { success: true };
}
