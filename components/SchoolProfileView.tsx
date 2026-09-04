'use client';

import React, { useState } from 'react';
import { MapPin, Star, Users, BookOpen, Calendar, Shield, Trophy, ArrowLeft, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from './Shared';

export default function SchoolProfileView({ school }: { school?: any }) {
    const [activeTab, setActiveTab] = useState('overview');

    // Mock rich data for the school
    const mockSchool = {
        id: '1',
        name: school?.name || 'Lincoln High School',
        type: school?.type || 'Public',
        grades: '9-12',
        students: 1240,
        ratio: '16:1',
        rating: 4.8,
        address: school?.address || '800 Education Way, City District',
        about: 'Lincoln High School is committed to academic excellence and preparing students for the challenges of the 21st century. We offer a robust STEM program and a wide variety of extracurriculars.',
        academics: {
            readingProficiency: 82,
            mathProficiency: 78,
            graduationRate: 95,
            apCourses: 14
        },
        reviews: [
            { id: 1, role: 'Parent', text: 'Amazing teachers and great STEM facilities. Communication could be slightly better.', rating: 4, date: '2 months ago' },
            { id: 2, role: 'Student', text: 'I love the robotics club here. The new science lab is awesome.', rating: 5, date: '4 months ago' }
        ]
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Hero Section */}
            <div className="relative h-72 bg-slate-800">
                <img src={`https://picsum.photos/seed/${mockSchool.id}/1200/600`} alt={mockSchool.name} className="w-full h-full object-cover opacity-60" />
                
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start">
                    <button onClick={() => window.history.back()} className="w-10 h-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center hover:bg-black/60 transition">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-black text-slate-900 flex items-center gap-1 shadow-lg">
                        <Star className="w-4 h-4 text-orange-500 fill-orange-500" /> {mockSchool.rating} (124 reviews)
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-6 pt-20">
                    <div className="flex gap-2 mb-2">
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">{mockSchool.type}</span>
                        <span className="bg-slate-700/80 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded">Grades {mockSchool.grades}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{mockSchool.name}</h1>
                    <p className="text-slate-300 flex items-center gap-1 text-sm font-medium"><MapPin className="w-4 h-4" /> {mockSchool.address}</p>
                </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="bg-white border-b border-slate-200 flex overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <div className="flex-1 min-w-[120px] p-4 text-center border-r border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Students</p>
                    <p className="text-xl font-black text-slate-900 flex items-center justify-center gap-1"><Users className="w-4 h-4 text-blue-500"/> {mockSchool.students}</p>
                </div>
                <div className="flex-1 min-w-[120px] p-4 text-center border-r border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Student:Teacher</p>
                    <p className="text-xl font-black text-slate-900">{mockSchool.ratio}</p>
                </div>
                <div className="flex-1 min-w-[120px] p-4 text-center border-r border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Graduation</p>
                    <p className="text-xl font-black text-green-600">{mockSchool.academics.graduationRate}%</p>
                </div>
                <div className="flex-1 min-w-[120px] p-4 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">AP Courses</p>
                    <p className="text-xl font-black text-slate-900">{mockSchool.academics.apCourses}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10 px-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {['overview', 'academics', 'reviews', 'admissions'].map(tab => (
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
                            <p className="text-slate-600 leading-relaxed">{mockSchool.about}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500"/> Top Programs</h3>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-sm text-slate-700"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Advanced STEM Track</li>
                                    <li className="flex items-center gap-3 text-sm text-slate-700"><div className="w-2 h-2 rounded-full bg-blue-500"></div> State Champion Debate Team</li>
                                    <li className="flex items-center gap-3 text-sm text-slate-700"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Bilingual Immersion (Spanish)</li>
                                </ul>
                            </div>
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-green-500"/> Facilities</h3>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-sm text-slate-700"><div className="w-2 h-2 rounded-full bg-green-500"></div> Maker Space / Robotics Lab</li>
                                    <li className="flex items-center gap-3 text-sm text-slate-700"><div className="w-2 h-2 rounded-full bg-green-500"></div> Olympic-sized Swimming Pool</li>
                                    <li className="flex items-center gap-3 text-sm text-slate-700"><div className="w-2 h-2 rounded-full bg-green-500"></div> Performing Arts Center</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'academics' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <h2 className="text-xl font-black text-slate-900 mb-6">Test Scores vs. State Average</h2>
                            
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-2">
                                        <span className="text-slate-700">Reading Proficiency</span>
                                        <span className="text-blue-700">{mockSchool.academics.readingProficiency}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3">
                                        <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${mockSchool.academics.readingProficiency}%` }}></div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">State average: 65%</p>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-2">
                                        <span className="text-slate-700">Math Proficiency</span>
                                        <span className="text-blue-700">{mockSchool.academics.mathProficiency}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3">
                                        <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${mockSchool.academics.mathProficiency}%` }}></div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">State average: 58%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-slate-900">Community Reviews</h2>
                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">Write a Review</Button>
                        </div>
                        
                        {mockSchool.reviews.map(review => (
                            <div key={review.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{review.role}</span>
                                        <span className="text-xs text-slate-400">{review.date}</span>
                                    </div>
                                    <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-orange-500 fill-orange-500' : 'text-slate-200 fill-slate-200'}`} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-slate-700 text-sm leading-relaxed">{review.text}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'admissions' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100">
                            <h2 className="text-xl font-black text-blue-900 mb-2">Ready to Enroll?</h2>
                            <p className="text-blue-700 text-sm mb-6">Schedule a tour or request more information directly from the admissions office.</p>
                            
                            <div className="space-y-3">
                                <Button variant="accent" className="w-full py-4 text-base bg-blue-600 hover:bg-blue-700">Request Information</Button>
                                <Button variant="outline" className="w-full py-4 text-base border-blue-200 text-blue-700 bg-white">Schedule a Tour</Button>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-orange-500"/> Upcoming Dates</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">Fall Open House</p>
                                        <p className="text-xs text-slate-500">In-person campus tour</p>
                                    </div>
                                    <p className="text-sm font-black text-blue-600">Oct 15</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">Application Deadline</p>
                                        <p className="text-xs text-slate-500">For 2027 Academic Year</p>
                                    </div>
                                    <p className="text-sm font-black text-red-500">Nov 30</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
