"use client";

import React, { useState } from "react";
import {
  HeartPulse,
  GraduationCap,
  FileText,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";

// --- Mock Data ---

const MOCK_WELLNESS_LOGS = [
  {
    id: "wl-1",
    studentName: "Emma Thompson",
    grade: "10th",
    date: "2026-08-28",
    topic: "Peer Mediation",
    priority: "Medium",
    status: "Resolved",
    counselor: "Sarah Jenkins",
  },
  {
    id: "wl-2",
    studentName: "Lucas Garcia",
    grade: "11th",
    date: "2026-08-29",
    topic: "Academic Anxiety",
    priority: "High",
    status: "Follow-up Required",
    counselor: "Sarah Jenkins",
  },
  {
    id: "wl-3",
    studentName: "Sophia Chen",
    grade: "9th",
    date: "2026-08-25",
    topic: "Transition Support",
    priority: "Low",
    status: "Closed",
    counselor: "Sarah Jenkins",
  },
];

const MOCK_IEP_TRACKER = [
  {
    id: "iep-1",
    studentName: "Jackson Miller",
    grade: "8th",
    type: "504 Plan",
    accommodations: ["1.5x Time on Tests", "Preferential Seating"],
    nextReviewDate: "2026-10-15",
    status: "Active",
  },
  {
    id: "iep-2",
    studentName: "Aaliyah Davis",
    grade: "12th",
    type: "IEP",
    accommodations: ["Audiobook versions of texts", "Quiet testing room"],
    nextReviewDate: "2026-09-10",
    status: "Needs Review",
  },
  {
    id: "iep-3",
    studentName: "Mason Clark",
    grade: "10th",
    type: "IEP",
    accommodations: ["Behavioral intervention plan", "Weekly counselor check-in"],
    nextReviewDate: "2027-01-20",
    status: "Active",
  },
];

const MOCK_COLLEGE_APPS = [
  {
    id: "ca-1",
    studentName: "Isabella Martinez",
    gpa: "3.9",
    topChoice: "State University",
    status: "Materials Pending",
    deadline: "2026-11-01",
    recommendations: "1/2 Received",
  },
  {
    id: "ca-2",
    studentName: "Ethan Wright",
    gpa: "3.5",
    topChoice: "Tech Institute",
    status: "Submitted",
    deadline: "2026-12-15",
    recommendations: "2/2 Received",
  },
  {
    id: "ca-3",
    studentName: "Aiden Lee",
    gpa: "4.0",
    topChoice: "Ivy College",
    status: "Counselor Review",
    deadline: "2026-11-01",
    recommendations: "0/2 Received",
  },
];

export function CounselorDashboard() {
  const [activeTab, setActiveTab] = useState<"wellness" | "iep" | "college">("wellness");

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-slate-800">Counselor & Support Staff Portal</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage student wellness, accommodations, and college guidance.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 pt-4 bg-white border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("wellness")}
            className={`pb-3 flex items-center space-x-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "wellness"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Wellness Logs</span>
          </button>
          <button
            onClick={() => setActiveTab("iep")}
            className={`pb-3 flex items-center space-x-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "iep"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>IEP / 504 Tracking</span>
          </button>
          <button
            onClick={() => setActiveTab("college")}
            className={`pb-3 flex items-center space-x-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "college"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>College Counseling</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="p-6 flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>

          {/* TAB CONTENT: Wellness Logs */}
          {activeTab === "wellness" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Topic</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {MOCK_WELLNESS_LOGS.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{log.studentName}</div>
                        <div className="text-xs text-slate-500">Grade {log.grade}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{log.date}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{log.topic}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            log.priority === "High"
                              ? "bg-red-100 text-red-700"
                              : log.priority === "Medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {log.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5 text-sm">
                          {log.status === "Resolved" || log.status === "Closed" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="text-slate-700">{log.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB CONTENT: IEP / 504 */}
          {activeTab === "iep" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_IEP_TRACKER.map((iep) => (
                <div key={iep.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{iep.studentName}</h3>
                      <p className="text-xs text-slate-500">Grade {iep.grade} • {iep.type}</p>
                    </div>
                    <span
                      className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                        iep.status === "Needs Review"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {iep.status}
                    </span>
                  </div>
                  
                  <div className="flex-1 mb-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Accommodations
                    </h4>
                    <ul className="space-y-1">
                      {iep.accommodations.map((acc, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex items-start space-x-2">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span>{acc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>Review: {iep.nextReviewDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB CONTENT: College Counseling */}
          {activeTab === "college" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Top Choice</th>
                    <th className="px-6 py-4">GPA</th>
                    <th className="px-6 py-4">Rec. Letters</th>
                    <th className="px-6 py-4">Deadline</th>
                    <th className="px-6 py-4">App Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {MOCK_COLLEGE_APPS.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{app.studentName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{app.topChoice}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{app.gpa}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{app.recommendations}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5 text-sm text-amber-600 font-medium">
                          <Clock className="w-4 h-4" />
                          <span>{app.deadline}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            app.status === "Submitted"
                              ? "bg-emerald-100 text-emerald-700"
                              : app.status === "Materials Pending"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
