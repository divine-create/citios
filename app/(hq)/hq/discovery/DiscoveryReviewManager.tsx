'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Pencil,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Search,
  Clock,
  Tag,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
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
  sourceUrl?: string;
  originalCategory?: string;
  tags?: string[];
  hours?: string;
  instagram?: string;
  confidenceScore: number;
  primaryPhone: string;
  primaryEmail: string;
  whatsapp?: string;
  website?: string;
}

const VERTICALS = [
  'HOTEL',
  'RESTAURANT',
  'HEALTHCARE',
  'SERVICES',
  'EVENT_ORGANIZER',
  'PHARMACY',
  'RETAIL',
  'SCHOOL',
  'LOGISTICS',
];

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

  // Filter & Search states
  const [selectedVertical, setSelectedVertical] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const remove = (ids: string[]) => {
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
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
      const d =
        editingId === l.id
          ? draft
          : {
              title: l.title,
              vertical: l.vertical,
              address: l.address,
              phone: l.primaryPhone,
              email: l.primaryEmail,
              description: l.description,
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

  const bulkApprove = async (targetIds?: string[]) => {
    setBusy('bulk');
    setMsg(null);
    try {
      const ids = targetIds || Array.from(selected);
      if (ids.length === 0) return;
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

  // Category counts across current list
  const verticalCounts: Record<string, number> = {};
  for (const item of items) {
    verticalCounts[item.vertical] = (verticalCounts[item.vertical] || 0) + 1;
  }

  // Filter items by category chip and search query
  const filteredItems = items.filter((item) => {
    if (selectedVertical !== 'ALL' && item.vertical !== selectedVertical) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchAddress = (item.address || '').toLowerCase().includes(q);
      const matchPhone =
        (item.primaryPhone || '').includes(q) || (item.whatsapp || '').includes(q);
      const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchSource = (item.sourceName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchAddress && !matchPhone && !matchTags && !matchSource) {
        return false;
      }
    }
    return true;
  });

  const selectAllFiltered = () => {
    const allFilteredIds = filteredItems.map((i) => i.id);
    const allSelected = allFilteredIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...allFilteredIds]));
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">All Clear</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          There are currently no listings in this status queue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 animate-in fade-in ${
            msg.ok
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {msg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Category Chips and Live Search Bar */}
      <div className="space-y-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by business name, address, phone, or tags (e.g. WiFi, Marian)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"
            >
              Clear Search
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedVertical('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedVertical === 'ALL'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Categories ({items.length})
          </button>

          {Object.entries(verticalCounts).map(([vertical, count]) => (
            <button
              key={vertical}
              onClick={() => setSelectedVertical(vertical)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedVertical === vertical
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{vertical}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedVertical === vertical ? 'bg-teal-800 text-teal-100' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Controls */}
      {mode === 'PENDING_REVIEW' && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAllFiltered}
              className="text-xs font-bold text-slate-300 hover:text-white"
            >
              {filteredItems.every((i) => selected.has(i.id)) && filteredItems.length > 0
                ? 'Clear Filtered Selection'
                : `Select All in View (${filteredItems.length})`}
            </button>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400">
              <strong className="text-white font-mono">{selected.size}</strong> selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                disabled={busy === 'bulk'}
                onClick={() => bulkApprove()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black transition-colors"
              >
                {busy === 'bulk' ? 'Publishing...' : `Approve Selected (${selected.size})`}
              </button>
            )}

            {filteredItems.length > 0 && selected.size === 0 && (
              <button
                disabled={busy === 'bulk'}
                onClick={() => {
                  if (confirm(`Approve all ${filteredItems.length} businesses matching the current filter?`)) {
                    bulkApprove(filteredItems.map((i) => i.id));
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Approve All Visible ({filteredItems.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Listing Cards */}
      <div className="space-y-4">
        {filteredItems.map((l) => {
          const editing = editingId === l.id;
          const waDigits = (l.whatsapp || '').replace(/[^0-9]/g, '');

          return (
            <div key={l.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex items-start gap-3.5">
                {mode === 'PENDING_REVIEW' && (
                  <input
                    type="checkbox"
                    checked={selected.has(l.id)}
                    onChange={() => toggle(l.id)}
                    className="mt-1.5 w-4 h-4 rounded border-slate-700 text-teal-600 focus:ring-teal-500"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white">{l.title}</h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-400 uppercase tracking-wider">
                      {l.vertical}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {l.cityName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300">
                      {l.sourceName} · {Math.round(l.confidenceScore * 100)}%
                    </span>
                    {l.originalCategory && l.originalCategory !== l.vertical && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Src: {l.originalCategory}
                      </span>
                    )}
                  </div>

                  {/* Primary details */}
                  <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {l.address || 'No address specified'}
                    </span>
                    {l.primaryPhone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-mono text-slate-300">{l.primaryPhone}</span>
                      </span>
                    )}
                    {l.whatsapp && (
                      <a
                        href={`https://wa.me/${waDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-emerald-400 hover:underline"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono">{l.whatsapp}</span>
                      </a>
                    )}
                    {l.primaryEmail && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {l.primaryEmail}
                      </span>
                    )}
                    {l.hours && (
                      <span className="flex items-center gap-1.5 text-amber-400/90">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {l.hours}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {l.tags && l.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {l.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description preview */}
                  {l.description && (
                    <p className="mt-2.5 text-xs text-slate-400/90 leading-relaxed line-clamp-2">
                      {l.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {l.sourceUrl && (
                    <a
                      href={l.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-teal-400 flex items-center gap-1"
                    >
                      Source <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <a
                    href={`/org/${l.organizationId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                  >
                    Public Page <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Edit Mode Form */}
              {editing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800 animate-in fade-in">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Business Name</label>
                    <input
                      className={inputCls}
                      placeholder="Business name"
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Vertical Category</label>
                    <select
                      className={inputCls}
                      value={draft.vertical}
                      onChange={(e) => setDraft({ ...draft, vertical: e.target.value })}
                    >
                      {VERTICALS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Street Address</label>
                    <input
                      className={inputCls}
                      placeholder="Address"
                      value={draft.address}
                      onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Phone Number</label>
                    <input
                      className={inputCls}
                      placeholder="Phone (e.g. 08012345678)"
                      value={draft.phone}
                      onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Description</label>
                    <textarea
                      className={inputCls}
                      rows={2}
                      placeholder="Business description"
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {mode !== 'PUBLISHED' && (
                <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-800">
                  {mode === 'PENDING_REVIEW' && (
                    <button
                      disabled={busy === l.id}
                      onClick={() => reject(l)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-400" /> Reject
                    </button>
                  )}
                  <button
                    onClick={() => (editing ? setEditingId(null) : startEdit(l))}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-400" /> {editing ? 'Cancel' : 'Edit'}
                  </button>
                  <button
                    disabled={busy === l.id}
                    onClick={() => approve(l)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />{' '}
                    {busy === l.id ? 'Publishing...' : editing ? 'Save & Publish' : 'Approve & Publish'}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-500 space-y-2">
            <Search className="w-6 h-6 text-slate-600 mx-auto" />
            <p className="font-bold text-white">No businesses match your filter</p>
            <p>Try clearing the search query or selecting a different category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
