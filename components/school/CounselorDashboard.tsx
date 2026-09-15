"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HeartPulse, ShieldAlert, Bell, Search, AlertCircle, CheckCircle2, Clock, Plus, Trash2, Edit2, X, Lock,
} from "lucide-react";
import {
  createStudentNote, updateStudentNote, deleteStudentNote,
  createBehaviorLog, createSuspension, resolveTruancyAlert,
} from "@/lib/actions/school";

interface CounselorDashboardProps {
  organizationId: string;
  authorUserId: string | null;
  reporterMemberId: string | null;
  studentNotes: any[];
  behaviourIncidents: any[];
  suspensions: any[];
  truancyAlerts: any[];
  students: any[];
}

export function CounselorDashboard({
  organizationId, authorUserId, reporterMemberId, studentNotes, behaviourIncidents, suspensions, truancyAlerts, students,
}: CounselorDashboardProps) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const [activeTab, setActiveTab] = useState<"wellness" | "behaviour" | "truancy">("wellness");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getStudentName = (studentDataId: string) => {
    const s = students.find((st) => st.id === studentDataId);
    return s ? `${s.firstName} ${s.lastName}` : "Unknown Student";
  };

  // ---- Wellness Notes ----
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [noteForm, setNoteForm] = useState({ studentDataId: "", content: "", type: "pastoral", private: false });

  const openAddNote = () => {
    setEditNoteId(null);
    setNoteForm({ studentDataId: students[0]?.id ?? "", content: "", type: "pastoral", private: false });
    setError(null);
    setIsNoteOpen(true);
  };

  const openEditNote = (note: any) => {
    setEditNoteId(note.id);
    setNoteForm({ studentDataId: note.studentDataId, content: note.content, type: note.type, private: note.private });
    setError(null);
    setIsNoteOpen(true);
  };

  const submitNote = async () => {
    setError(null);
    setIsSaving(true);
    try {
      if (editNoteId) {
        const res = await updateStudentNote(editNoteId, { content: noteForm.content, type: noteForm.type, private: noteForm.private });
        if (res.error) throw new Error(res.error);
      } else {
        if (!authorUserId) throw new Error("Could not resolve your account — please sign in again.");
        const res = await createStudentNote({ organizationId, studentDataId: noteForm.studentDataId, authorId: authorUserId, content: noteForm.content, type: noteForm.type as any, private: noteForm.private });
        if (res.error) throw new Error(res.error);
      }
      setIsNoteOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    await deleteStudentNote(id);
    refresh();
  };

  // ---- Behaviour & Suspensions ----
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ studentDataId: "", type: "DEMERIT" as "DEMERIT" | "COMMENDATION" | "REFERRAL", note: "" });

  const openAddLog = () => {
    setLogForm({ studentDataId: students[0]?.id ?? "", type: "DEMERIT", note: "" });
    setError(null);
    setIsLogOpen(true);
  };

  const submitLog = async () => {
    setError(null);
    setIsSaving(true);
    try {
      if (!reporterMemberId) throw new Error("Could not resolve your staff profile — please sign in again.");
      const res = await createBehaviorLog({ organizationId, studentDataId: logForm.studentDataId, reportedById: reporterMemberId, type: logForm.type, note: logForm.note });
      if (res.error) throw new Error(res.error);
      setIsLogOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const [isSuspensionOpen, setIsSuspensionOpen] = useState(false);
  const [suspensionForm, setSuspensionForm] = useState({ studentDataId: "", startDate: "", endDate: "", totalDays: 1, reason: "" });

  const openAddSuspension = () => {
    setSuspensionForm({ studentDataId: students[0]?.id ?? "", startDate: "", endDate: "", totalDays: 1, reason: "" });
    setError(null);
    setIsSuspensionOpen(true);
  };

  const submitSuspension = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = await createSuspension({ organizationId, ...suspensionForm });
      if (res.error) throw new Error(res.error);
      setIsSuspensionOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Truancy ----
  const resolveAlert = async (id: string) => {
    if (!reporterMemberId) return;
    await resolveTruancyAlert(id, { resolvedBy: reporterMemberId });
    refresh();
  };

  const filteredNotes = studentNotes.filter((n) => getStudentName(n.studentDataId).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4">
        <h1 className="text-2xl font-bold text-slate-800">Counselor &amp; Support Staff Portal</h1>
        <p className="text-sm text-slate-500 mt-1">Manage student wellness notes, behaviour records, and truancy alerts.</p>
      </div>

      <div className="px-4 md:px-6 pt-4 bg-white border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-6">
          {[
            { id: "wellness", label: "Wellness Notes", icon: HeartPulse },
            { id: "behaviour", label: "Behaviour & Suspensions", icon: ShieldAlert },
            { id: "truancy", label: "Truancy Alerts", icon: Bell },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 md:p-6 flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {activeTab === "wellness" && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button onClick={openAddNote} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Plus size={16} /> Add Note
              </button>
            </div>
          )}

          {activeTab === "wellness" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Note</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredNotes.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No wellness notes yet.</td></tr>
                    ) : (
                      filteredNotes.map((note) => (
                        <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{getStudentName(note.studentDataId)}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                              {note.private && <Lock size={10} />} {note.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 max-w-sm truncate">{note.content}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(note.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <button onClick={() => openEditNote(note)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={15} /></button>
                            <button onClick={() => removeNote(note.id)} className="p-1.5 text-slate-400 hover:text-red-600 ml-1"><Trash2 size={15} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "behaviour" && (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <button onClick={openAddLog} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">
                  <Plus size={16} /> Log Behavior
                </button>
                <button onClick={openAddSuspension} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <Plus size={16} /> Add Suspension
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50"><h3 className="font-semibold text-slate-800">Behaviour Incidents</h3></div>
                <ul className="divide-y divide-slate-200">
                  {behaviourIncidents.length === 0 ? (
                    <li className="px-6 py-8 text-center text-slate-400 text-sm">No incidents logged.</li>
                  ) : (
                    behaviourIncidents.map((inc) => (
                      <li key={inc.id} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{getStudentName(inc.studentDataId)}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{inc.description}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          inc.severity === "COMMENDATION" ? "bg-emerald-100 text-emerald-700" : inc.severity === "MAJOR" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>{inc.severity}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50"><h3 className="font-semibold text-slate-800">Suspensions</h3></div>
                <ul className="divide-y divide-slate-200">
                  {suspensions.length === 0 ? (
                    <li className="px-6 py-8 text-center text-slate-400 text-sm">No suspensions on record.</li>
                  ) : (
                    suspensions.map((s) => (
                      <li key={s.id} className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">{getStudentName(s.studentDataId)} — {s.totalDays} day(s)</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.reason} · {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}</p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeTab === "truancy" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50"><h3 className="font-semibold text-slate-800">Truancy Alerts</h3></div>
              <ul className="divide-y divide-slate-200">
                {truancyAlerts.length === 0 ? (
                  <li className="px-6 py-10 text-center text-slate-400 text-sm">No truancy alerts.</li>
                ) : (
                  truancyAlerts.map((alert) => (
                    <li key={alert.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{getStudentName(alert.studentDataId)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{alert.consecutiveAbsences} consecutive absences · {alert.totalUnexcused} unexcused total</p>
                      </div>
                      {alert.resolvedAt ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"><CheckCircle2 size={14} /> Resolved</span>
                      ) : (
                        <button onClick={() => resolveAlert(alert.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Mark Resolved</button>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {isNoteOpen && (
        <Modal title={editNoteId ? "Edit Note" : "Add Wellness Note"} onClose={() => setIsNoteOpen(false)}>
          {error && <ErrorBanner text={error} />}
          {!editNoteId && (
            <div>
              <label className="text-sm font-medium text-slate-700">Student</label>
              <select value={noteForm.studentDataId} onChange={(e) => setNoteForm((f) => ({ ...f, studentDataId: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select value={noteForm.type} onChange={(e) => setNoteForm((f) => ({ ...f, type: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="pastoral">Pastoral</option>
              <option value="medical">Medical</option>
              <option value="academic">Academic</option>
              <option value="behaviour">Behaviour</option>
              <option value="general">General</option>
            </select>
          </div>
          <TextArea label="Note" value={noteForm.content} onChange={(v) => setNoteForm((f) => ({ ...f, content: v }))} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={noteForm.private} onChange={(e) => setNoteForm((f) => ({ ...f, private: e.target.checked }))} />
            Private (visible only to counseling staff)
          </label>
          <ModalActions onCancel={() => setIsNoteOpen(false)} onSubmit={submitNote} disabled={isSaving || !noteForm.content.trim()} isSaving={isSaving} label={editNoteId ? "Save Changes" : "Add Note"} />
        </Modal>
      )}

      {isLogOpen && (
        <Modal title="Log Behavior" onClose={() => setIsLogOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <div>
            <label className="text-sm font-medium text-slate-700">Student</label>
            <select value={logForm.studentDataId} onChange={(e) => setLogForm((f) => ({ ...f, studentDataId: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select value={logForm.type} onChange={(e) => setLogForm((f) => ({ ...f, type: e.target.value as any }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="DEMERIT">Demerit</option>
              <option value="REFERRAL">Referral</option>
              <option value="COMMENDATION">Commendation</option>
            </select>
          </div>
          <TextArea label="Note" value={logForm.note} onChange={(v) => setLogForm((f) => ({ ...f, note: v }))} />
          <ModalActions onCancel={() => setIsLogOpen(false)} onSubmit={submitLog} disabled={isSaving || !logForm.note.trim()} isSaving={isSaving} label="Log Behavior" />
        </Modal>
      )}

      {isSuspensionOpen && (
        <Modal title="Add Suspension" onClose={() => setIsSuspensionOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <div>
            <label className="text-sm font-medium text-slate-700">Student</label>
            <select value={suspensionForm.studentDataId} onChange={(e) => setSuspensionForm((f) => ({ ...f, studentDataId: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Start Date" value={suspensionForm.startDate} onChange={(v) => setSuspensionForm((f) => ({ ...f, startDate: v }))} type="date" />
            <TextField label="End Date" value={suspensionForm.endDate} onChange={(v) => setSuspensionForm((f) => ({ ...f, endDate: v }))} type="date" />
          </div>
          <TextField label="Total Days" value={String(suspensionForm.totalDays)} onChange={(v) => setSuspensionForm((f) => ({ ...f, totalDays: parseInt(v) || 1 }))} type="number" />
          <TextArea label="Reason" value={suspensionForm.reason} onChange={(v) => setSuspensionForm((f) => ({ ...f, reason: v }))} />
          <ModalActions onCancel={() => setIsSuspensionOpen(false)} onSubmit={submitSuspension} disabled={isSaving || !suspensionForm.reason.trim() || !suspensionForm.startDate || !suspensionForm.endDate} isSaving={isSaving} label="Add Suspension" />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Shared bits
// =====================================================================

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSubmit, disabled, isSaving, label }: { onCancel: () => void; onSubmit: () => void; disabled: boolean; isSaving: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
      <button onClick={onSubmit} disabled={disabled} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
        {isSaving ? "Saving..." : label}
      </button>
    </div>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
      <AlertCircle size={14} />
      {text}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
    </div>
  );
}
