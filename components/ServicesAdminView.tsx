'use client';

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Shared';
import { Badge } from '@/components/Shared';
import { Button } from '@/components/Shared';

export function ServicesAdminView({ initialData }: { initialData: any }) {
    const { tasks, gigWorkers } = initialData;
    const [activeTab, setActiveTab] = useState<'board' | 'workers' | 'quotes'>('board');

    const pendingTasks = tasks.filter((t: any) => t.status === 'PENDING' || t.status === 'ACCEPTED');
    const onlineWorkers = gigWorkers.filter((w: any) => w.isOnline);
    const quotes = tasks.filter((t: any) => t.quote);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-teal-900 text-white p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-bl-full -z-0" />
                <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white">CityConnect Dispatch Center</h2>
                        <p className="text-teal-200 text-sm font-bold uppercase tracking-widest mt-2">Logistics & Services</p>
                    </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 border-t border-teal-800/50 pt-8">
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">{pendingTasks.length}</p>
                        <p className="text-xs text-teal-300 font-bold uppercase tracking-wider mt-2">Active Jobs</p>
                    </div>
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">{onlineWorkers.length}</p>
                        <p className="text-xs text-teal-300 font-bold uppercase tracking-wider mt-2">Workers Online</p>
                    </div>
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">{quotes.length}</p>
                        <p className="text-xs text-teal-300 font-bold uppercase tracking-wider mt-2">Pending Quotes</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-slate-200 px-6 overflow-x-auto">
                <div className="flex space-x-8 min-w-max">
                    <button onClick={() => setActiveTab('board')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Live Dispatch Board</button>
                    <button onClick={() => setActiveTab('workers')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Fleet & Workers</button>
                    <button onClick={() => setActiveTab('quotes')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Service Quotes</button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
                {activeTab === 'board' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">Active Task Queue</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {tasks.map((task: any) => (
                                <Card key={task.id} className="p-6 flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <Badge className="bg-teal-100 text-teal-800 mb-2 border-teal-200">{task.type}</Badge>
                                            <h3 className="font-bold text-lg text-slate-900"></h3>
                                            <p className="text-sm font-bold text-slate-700 mt-1">Requester: {task.requester?.name}</p>
                                        </div>
                                        <Badge variant="outline" className={task.status === 'PENDING' ? 'border-amber-200 text-amber-700' : 'border-green-200 text-green-700'}>{task.status}</Badge>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm space-y-2">
                                        <p className="flex items-center gap-2"><strong>From:</strong> {task.pickupAddress}</p>
                                        <p className="flex items-center gap-2"><strong>To:</strong> {task.dropoffAddress}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {task.status === 'PENDING' ? (
                                            <Button className="flex-1 bg-teal-700 hover:bg-teal-800 text-white font-bold">Assign Worker</Button>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-between bg-teal-50 px-4 py-2 rounded-md border border-teal-100">
                                                <span className="text-sm font-bold text-teal-800">Assigned to: {task.courier?.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'workers' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">Worker Directory</h3>
                            <Button className="bg-teal-700 hover:bg-teal-800 text-white font-bold">+ Onboard Worker</Button>
                        </div>
                        <Card className="p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-bold text-slate-700">Name</th>
                                        <th className="p-4 font-bold text-slate-700">Status</th>
                                        <th className="p-4 font-bold text-slate-700">Vehicle / Role</th>
                                        <th className="p-4 font-bold text-slate-700">Rating</th>
                                        <th className="p-4 font-bold text-slate-700 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {gigWorkers.map((worker: any) => (
                                        <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-bold text-slate-900">{worker.user?.name}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={"w-2 h-2 rounded-full "}></div>
                                                    <span className="font-medium">{worker.isOnline ? 'Online' : 'Offline'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-700">{worker.vehicleType || 'Handyman'}</td>
                                            <td className="p-4 font-medium text-slate-700">⭐ {worker.rating.toFixed(1)}</td>
                                            <td className="p-4 text-right">
                                                <Button variant="outline" size="sm">View Log</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </Card>
                    </div>
                )}
                
                {activeTab === 'quotes' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">Custom Service Quotes</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {quotes.map((task: any) => (
                                <Card key={task.id} className="p-6 flex flex-col justify-between border-2 border-teal-100">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 mb-1">Quoted: </h3>
                                            <p className="text-sm font-bold text-slate-700">For: {task.requester?.name}</p>
                                        </div>
                                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">{task.quote.status}</Badge>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm text-slate-600">
                                        {task.quote.notes}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button className="flex-1 bg-teal-700 hover:bg-teal-800 text-white font-bold">View Original Request</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
