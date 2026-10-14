'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupportCase, requestRefund } from '@/lib/actions/resident-support';
import Link from 'next/link';

export default function ResidentSupportHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const sourceType = searchParams?.get('sourceType');
  const sourceId = searchParams?.get('sourceId');
  const action = searchParams?.get('action'); // 'refund' or null

  const [category, setCategory] = useState('GENERAL');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceType || !sourceId) {
      setError('Missing order or context to report an issue on.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      if (action === 'refund') {
        await requestRefund({
          sourceType,
          sourceId,
          reason: description,
        });
      } else {
        await createSupportCase({
          sourceType,
          sourceId,
          category,
          description,
        });
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          ✓
        </div>
        <h1 className="text-2xl font-black text-ink">Request Submitted</h1>
        <p className="text-slate-600 font-medium">
          We&apos;ve received your {action === 'refund' ? 'refund request' : 'issue report'}. 
          You will receive a notification when there is an update.
        </p>
        <Link href={`/activity/${sourceType}/${sourceId}`} className="inline-block py-3 px-6 bg-slate-100 text-slate-800 font-bold rounded-xl mt-4">
          Return to Activity
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 pb-24">
      <h1 className="text-2xl font-black text-ink mb-2">
        {action === 'refund' ? 'Request a Refund' : 'Report an Issue'}
      </h1>
      <p className="text-slate-500 font-medium mb-8">
        We&apos;re sorry you experienced an issue. Let us know what happened.
      </p>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl font-medium mb-6">
          {error}
        </div>
      )}

      {!sourceType ? (
        <div className="text-center py-12 text-slate-500">
          <p>Please select an activity from your history to report an issue.</p>
          <Link href="/activity" className="inline-block mt-4 text-blue-600 font-bold">Go to Activity</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {action !== 'refund' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Issue Type</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-ink font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="GENERAL">General Issue</option>
                <option value="MISSING_ITEM">Missing Item</option>
                <option value="WRONG_ITEM">Wrong Item</option>
                <option value="DAMAGED_ITEM">Damaged Item</option>
                <option value="DELIVERY_LATE">Late Delivery</option>
                <option value="DELIVERY_NOT_RECEIVED">Delivery Not Received</option>
                <option value="PAYMENT_FAILED">Payment Issue</option>
                <option value="SERVICE_QUALITY_ISSUE">Service Quality</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              {action === 'refund' ? 'Reason for refund' : 'Description'}
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-ink font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-ink text-white font-bold rounded-xl disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
          
          <div className="text-center">
            <Link href={`/activity/${sourceType}/${sourceId}`} className="text-sm font-medium text-slate-500 hover:text-slate-800">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
