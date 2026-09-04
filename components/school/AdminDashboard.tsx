"use client";

import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  MessageSquareWarning, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Search,
  Bell,
  BarChart3,
  Megaphone,
  BookOpen
} from 'lucide-react';

const mockAttendance = [
  { grade: '9th Grade', present: 312, total: 320, percentage: 97.5 },
  { grade: '10th Grade', present: 298, total: 315, percentage: 94.6 },
  { grade: '11th Grade', present: 285, total: 300, percentage: 95.0 },
  { grade: '12th Grade', present: 270, total: 290, percentage: 93.1 },
];

const mockEnrollmentStats = {
  totalStudents: 1225,
  capacity: 1500,
  target: 1300,
  staffCount: 85,
  newAdmissions: 42
};

const mockSchedules = [
  { id: 1, name: 'Fall 2026 Master Schedule', status: 'Active', conflicts: 0, lastUpdated: '2 hours ago' },
  { id: 2, name: 'Spring 2027 Draft', status: 'Draft', conflicts: 12, lastUpdated: '1 day ago' },
  { id: 3, name: 'Summer School 2026', status: 'Archived', conflicts: 0, lastUpdated: '3 months ago' }
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'scheduling' | 'communication'>('overview');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            Super Admin Portal
          </h1>
          <p className="text-slate-500 mt-1">CityConnect School Management System</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search students, staff..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 relative">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Global Command Center
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('scheduling')}
          className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'scheduling' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Master Scheduling
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('communication')}
          className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'communication' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Mass Communication
          </div>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Enrollment</p>
                <p className="text-2xl font-bold mt-1">{mockEnrollmentStats.totalStudents}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +{mockEnrollmentStats.newAdmissions} this month
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Today's Attendance</p>
                <p className="text-2xl font-bold mt-1">95.2%</p>
                <p className="text-xs text-slate-500 mt-1">School-wide average</p>
              </div>
              <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Capacity Status</p>
                <p className="text-2xl font-bold mt-1">81%</p>
                <p className="text-xs text-slate-500 mt-1">{mockEnrollmentStats.capacity - mockEnrollmentStats.totalStudents} seats available</p>
              </div>
              <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Staff</p>
                <p className="text-2xl font-bold mt-1">{mockEnrollmentStats.staffCount}</p>
                <p className="text-xs text-slate-500 mt-1">Teachers & Admin</p>
              </div>
              <div className="h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Detailed Attendance */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-lg text-slate-800">Attendance by Grade (Today)</h3>
              <button className="text-blue-600 text-sm font-medium hover:underline">View Full Report</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-sm">
                    <th className="p-4 font-medium">Grade Level</th>
                    <th className="p-4 font-medium">Present</th>
                    <th className="p-4 font-medium">Total Students</th>
                    <th className="p-4 font-medium">Percentage</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockAttendance.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-700">{row.grade}</td>
                      <td className="p-4 text-slate-600">{row.present}</td>
                      <td className="p-4 text-slate-600">{row.total}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{row.percentage}%</span>
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${row.percentage >= 95 ? 'bg-green-500' : row.percentage >= 90 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${row.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {row.percentage >= 95 ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">Optimal</span>
                        ) : row.percentage >= 90 ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md font-medium">Warning</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md font-medium">Critical</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scheduling' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-slate-100">
            <div>
              <h3 className="font-semibold text-lg text-slate-800">Master Scheduling Engine</h3>
              <p className="text-sm text-slate-500">Create, manage, and resolve conflicts in the school-wide timetable.</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
              <Calendar className="h-4 w-4" /> New Schedule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockSchedules.map((schedule) => (
              <div key={schedule.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${schedule.status === 'Active' ? 'bg-green-100 text-green-700' : schedule.status === 'Draft' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    schedule.status === 'Active' ? 'bg-green-100 text-green-700' : 
                    schedule.status === 'Draft' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {schedule.status}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{schedule.name}</h4>
                <div className="space-y-2 mt-4 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span className="flex items-center gap-1"><AlertCircle className="h-4 w-4 text-orange-500" /> Conflicts</span>
                    <span className={schedule.conflicts > 0 ? 'font-bold text-red-600' : 'text-slate-500'}>
                      {schedule.conflicts > 0 ? `${schedule.conflicts} Detected` : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Last Updated</span>
                    <span>{schedule.lastUpdated}</span>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
                  <button className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors">
                    Edit
                  </button>
                  {schedule.conflicts > 0 && (
                    <button className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-2 rounded-lg text-sm font-medium transition-colors">
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'communication' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center gap-2">
                <MessageSquareWarning className="h-5 w-5 text-blue-600" /> New Broadcast Message
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                  <select className="w-full border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>All Parents & Guardians</option>
                    <option>All Staff & Teachers</option>
                    <option>All Students</option>
                    <option>Entire School Community</option>
                    <option>Custom Segment...</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Channels</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm p-3 border border-blue-200 bg-blue-50 rounded-lg cursor-pointer flex-1">
                      <input type="checkbox" defaultChecked className="text-blue-600 focus:ring-blue-500" /> CityConnect Push
                    </label>
                    <label className="flex items-center gap-2 text-sm p-3 border border-slate-200 rounded-lg cursor-pointer flex-1">
                      <input type="checkbox" defaultChecked className="text-blue-600 focus:ring-blue-500" /> SMS Text
                    </label>
                    <label className="flex items-center gap-2 text-sm p-3 border border-slate-200 rounded-lg cursor-pointer flex-1">
                      <input type="checkbox" defaultChecked className="text-blue-600 focus:ring-blue-500" /> Email
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message Subject / Title</label>
                  <input type="text" placeholder="e.g., Weather Closure Update" className="w-full border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message Body</label>
                  <textarea rows={5} placeholder="Type your message here..." className="w-full border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">Save Draft</button>
                  <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                    <Megaphone className="h-4 w-4" /> Send Broadcast
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Quick Templates</h3>
                <div className="space-y-3">
                  <button className="w-full text-left p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">Weather Closure</span>
                    <AlertCircle className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                  </button>
                  <button className="w-full text-left p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">Event Reminder</span>
                    <Calendar className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                  </button>
                  <button className="w-full text-left p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">Emergency Alert</span>
                    <MessageSquareWarning className="h-4 w-4 text-red-400 group-hover:text-red-500" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Recent Broadcasts</h3>
                <div className="space-y-4">
                  <div className="border-l-2 border-blue-500 pl-3">
                    <p className="text-sm font-medium text-slate-800">Early Dismissal Today</p>
                    <p className="text-xs text-slate-500 mt-1">Sent to: All Parents • 2h ago</p>
                  </div>
                  <div className="border-l-2 border-slate-300 pl-3">
                    <p className="text-sm font-medium text-slate-800">PTA Meeting Reminder</p>
                    <p className="text-xs text-slate-500 mt-1">Sent to: All Parents • Yesterday</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
