"use client";
import { useState } from 'react';
import { Calendar, Bed, Settings, FileText, User, Bell, ChevronRight, Activity, Moon, Coffee, ShieldCheck } from 'lucide-react';
import { Card, Button, Badge } from './Shared';

export default function HotelAdminView({ initialData }: { initialData?: any }) {
    const [activeTab, setActiveTab] = useState('frontdesk');
    const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);

    const rooms = initialData?.rooms || [];
    const hotel = initialData?.hotel || { name: 'The Grand City Hotel' };
    const reservations = initialData?.reservations || [];

    if (selectedOutlet) {
        return (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setSelectedOutlet(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedOutlet === 'rooftop' ? 'Rooftop Lounge POS' : 'Spa & Wellness POS'}</h2>
                        <p className="text-slate-500 font-medium">Terminal 1 • Cashier: Admin</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Menu Items */}
                    <div className="flex-1">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {[
                                { name: "Signature Cocktail", price: 18.00 },
                                { name: "Draft Beer", price: 8.00 },
                                { name: "Glass of Wine", price: 14.00 },
                                { name: "Tapas Platter", price: 24.00 },
                                { name: "Sparkling Water", price: 6.00 },
                                { name: "Espresso", price: 5.00 },
                            ].map((item, i) => (
                                <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl cursor-pointer hover:border-teal-500 hover:shadow-md transition-all text-center flex flex-col justify-center aspect-square active:scale-95">
                                    <p className="font-bold text-slate-900 mb-2">{item.name}</p>
                                    <p className="text-teal-700 font-bold">${item.price.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Cart & Checkout */}
                    <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-[500px]">
                        <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-4 mb-4">Current Tab</h3>
                        
                        <div className="flex-1 overflow-y-auto space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-slate-900">2x Signature Cocktail</p>
                                    <p className="text-xs text-slate-500">No ice</p>
                                </div>
                                <p className="font-bold text-sm text-slate-900">$36.00</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-slate-900">1x Tapas Platter</p>
                                </div>
                                <p className="font-bold text-sm text-slate-900">$24.00</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 mt-4">
                            <div className="flex justify-between items-center mb-2 text-sm text-slate-500">
                                <span>Subtotal</span>
                                <span>$60.00</span>
                            </div>
                            <div className="flex justify-between items-center mb-4 text-sm text-slate-500">
                                <span>Tax (8%)</span>
                                <span>$4.80</span>
                            </div>
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold text-lg text-slate-900">Total</span>
                                <span className="font-black text-2xl text-slate-900">$64.80</span>
                            </div>
                            
                            <Button variant="primary" className="w-full mb-3 bg-slate-900 text-white">Pay with CityWallet (QR)</Button>
                            <Button variant="outline" className="w-full border-teal-500 text-teal-700 bg-teal-50 hover:bg-teal-100">Charge to Room (Folio)</Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">The Grand City Hotel</h1>
                    <p className="text-slate-500 font-medium">Property Management System • Today, Oct 24</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-teal-50 px-4 py-2 rounded-xl text-center border border-teal-100">
                        <p className="text-teal-800 font-black text-xl">84%</p>
                        <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Occupancy</p>
                    </div>
                    <div className="bg-orange-50 px-4 py-2 rounded-xl text-center border border-orange-100">
                        <p className="text-orange-800 font-black text-xl">12</p>
                        <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">Arrivals</p>
                    </div>
                    <div className="bg-slate-50 px-4 py-2 rounded-xl text-center border border-slate-200">
                        <p className="text-slate-800 font-black text-xl">8</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Departures</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
                {[
                    { id: 'frontdesk', label: 'Front Desk (Tape Chart)', icon: Calendar },
                    { id: 'housekeeping', label: 'Housekeeping', icon: Bed },
                    { id: 'pos', label: 'POS & Outlets', icon: Coffee },
                    { id: 'finances', label: 'Night Audit', icon: Activity },
                ].map((tab) => (
                    <button
                        key={tab.slug}
                        onClick={() => setActiveTab(tab.slug)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${
                            activeTab === tab.slug
                                ? 'bg-teal-800 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeTab === 'frontdesk' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900">Live Room Status</h2>
                        <Button variant="primary" size="sm">New Walk-in</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rooms.map((room: any) => {
                            // Find an active reservation for this room
                            const activeRes = reservations.find((r: any) => r.roomId === room.id && (r.status === 'CHECKED_IN' || r.status === 'CONFIRMED'));
                            const guestName = activeRes ? activeRes.guestName : null;
                            const checkOut = activeRes ? new Date(activeRes.checkOutDate).toLocaleDateString() : null;
                            const isClean = room.status === 'CLEAN';
                            const isDirty = room.status === 'DIRTY';
                            const isInspecting = room.status === 'INSPECTING';
                            const isOoo = room.status === 'OUT_OF_ORDER';

                            return (
                                <Card key={room.id} className="p-4 border-l-4" style={{
                                    borderLeftColor: isClean ? '#10b981' : 
                                                     isDirty ? '#ef4444' : 
                                                     isInspecting ? '#f59e0b' :
                                                     isOoo ? '#64748b' : '#3b82f6'
                                }}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-black text-xl text-slate-900">Room {room.roomNumber}</h3>
                                            <p className="text-xs font-bold text-slate-500 uppercase">{room.type}</p>
                                        </div>
                                        <Badge variant={isClean ? 'default' : 'alert'} className={
                                            isDirty ? 'bg-red-100 text-red-700 border-none' : 
                                            isInspecting ? 'bg-orange-100 text-orange-700 border-none' : 
                                            isOoo ? 'bg-slate-200 text-slate-700 border-none' : 'bg-teal-100 text-teal-800 border-none'
                                        }>
                                            {room.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    {guestName ? (
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" /> {guestName}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">Check-out: {checkOut}</p>
                                            <div className="mt-3 flex gap-2">
                                                <Button variant="outline" size="sm" className="flex-1 text-xs py-1">Folio</Button>
                                                <Button variant="outline" size="sm" className="flex-1 text-xs py-1">Extend</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center h-[90px]">
                                            <p className="text-sm font-medium text-slate-400">Vacant</p>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'pos' && (
                <div className="space-y-6 animate-in fade-in">
                    <h2 className="text-lg font-bold text-slate-900">Multi-Outlet POS Terminal</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-700 text-white border-none shadow-lg">
                            <Coffee className="w-8 h-8 mb-4 text-orange-200" />
                            <h3 className="text-2xl font-black mb-2">Rooftop Lounge</h3>
                            <p className="text-orange-100 mb-6">Process F&B orders and charge directly to guest rooms.</p>
                            <Button onClick={() => setSelectedOutlet('rooftop')} className="w-full bg-white text-orange-700 hover:bg-orange-50 border-none font-bold">Open Register</Button>
                        </Card>
                        <Card className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none shadow-lg">
                            <Moon className="w-8 h-8 mb-4 text-indigo-200" />
                            <h3 className="text-2xl font-black mb-2">Spa & Wellness</h3>
                            <p className="text-indigo-100 mb-6">Manage appointments and retail purchases.</p>
                            <Button onClick={() => setSelectedOutlet('spa')} className="w-full bg-white text-indigo-700 hover:bg-indigo-50 border-none font-bold">Open Register</Button>
                        </Card>
                    </div>
                </div>
            )}
            {activeTab === 'housekeeping' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900">Housekeeping & Maintenance</h2>
                        <Button variant="outline" size="sm" className="bg-white"><Bell className="w-4 h-4" /> Dispatch Runner</Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Task List */}
                        <div className="md:col-span-2 space-y-4">
                            <Card className="p-0 overflow-hidden divide-y divide-slate-100">
                                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-700">Priority Tasks</h3>
                                    <Badge variant="alert" className="bg-red-100 text-red-700 border-none">2 Urgent</Badge>
                                </div>
                                <div className="p-4 flex justify-between items-center hover:bg-slate-50">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                            <Bed className="w-5 h-5 text-red-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">Clean Room 103</p>
                                            <p className="text-sm text-slate-500">Guest checking in at 3:00 PM</p>
                                        </div>
                                    </div>
                                    <Button variant="primary" size="sm">Start</Button>
                                </div>
                                <div className="p-4 flex justify-between items-center hover:bg-slate-50">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                            <Settings className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">Fix AC in Room 202</p>
                                            <p className="text-sm text-slate-500">Maintenance Ticket #4092</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="bg-white">View</Button>
                                </div>
                                <div className="p-4 flex justify-between items-center hover:bg-slate-50">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">Inspect Suite 104</p>
                                            <p className="text-sm text-slate-500">Awaiting Manager Approval</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="bg-white">Inspect</Button>
                                </div>
                            </Card>
                        </div>
                        
                        {/* Inventory Snapshot */}
                        <div className="space-y-4">
                            <Card className="p-5">
                                <h3 className="font-bold text-slate-900 mb-4">Inventory Alerts</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700">Fresh Linens</span>
                                            <span className="font-bold text-orange-600">Low (12%)</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500 w-[12%]" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700">Mini-Bar Snacks</span>
                                            <span className="font-bold text-teal-600">Good (78%)</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-teal-500 w-[78%]" />
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full mt-4 bg-white text-xs">Reorder Supplies</Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finances' && (
                <div className="space-y-6 animate-in fade-in">
                    <h2 className="text-lg font-bold text-slate-900">Night Audit & Finances</h2>
                    <Card className="p-10 text-center border-dashed border-2 bg-slate-50">
                        <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Automated Night Audit</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">The Night Audit automatically runs at 2:00 AM to post room charges, reconcile POS terminals, and generate daily revenue reports.</p>
                        <Button variant="primary" className="mx-auto">Run Manual Audit</Button>
                    </Card>
                </div>
            )}
        </div>
    );
}
