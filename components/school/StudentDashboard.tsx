"use client";

import React, { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, Clock, GraduationCap, CalendarCheck, CalendarClock, Bell, FileText } from 'lucide-react';
import { getStudentReportCard } from '@/lib/actions/school';
import ReportCardView from './ReportCardView';

interface StudentPortalData {
  user: any;
  student: any;
  organization?: any;
  classes: any[];
  assignments: any[];
  grades: any[];
  attendance: any[];
  timetable: any[];
  rooms: any[];
  events: any[];
  reportCards: any[];
}

const SCHEDULE_DAY_LABELS: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };

export function StudentDashboard({ initialData }: { initialData: StudentPortalData | null }) {
  const student = initialData?.student ?? null;
  const reportCards = initialData?.reportCards ?? [];
  const [selectedReportTermId, setSelectedReportTermId] = useState<string>(reportCards[0]?.termId ?? "");
  const [reportCardData, setReportCardData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!selectedReportTermId || !student) { setReportCardData(null); return; }
    setReportLoading(true);
    getStudentReportCard(student.organizationId, student.id, selectedReportTermId, { requirePublished: true })
      .then(setReportCardData)
      .finally(() => setReportLoading(false));
  }, [selectedReportTermId, student]);

  if (!initialData || !initialData.user) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 text-center py-20 px-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-4">Please Sign In</h2>
        <p className="text-slate-600 mb-6">Sign in to view your grades, assignments, and attendance.</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 text-center py-20 px-4">
        <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">No Student Record Linked</h2>
        <p className="text-slate-600">Your account isn't linked to a student record yet — contact your school's front office.</p>
      </div>
    );
  }

  const { organization, classes, assignments, grades, attendance, timetable = [], rooms = [], events = [] } = initialData;

  const missingAssignments = assignments.filter((a) => !grades.some((g) => g.gradebookId === a.id));
  const presentCount = attendance.filter((a) => a.status === "PRESENT").length;
  const attendancePct = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;

  const classAverage = (classId: string) => {
    const classAssignments = assignments.filter((a) => a.classId === classId);
    const classGrades = grades.filter((g) => classAssignments.some((a) => a.id === g.gradebookId));
    if (classGrades.length === 0) return null;
    return classGrades.reduce((s, g) => s + (g.score ?? 0), 0) / classGrades.length;
  };

  const getClassName = (classId: string) => classes.find((c) => c.id === classId)?.name ?? "Unknown Class";

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 md:p-6 w-full text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
            {student.firstName.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{student.firstName} {student.lastName}</h1>
            <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
              <GraduationCap className="w-4 h-4" />
              <span>Grade {student.yearLevel}</span>
              <span className="hidden sm:inline">·</span>
              <span>ID: {student.studentId}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center md:text-right hidden sm:block">
            <p className="text-sm text-slate-500 font-medium flex items-center gap-1 justify-end"><CalendarCheck className="w-3.5 h-3.5" /> Attendance</p>
            <p className="text-3xl font-bold text-green-600">{attendancePct !== null ? `${attendancePct}%` : "—"}</p>
          </div>
        </div>
      </div>

      {missingAssignments.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-red-100">
            <h3 className="flex items-center text-red-700 font-semibold text-lg">
              <AlertCircle className="w-5 h-5 mr-2" />
              Missing Assignments
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {missingAssignments.map((a) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-3.5 rounded-lg border border-red-100 shadow-sm gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{a.name}</p>
                  <p className="text-sm text-slate-500">{getClassName(a.classId)}</p>
                </div>
                {a.dueDate && (
                  <span className="text-sm font-medium text-red-600">Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="flex items-center gap-2 font-semibold text-lg text-slate-900 mb-4">
          <BookOpen className="w-5 h-5 text-blue-600" /> Academic Dashboard
        </h2>
        {classes.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">Not enrolled in any classes yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((cls) => {
              const avg = classAverage(cls.id);
              const classAssignments = assignments.filter((a) => a.classId === cls.id);
              return (
                <div key={cls.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900">{cls.name}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{cls.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-2 mb-3">
                    <span className="text-3xl font-bold text-slate-900">{avg !== null ? `${avg.toFixed(1)}%` : "No grades yet"}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {classAssignments.length} assignment{classAssignments.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {avg !== null && (
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(avg, 100)}%` }}></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="flex items-center gap-2 font-semibold text-lg text-slate-900 mb-4">
          <CalendarClock className="w-5 h-5 text-blue-600" /> This Week's Schedule
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Day</th>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timetable.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No timetable slots scheduled yet.</td></tr>
                ) : (
                  timetable.map((slot: any) => (
                    <tr key={slot.id}>
                      <td className="px-6 py-4 font-medium text-slate-800">{SCHEDULE_DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek}</td>
                      <td className="px-6 py-4 text-slate-500">{slot.period}</td>
                      <td className="px-6 py-4 text-slate-500">{slot.startTime} – {slot.endTime}</td>
                      <td className="px-6 py-4 text-slate-700">{getClassName(slot.classId)}</td>
                      <td className="px-6 py-4 text-slate-500">{rooms.find((r: any) => r.id === slot.roomId)?.name ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="flex items-center gap-2 font-semibold text-lg text-slate-900 mb-4">
          <Bell className="w-5 h-5 text-blue-600" /> Upcoming Events
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {events.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No upcoming events.</p>
          ) : (
            events.map((ev: any) => (
              <div key={ev.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{ev.title}</p>
                  <p className="text-xs text-slate-400 capitalize">{ev.category}</p>
                </div>
                <span className="text-xs text-slate-500">{new Date(ev.startDate).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="flex items-center gap-2 font-semibold text-lg text-slate-900">
            <FileText className="w-5 h-5 text-blue-600" /> Report Card
          </h2>
          {reportCards.length > 0 && (
            <select
              value={selectedReportTermId}
              onChange={(e) => setSelectedReportTermId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {reportCards.map((rc: any) => (
                <option key={rc.termId} value={rc.termId}>{rc.termName} ({rc.academicYear})</option>
              ))}
            </select>
          )}
        </div>
        {reportCards.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-10">
            <p className="text-slate-400 text-sm">No published report cards yet.</p>
          </div>
        ) : reportLoading || !reportCardData ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm text-center py-10">
            <p className="text-slate-400 text-sm">Loading...</p>
          </div>
        ) : (
          <ReportCardView schoolName={organization?.name ?? ""} data={reportCardData} />
        )}
      </div>
    </div>
  );
}
