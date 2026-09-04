"use client";

import React, { useState } from 'react';
import { 
  Users, 
  FileText, 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  Download, 
  Search, 
  Filter,
  UserPlus,
  FileCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';

// Mock Data
const ADMISSIONS_PROSPECTS = [
  { id: '1', name: 'Emma Thompson', grade: '9th Grade', status: 'Application Submitted', date: '2026-08-28', tour: 'Completed' },
  { id: '2', name: 'Liam Garcia', grade: '10th Grade', status: 'Under Review', date: '2026-08-25', tour: 'Scheduled' },
  { id: '3', name: 'Olivia Chen', grade: '9th Grade', status: 'Interview Scheduled', date: '2026-08-29', tour: 'Completed' },
  { id: '4', name: 'Noah Patel', grade: '11th Grade', status: 'Waitlisted', date: '2026-08-20', tour: 'Not Scheduled' },
  { id: '5', name: 'Ava Smith', grade: '9th Grade', status: 'Accepted', date: '2026-08-15', tour: 'Completed' },
];

const ENROLLMENT_TASKS = [
  { id: '1', name: 'Emma Thompson', type: 'Immunization Record', status: 'Pending', dueDate: '2026-09-01' },
  { id: '2', name: 'Liam Garcia', type: 'Birth Certificate', status: 'Verified', dueDate: '2026-09-01' },
  { id: '3', name: 'Ava Smith', type: 'Previous School Transcript', status: 'In Review', dueDate: '2026-09-05' },
  { id: '4', name: 'Mia Johnson', type: 'Emergency Contact Form', status: 'Pending', dueDate: '2026-09-01' },
];

const TRANSCRIPT_REQUESTS = [
  { id: '1', name: 'Ethan Williams', grade: '12th Grade', destination: 'State University', status: 'Processing', requestDate: '2026-08-27' },
  { id: '2', name: 'Sophia Davis', grade: 'Alumni (2024)', destination: 'Tech College', status: 'Sent', requestDate: '2026-08-25' },
  { id: '3', name: 'Jackson Brown', grade: '11th Grade', destination: 'Summer Program', status: 'Pending', requestDate: '2026-08-29' },
];

export default function RegistrarDashboard() {
  const [activeTab, setActiveTab] = useState<'admissions' | 'enrollment' | 'transcripts'>('admissions');

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admissions & Registrar Portal</h1>
          <p className="text-sm text-slate-500">Manage prospects, enrollments, and academic records</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <UserPlus size={18} />
            <span>New Application</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6 pt-4 bg-white border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('admissions')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'admissions' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Users size={18} />
            <span>Admissions CRM</span>
          </button>
          <button
            onClick={() => setActiveTab('enrollment')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'enrollment' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <ClipboardList size={18} />
            <span>Enrollment Workflows</span>
          </button>
          <button
            onClick={() => setActiveTab('transcripts')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'transcripts' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText size={18} />
            <span>Transcripts</span>
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search students, applications, or records..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 bg-white">
            <Filter size={18} />
            <span>Filters</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'admissions' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Prospective Students</h2>
              <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {ADMISSIONS_PROSPECTS.length} Active
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Applicant Name</th>
                    <th className="px-6 py-3">Applying For</th>
                    <th className="px-6 py-3">Application Status</th>
                    <th className="px-6 py-3">Campus Tour</th>
                    <th className="px-6 py-3">Last Updated</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ADMISSIONS_PROSPECTS.map((prospect) => (
                    <tr key={prospect.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{prospect.name}</td>
                      <td className="px-6 py-4">{prospect.grade}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${prospect.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' : 
                            prospect.status === 'Waitlisted' ? 'bg-amber-100 text-amber-800' : 
                            'bg-blue-100 text-blue-800'}`}
                        >
                          {prospect.status === 'Accepted' && <CheckCircle size={12} className="mr-1" />}
                          {prospect.status === 'Waitlisted' && <AlertCircle size={12} className="mr-1" />}
                          {prospect.status === 'Under Review' && <Clock size={12} className="mr-1" />}
                          {prospect.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-slate-600">
                          <Calendar size={14} className="mr-1.5 text-slate-400" />
                          {prospect.tour}
                        </div>
                      </td>
                      <td className="px-6 py-4">{prospect.date}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'enrollment' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="font-semibold text-slate-800">Pending Enrollment Documents</h2>
              </div>
              <ul className="divide-y divide-slate-200">
                {ENROLLMENT_TASKS.map((task) => (
                  <li key={task.id} className="p-6 flex items-start justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className={`mt-1 p-2 rounded-lg ${
                        task.status === 'Verified' ? 'bg-emerald-100 text-emerald-600' :
                        task.status === 'In Review' ? 'bg-amber-100 text-amber-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {task.status === 'Verified' ? <CheckCircle size={20} /> :
                         task.status === 'In Review' ? <Clock size={20} /> :
                         <AlertCircle size={20} />}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-900">{task.type}</h3>
                        <p className="text-sm text-slate-500 mt-1">Student: <span className="font-medium text-slate-700">{task.name}</span></p>
                        <div className="flex items-center mt-2 space-x-4 text-xs text-slate-500">
                          <span className="flex items-center"><Calendar size={14} className="mr-1" /> Due: {task.dueDate}</span>
                          <span className={`font-medium ${
                            task.status === 'Verified' ? 'text-emerald-600' :
                            task.status === 'In Review' ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            Status: {task.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 bg-white">
                      Review
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Enrollment Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Documents Verified</span>
                      <span className="font-medium text-slate-900">45%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Immunizations Logged</span>
                      <span className="font-medium text-slate-900">60%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transcripts' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800">Transcript Requests</h2>
              <button className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                <FileCheck size={16} />
                <span>Generate Official Transcript</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Student Name</th>
                    <th className="px-6 py-3">Level / Cohort</th>
                    <th className="px-6 py-3">Destination</th>
                    <th className="px-6 py-3">Date Requested</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {TRANSCRIPT_REQUESTS.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{req.name}</td>
                      <td className="px-6 py-4">{req.grade}</td>
                      <td className="px-6 py-4">{req.destination}</td>
                      <td className="px-6 py-4">{req.requestDate}</td>
                      <td className="px-6 py-4">
                         <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${req.status === 'Sent' ? 'bg-emerald-100 text-emerald-800' : 
                            req.status === 'Processing' ? 'bg-amber-100 text-amber-800' : 
                            'bg-slate-100 text-slate-800'}`}
                        >
                          {req.status === 'Sent' && <CheckCircle size={12} className="mr-1" />}
                          {req.status === 'Processing' && <Clock size={12} className="mr-1" />}
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download PDF">
                          <Download size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
