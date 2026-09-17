"use client";

import React, { useEffect, useState } from "react";
import { GraduationCap, CalendarCheck, DollarSign, CheckCircle2, AlertCircle, Clock, CalendarClock, Bell, FileText } from "lucide-react";
import { getStudentReportCard } from "@/lib/actions/school";
import ReportCardView from "./ReportCardView";

interface Child {
  student: any;
  organization: any;
  feeInvoices: any[];
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

interface ParentPortalData {
  user: any;
  children: Child[];
}

export default function ParentDashboard({ initialData }: { initialData: ParentPortalData | null }) {
  if (!initialData || !initialData.user) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 text-center py-20 px-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-4">Please Sign In</h2>
        <p className="text-slate-600 mb-6">Sign in to view your children's grades, attendance, and fees.</p>
      </div>
    );
  }

  if (initialData.children.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 text-center py-20 px-4">
        <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">No Children Linked</h2>
        <p className="text-slate-600">No children are linked to your account yet — contact your school's front office to be added as a parent/guardian.</p>
      </div>
    );
  }

  return <ParentDashboardContent children={initialData.children} />;
}

function ParentDashboardContent({ children }: { children: Child[] }) {
  const [selectedChildId, setSelectedChildId] = useState<string>(children[0].student.id);
  const [activeTab, setActiveTab] = useState<"grades" | "attendance" | "fees" | "schedule" | "reportcard">("grades");

  const child = children.find((c) => c.student.id === selectedChildId) ?? children[0];
  const { student, organization, feeInvoices, classes, assignments, grades, attendance, timetable = [], rooms = [], events = [], reportCards = [] } = child;
  const getClassName = (classId: string) => classes.find((c: any) => c.id === classId)?.name ?? "Unknown Class";

  const [selectedReportTermId, setSelectedReportTermId] = useState<string>(reportCards[0]?.termId ?? "");
  const [reportCardData, setReportCardData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const defaultTermId = reportCards[0]?.termId ?? "";
    setSelectedReportTermId(defaultTermId);
  }, [student.id]);

  useEffect(() => {
    if (!selectedReportTermId) { setReportCardData(null); return; }
    setReportLoading(true);
    getStudentReportCard(student.organizationId, student.id, selectedReportTermId, { requirePublished: true })
      .then(setReportCardData)
      .finally(() => setReportLoading(false));
  }, [selectedReportTermId, student.id, student.organizationId]);

  const attendanceCounts = attendance.reduce((acc: Record<string, number>, a: any) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 md:px-10 py-5">
        <h1 className="text-xl font-bold text-gray-900">Parent Portal</h1>
        <p className="text-sm text-gray-500">Grades, attendance, and fees for your children.</p>
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {children.map((c) => (
            <button
              key={c.student.id}
              onClick={() => setSelectedChildId(c.student.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedChildId === c.student.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.student.firstName} {c.student.lastName}
            </button>
          ))}
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 px-4 md:px-10 flex gap-1 overflow-x-auto">
        {[
          { id: "grades", label: "Grades", icon: GraduationCap },
          { id: "attendance", label: "Attendance", icon: CalendarCheck },
          { id: "fees", label: "Fees", icon: DollarSign },
          { id: "schedule", label: "Schedule", icon: CalendarClock },
          { id: "reportcard", label: "Report Card", icon: FileText },
        ].map((tab) => (
          <button
            key={tab.slug}
            onClick={() => setActiveTab(tab.slug as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.slug ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="p-4 md:p-10 max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-800">{student.firstName} {student.lastName}</h2>
          <p className="text-sm text-slate-500">{organization?.name} · Grade {student.yearLevel}</p>
        </div>

        {activeTab === "grades" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classes.length === 0 ? (
              <p className="text-slate-400 text-sm col-span-2 text-center py-10">Not enrolled in any classes yet.</p>
            ) : (
              classes.map((cls) => {
                const classAssignments = assignments.filter((a) => a.classId === cls.id);
                const classGrades = grades.filter((g) => classAssignments.some((a) => a.id === g.gradebookId));
                const avg = classGrades.length > 0 ? classGrades.reduce((s, g) => s + (g.score ?? 0), 0) / classGrades.length : null;
                return (
                  <div key={cls.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="font-semibold text-slate-900">{cls.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{cls.subject}</p>
                    <div className="flex items-end justify-between mt-4">
                      <span className="text-2xl font-bold text-slate-900">{avg !== null ? `${avg.toFixed(1)}%` : "No grades yet"}</span>
                      <span className="text-xs text-slate-400">{classAssignments.length} assignment{classAssignments.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {["PRESENT", "ABSENT", "LATE", "EXCUSED"].map((status) => (
                <div key={status} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{attendanceCounts[status] ?? 0}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">{status}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50"><h3 className="text-sm font-semibold text-slate-700">Recent Attendance</h3></div>
              <div className="overflow-x-auto">
                <ul className="divide-y divide-slate-100 min-w-[300px]">
                  {attendance.length === 0 ? (
                    <li className="px-5 py-8 text-center text-slate-400 text-sm">No attendance records yet.</li>
                  ) : (
                    [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map((a) => (
                      <li key={a.id} className="px-5 py-3 flex items-center justify-between text-sm">
                        <span className="text-slate-600">{new Date(a.date).toLocaleDateString()}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.status === "PRESENT" ? "bg-emerald-100 text-emerald-700" : a.status === "ABSENT" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>{a.status}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === "fees" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {feeInvoices.length === 0 ? (
                <li className="px-5 py-10 text-center text-slate-400 text-sm">No fee invoices on file.</li>
              ) : (
                feeInvoices.map((inv) => {
                  const isPaid = inv.status === "paid";
                  return (
                    <li key={inv.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-medium text-slate-900">${inv.totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">Due {new Date(inv.dueDate).toLocaleDateString()} · ${inv.paidAmount.toFixed(2)} paid</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {isPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />} {inv.status}
                        </span>
                        <button disabled className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed" title="Online fee payment is coming soon — contact the school office to pay">
                          Pay Now
                        </button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50"><h3 className="text-sm font-semibold text-slate-700">Weekly Schedule</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Day</th>
                      <th className="px-5 py-3">Period</th>
                      <th className="px-5 py-3">Time</th>
                      <th className="px-5 py-3">Class</th>
                      <th className="px-5 py-3">Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timetable.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No timetable slots scheduled yet.</td></tr>
                    ) : (
                      timetable.map((slot: any) => (
                        <tr key={slot.id}>
                          <td className="px-5 py-3 font-medium text-slate-800">{SCHEDULE_DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek}</td>
                          <td className="px-5 py-3 text-slate-500">{slot.period}</td>
                          <td className="px-5 py-3 text-slate-500">{slot.startTime} – {slot.endTime}</td>
                          <td className="px-5 py-3 text-slate-700">{getClassName(slot.classId)}</td>
                          <td className="px-5 py-3 text-slate-500">{rooms.find((r: any) => r.id === slot.roomId)?.name ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50"><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Bell size={14} /> Upcoming Events</h3></div>
              <ul className="divide-y divide-slate-100">
                {events.length === 0 ? (
                  <li className="px-5 py-8 text-center text-slate-400 text-sm">No upcoming events.</li>
                ) : (
                  events.map((ev: any) => (
                    <li key={ev.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{ev.title}</p>
                        <p className="text-xs text-slate-400 capitalize">{ev.category}</p>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(ev.startDate).toLocaleDateString()}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}

        {activeTab === "reportcard" && (
          <div className="space-y-4">
            {reportCards.length > 0 && (
              <div className="flex justify-end">
                <select
                  value={selectedReportTermId}
                  onChange={(e) => setSelectedReportTermId(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {reportCards.map((rc: any) => (
                    <option key={rc.termId} value={rc.termId}>{rc.termName} ({rc.academicYear})</option>
                  ))}
                </select>
              </div>
            )}
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
        )}
      </div>
    </div>
  );
}
