"use client";

import React, { useEffect, useState } from "react";
import { Award, ClipboardList, TrendingUp, Plus, Edit2, Trash2, X, Eye, CheckCircle2 } from "lucide-react";
import ReportCardView from "./ReportCardView";
import PromotionPanel from "./PromotionPanel";
import {
  getGradingScales,
  createGradingScale,
  updateGradingScale,
  deleteGradingScale,
  createGradeBoundary,
  updateGradeBoundary,
  deleteGradeBoundary,
  getClassReportCards,
  getStudentReportCard,
  upsertReportCardRemarks,
  publishReportCard,
  unpublishReportCard,
  publishClassReportCards,
} from "@/lib/actions/school";

export type TabId = "reportcards" | "scales" | "promotion";

export const EXAMINATION_TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "reportcards", label: "Report Cards", icon: ClipboardList },
  { id: "scales", label: "Grading Scales", icon: Award },
  { id: "promotion", label: "Promotion", icon: TrendingUp },
];

interface ExaminationManagerProps {
  organizationId: string;
  activeTab: TabId;
  schoolName: string;
  classSections: any[];
  terms: any[];
  students: any[];
  refresh: () => void;
}

export default function ExaminationManager({ organizationId, activeTab, schoolName, classSections, terms, students, refresh }: ExaminationManagerProps) {
  const [scales, setScales] = useState<any[]>([]);
  const [scalesLoaded, setScalesLoaded] = useState(false);

  const loadScales = async () => {
    const data = await getGradingScales(organizationId);
    setScales(data);
    setScalesLoaded(true);
  };

  useEffect(() => {
    loadScales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAll = () => {
    loadScales();
    refresh();
  };

  return (
    <div>
      {activeTab === "reportcards" && (
        <ReportCardsPanel
          organizationId={organizationId} schoolName={schoolName} classSections={classSections} terms={terms}
          gradingScaleReady={scalesLoaded} refresh={refresh}
        />
      )}
      {activeTab === "scales" && <GradingScalesPanel organizationId={organizationId} scales={scales} refresh={refreshAll} />}
      {activeTab === "promotion" && <PromotionTab organizationId={organizationId} classSections={classSections} refresh={refresh} />}
    </div>
  );
}

// =====================================================================
// Promotion
// =====================================================================

function PromotionTab({ organizationId, classSections, refresh }: { organizationId: string; classSections: any[]; refresh: () => void }) {
  const [selectedSectionId, setSelectedSectionId] = useState(classSections[0]?.id ?? "");

  return (
    <div className="space-y-4">
      <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
        {classSections.length === 0 && <option value="">No class sections</option>}
        {classSections.map((s: any) => <option key={s.id} value={s.id}>{s.gradeName ?? ""} - {s.name}</option>)}
      </select>
      {selectedSectionId ? (
        <PromotionPanel organizationId={organizationId} classSectionId={selectedSectionId} onDone={refresh} />
      ) : (
        <p className="text-sm text-slate-500 py-8 text-center">Select a class section to promote.</p>
      )}
    </div>
  );
}

// =====================================================================
// Grading Scales
// =====================================================================

function GradingScalesPanel({ organizationId, scales, refresh }: { organizationId: string; scales: any[]; refresh: () => void }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", isDefault: false });
  const [managingScaleId, setManagingScaleId] = useState<string | null>(null);
  const [boundaryForm, setBoundaryForm] = useState({ minPercent: "", maxPercent: "", label: "", remark: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", isDefault: scales.length === 0 });
    setError(null);
    setIsAddOpen(true);
  };

  const openEdit = (scale: any) => {
    setEditId(scale.id);
    setForm({ name: scale.name, isDefault: scale.isDefault });
    setError(null);
    setIsAddOpen(true);
  };

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = editId
        ? await updateGradingScale(editId, form)
        : await createGradingScale(organizationId, form.name, form.isDefault);
      if (res.error) throw new Error(res.error);
      setIsAddOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this grading scale and all its boundaries?")) return;
    await deleteGradingScale(id);
    refresh();
  };

  const addBoundary = async (gradingScaleId: string) => {
    const min = parseFloat(boundaryForm.minPercent);
    const max = parseFloat(boundaryForm.maxPercent);
    if (isNaN(min) || isNaN(max) || !boundaryForm.label.trim()) return;
    const res = await createGradeBoundary({ gradingScaleId, minPercent: min, maxPercent: max, label: boundaryForm.label.trim(), remark: boundaryForm.remark || undefined });
    if (res?.error) { alert(res.error); return; }
    setBoundaryForm({ minPercent: "", maxPercent: "", label: "", remark: "" });
    refresh();
  };

  const removeBoundary = async (id: string) => {
    await deleteGradeBoundary(id);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Grading Scale
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {scales.length === 0 && <p className="text-sm text-slate-500">No grading scales yet — add one to start computing letter grades.</p>}
        {scales.map((scale) => (
          <div key={scale.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  {scale.name}
                  {scale.isDefault && <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Default</span>}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">{scale.boundaries.length} band{scale.boundaries.length === 1 ? "" : "s"}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(scale)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                <button onClick={() => remove(scale.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>

            {scale.boundaries.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {[...scale.boundaries].sort((a: any, b: any) => b.minPercent - a.minPercent).map((b: any) => (
                  <span key={b.id} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium text-slate-700">
                    {b.label} ({b.minPercent}-{b.maxPercent}{b.remark ? `, ${b.remark}` : ""})
                    <button onClick={() => removeBoundary(b.id)} className="text-slate-400 hover:text-red-600"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}

            {managingScaleId === scale.id ? (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Min %" value={boundaryForm.minPercent} onChange={(e) => setBoundaryForm((f) => ({ ...f, minPercent: e.target.value }))} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                  <input type="number" placeholder="Max %" value={boundaryForm.maxPercent} onChange={(e) => setBoundaryForm((f) => ({ ...f, maxPercent: e.target.value }))} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                  <input type="text" placeholder="Label (A, B...)" value={boundaryForm.label} onChange={(e) => setBoundaryForm((f) => ({ ...f, label: e.target.value }))} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                  <input type="text" placeholder="Remark (optional)" value={boundaryForm.remark} onChange={(e) => setBoundaryForm((f) => ({ ...f, remark: e.target.value }))} className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => addBoundary(scale.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">Add Band</button>
                  <button onClick={() => setManagingScaleId(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Done</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setManagingScaleId(scale.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                Add grade band
              </button>
            )}
          </div>
        ))}
      </div>

      {isAddOpen && (
        <Modal title={editId ? "Edit Grading Scale" : "Add Grading Scale"} onClose={() => setIsAddOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <TextField label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Standard Scale" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            Set as default scale
          </label>
          <ModalActions onCancel={() => setIsAddOpen(false)} onSubmit={submit} disabled={isSaving || !form.name.trim()} isSaving={isSaving} label={editId ? "Save Changes" : "Add Scale"} />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Report Cards
// =====================================================================

function ReportCardsPanel({ organizationId, schoolName, classSections, terms, gradingScaleReady, refresh }: {
  organizationId: string; schoolName: string; classSections: any[]; terms: any[]; gradingScaleReady: boolean; refresh: () => void;
}) {
  const [selectedSectionId, setSelectedSectionId] = useState(classSections[0]?.id ?? "");
  const [selectedTermId, setSelectedTermId] = useState(terms[0]?.id ?? "");
  const [data, setData] = useState<{ classSize: number; results: any[]; gradingScale: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [remarksForm, setRemarksForm] = useState({ comments: "", teacherNotes: "", principalNotes: "" });
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    if (!selectedSectionId || !selectedTermId) { setData(null); return; }
    setLoading(true);
    try {
      const res = await getClassReportCards(organizationId, selectedSectionId, selectedTermId);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId, selectedTermId]);

  const openPreview = async (studentDataId: string) => {
    setPreviewStudentId(studentDataId);
    const res = await getStudentReportCard(organizationId, studentDataId, selectedTermId);
    setPreviewData(res);
    setRemarksForm({
      comments: res?.reportCard?.comments || "",
      teacherNotes: res?.reportCard?.teacherNotes || "",
      principalNotes: res?.reportCard?.principalNotes || "",
    });
  };

  const closePreview = () => {
    setPreviewStudentId(null);
    setPreviewData(null);
  };

  const saveRemarks = async () => {
    if (!previewStudentId) return;
    setIsSaving(true);
    try {
      await upsertReportCardRemarks(organizationId, previewStudentId, selectedTermId, remarksForm);
      await openPreview(previewStudentId);
      load();
      refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublish = async (studentDataId: string, currentlyPublished: boolean) => {
    if (currentlyPublished) await unpublishReportCard(studentDataId, selectedTermId);
    else await publishReportCard(organizationId, studentDataId, selectedTermId);
    if (previewStudentId === studentDataId) await openPreview(studentDataId);
    load();
    refresh();
  };

  const publishAll = async () => {
    if (!selectedSectionId || !confirm("Publish report cards for every student in this class section?")) return;
    await publishClassReportCards(organizationId, selectedSectionId, selectedTermId);
    load();
    refresh();
  };

  return (
    <div className="space-y-4">
      {!gradingScaleReady || (data?.gradingScale == null && data !== null) ? (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
          No default grading scale is set up yet — letter grades won't show until one exists. Add one in the Grading Scales view.
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
            {classSections.length === 0 && <option value="">No class sections</option>}
            {classSections.map((s: any) => <option key={s.id} value={s.id}>{s.gradeName ?? ""} - {s.name}</option>)}
          </select>
          <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
            {terms.length === 0 && <option value="">No terms</option>}
            {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button
          onClick={publishAll}
          disabled={!selectedSectionId || !selectedTermId}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <CheckCircle2 size={16} /> Publish All
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Average</th>
                <th className="px-6 py-4">Grade</th>
                <th className="px-6 py-4">Position</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : !data || data.results.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No students found for this class section.</td></tr>
              ) : (
                data.results.map((r: any) => (
                  <tr key={r.student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{r.student.firstName} {r.student.lastName}</td>
                    <td className="px-6 py-4 text-slate-500">{r.overallPercentage !== null ? `${r.overallPercentage.toFixed(1)}%` : "—"}</td>
                    <td className="px-6 py-4 text-slate-500">{r.overallGradeLabel ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-500">{r.position !== null ? `${r.position} of ${data.classSize}` : "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${r.reportCard?.published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {r.reportCard?.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button onClick={() => openPreview(r.student.id)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="Preview / edit remarks"><Eye size={16} /></button>
                      <button
                        onClick={() => togglePublish(r.student.id, !!r.reportCard?.published)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 ml-2"
                      >
                        {r.reportCard?.published ? "Unpublish" : "Publish"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewStudentId && previewData && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={closePreview}>
          <div className="bg-slate-50 rounded-xl shadow-xl w-full max-w-5xl my-8 p-4 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Report Card Preview</h3>
              <button onClick={closePreview} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <ReportCardView schoolName={schoolName} data={previewData} />

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-700">Edit Remarks</h4>
              <TextField label="General Comments" value={remarksForm.comments} onChange={(v) => setRemarksForm((f) => ({ ...f, comments: v }))} />
              <TextField label="Class Teacher's Remark" value={remarksForm.teacherNotes} onChange={(v) => setRemarksForm((f) => ({ ...f, teacherNotes: v }))} />
              <TextField label="Principal's Remark" value={remarksForm.principalNotes} onChange={(v) => setRemarksForm((f) => ({ ...f, principalNotes: v }))} />
              <div className="flex justify-end gap-2">
                <button onClick={saveRemarks} disabled={isSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                  {isSaving ? "Saving..." : "Save Remarks"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Shared bits
// =====================================================================

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSubmit, disabled, isSaving, label }: { onCancel: () => void; onSubmit: () => void; disabled: boolean; isSaving: boolean; label: string }) {
  return (
    <div className="pt-2 flex gap-3">
      <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
        Cancel
      </button>
      <button onClick={onSubmit} disabled={disabled} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
        {isSaving ? "Saving..." : label}
      </button>
    </div>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{text}</div>;
}

function TextField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
