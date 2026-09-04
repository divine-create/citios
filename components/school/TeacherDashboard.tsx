"use client";

import React, { useState } from 'react';
import { AlertTriangle, Award, BookOpen, Calendar, CheckCircle, Clock, FileText, Filter, MessageSquare, Plus, Search, Users, Video, XCircle } from 'lucide-react';

// Mock Data
const SCHEDULE = [
  { id: 1, time: '08:00 AM', period: '1st Period', subject: 'AP Physics', room: 'Lab 402', students: 24 },
  { id: 2, time: '09:30 AM', period: '2nd Period', subject: 'Honors Physics', room: 'Lab 402', students: 28 },
  { id: 3, time: '11:00 AM', period: '3rd Period', subject: 'Planning', room: 'Staff Room', students: 0 },
  { id: 4, time: '12:30 PM', period: 'Lunch', subject: 'Cafeteria Duty', room: 'Main Cafe', students: 200 },
  { id: 5, time: '01:30 PM', period: '4th Period', subject: 'AP Physics', room: 'Lab 402', students: 25 },
];

const ROSTER = [
  { id: 'S001', name: 'Alex Johnson', grade: 'A-', attendance: 'Present', behavior: 'Good', missingAssignments: 0 },
  { id: 'S002', name: 'Maria Garcia', grade: 'B+', attendance: 'Late', behavior: 'Excellent', missingAssignments: 1 },
  { id: 'S003', name: 'James Smith', grade: 'C', attendance: 'Absent', behavior: 'Warning', missingAssignments: 3 },
  { id: 'S004', name: 'Emma Davis', grade: 'A', attendance: 'Present', behavior: 'Excellent', missingAssignments: 0 },
  { id: 'S005', name: 'Michael Chen', grade: 'B', attendance: 'Present', behavior: 'Good', missingAssignments: 0 },
];

const ASSIGNMENTS = [
  { id: 1, title: 'Kinematics Lab Report', dueDate: 'Today', submitted: 20, total: 24, avgScore: '88%' },
  { id: 2, title: 'Chapter 4 Quiz', dueDate: 'Yesterday', submitted: 24, total: 24, avgScore: '82%' },
  { id: 3, title: "Newton's Laws Problem Set", dueDate: 'In 3 days', submitted: 5, total: 24, avgScore: '-' },
];

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar / Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Teacher Portal
          </h2>
          <p className="text-sm text-gray-500 mt-1">Sarah Jenkins</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'schedule' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Daily Schedule
          </button>
          
          <button 
            onClick={() => setActiveTab('gradebook')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'gradebook' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Smart Gradebook
          </button>
          
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'attendance' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Attendance & Roster
          </button>
          
          <button 
            onClick={() => setActiveTab('behavior')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'behavior' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Award className="w-5 h-5" />
            Behavior Logging
          </button>
                  <button 
            onClick={() => setActiveTab('lms')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === 'lms' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            LMS Workspace
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-2xl font-bold capitalize">
              {activeTab === 'schedule' && "Today's Schedule"}
              {activeTab === 'gradebook' && 'Smart Gradebook'}
              {activeTab === 'attendance' && 'Attendance Management'}
              {activeTab === 'behavior' && 'Behavior & Discipline'}
            {activeTab === 'lms' && 'LMS Workspace'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search students..." 
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'schedule' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Tuesday, October 24th</h3>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Current: 1st Period
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {SCHEDULE.map((slot) => (
                    <div key={slot.id} className="p-6 flex items-center hover:bg-gray-50 transition-colors">
                      <div className="w-32 flex flex-col">
                        <span className="font-bold text-gray-900">{slot.time}</span>
                        <span className="text-sm text-gray-500">{slot.period}</span>
                      </div>
                      <div className="flex-1 pl-6 border-l-2 border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900">{slot.subject}</h4>
                        <div className="flex gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1"><Users className="w-4 h-4"/> {slot.students} students</span>
                          <span className="flex items-center gap-1"><BookOpen className="w-4 h-4"/> {slot.room}</span>
                        </div>
                      </div>
                      <div>
                        {slot.students > 0 && (
                           <button className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium rounded-lg transition-colors">
                             Start Class
                           </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gradebook' && (
            <div className="space-y-6">
              {/* Gradebook Header Actions */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <select className="px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>AP Physics - 1st Period</option>
                    <option>Honors Physics - 2nd Period</option>
                  </select>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 shadow-sm transition-colors">
                    <Filter className="w-4 h-4" /> Filter
                  </button>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
                  <Plus className="w-4 h-4" /> New Assignment
                </button>
              </div>

              {/* Assignments Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {ASSIGNMENTS.map((assignment) => (
                  <div key={assignment.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-900 truncate">{assignment.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">Due: {assignment.dueDate}</p>
                    <div className="mt-4 flex justify-between items-end">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{assignment.submitted}/{assignment.total}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{assignment.avgScore}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Score</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Roster Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-sm uppercase text-gray-600">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Student</th>
                      <th className="px-6 py-4 font-semibold text-center">Overall Grade</th>
                      <th className="px-6 py-4 font-semibold text-center">Missing</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ROSTER.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.id}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${
                            student.grade.startsWith('A') ? 'bg-green-100 text-green-700' :
                            student.grade.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                            student.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {student.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {student.missingAssignments > 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                              <AlertTriangle className="w-4 h-4" /> {student.missingAssignments}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-bold">1st Period: AP Physics</h3>
                 <div className="flex gap-3">
                   <button className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium">
                     Mark All Present
                   </button>
                   <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                     Save Attendance
                   </button>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ROSTER.map((student) => (
                  <div key={student.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.id}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className={`p-2 rounded-full transition-colors ${
                        student.attendance === 'Present' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}>
                        <CheckCircle className="w-6 h-6" />
                      </button>
                      <button className={`p-2 rounded-full transition-colors ${
                        student.attendance === 'Late' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}>
                        <Clock className="w-6 h-6" />
                      </button>
                      <button className={`p-2 rounded-full transition-colors ${
                        student.attendance === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}>
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Log Incident or Commendation</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option>Select a student...</option>
                      {ROSTER.map(s => <option key={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option>Commendation (Positive)</option>
                        <option>Warning (Minor)</option>
                        <option>Demerit (Infraction)</option>
                        <option>Referral (Major)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" defaultValue="2023-10-24" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                      placeholder="Describe the incident or reason for commendation..."
                    ></textarea>
                  </div>
                  
                  <div className="pt-2">
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm w-full">
                      Submit Log
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

                  {activeTab === 'lms' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="flex gap-4 mb-6">
                <button className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition text-center">
                  <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-bold text-gray-900">Upload Content</h3>
                  <p className="text-sm text-gray-500">PDFs, Slides, Docs</p>
                </button>
                <button className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition text-center">
                  <BookOpen className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-bold text-gray-900">Quiz Builder</h3>
                  <p className="text-sm text-gray-500">Multiple choice & short answer</p>
                </button>
                <button className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition text-center">
                  <MessageSquare className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-bold text-gray-900">Discussions</h3>
                  <p className="text-sm text-gray-500">Class forums & threads</p>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 font-bold text-gray-700">
                  Recent Course Materials
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-bold text-gray-900">Physics 101: Kinematics Lecture</p>
                        <p className="text-xs text-gray-500">Uploaded Today • Visible to Students</p>
                      </div>
                    </div>
                    <button className="text-blue-600 text-sm font-bold">Edit</button>
                  </div>
                  <div className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-bold text-gray-900">Midterm Practice Quiz</p>
                        <p className="text-xs text-gray-500">24 Questions • Due Friday</p>
                      </div>
                    </div>
                    <button className="text-blue-600 text-sm font-bold">Edit</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


