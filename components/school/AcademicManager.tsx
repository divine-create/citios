"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Plus, Search, Edit2, Trash2, X, CalendarCheck, ListTree, Users2, GraduationCap, CalendarRange, DoorOpen, CalendarClock, CalendarDays } from "lucide-react";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  assignTeacherToClass,
  removeTeacherFromClass,
  createSchoolGrade,
  updateSchoolGrade,
  deleteSchoolGrade,
  createClassSection,
  updateClassSection,
  deleteClassSection,
  assignStudentToSection,
  getSyllabus,
  createSyllabusTopic,
  updateSyllabusTopic,
  deleteSyllabusTopic,
  getDailyAttendance,
  markAttendance,
  createSubject,
  updateSubject,
  deleteSubject,
  assignTeacherToSubject,
  removeTeacherFromSubject,
  createAcademicYear,
  setActiveAcademicYear,
  createTerm,
  updateTerm,
  deleteTerm,
  createRoom,
  updateRoom,
  deleteRoom,
  getTimetableForClass,
  getTimetableForSection,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  createSchoolEvent,
  updateSchoolEvent,
  deleteSchoolEvent,
} from "@/lib/actions/school";

export type TabId = "attendance" | "grades" | "sections" | "subjectClasses" | "syllabus" | "subjects" | "terms" | "rooms" | "timetable" | "calendar";

export const ACADEMIC_TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "attendance", label: "Daily Attendance", icon: CalendarCheck },
  { id: "grades", label: "Classes", icon: GraduationCap },
  { id: "sections", label: "Class Sections", icon: Users2 },
  { id: "subjectClasses", label: "Subject Classes", icon: BookOpen },
  { id: "subjects", label: "Subjects", icon: GraduationCap },
  { id: "rooms", label: "Rooms", icon: DoorOpen },
  { id: "timetable", label: "Timetable", icon: CalendarClock },
  { id: "syllabus", label: "Syllabus", icon: ListTree },
  { id: "terms", label: "Terms", icon: CalendarRange },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
];

interface AcademicManagerProps {
  organizationId: string;
  activeTab: TabId;
  courses: any[];
  teachers: any[]; // staff entries with .role === 'TEACHER', each carrying .staffProfile
  grades: any[];
  classSections: any[];
  subjects: any[];
  terms: any[];
  academicYears: any[];
  students: any[];
  rooms: any[];
  events: any[];
  currentUserId?: string | null;
  refresh: () => void;
}

export default function AcademicManager({ organizationId, activeTab, courses, teachers, grades, classSections, subjects, terms, academicYears, students, rooms, events, currentUserId = null, refresh }: AcademicManagerProps) {
  const [search, setSearch] = useState("");

  const activeLabel = ACADEMIC_TABS.find((t) => t.id === activeTab)?.label ?? "Academic";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">{activeLabel}</h1>
        {activeTab === "subjectClasses" && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search classes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {activeTab === "attendance" && <DailyAttendanceTab organizationId={organizationId} />}
        {activeTab === "grades" && (
          <GradesTab organizationId={organizationId} grades={grades} refresh={refresh} />
        )}
        {activeTab === "sections" && (
          <ClassSectionsTab organizationId={organizationId} grades={grades} classSections={classSections} teachers={teachers} students={students} refresh={refresh} />
        )}
        {activeTab === "subjectClasses" && (
          <ClassesTab
            organizationId={organizationId}
            courses={courses}
            teachers={teachers}
            subjects={subjects}
            classSections={classSections}
            search={search}
            refresh={refresh}
          />
        )}
        {activeTab === "subjects" && (
          <SubjectsTab organizationId={organizationId} subjects={subjects} teachers={teachers} refresh={refresh} />
        )}
        {activeTab === "rooms" && (
          <RoomsTab organizationId={organizationId} rooms={rooms} refresh={refresh} />
        )}
        {activeTab === "timetable" && (
          <TimetableTab organizationId={organizationId} courses={courses} teachers={teachers} rooms={rooms} classSections={classSections} refresh={refresh} />
        )}
        {activeTab === "syllabus" && <SyllabusTab courses={courses} />}
        {activeTab === "terms" && (
          <TermsTab organizationId={organizationId} terms={terms} academicYears={academicYears} refresh={refresh} />
        )}
        {activeTab === "calendar" && (
          <CalendarTab organizationId={organizationId} events={events} grades={grades} currentUserId={currentUserId} refresh={refresh} />
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Daily Attendance
// =====================================================================

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

function DailyAttendanceTab({ organizationId }: { organizationId: string }) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = async (d: string) => {
    setLoading(true);
    try {
      const data = await getDailyAttendance(organizationId, d);
      setRecords(data.records);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const mark = async (studentDataId: string, status: (typeof ATTENDANCE_STATUSES)[number]) => {
    setPendingId(studentDataId);
    try {
      await markAttendance(studentDataId, status, date);
      await load(date);
    } finally {
      setPendingId(null);
    }
  };

  const presentCount = records.filter((r) => r.status === "PRESENT").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <p className="text-sm text-slate-500">{presentCount} of {records.length} present</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Class Section</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Mark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No students yet.</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.studentDataId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{r.studentName}</td>
                  <td className="px-6 py-4 text-slate-500">{r.classSectionName ?? "Unassigned"}</td>
                  <td className="px-6 py-4">
                    {r.status ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        r.status === "PRESENT" ? "bg-emerald-100 text-emerald-700" :
                        r.status === "LATE" ? "bg-amber-100 text-amber-700" :
                        r.status === "EXCUSED" ? "bg-blue-100 text-blue-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {r.status}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">Not marked</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {ATTENDANCE_STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => mark(r.studentDataId, s)}
                          disabled={pendingId === r.studentDataId}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase border disabled:opacity-50 ${
                            r.status === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                          }`}
                        >
                          {s[0]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

// =====================================================================
// Classes
// =====================================================================

function ClassesTab({
  organizationId, courses, teachers, subjects, classSections, search, refresh,
}: {
  organizationId: string; courses: any[]; teachers: any[]; subjects: any[]; classSections: any[]; search: string; refresh: () => void;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", subjectId: "", classSectionId: "", teacherStaffId: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [addTeacherId, setAddTeacherId] = useState("");

  const filtered = courses.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", subjectId: subjects[0]?.id ?? "", classSectionId: "", teacherStaffId: "" });
    setError(null);
    setIsAddOpen(true);
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({ name: c.name, subjectId: c.subjectId || "", classSectionId: c.classSectionId || "", teacherStaffId: "" });
    setError(null);
    setIsAddOpen(true);
  };

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const subjectName = subjects.find((s) => s.id === form.subjectId)?.name ?? "";
      if (editId) {
        const res = await updateCourse(editId, {
          name: form.name, subject: subjectName, subjectId: form.subjectId || null, classSectionId: form.classSectionId || null,
        });
        if (res.error) throw new Error(res.error);
      } else {
        const res = await createCourse({
          organizationId, name: form.name, subject: subjectName,
          subjectId: form.subjectId || undefined, classSectionId: form.classSectionId || undefined,
          teacherStaffId: form.teacherStaffId || undefined,
        });
        if (res.error) throw new Error(res.error);
      }
      setIsAddOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this class?")) return;
    await deleteCourse(id);
    refresh();
  };

  const addTeacher = async (classId: string) => {
    if (!addTeacherId) return;
    const res = await assignTeacherToClass(classId, addTeacherId);
    if (res?.error) { alert(res.error); return; }
    setAddTeacherId("");
    refresh();
  };

  const removeTeacher = async (classTeacherId: string) => {
    await removeTeacherFromClass(classTeacherId);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Class
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Class Code</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Class Section</th>
              <th className="px-6 py-4">Teacher(s)</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No classes found.</td></tr>
            ) : (
              filtered.map((c) => {
                const section = classSections.find((s) => s.id === c.classSectionId);
                const classTeacherLinks: any[] = c.classTeachers ?? [];
                const classTeacherNames = classTeacherLinks
                  .map((ct) => teachers.find((t) => t.staffProfile?.id === ct.staffId))
                  .filter(Boolean)
                  .map((t: any) => t.user?.name ?? t.user?.email);
                return (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-blue-600">{c.code}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{c.name}</td>
                      <td className="px-6 py-4 text-slate-500">{subjects.find((s) => s.id === c.subjectId)?.name ?? c.subject ?? "—"}</td>
                      <td className="px-6 py-4 text-slate-500">{section ? `${section.gradeName ?? ""} - ${section.name}` : "—"}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => setManagingId(managingId === c.id ? null : c.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                          {classTeacherNames.length > 0 ? classTeacherNames.join(", ") : "Assign teacher"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => remove(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors ml-1"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                    {managingId === c.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-slate-50">
                          <div className="space-y-2">
                            {classTeacherLinks.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {classTeacherLinks.map((ct) => {
                                  const t = teachers.find((x) => x.staffProfile?.id === ct.staffId);
                                  return (
                                    <span key={ct.id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium text-slate-700">
                                      {t?.user?.name ?? t?.user?.email ?? "Unknown"}
                                      <button onClick={() => removeTeacher(ct.id)} className="text-slate-400 hover:text-red-600"><X size={12} /></button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <select
                                value={addTeacherId}
                                onChange={(e) => setAddTeacherId(e.target.value)}
                                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                              >
                                <option value="">Assign a teacher...</option>
                                {teachers.map((t) => (
                                  <option key={t.staffProfile?.id} value={t.staffProfile?.id}>{t.user?.name ?? t.user?.email}</option>
                                ))}
                              </select>
                              <button onClick={() => addTeacher(c.id)} disabled={!addTeacherId} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                                Add
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>

      {isAddOpen && (
        <Modal title={editId ? "Edit Class" : "Add Class"} onClose={() => setIsAddOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <TextField label="Class Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Mathematics — JSS1A" />
          <div>
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <select
              value={form.subjectId}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— No subject —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {subjects.length === 0 && <p className="text-xs text-slate-400 mt-1">No subjects yet — add one in the Subjects tab.</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Class Section</label>
            <select
              value={form.classSectionId}
              onChange={(e) => setForm((f) => ({ ...f, classSectionId: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— No class section —</option>
              {classSections.map((s) => <option key={s.id} value={s.id}>{s.gradeName ?? ""} - {s.name}</option>)}
            </select>
          </div>
          {!editId && (
            <div>
              <label className="text-sm font-medium text-slate-700">Teacher (optional)</label>
              <select
                value={form.teacherStaffId}
                onChange={(e) => setForm((f) => ({ ...f, teacherStaffId: e.target.value }))}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— Assign later —</option>
                {teachers.map((t) => (
                  <option key={t.staffProfile?.id} value={t.staffProfile?.id}>{t.user?.name ?? t.user?.email}</option>
                ))}
              </select>
            </div>
          )}
          <ModalActions onCancel={() => setIsAddOpen(false)} onSubmit={submit} disabled={isSaving || !form.name.trim()} isSaving={isSaving} label={editId ? "Save Changes" : "Add Class"} />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Syllabus
// =====================================================================

const STATUS_STYLES: Record<string, string> = {
  PLANNED: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

function SyllabusTab({ courses }: { courses: any[] }) {
  const [classId, setClassId] = useState<string>(courses[0]?.id ?? "");
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", week: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async (id: string) => {
    if (!id) { setTopics([]); return; }
    setLoading(true);
    try {
      setTopics(await getSyllabus(id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = await createSyllabusTopic({
        classId, title: form.title, description: form.description || undefined,
        week: form.week ? parseInt(form.week) : undefined,
      });
      if (res.error) throw new Error(res.error);
      setIsAddOpen(false);
      setForm({ title: "", description: "", week: "" });
      await load(classId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const cycleStatus = async (topic: any) => {
    const next = topic.status === "PLANNED" ? "IN_PROGRESS" : topic.status === "IN_PROGRESS" ? "COMPLETED" : "PLANNED";
    await updateSyllabusTopic(topic.id, { status: next });
    await load(classId);
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this topic?")) return;
    await deleteSyllabusTopic(id);
    await load(classId);
  };

  if (courses.length === 0) {
    return <p className="py-12 text-center text-slate-500">Add a class first to build its syllabus.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          onClick={() => { setError(null); setForm({ title: "", description: "", week: "" }); setIsAddOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Topic
        </button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="py-8 text-center text-slate-400">Loading...</p>
        ) : topics.length === 0 ? (
          <p className="py-8 text-center text-slate-500">No syllabus topics yet for this class.</p>
        ) : (
          topics.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {t.week != null && <span className="text-xs font-semibold text-slate-400">Week {t.week}</span>}
                  <p className="font-semibold text-slate-800">{t.title}</p>
                </div>
                {t.description && <p className="text-sm text-slate-500 mt-1">{t.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => cycleStatus(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[t.status]}`}
                  title="Click to advance status"
                >
                  {t.status.replace("_", " ")}
                </button>
                <button onClick={() => remove(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {isAddOpen && (
        <Modal title="Add Syllabus Topic" onClose={() => setIsAddOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <TextField label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Cell Structure" />
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Week (optional)</label>
            <input
              type="number" min={1}
              value={form.week}
              onChange={(e) => setForm((f) => ({ ...f, week: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <ModalActions onCancel={() => setIsAddOpen(false)} onSubmit={submit} disabled={isSaving || !form.title.trim()} isSaving={isSaving} label="Add Topic" />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Classes (grade levels, e.g. "JSS1", "Grade 10")
// =====================================================================

function GradesTab({ organizationId, grades, refresh }: { organizationId: string; grades: any[]; refresh: () => void }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", level: 1 });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", level: (grades[grades.length - 1]?.level ?? 0) + 1 });
    setError(null);
    setIsAddOpen(true);
  };

  const openEdit = (grade: any) => {
    setEditId(grade.id);
    setForm({ name: grade.name, level: grade.level });
    setError(null);
    setIsAddOpen(true);
  };

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = editId
        ? await updateSchoolGrade(editId, form)
        : await createSchoolGrade(organizationId, form.name, form.level);
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
    if (!confirm("Remove this class?")) return;
    const res = await deleteSchoolGrade(id);
    if (res?.error) { alert(res.error); return; }
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Class
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {grades.length === 0 && <p className="text-sm text-slate-500">No classes yet.</p>}
        {grades.map((grade) => (
          <div key={grade.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800">{grade.name}</h4>
              <p className="text-xs text-slate-400 mt-1">{grade.sectionCount} section{grade.sectionCount === 1 ? "" : "s"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => openEdit(grade)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
              <button onClick={() => remove(grade.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {isAddOpen && (
        <Modal title={editId ? "Edit Class" : "Add Class"} onClose={() => setIsAddOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <TextField label="Class Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. JSS1, Grade 10" />
          <div>
            <label className="text-sm font-medium text-slate-700">Progression Level (Numeric Order)</label>
            <p className="text-xs text-slate-500 mb-1.5">
              Enter a number to define the academic order. E.g., <strong>1</strong> for Creche, <strong>2</strong> for Nursery, <strong>5</strong> for Primary 1. The system uses this to sort classes and promote students to the next number at the end of the year.
            </p>
            <input
              type="number" min={0} max={50}
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. 1"
            />
          </div>
          <ModalActions onCancel={() => setIsAddOpen(false)} onSubmit={submit} disabled={isSaving || !form.name.trim()} isSaving={isSaving} label={editId ? "Save Changes" : "Add Class"} />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Class Sections — each belongs to a Class (grade level)
// =====================================================================

function ClassSectionsTab({ organizationId, grades, classSections, teachers, students, refresh }: { organizationId: string; grades: any[]; classSections: any[]; teachers: any[]; students: any[]; refresh: () => void }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", gradeId: "", formTeacherStaffId: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [managingSectionId, setManagingSectionId] = useState<string | null>(null);
  const [assignStudentId, setAssignStudentId] = useState("");

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", gradeId: grades[0]?.id ?? "", formTeacherStaffId: "" });
    setError(null);
    setIsAddOpen(true);
  };

  const openEdit = (section: any) => {
    setEditId(section.id);
    setForm({ name: section.name, gradeId: section.gradeId, formTeacherStaffId: section.formTeacherId || "" });
    setError(null);
    setIsAddOpen(true);
  };

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      if (editId) {
        const res = await updateClassSection(editId, {
          name: form.name, gradeId: form.gradeId, formMembershipId: form.formTeacherStaffId || null,
        });
        if (res.error) throw new Error(res.error);
      } else {
        const res = await createClassSection({
          organizationId, name: form.name, gradeId: form.gradeId, formMembershipId: form.formTeacherStaffId || undefined,
        });
        if (res.error) throw new Error(res.error);
      }
      setIsAddOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    const result = await deleteClassSection(id);
    if (result?.error) {
      alert(result.error);
      return;
    }
    refresh();
  };

  const assign = async (sectionId: string) => {
    if (!assignStudentId) return;
    await assignStudentToSection(assignStudentId, sectionId);
    setAssignStudentId("");
    refresh();
  };

  const unassign = async (studentDataId: string) => {
    await assignStudentToSection(studentDataId, null);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          disabled={grades.length === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Section
        </button>
      </div>
      {grades.length === 0 && <p className="text-sm text-slate-500">Create a Class first, in the Classes tab, before adding sections.</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {classSections.length === 0 && grades.length > 0 && <p className="text-sm text-slate-500">No class sections yet.</p>}
        {classSections.map((section) => {
          const sectionStudents = students.filter((s) => s.classSectionId === section.id);
          const unassignedInGrade = students.filter((s) => s.yearLevel === section.gradeLevel && !s.classSectionId);
          return (
            <div key={section.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-bold text-slate-800">{section.gradeName} — {section.name}</h4>
                  <p className="text-xs text-slate-400">{section.formTeacherName ? `Form teacher: ${section.formTeacherName}` : "No form teacher assigned"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(section)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                  <button onClick={() => remove(section.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-3">{sectionStudents.length} student(s)</p>

              {managingSectionId === section.id ? (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {sectionStudents.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs text-slate-600">
                        <span>{s.firstName} {s.lastName}</span>
                        <button onClick={() => unassign(s.id)} className="text-red-500 hover:text-red-700">Remove</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={assignStudentId}
                      onChange={(e) => setAssignStudentId(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                    >
                      <option value="">Select a {section.gradeName} student...</option>
                      {unassignedInGrade.map((s) => (
                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                      ))}
                    </select>
                    <button onClick={() => assign(section.id)} disabled={!assignStudentId} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                      Add
                    </button>
                  </div>
                  <button onClick={() => setManagingSectionId(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Done</button>
                </div>
              ) : (
                <button onClick={() => setManagingSectionId(section.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  Manage students
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isAddOpen && (
        <Modal title={editId ? "Edit Class Section" : "Add Class Section"} onClose={() => setIsAddOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <div>
            <label className="text-sm font-medium text-slate-700">Class</label>
            <select
              value={form.gradeId}
              onChange={(e) => setForm((f) => ({ ...f, gradeId: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <TextField label="Section Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="A, B, Gold..." />
          <div>
            <label className="text-sm font-medium text-slate-700">Form Teacher (optional)</label>
            <select
              value={form.formTeacherStaffId}
              onChange={(e) => setForm((f) => ({ ...f, formTeacherStaffId: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">None</option>
              {teachers.map((t: any) => (
                <option key={t.staffProfile?.id} value={t.staffProfile?.id}>{t.user?.name ?? t.user?.email}</option>
              ))}
            </select>
          </div>
          <ModalActions onCancel={() => setIsAddOpen(false)} onSubmit={submit} disabled={isSaving || !form.name.trim() || !form.gradeId} isSaving={isSaving} label={editId ? "Save Changes" : "Add Section"} />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Subjects
// =====================================================================

function SubjectsTab({ organizationId, subjects, teachers, refresh }: { organizationId: string; subjects: any[]; teachers: any[]; refresh: () => void }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [addTeacherId, setAddTeacherId] = useState("");

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", code: "" });
    setError(null);
    setIsAddOpen(true);
  };

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({ name: s.name, code: s.code || "" });
    setError(null);
    setIsAddOpen(true);
  };

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = editId
        ? await updateSubject(editId, { name: form.name, code: form.code })
        : await createSubject(organizationId, form.name, form.code);
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
    if (!confirm("Remove this subject?")) return;
    const res = await deleteSubject(id);
    if (res?.error) { alert(res.error); return; }
    refresh();
  };

  const addTeacher = async (subjectId: string) => {
    if (!addTeacherId) return;
    const res = await assignTeacherToSubject(addTeacherId, subjectId);
    if (res?.error) { alert(res.error); return; }
    setAddTeacherId("");
    refresh();
  };

  const removeTeacher = async (linkId: string) => {
    await removeTeacherFromSubject(linkId);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Subject
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {subjects.length === 0 && <p className="text-sm text-slate-500">No subjects yet.</p>}
        {subjects.map((s) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-bold text-slate-800">{s.name}</h4>
                {s.code && <p className="text-xs text-slate-400">Code: {s.code}</p>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                <button onClick={() => remove(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>

            {s.teachers?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {s.teachers.map((t: any) => (
                  <span key={t.linkId} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium text-slate-700">
                    {t.name}
                    <button onClick={() => removeTeacher(t.linkId)} className="text-slate-400 hover:text-red-600"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}

            {managingId === s.id ? (
              <div className="flex gap-2">
                <select
                  value={addTeacherId}
                  onChange={(e) => setAddTeacherId(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                >
                  <option value="">Select a teacher...</option>
                  {teachers.map((t: any) => (
                    <option key={t.staffProfile?.id} value={t.staffProfile?.id}>{t.user?.name ?? t.user?.email}</option>
                  ))}
                </select>
                <button onClick={() => addTeacher(s.id)} disabled={!addTeacherId} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                  Add
                </button>
                <button onClick={() => setManagingId(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Done</button>
              </div>
            ) : (
              <button onClick={() => setManagingId(s.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                Assign teacher
              </button>
            )}
          </div>
        ))}
      </div>

      {isAddOpen && (
        <Modal title={editId ? "Edit Subject" : "Add Subject"} onClose={() => setIsAddOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <TextField label="Subject Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Mathematics" />
          <TextField label="Code (optional)" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="MTH" />
          <ModalActions onCancel={() => setIsAddOpen(false)} onSubmit={submit} disabled={isSaving || !form.name.trim()} isSaving={isSaving} label={editId ? "Save Changes" : "Add Subject"} />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Academic Years & Terms
// =====================================================================

function TermsTab({ organizationId, terms, academicYears, refresh }: { organizationId: string; terms: any[]; academicYears: any[]; refresh: () => void }) {
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [yearForm, setYearForm] = useState({ year: new Date().getFullYear(), startDate: "", endDate: "", active: false });
  const [isTermOpen, setIsTermOpen] = useState(false);
  const [editTermId, setEditTermId] = useState<string | null>(null);
  const [termForm, setTermForm] = useState({ academicYearId: "", termNumber: 1, name: "", startDate: "", endDate: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sortedYears = [...academicYears].sort((a, b) => b.year - a.year);

  const openAddYear = () => {
    setYearForm({ year: new Date().getFullYear(), startDate: "", endDate: "", active: academicYears.length === 0 });
    setError(null);
    setIsYearOpen(true);
  };

  const submitYear = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = await createAcademicYear({ organizationId, ...yearForm });
      if (res.error) throw new Error(res.error);
      setIsYearOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const activateYear = async (id: string) => {
    await setActiveAcademicYear(id, organizationId);
    refresh();
  };

  const openAddTerm = (academicYearId?: string) => {
    setEditTermId(null);
    const nextTermNumber = (terms.filter((t) => t.academicYearId === (academicYearId ?? sortedYears[0]?.id)).length || 0) + 1;
    setTermForm({ academicYearId: academicYearId ?? sortedYears[0]?.id ?? "", termNumber: nextTermNumber, name: "", startDate: "", endDate: "" });
    setError(null);
    setIsTermOpen(true);
  };

  const openEditTerm = (t: any) => {
    setEditTermId(t.id);
    setTermForm({
      academicYearId: t.academicYearId, termNumber: t.termNumber, name: t.name,
      startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : "",
      endDate: t.endDate ? new Date(t.endDate).toISOString().slice(0, 10) : "",
    });
    setError(null);
    setIsTermOpen(true);
  };

  const submitTerm = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = editTermId
        ? await updateTerm(editTermId, { name: termForm.name, startDate: termForm.startDate, endDate: termForm.endDate })
        : await createTerm({ organizationId, ...termForm });
      if (res.error) throw new Error(res.error);
      setIsTermOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeTerm = async (id: string) => {
    if (!confirm("Remove this term?")) return;
    const res = await deleteTerm(id);
    if (res?.error) { alert(res.error); return; }
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">Academic Years</h3>
          <button onClick={openAddYear} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Add Year
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {sortedYears.length === 0 && <p className="text-sm text-slate-500">No academic years yet.</p>}
          {sortedYears.map((y) => (
            <div key={y.id} className={`bg-white border rounded-xl p-4 ${y.active ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{y.year}/{y.year + 1}</span>
                {y.active ? (
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
                ) : (
                  <button onClick={() => activateYear(y.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Set active</button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {y.startDate ? new Date(y.startDate).toLocaleDateString() : "—"} – {y.endDate ? new Date(y.endDate).toLocaleDateString() : "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">Terms</h3>
          <button
            onClick={() => openAddTerm()}
            disabled={sortedYears.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Plus size={16} /> Add Term
          </button>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Term</th>
                <th className="px-6 py-4">Academic Year</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {terms.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No terms found.</td></tr>
              ) : (
                terms.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{t.name} <span className="text-slate-400 font-normal">(Term {t.termNumber})</span></td>
                    <td className="px-6 py-4 text-slate-500">{t.academicYearLabel ? `${t.academicYearLabel}/${t.academicYearLabel + 1}` : "—"}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {t.startDate ? new Date(t.startDate).toLocaleDateString() : "—"} – {t.endDate ? new Date(t.endDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEditTerm(t)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => removeTerm(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors ml-1"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {isYearOpen && (
        <Modal title="Add Academic Year" onClose={() => setIsYearOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <div>
            <label className="text-sm font-medium text-slate-700">Year (session start)</label>
            <input
              type="number"
              value={yearForm.year}
              onChange={(e) => setYearForm((f) => ({ ...f, year: parseInt(e.target.value) || f.year }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">e.g. 2025 for the "2025/2026" session</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Start Date</label>
            <input
              type="date" value={yearForm.startDate}
              onChange={(e) => setYearForm((f) => ({ ...f, startDate: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">End Date</label>
            <input
              type="date" value={yearForm.endDate}
              onChange={(e) => setYearForm((f) => ({ ...f, endDate: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={yearForm.active} onChange={(e) => setYearForm((f) => ({ ...f, active: e.target.checked }))} />
            Set as active academic year
          </label>
          <ModalActions onCancel={() => setIsYearOpen(false)} onSubmit={submitYear} disabled={isSaving || !yearForm.startDate || !yearForm.endDate} isSaving={isSaving} label="Add Year" />
        </Modal>
      )}

      {isTermOpen && (
        <Modal title={editTermId ? "Edit Term" : "Add Term"} onClose={() => setIsTermOpen(false)}>
          {error && <ErrorBanner text={error} />}
          {!editTermId && (
            <div>
              <label className="text-sm font-medium text-slate-700">Academic Year</label>
              <select
                value={termForm.academicYearId}
                onChange={(e) => setTermForm((f) => ({ ...f, academicYearId: e.target.value }))}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {sortedYears.map((y) => <option key={y.id} value={y.id}>{y.year}/{y.year + 1}</option>)}
              </select>
            </div>
          )}
          <TextField label="Term Name" value={termForm.name} onChange={(v) => setTermForm((f) => ({ ...f, name: v }))} placeholder="1st Term" />
          {!editTermId && (
            <div>
              <label className="text-sm font-medium text-slate-700">Term Number</label>
              <input
                type="number" min={1}
                value={termForm.termNumber}
                onChange={(e) => setTermForm((f) => ({ ...f, termNumber: parseInt(e.target.value) || 1 }))}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700">Start Date</label>
            <input
              type="date" value={termForm.startDate}
              onChange={(e) => setTermForm((f) => ({ ...f, startDate: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">End Date</label>
            <input
              type="date" value={termForm.endDate}
              onChange={(e) => setTermForm((f) => ({ ...f, endDate: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <ModalActions
            onCancel={() => setIsTermOpen(false)} onSubmit={submitTerm}
            disabled={isSaving || !termForm.name.trim() || !termForm.startDate || !termForm.endDate}
            isSaving={isSaving} label={editTermId ? "Save Changes" : "Add Term"}
          />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Rooms
// =====================================================================

function RoomsTab({ organizationId, rooms, refresh }: { organizationId: string; rooms: any[]; refresh: () => void }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", capacity: "", type: "", building: "", floor: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", code: "", capacity: "", type: "", building: "", floor: "" });
    setError(null);
    setIsAddOpen(true);
  };

  const openEdit = (room: any) => {
    setEditId(room.id);
    setForm({
      name: room.name, code: room.code,
      capacity: room.capacity != null ? String(room.capacity) : "",
      type: room.type || "", building: room.building || "", floor: room.floor || "",
    });
    setError(null);
    setIsAddOpen(true);
  };

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const payload = {
        name: form.name, code: form.code,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        type: form.type || undefined, building: form.building || undefined, floor: form.floor || undefined,
      };
      const res = editId ? await updateRoom(editId, payload) : await createRoom({ organizationId, ...payload });
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
    if (!confirm("Remove this room?")) return;
    const res = await deleteRoom(id);
    if (res?.error) { alert(res.error); return; }
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Room
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.length === 0 && <p className="text-sm text-slate-500">No rooms yet.</p>}
        {rooms.map((room) => (
          <div key={room.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between">
            <div>
              <h4 className="font-bold text-slate-800">{room.name}</h4>
              <p className="text-xs text-slate-400 mt-1">{room.code}{room.capacity ? ` · Capacity ${room.capacity}` : ""}</p>
              {(room.building || room.floor) && (
                <p className="text-xs text-slate-400">{[room.building, room.floor ? `Floor ${room.floor}` : null].filter(Boolean).join(" · ")}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => openEdit(room)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
              <button onClick={() => remove(room.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {isAddOpen && (
        <Modal title={editId ? "Edit Room" : "Add Room"} onClose={() => setIsAddOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <TextField label="Room Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Room 101" />
          <TextField label="Code" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="RM-101" />
          <TextField label="Capacity (optional)" value={form.capacity} onChange={(v) => setForm((f) => ({ ...f, capacity: v }))} type="number" />
          <TextField label="Type (optional)" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} placeholder="classroom, lab..." />
          <TextField label="Building (optional)" value={form.building} onChange={(v) => setForm((f) => ({ ...f, building: v }))} />
          <TextField label="Floor (optional)" value={form.floor} onChange={(v) => setForm((f) => ({ ...f, floor: v }))} />
          <ModalActions onCancel={() => setIsAddOpen(false)} onSubmit={submit} disabled={isSaving || !form.name.trim() || !form.code.trim()} isSaving={isSaving} label={editId ? "Save Changes" : "Add Room"} />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Timetable
// =====================================================================

const DAY_LABELS: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };

function TimetableTab({ organizationId, courses, teachers, rooms, classSections, refresh }: { organizationId: string; courses: any[]; teachers: any[]; rooms: any[]; classSections: any[]; refresh: () => void }) {
  const [viewMode, setViewMode] = useState<"subject" | "section">("subject");
  const [selectedClassId, setSelectedClassId] = useState<string>(courses[0]?.id ?? "");
  const [selectedSectionId, setSelectedSectionId] = useState<string>(classSections[0]?.id ?? "");
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ dayOfWeek: 1, period: 1, startTime: "08:00", endTime: "08:45", roomId: "", staffId: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (viewMode === "subject") {
        if (!selectedClassId) { setSlots([]); return; }
        const data = await getTimetableForClass(selectedClassId);
        setSlots(data);
      } else {
        if (!selectedSectionId) { setSlots([]); return; }
        const data = await getTimetableForSection(selectedSectionId);
        setSlots(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedClassId, selectedSectionId]);

  const primaryTeacherId = () => {
    // best-effort: no ClassTeacher data available client-side here, so leave
    // blank and let the server auto-derive on create; still let the admin
    // pick explicitly.
    return "";
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ dayOfWeek: 1, period: 1, startTime: "08:00", endTime: "08:45", roomId: "", staffId: primaryTeacherId(), notes: "" });
    setError(null);
    setIsAddOpen(true);
  };

  const openEdit = (slot: any) => {
    setEditId(slot.id);
    setForm({
      dayOfWeek: slot.dayOfWeek, period: slot.period, startTime: slot.startTime, endTime: slot.endTime,
      roomId: slot.roomId || "", staffId: slot.staffId || "", notes: slot.notes || "",
    });
    setError(null);
    setIsAddOpen(true);
  };

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const payload = {
        dayOfWeek: form.dayOfWeek, period: form.period, startTime: form.startTime, endTime: form.endTime,
        roomId: form.roomId || undefined, staffId: form.staffId || undefined, notes: form.notes || undefined,
      };
      const res = editId
        ? await updateTimetableSlot(editId, payload)
        : await createTimetableSlot({ classId: selectedClassId, ...payload });
      if ('error' in res) throw new Error(res.error);
      setIsAddOpen(false);
      await load();
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this slot?")) return;
    const res = await deleteTimetableSlot(id);
    if (res?.error) { alert(res.error); return; }
    await load();
    refresh();
  };

  const periods = [...new Set(slots.map((s) => s.period))].sort((a, b) => a - b);
  const days = [1, 2, 3, 4, 5];
  const cellsFor = (day: number, period: number) => slots.filter((s) => s.dayOfWeek === day && s.period === period);

  return (
    <div className="space-y-4">
      <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setViewMode("subject")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "subject" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Manage by Subject Class
        </button>
        <button
          onClick={() => setViewMode("section")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "section" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Master View (By Section)
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {viewMode === "subject" ? (
          <div>
            <label className="text-sm font-medium text-slate-700 mr-2">Subject Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[200px]"
            >
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-slate-700 mr-2">Class Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[200px]"
            >
              {classSections.map((cs) => <option key={cs.id} value={cs.id}>{cs.name}</option>)}
            </select>
          </div>
        )}
        <button
          onClick={openAdd}
          disabled={viewMode === "subject" ? !selectedClassId : !selectedSectionId}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Slot
        </button>
      </div>

      {courses.length === 0 ? (
        <p className="text-sm text-slate-500">Create a Subject Class first, before scheduling its timetable.</p>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    {viewMode === "section" && <th className="px-6 py-4">Subject Class</th>}
                    <th className="px-6 py-4">Day</th>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Room</th>
                    <th className="px-6 py-4">Teacher</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={viewMode === "section" ? 7 : 6} className="px-6 py-8 text-center text-slate-400">Loading...</td></tr>
                  ) : slots.length === 0 ? (
                    <tr><td colSpan={viewMode === "section" ? 7 : 6} className="px-6 py-8 text-center text-slate-500">No slots scheduled yet.</td></tr>
                  ) : (
                    slots.map((slot) => (
                      <tr key={slot.id} className="hover:bg-slate-50 transition-colors">
                        {viewMode === "section" && <td className="px-6 py-4 font-medium text-slate-800">{slot.courseName ?? "—"}</td>}
                        <td className="px-6 py-4 font-medium text-slate-800">{DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek}</td>
                        <td className="px-6 py-4 text-slate-500">{slot.period}</td>
                        <td className="px-6 py-4 text-slate-500">{slot.startTime} – {slot.endTime}</td>
                        <td className="px-6 py-4 text-slate-500">{slot.roomName ?? "—"}</td>
                        <td className="px-6 py-4 text-slate-500">{slot.staffName ?? "—"}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => openEdit(slot)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => remove(slot.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors ml-1"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {slots.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 border border-slate-100">Period</th>
                      {days.map((d) => <th key={d} className="px-3 py-2 border border-slate-100">{DAY_LABELS[d]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p) => (
                      <tr key={p}>
                        <td className="px-3 py-2 border border-slate-100 font-medium text-slate-600">{p}</td>
                        {days.map((d) => {
                          const cells = cellsFor(d, p);
                          return (
                            <td key={d} className="px-3 py-2 border border-slate-100 text-slate-600 align-top">
                              <div className="flex flex-col gap-2">
                                {cells.length > 0 ? cells.map((cell: any) => (
                                  <div key={cell.id} className="bg-slate-50 p-1.5 rounded border border-slate-200 shadow-sm">
                                    {viewMode === "section" ? (
                                      <div className="flex flex-col items-center justify-center text-xs">
                                        <span className="font-semibold text-slate-800 text-center">{cell.courseName}</span>
                                        <span className="text-slate-500 text-[10px]">{cell.roomName || "No Room"}</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center text-xs">
                                        <span className="font-semibold text-slate-700">{cell.roomName || "✓"}</span>
                                      </div>
                                    )}
                                  </div>
                                )) : ""}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {isAddOpen && (
        <Modal title={editId ? "Edit Slot" : "Add Slot"} onClose={() => setIsAddOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <div>
            <label className="text-sm font-medium text-slate-700">Day</label>
            <select
              value={form.dayOfWeek}
              onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: parseInt(e.target.value) }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {days.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
            </select>
          </div>
          <TextField label="Period" value={String(form.period)} onChange={(v) => setForm((f) => ({ ...f, period: parseInt(v) || 1 }))} type="number" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Start Time" value={form.startTime} onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} type="time" />
            <TextField label="End Time" value={form.endTime} onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} type="time" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Room (optional)</label>
            <select
              value={form.roomId}
              onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">None</option>
              {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Teacher (optional — defaults to class's primary teacher)</label>
            <select
              value={form.staffId}
              onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Auto (class's primary teacher)</option>
              {teachers.map((t: any) => (
                <option key={t.staffProfile?.id} value={t.staffProfile?.id}>{t.user?.name ?? t.user?.email}</option>
              ))}
            </select>
          </div>
          <TextField label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <ModalActions onCancel={() => setIsAddOpen(false)} onSubmit={submit} disabled={isSaving} isSaving={isSaving} label={editId ? "Save Changes" : "Add Slot"} />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Calendar
// =====================================================================

const AUDIENCE_ROLES = ["ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;
const EVENT_CATEGORIES = ["academic", "sports", "cultural", "admin", "holiday"];

function CalendarTab({ organizationId, events, grades, currentUserId, refresh }: { organizationId: string; events: any[]; grades: any[]; currentUserId?: string | null; refresh: () => void }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", startDate: "", endDate: "", allDay: true, category: "academic",
    rolesAll: true, roles: [] as string[], yearsAll: true, years: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const audienceSummary = (raw: string, labelFor: (v: string) => string) => {
    if (raw === "all") return "All";
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length > 0 ? arr.map(labelFor).join(", ") : "All";
    } catch {
      return "All";
    }
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ title: "", description: "", startDate: "", endDate: "", allDay: true, category: "academic", rolesAll: true, roles: [], yearsAll: true, years: [] });
    setError(null);
    setIsAddOpen(true);
  };

  const parseField = (raw: string): string[] | "all" => {
    if (raw === "all") return "all";
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(String) : "all";
    } catch {
      return "all";
    }
  };

  const openEdit = (ev: any) => {
    setEditId(ev.id);
    const roles = parseField(ev.targetRoles);
    const years = parseField(ev.targetYears);
    setForm({
      title: ev.title, description: ev.description || "",
      startDate: ev.startDate ? new Date(ev.startDate).toISOString().slice(0, 10) : "",
      endDate: ev.endDate ? new Date(ev.endDate).toISOString().slice(0, 10) : "",
      allDay: ev.allDay, category: ev.category,
      rolesAll: roles === "all", roles: roles === "all" ? [] : roles,
      yearsAll: years === "all", years: years === "all" ? [] : years,
    });
    setError(null);
    setIsAddOpen(true);
  };

  const toggleRole = (role: string) => {
    setForm((f) => ({ ...f, roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role] }));
  };
  const toggleYear = (level: string) => {
    setForm((f) => ({ ...f, years: f.years.includes(level) ? f.years.filter((y) => y !== level) : [...f.years, level] }));
  };

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const payload = {
        title: form.title, description: form.description || undefined,
        startDate: form.startDate, endDate: form.endDate, allDay: form.allDay, category: form.category,
        targetRoles: (form.rolesAll ? "all" : form.roles) as any,
        targetYears: (form.yearsAll ? "all" : form.years) as any,
      };
      const res = editId
        ? await updateSchoolEvent(editId, payload)
        : await createSchoolEvent({ organizationId, createdById: currentUserId ?? "", ...payload });
      if ('error' in res) throw new Error(res.error);
      setIsAddOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this event?")) return;
    const res = await deleteSchoolEvent(id);
    if (res?.error) { alert(res.error); return; }
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Event
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500 p-6 text-center">No events yet.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">{ev.title}</h4>
                  <span className="capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{ev.category}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(ev.startDate).toLocaleDateString()} – {new Date(ev.endDate).toLocaleDateString()}
                  {" · "}Audience: {audienceSummary(ev.targetRoles, (r) => r)}
                  {" · "}Years: {audienceSummary(ev.targetYears, (y) => `Level ${y}`)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(ev)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                <button onClick={() => remove(ev.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {isAddOpen && (
        <Modal title={editId ? "Edit Event" : "Add Event"} onClose={() => setIsAddOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <TextField label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Fall Break" />
          <TextArea label="Description (optional)" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Start Date" value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} type="date" />
            <TextField label="End Date" value={form.endDate} onChange={(v) => setForm((f) => ({ ...f, endDate: v }))} type="date" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {EVENT_CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.allDay} onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))} />
            All day
          </label>

          <div>
            <label className="text-sm font-medium text-slate-700">Visible to</label>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={form.rolesAll} onChange={(e) => setForm((f) => ({ ...f, rolesAll: e.target.checked, roles: [] }))} />
                All
              </label>
              {AUDIENCE_ROLES.map((role) => (
                <label key={role} className={`flex items-center gap-1.5 text-xs ${form.rolesAll ? "text-slate-300" : "text-slate-600"}`}>
                  <input type="checkbox" disabled={form.rolesAll} checked={form.roles.includes(role)} onChange={() => toggleRole(role)} />
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Class years</label>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={form.yearsAll} onChange={(e) => setForm((f) => ({ ...f, yearsAll: e.target.checked, years: [] }))} />
                All
              </label>
              {grades.map((g: any) => (
                <label key={g.id} className={`flex items-center gap-1.5 text-xs ${form.yearsAll ? "text-slate-300" : "text-slate-600"}`}>
                  <input type="checkbox" disabled={form.yearsAll} checked={form.years.includes(String(g.level))} onChange={() => toggleYear(String(g.level))} />
                  {g.name}
                </label>
              ))}
            </div>
          </div>

          <ModalActions onCancel={() => setIsAddOpen(false)} onSubmit={submit} disabled={isSaving || !form.title.trim() || !form.startDate || !form.endDate} isSaving={isSaving} label={editId ? "Save Changes" : "Add Event"} />
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

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
