'use client';

import React, { useState } from 'react';
import { Badge, Button, Input } from '@/components/ui';
import { updateSupportCaseStatus, approveMerchantRefundRequest, rejectMerchantRefundRequest } from '@/app/actions/merchant-support';
import { useRouter } from 'next/navigation';

export default function MerchantSupportHub({ 
  organizationId,
  supportCases,
  refundRequests 
}: {
  organizationId: string;
  supportCases: any[];
  refundRequests: any[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'CASES' | 'REFUNDS'>('CASES');

  const handleUpdateStatus = async (caseId: string, status: 'OPEN' | 'IN_REVIEW' | 'WAITING_FOR_RESIDENT' | 'RESOLVED' | 'CLOSED') => {
    try {
      await updateSupportCaseStatus(organizationId, caseId, status);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApproveRefund = async (reqId: string) => {
    if (!confirm('Approve this refund request?')) return;
    try {
      await approveMerchantRefundRequest(organizationId, reqId);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectRefund = async (reqId: string) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    try {
      await rejectMerchantRefundRequest(organizationId, reqId, reason);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Support & Disputes</h1>
        <div className="flex gap-2">
          <Button variant={activeTab === 'CASES' ? 'primary' : 'outline'} onClick={() => setActiveTab('CASES')}>
            Support Cases ({supportCases.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length})
          </Button>
          <Button variant={activeTab === 'REFUNDS' ? 'primary' : 'outline'} onClick={() => setActiveTab('REFUNDS')}>
            Refund Requests ({refundRequests.filter(r => r.status === 'REQUESTED').length})
          </Button>
        </div>
      </div>

      {activeTab === 'CASES' && (
        <div className="space-y-4">
          {supportCases.length === 0 ? (
            <p className="text-slate-500">No support cases found.</p>
          ) : (
            supportCases.map((c) => (
              <div className="bg-white rounded-lg border shadow-sm" key={c.id}>
                <div className="p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default">{c.status}</Badge>
                      <Badge variant="default">{c.category}</Badge>
                      <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="font-semibold text-slate-900">{c.description}</p>
                    <p className="text-sm text-slate-500 mt-1">Source: {c.sourceType} ({c.sourceId})</p>
                  </div>
                  
                  <div className="flex gap-2">
                    {c.status === 'OPEN' && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(c.id, 'IN_REVIEW')}>
                        Mark In Review
                      </Button>
                    )}
                    {['OPEN', 'IN_REVIEW', 'WAITING_FOR_RESIDENT'].includes(c.status) && (
                      <Button size="sm" variant="primary" onClick={() => handleUpdateStatus(c.id, 'RESOLVED')}>
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'REFUNDS' && (
        <div className="space-y-4">
          {refundRequests.length === 0 ? (
            <p className="text-slate-500">No refund requests found.</p>
          ) : (
            refundRequests.map((r) => (
              <div className="bg-white rounded-lg border shadow-sm" key={r.id}>
                <div className="p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default">{r.status}</Badge>
                      <span className="font-bold text-lg text-slate-900">${r.amount.toFixed(2)}</span>
                      <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700">{r.reason || 'No reason provided'}</p>
                    <p className="text-sm text-slate-500 mt-1">Payment ID: {r.paymentId}</p>
                  </div>
                  
                  {r.status === 'REQUESTED' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" onClick={() => handleRejectRefund(r.id)}>
                        Reject
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => handleApproveRefund(r.id)}>
                        Approve Refund
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
