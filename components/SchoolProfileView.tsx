'use client';

import React, { useState } from 'react';
import { MapPin, Users, GraduationCap, School, Calendar, Globe, Phone, Mail, ArrowLeft } from 'lucide-react';
import { Button } from './Shared';

interface SchoolProfile {
    organization: { id: string; name: string; description?: string | null; address?: string | null };
    settings: { phone?: string | null; email?: string | null; website?: string | null; schoolType?: string | null; logo?: string | null } | null;
    studentCount: number;
    teacherCount: number;
    classCount: number;
    gradeRange: string | null;
}

export default function SchoolProfileView({ profile }: { profile: SchoolProfile }) {
    const [activeTab, setActiveTab] = useState('overview');
    const { organization, settings, studentCount, teacherCount, classCount, gradeRange } = profile;
    const ratio = teacherCount > 0 ? `${Math.round(studentCount / teacherCount)}:1` : '—';

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Hero Section */}
            <div className="relative h-56 bg-slate-800">
                <img src={`https://picsum.photos/seed/${organization.id}/1200/600`} alt={organization.name} className="w-full h-full object-cover opacity-60" />

                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start">
                    <button onClick={() => window.history.back()} className="w-10 h-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center hover:bg-black/60 transition">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-6 pt-20">
                    <div className="flex gap-2 mb-2">
                        {settings?.schoolType && (
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded capitalize">{settings.schoolType}</span>
                        )}
                        {gradeRange && (
                            <span className="bg-slate-700/80 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded">Grades {gradeRange}</span>
                        )}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{organization.name}</h1>
                    {organization.address && (
                        <p className="text-slate-300 flex items-center gap-1 text-sm font-medium"><MapPin className="w-4 h-4" /> {organization.address}</p>
                    )}
                </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="bg-white border-b border-slate-200 flex overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <div className="flex-1 min-w-[120px] p-4 text-center border-r border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Students</p>
                    <p className="text-xl font-black text-slate-900 flex items-center justify-center gap-1"><Users className="w-4 h-4 text-blue-500" /> {studentCount}</p>
                </div>
                <div className="flex-1 min-w-[120px] p-4 text-center border-r border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Student:Teacher</p>
                    <p className="text-xl font-black text-slate-900">{ratio}</p>
                </div>
                <div className="flex-1 min-w-[120px] p-4 text-center border-r border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Teachers</p>
                    <p className="text-xl font-black text-slate-900">{teacherCount}</p>
                </div>
                <div className="flex-1 min-w-[120px] p-4 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Classes</p>
                    <p className="text-xl font-black text-slate-900">{classCount}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10 px-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {['overview', 'contact', 'admissions'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-4 text-sm font-bold capitalize whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

                {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <h2 className="text-xl font-black text-slate-900 mb-4">About</h2>
                            {organization.description ? (
                                <p className="text-slate-600 leading-relaxed">{organization.description}</p>
                            ) : (
                                <p className="text-slate-400 text-sm">This school hasn't added a description yet.</p>
                            )}
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-blue-500" /> At a glance</h3>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-sm text-slate-700"><Users className="w-4 h-4 text-slate-400" /> {studentCount} enrolled student{studentCount === 1 ? '' : 's'}</li>
                                <li className="flex items-center gap-3 text-sm text-slate-700"><School className="w-4 h-4 text-slate-400" /> {teacherCount} teacher{teacherCount === 1 ? '' : 's'} on staff</li>
                                <li className="flex items-center gap-3 text-sm text-slate-700"><Calendar className="w-4 h-4 text-slate-400" /> {classCount} active class{classCount === 1 ? '' : 'es'} this year</li>
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === 'contact' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <h2 className="text-xl font-black text-slate-900 mb-4">Contact Information</h2>
                            {!settings?.phone && !settings?.email && !settings?.website ? (
                                <p className="text-slate-400 text-sm">No contact details have been published for this school yet.</p>
                            ) : (
                                <ul className="space-y-4">
                                    {settings?.phone && (
                                        <li className="flex items-center gap-3 text-sm text-slate-700"><Phone className="w-4 h-4 text-slate-400" /> {settings.phone}</li>
                                    )}
                                    {settings?.email && (
                                        <li className="flex items-center gap-3 text-sm text-slate-700"><Mail className="w-4 h-4 text-slate-400" /> {settings.email}</li>
                                    )}
                                    {settings?.website && (
                                        <li className="flex items-center gap-3 text-sm text-slate-700"><Globe className="w-4 h-4 text-slate-400" /> {settings.website}</li>
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'admissions' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100">
                            <h2 className="text-xl font-black text-blue-900 mb-2">Ready to Enroll?</h2>
                            <p className="text-blue-700 text-sm mb-6">Contact the school's admissions office directly to learn about openings and how to apply.</p>

                            <div className="space-y-3">
                                {settings?.email ? (
                                    <a href={`mailto:${settings.email}`}>
                                        <Button variant="accent" className="w-full py-4 text-base bg-blue-600 hover:bg-blue-700">Email Admissions</Button>
                                    </a>
                                ) : (
                                    <Button variant="accent" disabled className="w-full py-4 text-base bg-blue-300 cursor-not-allowed">No contact info available yet</Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
