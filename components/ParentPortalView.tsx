'use client';

import React, { useState } from 'react';
import { GraduationCap, CalendarCheck, BookOpen, Bell, ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function ParentPortalView({ students = [] }: { students?: any[] }) {
    if (!students || students.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-sm border border-slate-100">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center mb-4">
                        <GraduationCap className="w-8 h-8 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">No Students Linked</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Your account is not linked to any student records. Contact your school administrator to receive an invitation code.
                    </p>
                    <button onClick={() => window.history.back()} className="w-full py-3 bg-teal-700 text-white rounded-xl font-medium">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }
    
    // Use actual students
    const displayStudents = students;

    const [activeStudent, setActiveStudent] = useState(displayStudents[0]);

    
    // currentData is derived directly from the canonical activeStudent
    const currentData = {
        attendance: activeStudent.attendance?.length > 0 ? { status: activeStudent.attendance[0].status, time: new Date(activeStudent.attendance[0].date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) } : { status: 'UNKNOWN', time: '-' },
        courses: activeStudent.classes?.map((c: any) => {
            const courseGrades = activeStudent.grades?.filter((g: any) => g.classId === c.id) || [];
            const avgGrade = courseGrades.length > 0 ? Math.round(courseGrades.reduce((acc: number, g: any) => acc + g.score, 0) / courseGrades.length) : '-';
            return { name: c.name, grade: avgGrade, teacher: 'Assigned Teacher' };
        }) || [],
        posts: activeStudent.notices?.map((n: any) => ({
            id: n.id,
            title: n.title,
            date: new Date(n.createdAt).toLocaleDateString(),
            content: n.content
        })) || []
    };


    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-teal-700 text-white pt-12 pb-6 px-6 shadow-md rounded-b-3xl">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => window.history.back()} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <h1 className="text-2xl font-black tracking-tight">Parent Portal</h1>
                </div>

                {/* Student Selector Carousel */}
                <p className="text-teal-100 font-bold text-sm uppercase tracking-widest mb-3">My Students</p>
                <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden -mx-6 px-6">
                    {displayStudents.map(student => (
                        <div 
                            key={student.id} 
                            onClick={() => setActiveStudent(student)}
                            className={`shrink-0 w-64 p-4 rounded-2xl cursor-pointer transition-all border-2 ${activeStudent.id === student.id ? 'bg-white border-white text-slate-900 shadow-xl scale-105' : 'bg-teal-800/50 border-teal-600 text-white hover:bg-teal-800'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-200 rounded-full overflow-hidden shrink-0">
                                    <img src={`https://i.pravatar.cc/150?u=${student.id}`} alt={student.firstName} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-black text-lg leading-tight">{student.firstName} {student.lastName}</p>
                                    <p className={`text-xs font-bold ${activeStudent.id === student.id ? 'text-teal-600' : 'text-teal-300'}`}>{student.gradeLevel}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="px-4 mt-6 space-y-6">
                <p className="text-center font-bold text-slate-500 mb-2">{activeStudent.organization?.name || 'School'}</p>

                {/* Widget A: Attendance */}
                <div className={`rounded-3xl p-6 shadow-sm border ${currentData.attendance.status === 'PRESENT' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <CalendarCheck className="w-5 h-5" /> Today's Status
                        </h2>
                        {currentData.attendance.status === 'PRESENT' ? (
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        ) : (
                            <XCircle className="w-8 h-8 text-red-500" />
                        )}
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                        <p className={`text-2xl font-black ${currentData.attendance.status === 'PRESENT' ? 'text-green-700' : 'text-red-700'}`}>
                            {currentData.attendance.status === 'PRESENT' ? 'Present' : 'Absent'}
                        </p>
                    </div>
                    <p className="text-sm font-bold text-slate-500 flex items-center gap-1 mt-1">
                        <Clock className="w-4 h-4" /> {currentData.attendance.status === 'PRESENT' ? `Checked in at ${currentData.attendance.time}` : 'Notified Office'}
                    </p>
                </div>

                {/* Widget B: Academic Progress */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
                        <GraduationCap className="w-5 h-5 text-blue-500" /> Academic Progress
                    </h2>
                    
                    <div className="space-y-4">
                        {currentData.courses.map((course, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-slate-50 last:border-0 pb-4 last:pb-0">
                                <div>
                                    <p className="font-bold text-slate-900">{course.name}</p>
                                    <p className="text-xs font-medium text-slate-500">{course.teacher}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-lg font-black text-sm ${course.grade >= 90 ? 'bg-green-100 text-green-800' : course.grade >= 80 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                    {course.grade}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Widget C: Announcements */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
                        <Bell className="w-5 h-5 text-orange-500" /> School Announcements
                    </h2>
                    
                    <div className="space-y-4">
                        {currentData.posts.map((post) => (
                            <div key={post.id} className="bg-slate-50 rounded-2xl p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-bold text-slate-900">{post.title}</p>
                                    <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md">{post.date}</span>
                                </div>
                                <p className="text-sm text-slate-600">{post.content}</p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
