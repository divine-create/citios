"use client";

import React, { useEffect, useState } from "react";
import { GraduationCap, ArrowRight } from "lucide-react";
import { getPromotionCandidates, promoteStudents } from "@/lib/actions/school";

const GRADUATE = "GRADUATE";

interface PromotionData {
  section: any;
  students: any[];
  suggestedTargetId: string | null;
  candidateSections: any[];
}

export default function PromotionPanel({ organizationId, classSectionId, onDone }: {
  organizationId: string;
  classSectionId: string;
  onDone?: () => void;
}) {
  const [data, setData] = useState<PromotionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkTarget, setBulkTarget] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ promoted: number; graduated: number } | null>(null);

  const load = async () => {
    if (!classSectionId) { setData(null); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await getPromotionCandidates(organizationId, classSectionId);
      if (!res || (res as any).error) { setData(null); return; }
      const typed = res as PromotionData;
      setData(typed);
      const initialDecisions: Record<string, string> = {};
      const initialSelected: Record<string, boolean> = {};
      for (const s of typed.students) {
        initialDecisions[s.id] = typed.suggestedTargetId ?? "";
        initialSelected[s.id] = true;
      }
      setDecisions(initialDecisions);
      setSelected(initialSelected);
      setBulkTarget(typed.suggestedTargetId ?? "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSectionId]);

  const applyBulk = () => {
    if (!data || !bulkTarget) return;
    setDecisions((prev) => {
      const next = { ...prev };
      for (const s of data.students) {
        if (selected[s.id]) next[s.id] = bulkTarget;
      }
      return next;
    });
  };

  const submit = async () => {
    if (!data) return;
    const toSubmit = data.students
      .filter((s) => selected[s.id] && decisions[s.id])
      .map((s) => ({ studentDataId: s.id, target: decisions[s.id] }));
    if (toSubmit.length === 0) return;
    if (!confirm(`Apply promotion decisions for ${toSubmit.length} student${toSubmit.length === 1 ? "" : "s"}?`)) return;
    setIsSaving(true);
    try {
      const res = await promoteStudents(organizationId, toSubmit);
      if ((res as any)?.error) { alert((res as any).error); return; }
      setResult({ promoted: (res as any).promoted ?? 0, graduated: (res as any).graduated ?? 0 });
      await load();
      onDone?.();
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-400 py-8 text-center">Loading...</p>;
  if (!data) return <p className="text-sm text-slate-500 py-8 text-center">Select a class section to promote.</p>;

  return (
    <div className="space-y-4">
      {result && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
          Done — {result.promoted} student{result.promoted === 1 ? "" : "s"} moved, {result.graduated} graduated.
        </div>
      )}

      {data.students.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">No active students in this class section.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-slate-600">Apply to all selected:</span>
            <select value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white">
              <option value="">— Select —</option>
              <option value={GRADUATE}>🎓 Graduate (leaving school)</option>
              {data.candidateSections.map((s: any) => (
                <option key={s.id} value={s.id}>{s.gradeName} - {s.name} ({s.academicYearLabel})</option>
              ))}
            </select>
            <button onClick={applyBulk} disabled={!bulkTarget} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors">
              Apply to Selected
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3"><ArrowRight size={14} className="inline mr-1" />Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.students.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={!!selected[s.id]}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{s.firstName} {s.lastName}</td>
                      <td className="px-4 py-3">
                        <select
                          value={decisions[s.id] ?? ""}
                          onChange={(e) => setDecisions((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="">— Leave as is —</option>
                          <option value={GRADUATE}>🎓 Graduate (leaving school)</option>
                          {data.candidateSections.map((cs: any) => (
                            <option key={cs.id} value={cs.id}>{cs.gradeName} - {cs.name} ({cs.academicYearLabel})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              <GraduationCap size={16} /> {isSaving ? "Applying..." : "Apply Promotion"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
