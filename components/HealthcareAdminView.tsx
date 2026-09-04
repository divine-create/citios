'use client';

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Shared';
import { Badge } from '@/components/Shared';
import { Button } from '@/components/Shared';

export function HealthcareAdminView({ initialData }: { initialData: any }) {
    const { clinic, pharmacy, appointments, prescriptions, pharmacyItems } = initialData;
    const [activeTab, setActiveTab] = useState<'appointments' | 'prescriptions' | 'pharmacy_pos' | 'inventory'>('appointments');

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-rose-900 text-white p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-bl-full -z-0" />
                <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">{clinic.name} & {pharmacy.name}</h2>
                        <p className="text-rose-200 text-sm font-bold uppercase tracking-widest mt-2">Healthcare Management System</p>
                    </div>
                </div>

                <div className="relative z-10 grid grid-cols-4 gap-8 border-t border-rose-800/50 pt-8">
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">{appointments.length}</p>
                        <p className="text-xs text-rose-300 font-bold uppercase tracking-wider mt-2">Today's Appointments</p>
                    </div>
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">{prescriptions.filter((p:any) => p.status === 'ISSUED').length}</p>
                        <p className="text-xs text-rose-300 font-bold uppercase tracking-wider mt-2">Pending Prescriptions</p>
                    </div>
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">{pharmacyItems.length}</p>
                        <p className="text-xs text-rose-300 font-bold uppercase tracking-wider mt-2">Pharmacy SKUs</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-slate-200 px-6 overflow-x-auto">
                <div className="flex space-x-8 min-w-max">
                    <button onClick={() => setActiveTab('appointments')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Clinic Appointments</button>
                    <button onClick={() => setActiveTab('prescriptions')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>E-Prescriptions</button>
                    <button onClick={() => setActiveTab('pharmacy_pos')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Pharmacy POS</button>
                    <button onClick={() => setActiveTab('inventory')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Pharmacy Inventory</button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
                {activeTab === 'appointments' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">Patient Schedule</h3>
                            <Button className="bg-rose-700 hover:bg-rose-800 text-white font-bold">Book Appointment</Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {appointments.map((apt: any) => (
                                <Card key={apt.id} className="p-6 flex justify-between items-center">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-rose-50 text-rose-700 w-16 h-16 rounded-xl flex items-center justify-center font-bold text-lg">
                                            {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-900">{apt.patient?.name || 'Unknown Patient'}</h4>
                                            <p className="text-slate-500 text-sm">Reason: {apt.reason}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge variant="outline" className={apt.status === 'SCHEDULED' ? 'border-amber-200 text-amber-700' : 'border-green-200 text-green-700'}>{apt.status}</Badge>
                                        <Button variant="outline">View Records</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'prescriptions' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">E-Prescription Fulfillment</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {prescriptions.map((px: any) => (
                                <Card key={px.id} className="p-6 flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <Badge className="bg-rose-100 text-rose-800 mb-2 border-rose-200">{px.status}</Badge>
                                            <h3 className="font-bold text-lg text-slate-900">{px.medication}</h3>
                                            <p className="text-sm font-bold text-slate-700 mt-1">Patient: {px.patient?.name}</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm">
                                        <p><strong>Dosage:</strong> {px.dosage}</p>
                                        <p><strong>Instructions:</strong> {px.instructions}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button className="flex-1 bg-rose-700 hover:bg-rose-800 text-white font-bold">Fill Prescription</Button>
                                        <Button variant="outline" className="flex-1">Dispatch CityDrive</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'pharmacy_pos' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex gap-6">
                            <div className="flex-1 space-y-6">
                                <h3 className="text-xl font-bold text-slate-900">Scan or Search Item</h3>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    {pharmacyItems.map((item: any) => (
                                        <Card key={item.id} hoverable className="p-4 cursor-pointer border-2 border-transparent hover:border-rose-500">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className={item.requiresPrescription ? 'border-rose-200 text-rose-700' : 'border-blue-200 text-blue-700'}>
                                                    {item.requiresPrescription ? 'Rx Only' : 'OTC'}
                                                </Badge>
                                            </div>
                                            <h4 className="font-bold text-slate-900 line-clamp-1">{item.name}</h4>
                                            <p className="text-slate-500 text-xs mt-1">Stock: {item.stockLevel}</p>
                                            <p className="text-lg font-black text-rose-700 mt-2"></p>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="w-96">
                                <Card className="p-6 sticky top-6 bg-slate-900 text-white">
                                    <h3 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2">Current Order</h3>
                                    <div className="space-y-4 min-h-[200px]">
                                        <div className="flex items-center justify-center h-full text-slate-500 text-sm font-medium">
                                            Select items to add to order
                                        </div>
                                    </div>
                                    <div className="border-t border-slate-700 pt-4 mt-6 space-y-2">
                                        <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>.00</span></div>
                                        <div className="flex justify-between text-slate-400"><span>Tax</span><span>.00</span></div>
                                        <div className="flex justify-between font-bold text-xl pt-2 border-t border-slate-700">
                                            <span>Total</span>
                                            <span>.00</span>
                                        </div>
                                    </div>
                                    <Button className="w-full mt-6 bg-rose-600 hover:bg-rose-500 text-white font-bold h-12 text-lg">
                                        Checkout via CityPay
                                    </Button>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">Pharmacy Inventory</h3>
                            <Button className="bg-rose-700 hover:bg-rose-800 text-white font-bold">+ Add New SKU</Button>
                        </div>
                        <Card className="p-0 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-bold text-slate-700">Item Name</th>
                                        <th className="p-4 font-bold text-slate-700">Category</th>
                                        <th className="p-4 font-bold text-slate-700">Price</th>
                                        <th className="p-4 font-bold text-slate-700">Stock Level</th>
                                        <th className="p-4 font-bold text-slate-700 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pharmacyItems.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <p className="font-bold text-slate-900">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.description}</p>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="outline" className={item.requiresPrescription ? 'border-rose-200 text-rose-700' : 'border-blue-200 text-blue-700'}>
                                                    {item.category}
                                                </Badge>
                                            </td>
                                            <td className="p-4 font-medium text-slate-700"></td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={"w-2 h-2 rounded-full "}></div>
                                                    <span className="font-medium">{item.stockLevel} units</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button variant="outline" size="sm">Update Stock</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
