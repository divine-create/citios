"use client";

import React from "react";
import { GraduationCap } from "lucide-react";

interface ReportCardData {
  student: { firstName: string; lastName: string; studentDataId: string; yearLevel: number | null };
  subjects: {
    classId: string;
    subjectName: string;
    percentage: number | null;
    breakdown: { name: string; type: string; score: number; maxScore: number; percentage: number; weight: number }[];
    gradeLabel: string | null;
    gradeRemark: string | null;
  }[];
  overallPercentage: number | null;
  overallGradeLabel: string | null;
  overallGradeRemark: string | null;
  position: number | null;
  classSize: number;
  term: { name: string; termNumber?: number } | null;
  academicYear: { year: number } | null;
  attendance: { present: number; absent: number; late: number; excused: number; total: number };
  reportCard: { comments?: string | null; teacherNotes?: string | null; principalNotes?: string | null; published: boolean; issuedAt?: string | null } | null;
  gradingScale: { name: string; boundaries: { label: string; minPercent: number; maxPercent: number; remark?: string | null }[] } | null;
  notPublished?: boolean;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function ReportCardView({ schoolName, data }: { schoolName: string; data: ReportCardData }) {
  if (data.notPublished) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 px-4">
        <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">Report Card Not Yet Published</h3>
        <p className="text-slate-500 text-sm">Your school hasn't published this term's report card yet — check back later.</p>
      </div>
    );
  }

  const { student, subjects, overallPercentage, overallGradeLabel, position, classSize, term, academicYear, attendance, reportCard, gradingScale } = data;

  return (
    <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print:border-0 print:shadow-none">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300 mb-1">{schoolName}</p>
        <h2 className="text-xl font-black tracking-tight">TERMLY REPORT SHEET</h2>
        <p className="text-sm text-slate-300 mt-1">
          {term?.name ?? "Term"}{academicYear ? ` — ${academicYear.year}/${academicYear.year + 1} Session` : ""}
        </p>
      </div>

      {/* Student info bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200 text-sm">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Student Name</p>
          <p className="font-semibold text-slate-800">{student.firstName} {student.lastName}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Admission No.</p>
          <p className="font-semibold text-slate-800">{student.studentDataId}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Class</p>
          <p className="font-semibold text-slate-800">{student.yearLevel != null ? `Grade ${student.yearLevel}` : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">No. in Class</p>
          <p className="font-semibold text-slate-800">{classSize || "—"}</p>
        </div>
      </div>

      {/* Subject results table */}
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wide">
                <th className="text-left px-3 py-2 border border-slate-200">Subject</th>
                <th className="text-left px-3 py-2 border border-slate-200">Breakdown</th>
                <th className="text-center px-3 py-2 border border-slate-200">Total %</th>
                <th className="text-center px-3 py-2 border border-slate-200">Grade</th>
                <th className="text-left px-3 py-2 border border-slate-200">Remark</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400 border border-slate-200">No subject results recorded yet.</td></tr>
              ) : (
                subjects.map((s) => (
                  <tr key={s.classId} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 border border-slate-200 font-medium text-slate-800">{s.subjectName}</td>
                    <td className="px-3 py-2.5 border border-slate-200 text-xs text-slate-500">
                      {s.breakdown.length === 0 ? "—" : s.breakdown.map((b) => `${b.name}: ${b.score}/${b.maxScore}`).join(" · ")}
                    </td>
                    <td className="px-3 py-2.5 border border-slate-200 text-center font-semibold text-slate-800">
                      {s.percentage !== null ? `${s.percentage.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2.5 border border-slate-200 text-center">
                      {s.gradeLabel ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">{s.gradeLabel}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 border border-slate-200 text-slate-500">{s.gradeRemark ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary + attendance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="border border-slate-200 rounded-lg p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Term Summary</h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Overall Average</span><span className="font-semibold text-slate-800">{overallPercentage !== null ? `${overallPercentage.toFixed(1)}%` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Overall Grade</span><span className="font-semibold text-slate-800">{overallGradeLabel ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Position in Class</span><span className="font-semibold text-slate-800">{position !== null ? `${ordinal(position)} of ${classSize}` : "—"}</span></div>
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Attendance</h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Present</span><span className="font-semibold text-emerald-600">{attendance.present}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Absent</span><span className="font-semibold text-red-600">{attendance.absent}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Late</span><span className="font-semibold text-amber-600">{attendance.late}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Days Recorded</span><span className="font-semibold text-slate-800">{attendance.total}</span></div>
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="border border-slate-200 rounded-lg p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Class Teacher's Remark</h4>
            <p className="text-sm text-slate-700">{reportCard?.teacherNotes || reportCard?.comments || "—"}</p>
          </div>
          <div className="border border-slate-200 rounded-lg p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Principal's Remark</h4>
            <p className="text-sm text-slate-700">{reportCard?.principalNotes || "—"}</p>
          </div>
        </div>

        {/* Grading key */}
        {gradingScale && gradingScale.boundaries.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Grading Key — {gradingScale.name}</h4>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              {[...gradingScale.boundaries].sort((a, b) => b.minPercent - a.minPercent).map((b) => (
                <span key={b.label} className="inline-flex items-center gap-1">
                  <span className="font-bold text-slate-700">{b.label}</span>
                  <span>({b.minPercent}–{b.maxPercent}{b.remark ? `, ${b.remark}` : ""})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {reportCard?.issuedAt && (
          <p className="text-xs text-slate-400 mt-6 text-right">Issued {new Date(reportCard.issuedAt).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
}
