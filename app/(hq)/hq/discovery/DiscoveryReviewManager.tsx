'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Pencil, AlertCircle, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import {
  updateAndApproveListing,
  rejectScrapedListing,
  bulkApproveScrapedListings,
} from '@/lib/actions/discovery-admin';

interface Listing {
  id: string;
  organizationId: string;
  cityName: string;
  title: string;
  vertical: string;
  description: string;
  address: string;
  isActive: boolean;
  approvalStatus: string;
  sourceName: string;
  confidenceScore: number;
  primaryPhone: string;
  primaryEmail: string;
}

const VERTICALS = ['RESTAURANT', 'RETAIL', 'HOTEL', 'SCHOOL', 'HEALTHCARE', 'PHARMACY', 'SERVICES'];

const inputCls =
  'w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500';

export default function DiscoveryReviewManager({
  initialListings,
  mode,
}: {
  initialListings: Listing[];
  mode: 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED';
}) {
  const router = useRouter();
  const [items, setItems] = useState<Listing[]>(initialListings);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const remove = (ids: string[]) => {
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setSelected(new Set());
    setEditingId(null);
    router.refresh();
  };

  const startEdit = (l: Listing) => {
    setEditingId(l.id);
    setDraft({
      title: l.title,
      vertical: l.vertical,
      address: l.address,
      phone: l.primaryPhone,
      email: l.primaryEmail,
      description: l.description,
    });
  };

  const approve = async (l: Listing) => {
    setBusy(l.id);
    setMsg(null);
    try {
      const d = editingId === l.id ? draft : {
        title: l.title, vertical: l.vertical, address: l.address,
        phone: l.primaryPhone, email: l.primaryEmail, description: l.description,
      };
      const res = await updateAndApproveListing({ listingId: l.id, ...d } as any);
      if (res.error) setMsg({ text: res.error, ok: false });
      else {
        setMsg({ text: res.message!, ok: true });
        remove([l.id]);
      }
    } catch (e: any) {
      setMsg({ text: e.message || 'Failed', ok: false });
    } finally {
      setBusy(null);
    }
  };

  const reject = async (l: Listing) => {
    setBusy(l.id);
    setMsg(null);
    try {
      const res = await rejectScrapedListing(l.id, 'Rejected during admin review');
      if (res.error) setMsg({ text: res.error, ok: false });
      else {
        setMsg({ text: `"${l.title}" rejected.`, ok: true });
        remove([l.id]);
      }
    } catch (e: any) {
      setMsg({ text: e.message || 'Failed', ok: false });
    } finally {
      setBusy(null);
    }
  };

  const bulkApprove = async () => {
    setBusy('bulk');
    setMsg(null);
    try {
      const ids = Array.from(selected);
      const res = await bulkApproveScrapedListings(ids);
      if (res.error) setMsg({ text: res.error, ok: false });
      else {
        setMsg({ text: res.message!, ok: true });
        remove(ids);
      }
    } catch (e: any) {
      setMsg({ text: e.message || 'Failed', ok: false });
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (items.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-400">
        Nothing here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            msg.ok
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {mode === 'PENDING_REVIEW' && (
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
          <button
            onClick={() =>
              setSelected(selected.size === items.length ? new Set() : new Set(items.map((i) => i.id)))
            }
            className="text-xs font-bold text-slate-300 hover:text-white"
          >
            {selected.size === items.length ? 'Clear selection' : 'Select all'}
          </button>
          <button
            disabled={selected.size === 0 || busy === 'bulk'}
            onClick={bulkApprove}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black"
          >
            {busy === 'bulk' ? 'Publishing...' : `Approve selected (${selected.size})`}
          </button>
        </div>
      )}

      {items.map((l) => {
        const editing = editingId === l.id;
        return (
          <div key={l.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              {mode === 'PENDING_REVIEW' && (
                <input
                  type="checkbox"
                  checked={selected.has(l.id)}
                  onChange={() => toggle(l.id)}
                  className="mt-1.5"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-white">{l.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-400 uppercase">
                    {l.vertical}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {l.cityName}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300">
                    {l.sourceName} · {Math.round(l.confidenceScore * 100)}%
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{l.address || 'No address'}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{l.primaryPhone || 'No phone'}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{l.primaryEmail || 'No email'}</span>
                </div>
              </div>
              <a
                href={`/org/${l.organizationId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal-400 hover:underline flex items-center gap-1 shrink-0"
              >
                Preview <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {editing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                <input className={inputCls} placeholder="Business name" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                <select className={inputCls} value={draft.vertical} onChange={(e) => setDraft({ ...draft, vertical: e.target.value })}>
                  {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <input className={inputCls} placeholder="Address" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
                <input className={inputCls} placeholder="Phone (e.g. 08012345678)" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                <input className={inputCls} placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                <textarea className={`${inputCls} sm:col-span-2`} rows={2} placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
            )}

            {mode !== 'PUBLISHED' && (
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                {mode === 'PENDING_REVIEW' && (
                  <button disabled={busy === l.id} onClick={() => reject(l)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold">
                    <XCircle className="w-3.5 h-3.5 text-red-400" /> Reject
                  </button>
                )}
                <button
                  onClick={() => (editing ? setEditingId(null) : startEdit(l))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  <Pencil className="w-3.5 h-3.5" /> {editing ? 'Cancel edit' : 'Edit'}
                </button>
                <button disabled={busy === l.id} onClick={() => approve(l)} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {busy === l.id ? 'Publishing...' : editing ? 'Save & Publish' : 'Approve & Publish'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
