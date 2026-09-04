'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Star, GraduationCap, Users, BookOpen, Filter, Search, ArrowLeft } from 'lucide-react';
import { Button } from './Shared';

export default function SchoolDirectoryView({ organizations = [] }: { organizations?: any[] }) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');

    // Mock data for visual completeness if DB is empty
    const displaySchools = organizations.length > 0 ? organizations : [
        { id: '1', name: 'Lincoln High School', address: '800 Education Way', rating: 4.8, type: 'Public', grades: '9-12', students: 1200, tags: ['STEM', 'Athletics'], img: '22' },
        { id: '2', name: 'St. Jude Primary', address: '120 Saint Jude St', rating: 4.9, type: 'Private', grades: 'K-5', students: 450, tags: ['Arts', 'Languages'], img: '24' },
        { id: '3', name: 'City Middle Academy', address: '45 Center Ave', rating: 4.6, type: 'Charter', grades: '6-8', students: 800, tags: ['Technology', 'Music'], img: '20' }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-blue-800 text-white pt-12 pb-6 px-6 shadow-md">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => window.history.back()} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <h1 className="text-2xl font-black tracking-tight">Discover Schools</h1>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200" />
                    <input 
                        type="text" 
                        placeholder="Search by name, district, or program..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-blue-900/50 border border-blue-700/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden -mx-6 px-6">
                    {['All', 'Public', 'Private', 'Charter', 'Primary', 'High School'].map(f => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${filter === f ? 'bg-white text-blue-900 shadow-md' : 'bg-blue-900/40 text-blue-100 hover:bg-blue-800/60'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Directory List */}
            <div className="px-4 mt-6 space-y-4">
                {displaySchools.map((school) => (
                    <div key={school.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex gap-4">
                            <div className="w-24 h-24 bg-slate-200 rounded-2xl overflow-hidden shrink-0 relative">
                                <img src={`https://picsum.photos/id/${school.img || '20'}/400/400`} alt={school.name} className="w-full h-full object-cover" />
                                <div className="absolute top-0 right-0 bg-white/90 backdrop-blur px-1.5 py-0.5 m-1 rounded text-xs font-bold text-slate-800 flex items-center gap-1 shadow-sm">
                                    <Star className="w-3 h-3 text-orange-500 fill-orange-500" /> {school.rating || '4.5'}
                                </div>
                            </div>
                            
                            <div className="flex flex-col justify-between py-1 flex-1">
                                <div>
                                    <h3 className="font-black text-lg text-slate-900 leading-tight mb-1">{school.name}</h3>
                                    <p className="text-sm font-bold text-slate-500 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {school.address || 'City District'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-blue-700 bg-blue-50 w-fit px-2 py-1 rounded-md mt-2">
                                    <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3"/> Grades {school.grades || 'K-12'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex gap-2">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold text-xs border border-slate-200">{school.type || 'Public'}</span>
                                {school.tags?.map((tag: string) => (
                                    <span key={tag} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold text-xs border border-slate-200">{tag}</span>
                                ))}
                            </div>
                            <span className="text-slate-400 font-medium text-xs flex items-center gap-1"><Users className="w-3 h-3"/> {school.students || '800'}</span>
                        </div>

                        <div className="flex gap-3 mt-1">
                            <Link href={`/services/education/${school.id}`} className="flex-1">
                                <Button variant="outline" className="w-full py-4 text-sm font-bold border-blue-100 text-blue-700 hover:bg-blue-50 bg-blue-50/50">View Profile</Button>
                            </Link>
                            <Button variant="accent" className="flex-1 py-4 text-sm font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 text-white border-0">Apply / Enroll</Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
