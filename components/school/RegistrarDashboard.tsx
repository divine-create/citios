"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, FileText, ClipboardList, CheckCircle, Clock, Search, UserPlus, Calendar, AlertCircle, X, Trash2, LogOut, ArrowRightLeft,
} from 'lucide-react';
import {
  createEnrolmentRequest, updateEnrolmentRequestStatus, deleteEnrolmentRequest,
  createStudentDocument, deleteStudentDocument,
  createStudentExit, updateStudentExit,
  createStudentTransferIn, updateStudentTransferIn,
  createStudent,
} from '@/lib/actions/school';

interface RegistrarDashboardProps {
  organizationId: string;
  reviewerUserId: string | null;
  enrolmentRequests: any[];
  documents: any[];
  studentExits: any[];
  studentTransfersIn: any[];
  students: any[];
  classes: any[];
}

export default function RegistrarDashboard({
  organizationId, reviewerUserId, enrolmentRequests, documents, studentExits, studentTransfersIn, students, classes,
}: RegistrarDashboardProps) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const [activeTab, setActiveTab] = useState<'requests' | 'documents' | 'lifecycle'>('requests');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getStudentName = (studentId: string) => {
    const s = students.find((st) => st.id === studentId);
    return s ? `${s.firstName} ${s.lastName}` : 'Unknown Student';
  };
  const getClassName = (classId: string) => classes.find((c) => c.id === classId)?.name ?? 'Unknown Class';

  // ---- Enrolment Requests ----
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ mode: 'existing' as 'existing' | 'new', studentId: '', firstName: '', lastName: '', yearLevel: 9, classId: '', message: '' });

  const openNewRequest = () => {
    setRequestForm({ mode: 'existing', studentId: students[0]?.id ?? '', firstName: '', lastName: '', yearLevel: 9, classId: classes[0]?.id ?? '', message: '' });
    setError(null);
    setIsRequestOpen(true);
  };

  const submitRequest = async () => {
    setError(null);
    setIsSaving(true);
    try {
      if (!reviewerUserId) throw new Error('Could not resolve your account — please sign in again.');
      let studentId = requestForm.studentId;
      if (requestForm.mode === 'new') {
        if (!requestForm.firstName.trim() || !requestForm.lastName.trim()) throw new Error('First and last name are required.');
        const studentRes = await createStudent({ organizationId, firstName: requestForm.firstName, lastName: requestForm.lastName, yearLevel: requestForm.yearLevel });
        if (studentRes.error || !studentRes.student) throw new Error(studentRes.error || 'Failed to create student.');
        studentId = studentRes.student.id;
      }
      if (!studentId || !requestForm.classId) throw new Error('Select a student and a class.');
      const res = await createEnrolmentRequest({ organizationId, classId: requestForm.classId, studentId, requestedById: reviewerUserId, message: requestForm.message });
      if (res.error) throw new Error(res.error);
      setIsRequestOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const reviewRequest = async (id: string, status: 'approved' | 'rejected') => {
    if (!reviewerUserId) return;
    await updateEnrolmentRequestStatus(id, { status, reviewedById: reviewerUserId });
    refresh();
  };

  const removeRequest = async (id: string) => {
    if (!confirm('Delete this request?')) return;
    await deleteEnrolmentRequest(id);
    refresh();
  };

  // ---- Documents ----
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [docForm, setDocForm] = useState({ studentId: '', name: '', type: 'Birth Certificate', filePath: '' });

  const openAddDoc = () => {
    setDocForm({ studentId: students[0]?.id ?? '', name: '', type: 'Birth Certificate', filePath: 'on file' });
    setError(null);
    setIsDocOpen(true);
  };

  const submitDoc = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = await createStudentDocument({ organizationId, studentId: docForm.studentId, name: docForm.name || docForm.type, type: docForm.type, filePath: docForm.filePath || 'on file' });
      if (res.error) throw new Error(res.error);
      setIsDocOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeDoc = async (id: string) => {
    if (!confirm('Remove this document record?')) return;
    await deleteStudentDocument(id);
    refresh();
  };

  // ---- Lifecycle: Exits ----
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [exitForm, setExitForm] = useState({ studentId: '', exitType: 'withdrawn', exitDate: '', reason: '' });

  const openAddExit = () => {
    const unenrolled = students.find((s) => !studentExits.some((e) => e.studentId === s.id));
    setExitForm({ studentId: unenrolled?.id ?? students[0]?.id ?? '', exitType: 'withdrawn', exitDate: '', reason: '' });
    setError(null);
    setIsExitOpen(true);
  };

  const submitExit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = await createStudentExit({ organizationId, studentId: exitForm.studentId, exitType: exitForm.exitType, exitDate: exitForm.exitDate, reason: exitForm.reason });
      if (res.error) throw new Error(res.error);
      setIsExitOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Lifecycle: Transfers In ----
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ studentId: '', previousSchool: '', transferDate: '', reason: '' });

  const openAddTransfer = () => {
    const notYetTransferred = students.find((s) => !studentTransfersIn.some((t) => t.studentId === s.id));
    setTransferForm({ studentId: notYetTransferred?.id ?? students[0]?.id ?? '', previousSchool: '', transferDate: '', reason: '' });
    setError(null);
    setIsTransferOpen(true);
  };

  const submitTransfer = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = await createStudentTransferIn({ organizationId, studentId: transferForm.studentId, previousSchool: transferForm.previousSchool, transferDate: transferForm.transferDate, reason: transferForm.reason });
      if (res.error) throw new Error(res.error);
      setIsTransferOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRequests = enrolmentRequests.filter((r) => getStudentName(r.studentId).toLowerCase().includes(search.toLowerCase()));
  const filteredDocs = documents.filter((d) => getStudentName(d.studentId).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admissions & Registrar Portal</h1>
          <p className="text-sm text-slate-500">Manage enrolment requests, documents, and student lifecycle records</p>
        </div>
        {activeTab === 'requests' && (
          <button onClick={openNewRequest} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <UserPlus size={18} />
            <span>New Request</span>
          </button>
        )}
      </header>

      <div className="px-4 md:px-6 pt-4 bg-white border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-8">
          {[
            { id: 'requests', label: 'Enrolment Requests', icon: Users },
            { id: 'documents', label: 'Documents', icon: ClipboardList },
            { id: 'lifecycle', label: 'Student Lifecycle', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {activeTab !== 'lifecycle' && (
          <div className="relative w-full sm:w-96 mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text" placeholder="Search students..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Enrolment Requests</h2>
              <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{filteredRequests.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Requested Class</th>
                    <th className="px-6 py-3">Message</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRequests.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No enrolment requests.</td></tr>
                  ) : (
                    filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{getStudentName(req.studentId)}</td>
                        <td className="px-6 py-4">{getClassName(req.classId)}</td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{req.message || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {req.status === 'approved' && <CheckCircle size={12} />}
                            {req.status === 'pending' && <Clock size={12} />}
                            {req.status === 'rejected' && <AlertCircle size={12} />}
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {req.status === 'pending' ? (
                            <>
                              <button onClick={() => reviewRequest(req.id, 'approved')} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm mr-3">Approve</button>
                              <button onClick={() => reviewRequest(req.id, 'rejected')} className="text-red-600 hover:text-red-800 font-medium text-sm mr-3">Reject</button>
                            </>
                          ) : null}
                          <button onClick={() => removeRequest(req.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-slate-800">Student Documents</h2>
                <p className="text-xs text-slate-400 mt-0.5">Record-keeping only — no file upload yet, "on file" is a placeholder.</p>
              </div>
              <button onClick={openAddDoc} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
                <UserPlus size={15} /> Add Document
              </button>
            </div>
            <ul className="divide-y divide-slate-200">
              {filteredDocs.length === 0 ? (
                <li className="px-6 py-10 text-center text-slate-400">No documents on file.</li>
              ) : (
                filteredDocs.map((doc) => (
                  <li key={doc.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">{doc.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">Student: <span className="font-medium text-slate-700">{getStudentName(doc.studentId)}</span> · {doc.type}</p>
                    </div>
                    <button onClick={() => removeDoc(doc.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {activeTab === 'lifecycle' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2"><LogOut size={16} /> Exits</h2>
                <button onClick={openAddExit} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Add</button>
              </div>
              <ul className="divide-y divide-slate-200">
                {studentExits.length === 0 ? (
                  <li className="px-6 py-8 text-center text-slate-400 text-sm">No exit records.</li>
                ) : (
                  studentExits.map((ex) => (
                    <li key={ex.id} className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{getStudentName(ex.studentId)}</p>
                      <p className="text-xs text-slate-500 mt-1 capitalize">{ex.exitType} · {new Date(ex.exitDate).toLocaleDateString()}{ex.destinationSchool ? ` · to ${ex.destinationSchool}` : ''}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2"><ArrowRightLeft size={16} /> Transfers In</h2>
                <button onClick={openAddTransfer} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Add</button>
              </div>
              <ul className="divide-y divide-slate-200">
                {studentTransfersIn.length === 0 ? (
                  <li className="px-6 py-8 text-center text-slate-400 text-sm">No transfer records.</li>
                ) : (
                  studentTransfersIn.map((t) => (
                    <li key={t.id} className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{getStudentName(t.studentId)}</p>
                      <p className="text-xs text-slate-500 mt-1">from {t.previousSchool} · {new Date(t.transferDate).toLocaleDateString()}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </main>

      {isRequestOpen && (
        <Modal title="New Enrolment Request" onClose={() => setIsRequestOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <div className="flex gap-2">
            <button onClick={() => setRequestForm((f) => ({ ...f, mode: 'existing' }))} className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold ${requestForm.mode === 'existing' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Existing Student</button>
            <button onClick={() => setRequestForm((f) => ({ ...f, mode: 'new' }))} className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold ${requestForm.mode === 'new' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>New Student</button>
          </div>
          {requestForm.mode === 'existing' ? (
            <div>
              <label className="text-sm font-medium text-slate-700">Student</label>
              <select value={requestForm.studentId} onChange={(e) => setRequestForm((f) => ({ ...f, studentId: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <TextField label="First Name" value={requestForm.firstName} onChange={(v) => setRequestForm((f) => ({ ...f, firstName: v }))} />
              <TextField label="Last Name" value={requestForm.lastName} onChange={(v) => setRequestForm((f) => ({ ...f, lastName: v }))} />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700">Class</label>
            <select value={requestForm.classId} onChange={(e) => setRequestForm((f) => ({ ...f, classId: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <TextField label="Message (optional)" value={requestForm.message} onChange={(v) => setRequestForm((f) => ({ ...f, message: v }))} />
          <ModalActions onCancel={() => setIsRequestOpen(false)} onSubmit={submitRequest} disabled={isSaving} isSaving={isSaving} label="Submit Request" />
        </Modal>
      )}

      {isDocOpen && (
        <Modal title="Add Document" onClose={() => setIsDocOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <div>
            <label className="text-sm font-medium text-slate-700">Student</label>
            <select value={docForm.studentId} onChange={(e) => setDocForm((f) => ({ ...f, studentId: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select value={docForm.type} onChange={(e) => setDocForm((f) => ({ ...f, type: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option>Birth Certificate</option>
              <option>Immunization Record</option>
              <option>Previous School Transcript</option>
              <option>Emergency Contact Form</option>
              <option>Other</option>
            </select>
          </div>
          <TextField label="Name / description" value={docForm.name} onChange={(v) => setDocForm((f) => ({ ...f, name: v }))} placeholder="e.g. Immunization record 2026" />
          <ModalActions onCancel={() => setIsDocOpen(false)} onSubmit={submitDoc} disabled={isSaving} isSaving={isSaving} label="Add Document" />
        </Modal>
      )}

      {isExitOpen && (
        <Modal title="Add Exit Record" onClose={() => setIsExitOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <div>
            <label className="text-sm font-medium text-slate-700">Student</label>
            <select value={exitForm.studentId} onChange={(e) => setExitForm((f) => ({ ...f, studentId: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Exit Type</label>
            <select value={exitForm.exitType} onChange={(e) => setExitForm((f) => ({ ...f, exitType: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="withdrawn">Withdrawn</option>
              <option value="transferred">Transferred</option>
              <option value="expelled">Expelled</option>
              <option value="graduated">Graduated</option>
              <option value="other">Other</option>
            </select>
          </div>
          <TextField label="Exit Date" value={exitForm.exitDate} onChange={(v) => setExitForm((f) => ({ ...f, exitDate: v }))} type="date" />
          <TextField label="Reason (optional)" value={exitForm.reason} onChange={(v) => setExitForm((f) => ({ ...f, reason: v }))} />
          <ModalActions onCancel={() => setIsExitOpen(false)} onSubmit={submitExit} disabled={isSaving || !exitForm.exitDate} isSaving={isSaving} label="Add Exit Record" />
        </Modal>
      )}

      {isTransferOpen && (
        <Modal title="Add Transfer-In Record" onClose={() => setIsTransferOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <div>
            <label className="text-sm font-medium text-slate-700">Student</label>
            <select value={transferForm.studentId} onChange={(e) => setTransferForm((f) => ({ ...f, studentId: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <TextField label="Previous School" value={transferForm.previousSchool} onChange={(v) => setTransferForm((f) => ({ ...f, previousSchool: v }))} />
          <TextField label="Transfer Date" value={transferForm.transferDate} onChange={(v) => setTransferForm((f) => ({ ...f, transferDate: v }))} type="date" />
          <TextField label="Reason (optional)" value={transferForm.reason} onChange={(v) => setTransferForm((f) => ({ ...f, reason: v }))} />
          <ModalActions onCancel={() => setIsTransferOpen(false)} onSubmit={submitTransfer} disabled={isSaving || !transferForm.previousSchool.trim() || !transferForm.transferDate} isSaving={isSaving} label="Add Transfer Record" />
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
