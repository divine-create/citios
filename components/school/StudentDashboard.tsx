"use client";

import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Award, BookOpen, Calendar, CheckCircle, ChevronRight, Clock, Download, GraduationCap, Layout, MessageSquare, ShoppingCart, Tag, Trophy, Activity, FileText, Users } from 'lucide-react';

// Mock Data
const STUDENT_DATA = {
  name: "Alex Johnson",
  grade: "11th Grade",
  studentId: "STU-849201",
  gpa: 3.84,
  credits: 85,
  attendance: 98,
};

const ACADEMIC_DATA = [
  { subject: "AP Calculus AB", grade: "A", percentage: 94, teacher: "Mr. Smith", lastUpdate: "2 hrs ago" },
  { subject: "AP Physics 1", grade: "A-", percentage: 91, teacher: "Dr. Chen", lastUpdate: "1 day ago" },
  { subject: "US History", grade: "B+", percentage: 88, teacher: "Ms. Davis", lastUpdate: "3 days ago" },
  { subject: "English Literature", grade: "A", percentage: 96, teacher: "Mrs. Wilson", lastUpdate: "Just now" },
  { subject: "Spanish III", grade: "A-", percentage: 90, teacher: "Sr. Rodriguez", lastUpdate: "4 hrs ago" },
  { subject: "Computer Science", grade: "A+", percentage: 99, teacher: "Mr. Turing", lastUpdate: "Yesterday" }
];

const MISSING_ASSIGNMENTS = [
  { subject: "US History", title: "Chapter 14 Reading Quiz", dueDate: "Yesterday", points: 20 },
  { subject: "Spanish III", title: "Vocab Worksheet", dueDate: "Today 11:59 PM", points: 15 },
];

const TIMETABLE = [
  { period: "1st", time: "08:00 AM - 08:50 AM", subject: "AP Calculus AB", room: "Room 302" },
  { period: "2nd", time: "08:55 AM - 09:45 AM", subject: "English Literature", room: "Room 105" },
  { period: "3rd", time: "09:50 AM - 10:40 AM", subject: "US History", room: "Room 214" },
  { period: "Lunch", time: "10:40 AM - 11:20 AM", subject: "Cafeteria", room: "Main Hall" },
  { period: "4th", time: "11:25 AM - 12:15 PM", subject: "AP Physics 1", room: "Lab 4" },
  { period: "5th", time: "12:20 PM - 01:10 PM", subject: "Spanish III", room: "Room 112" },
  { period: "6th", time: "01:15 PM - 02:05 PM", subject: "Computer Science", room: "Lab 2" },
];

const EXTRACURRICULARS = [
  { name: "Robotics Club", role: "Team Lead", schedule: "Tue/Thu 3:00 PM", status: "Active" },
  { name: "Varsity Track", role: "Member", schedule: "Mon/Wed/Fri 3:30 PM", status: "Active" },
  { name: "Debate Team", role: "Interested", schedule: "Wed 4:00 PM", status: "Sign up open" },
];

export function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('academic');

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 md:p-6 w-full text-slate-900">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
            {STUDENT_DATA.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{STUDENT_DATA.name}</h1>
            <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
              <GraduationCap className="w-4 h-4" />
              <span>{STUDENT_DATA.grade}</span>
              <span className="hidden sm:inline">â€¢</span>
              <span>ID: {STUDENT_DATA.studentId}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center md:text-right">
            <p className="text-sm text-slate-500 font-medium">Cumulative GPA</p>
            <p className="text-3xl font-bold text-blue-600">{STUDENT_DATA.gpa}</p>
          </div>
          <div className="text-center md:text-right hidden sm:block">
            <p className="text-sm text-slate-500 font-medium">Attendance</p>
            <p className="text-3xl font-bold text-green-600">{STUDENT_DATA.attendance}%</p>
          </div>
        </div>
      </div>

      <div className="w-full">
        {/* Tabs */}
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg mb-6">
          <button 
            onClick={() => setActiveTab('academic')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'academic' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Academic</span> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('timetable')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'timetable' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Interactive</span> Timetable
          </button>
          <button 
            onClick={() => setActiveTab('extracurriculars')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'extracurriculars' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
          >
            <Activity className="w-4 h-4" />
            Extracurriculars
          </button>
        </div>

        {/* Academic Tab */}
        {activeTab === 'academic' && (
          <div className="space-y-6">
            {MISSING_ASSIGNMENTS.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-red-100">
                  <h3 className="flex items-center text-red-700 font-semibold text-lg">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Action Required: Missing Assignments
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {MISSING_ASSIGNMENTS.map((assignment, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-3.5 rounded-lg border border-red-100 shadow-sm gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{assignment.title}</p>
                        <p className="text-sm text-slate-500">{assignment.subject}</p>
                      </div>
                      <div className="flex items-center gap-4 sm:justify-end">
                        <div className="text-sm text-right">
                          <span className="block font-medium text-red-600">Due: {assignment.dueDate}</span>
                          <span className="text-slate-500">{assignment.points} pts</span>
                        </div>
                        <button className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ACADEMIC_DATA.map((course, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900">{course.subject}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{course.teacher}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${course.grade.startsWith('A') ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                      {course.grade}
                    </span>
                  </div>
                  
                  <div className="flex items-end justify-between mt-2 mb-3">
                    <span className="text-3xl font-bold text-slate-900">{course.percentage}%</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {course.lastUpdate}
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${course.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timetable Tab */}
        {activeTab === 'timetable' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="flex items-center gap-2 font-semibold text-lg text-slate-900">
                <Calendar className="w-5 h-5 text-blue-600" />
                Today's Schedule
              </h3>
              <p className="text-sm text-slate-500 mt-1">Wednesday, November 15th</p>
            </div>
            <div className="divide-y divide-slate-100">
              {TIMETABLE.map((slot, idx) => (
                <div key={idx} className={`flex items-center p-4 sm:px-6 transition-colors ${slot.subject === 'Cafeteria' ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                  <div className="w-24 sm:w-32 shrink-0">
                    <span className="font-semibold text-slate-900">{slot.period}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{slot.time}</p>
                  </div>
                  <div className="flex-1 px-2 sm:px-4">
                    <p className="font-medium text-slate-900">{slot.subject}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{slot.room}</p>
                  </div>
                  {slot.subject !== 'Cafeteria' && (
                    <button className="shrink-0 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extracurriculars Tab */}
        {activeTab === 'extracurriculars' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h3 className="flex items-center gap-2 font-semibold text-lg text-slate-900">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  My Activities
                </h3>
              </div>
              <div className="p-5 space-y-4">
                {EXTRACURRICULARS.filter(e => e.status === 'Active').map((activity, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2.5 rounded-md shadow-sm border border-slate-200">
                        <Users className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{activity.name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{activity.schedule}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white text-slate-700">
                      {activity.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h3 className="flex items-center gap-2 font-semibold text-lg text-slate-900">
                  <Activity className="w-5 h-5 text-green-500" />
                  Discover Clubs
                </h3>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                  <div>
                    <p className="font-semibold text-slate-900">Debate Team</p>
                    <p className="text-sm text-slate-500 mt-0.5">Wednesdays 4:00 PM</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                    Sign Up
                  </button>
                </div>
                <div className="mt-6 text-center">
                  <button className="text-sm text-blue-600 font-medium hover:text-blue-800 hover:underline">
                    Browse all 42 activities...
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




