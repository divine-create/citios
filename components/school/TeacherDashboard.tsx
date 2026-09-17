"use client";

import React, { useMemo, useState } from "react";
import { BookOpen, ClipboardCheck, GraduationCap, Plus, Loader2, AlertCircle, X, ShieldAlert, CalendarClock, TrendingUp } from "lucide-react";
import { Button } from "@/components/Shared";
import PromotionPanel from "./PromotionPanel";
import {
  bulkMarkAttendance,
  createAssignment,
  createBehaviorLog,
  getTeacherPortalData,
  markAttendance,
  recordGrade,
} from "@/lib/actions/school";

type Course = { id: string; name: string; roomNumber: string | null };
type Enrollment = { id: string; studentDataId: string; courseId: string; grade: number | null };
type Student = { id: string; firstName: string; lastName: string };
type Assignment = { id: string; courseId: string; title: string; category: string; weight: number; maxScore: number };
type Grade = { id: string; assignmentId: string; studentDataId: string; score: number };
type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

type AttendanceRecord = { id: string; studentDataId: string; status: AttendanceStatus; date: string };

interface TeacherDashboardProps {
  organizationId: string | null;
  organizationMemberId: string | null;
  initialCourses: Course[];
  initialEnrollments: Enrollment[];
  initialStudents: Student[];
  initialAssignments: Assignment[];
  initialGrades: Grade[];
  initialTodayAttendance: AttendanceRecord[];
  initialSchedule?: any[];
  initialEvents?: any[];
  initialFormSections?: any[];
}

const TABS = [
  { id: "roster", label: "Roster & Attendance", icon: ClipboardCheck },
  { id: "gradebook", label: "Gradebook", icon: GraduationCap },
  { id: "schedule", label: "My Schedule", icon: CalendarClock },
] as const;

type TabId = (typeof TABS)[number]["id"] | "promotion";

export default function TeacherDashboard({
  organizationId,
  organizationMemberId,
  initialCourses,
  initialEnrollments,
  initialStudents,
  initialAssignments,
  initialGrades,
  initialTodayAttendance,
  initialSchedule = [],
  initialEvents = [],
  initialFormSections = [],
}: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("roster");
  const [courses] = useState<Course[]>(initialCourses);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courses[0]?.id ?? null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(initialEnrollments);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [grades, setGrades] = useState<Grade[]>(initialGrades);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialTodayAttendance);
  const [mySchedule, setMySchedule] = useState<any[]>(initialSchedule);
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [formSections, setFormSections] = useState<any[]>(initialFormSections);

  const refresh = async () => {
    const data = organizationMemberId
      ? await getTeacherPortalData(organizationMemberId, organizationId ?? undefined)
      : organizationId
      ? await getTeacherPortalData(undefined, organizationId)
      : null;
    if (!data) return;
    setEnrollments(data.enrollments);
    setStudents(data.students);
    setAssignments(data.assignments);
    setGrades(data.grades);
    setAttendance(data.todayAttendance);
    setMySchedule(data.mySchedule ?? []);
    setEvents(data.events ?? []);
    setFormSections(data.formSections ?? []);
  };

  const roster = useMemo(() => {
    const studentIds = enrollments.filter((e) => e.courseId === selectedCourseId).map((e) => e.studentDataId);
    return students.filter((s) => studentIds.includes(s.id));
  }, [enrollments, students, selectedCourseId]);

  const courseAssignments = assignments.filter((a) => a.courseId === selectedCourseId);
  const tabs = formSections.length > 0 ? [...TABS, { id: "promotion" as const, label: "Promotion", icon: TrendingUp }] : TABS;

  if (!organizationId) {
    return (
      <div className="p-10 text-center text-gray-400">
        <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
        <p>No school organization found — run the seed script.</p>
      </div>
    );
  }

  if (courses.length === 0 && formSections.length === 0) {
    return (
      <div className="p-10 text-center text-gray-400">
        <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
        <p>No courses assigned to you yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 md:px-10 py-5">
        <h1 className="text-xl font-bold text-gray-900">Teacher Portal</h1>
        <p className="text-sm text-gray-500">Roster, attendance, and gradebook for your classes.</p>
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourseId(c.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedCourseId === c.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 px-6 md:px-10 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        {activeTab === "roster" && (
          <RosterTab
            organizationId={organizationId as string}
            organizationMemberId={organizationMemberId}
            roster={roster}
            attendance={attendance}
            onChanged={refresh}
          />
        )}
        {activeTab === "gradebook" && selectedCourseId && (
          <GradebookTab
            courseId={selectedCourseId}
            roster={roster}
            assignments={courseAssignments}
            grades={grades}
            onChanged={refresh}
          />
        )}
        {activeTab === "schedule" && <ScheduleTab schedule={mySchedule} events={events} />}
        {activeTab === "promotion" && formSections.length > 0 && (
          <PromotionTab organizationId={organizationId as string} formSections={formSections} refresh={refresh} />
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Roster & Attendance
// =====================================================================

function RosterTab({
  organizationId,
  organizationMemberId,
  roster,
  attendance,
  onChanged,
}: {
  organizationId: string;
  organizationMemberId: string | null;
  roster: Student[];
  attendance: AttendanceRecord[];
  onChanged: () => Promise<void>;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [behaviorStudentId, setBehaviorStudentId] = useState<string | null>(null);
  const [behaviorForm, setBehaviorForm] = useState({ type: "COMMENDATION" as "DEMERIT" | "COMMENDATION" | "REFERRAL", note: "" });
  const [behaviorError, setBehaviorError] = useState<string | null>(null);

  const mark = async (studentDataId: string, status: AttendanceStatus) => {
    await markAttendance(studentDataId, status);
    await onChanged();
  };

  const markAllPresent = async () => {
    setIsBusy(true);
    try {
      await bulkMarkAttendance(roster.map((s) => s.id), "PRESENT");
      await onChanged();
    } finally {
      setIsBusy(false);
    }
  };

  const submitBehavior = async () => {
    if (!behaviorStudentId) return;
    setBehaviorError(null);
    try {
      const result = await createBehaviorLog({
        organizationId: organizationId as string,
        studentDataId: behaviorStudentId,
        reportedById: organizationMemberId as string,
        type: behaviorForm.type,
        note: behaviorForm.note,
      });
      if (result?.error) {
        setBehaviorError(result.error);
        return;
      }
      setBehaviorStudentId(null);
      setBehaviorForm({ type: "COMMENDATION", note: "" });
    } catch {
      setBehaviorError("Failed to log behavior.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Today's Roster</h3>
        <button
          onClick={markAllPresent}
          disabled={isBusy || roster.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {isBusy && <Loader2 size={14} className="animate-spin" />}
          Mark All Present
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3">Student</th>
              <th className="text-left px-5 py-3">Attendance</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {roster.map((s) => {
              const record = attendance.find((a) => a.studentDataId === s.id);
              return (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-medium text-gray-900">{s.firstName} {s.lastName}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      {(["PRESENT", "LATE", "ABSENT", "EXCUSED"] as AttendanceStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => mark(s.id, status)}
                          className={`w-8 h-8 rounded-md text-xs font-bold transition-colors ${
                            record?.status === status
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {status === "PRESENT" ? "P" : status === "LATE" ? "L" : status === "EXCUSED" ? "E" : "A"}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setBehaviorStudentId(s.id)}
                      className="text-xs font-semibold text-gray-400 hover:text-indigo-600 flex items-center gap-1 ml-auto"
                    >
                      <ShieldAlert size={12} /> Log behavior
                    </button>
                  </td>
                </tr>
              );
            })}
            {roster.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">No students enrolled in this course.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      {behaviorStudentId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBehaviorStudentId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Log Behavior</h2>
              <button onClick={() => setBehaviorStudentId(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {behaviorError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{behaviorError}</span>
                </div>
              )}
              <select
                value={behaviorForm.type}
                onChange={(e) => setBehaviorForm((f) => ({ ...f, type: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="COMMENDATION">Commendation</option>
                <option value="DEMERIT">Demerit</option>
                <option value="REFERRAL">Referral</option>
              </select>
              <textarea
                value={behaviorForm.note}
                onChange={(e) => setBehaviorForm((f) => ({ ...f, note: e.target.value }))}
                rows={3}
                placeholder="Note..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setBehaviorStudentId(null)}>
                Cancel
              </Button>
              <button
                onClick={submitBehavior}
                disabled={!behaviorForm.note.trim()}
                className="flex-1 bg-indigo-600 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-indigo-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Gradebook
// =====================================================================

function GradebookTab({
  courseId,
  roster,
  assignments,
  grades,
  onChanged,
}: {
  courseId: string;
  roster: Student[];
  assignments: Assignment[];
  grades: Grade[];
  onChanged: () => Promise<void>;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "Homework", weight: "1", maxScore: "100" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submitAssignment = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const result = await createAssignment({
        courseId,
        title: form.title,
        category: form.category,
        weight: parseFloat(form.weight) || 1,
        maxScore: parseFloat(form.maxScore) || 100,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsAddOpen(false);
      setForm({ title: "", category: "Homework", weight: "1", maxScore: "100" });
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const saveGrade = async (studentDataId: string, assignmentId: string, value: string) => {
    const score = parseFloat(value);
    if (isNaN(score)) return;
    await recordGrade({ assignmentId, studentDataId, courseId, score });
    await onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Gradebook</h3>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={16} /> New Assignment
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3 sticky left-0 bg-gray-50">Student</th>
              {assignments.map((a) => (
                <th key={a.id} className="text-left px-4 py-3 whitespace-nowrap">
                  {a.title} <span className="text-gray-300">/{a.maxScore}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {roster.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3 font-medium text-gray-900 sticky left-0 bg-white">{s.firstName} {s.lastName}</td>
                {assignments.map((a) => {
                  const g = grades.find((gr) => gr.assignmentId === a.id && gr.studentDataId === s.id);
                  return (
                    <td key={a.id} className="px-4 py-3">
                      <input
                        type="number"
                        defaultValue={g?.score ?? ""}
                        onBlur={(e) => saveGrade(s.id, a.id, e.target.value)}
                        placeholder="-"
                        className="w-16 border border-transparent hover:border-gray-200 focus:border-indigo-400 rounded px-2 py-1 text-sm focus:outline-none"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr><td className="px-5 py-8 text-center text-gray-400">No assignments yet — add one to start grading.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsAddOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New Assignment</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Chapter 4 Quiz"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Weight</label>
                  <input
                    type="number"
                    value={form.weight}
                    onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Max Score</label>
                  <input
                    type="number"
                    value={form.maxScore}
                    onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <button
                onClick={submitAssignment}
                disabled={isSaving || !form.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// My Schedule
// =====================================================================

const SCHEDULE_DAY_LABELS: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };

function ScheduleTab({ schedule, events }: { schedule: any[]; events: any[] }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Weekly Schedule</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">Day</th>
                <th className="text-left px-5 py-3">Period</th>
                <th className="text-left px-5 py-3">Time</th>
                <th className="text-left px-5 py-3">Class</th>
                <th className="text-left px-5 py-3">Room</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedule.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No timetable slots scheduled yet.</td></tr>
              ) : (
                schedule.map((slot) => (
                  <tr key={slot.id}>
                    <td className="px-5 py-3 font-medium text-gray-900">{SCHEDULE_DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek}</td>
                    <td className="px-5 py-3 text-gray-500">{slot.period}</td>
                    <td className="px-5 py-3 text-gray-500">{slot.startTime} – {slot.endTime}</td>
                    <td className="px-5 py-3 text-gray-700">{slot.className}</td>
                    <td className="px-5 py-3 text-gray-500">{slot.roomName ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Upcoming Events</h3>
        </div>
        <ul className="divide-y divide-gray-100">
          {events.length === 0 ? (
            <li className="px-5 py-8 text-center text-gray-400 text-sm">No upcoming events.</li>
          ) : (
            events.map((ev) => (
              <li key={ev.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{ev.category}</p>
                </div>
                <span className="text-xs text-gray-500">{new Date(ev.startDate).toLocaleDateString()}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

// =====================================================================
// Promotion (only shown when this teacher is a section's form/class teacher)
// =====================================================================

function PromotionTab({ organizationId, formSections, refresh }: { organizationId: string; formSections: any[]; refresh: () => Promise<void> }) {
  const [selectedSectionId, setSelectedSectionId] = useState(formSections[0]?.id ?? "");

  return (
    <div className="space-y-4">
      {formSections.length > 1 && (
        <select
          value={selectedSectionId}
          onChange={(e) => setSelectedSectionId(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          {formSections.map((s: any) => (
            <option key={s.id} value={s.id}>{s.gradeName ?? ""} - {s.name} ({s.academicYearLabel})</option>
          ))}
        </select>
      )}
      {selectedSectionId && <PromotionPanel organizationId={organizationId} classSectionId={selectedSectionId} onDone={refresh} />}
    </div>
  );
}
