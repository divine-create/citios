'use client';
import { Card, Button, Badge } from '@/components/Shared';
import { MapPin, Navigation, Clock, Package } from 'lucide-react';

export default function CourierDashboard() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Online Status & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-teal-900/30 border-teal-800/50 flex flex-col justify-center">
                    <h2 className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">Current Status</h2>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-teal-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>
                        <span className="text-2xl font-black text-white tracking-tighter">Looking for Requests...</span>
                    </div>
                </Card>
                <Card className="p-6 bg-slate-950 border-slate-800">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Today's Earnings</h3>
                    <p className="text-3xl font-black text-white tracking-tighter">$142.50</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">4 Rides • 2 Deliveries</p>
                </Card>
                <Card className="p-6 bg-slate-950 border-slate-800">
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">City Score</h3>
                    <p className="text-3xl font-black text-white tracking-tighter">4.95 ⭐</p>
                    <p className="text-[10px] text-teal-500 font-bold uppercase tracking-wider mt-1">Top 5% in District</p>
                </Card>
            </div>

            {/* Active Request (Mocked) */}
            <div className="mt-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Incoming Request</h3>
                <Card className="p-0 overflow-hidden border-teal-800/50 bg-slate-950 ring-1 ring-teal-500/20">
                    <div className="h-48 bg-slate-800 relative w-full overflow-hidden">
                        {/* Mock Map Background */}
                        <div className="absolute inset-0 opacity-20" style={{
                            backgroundImage: 'radial-gradient(circle at center, #2dd4bf 2px, transparent 2px)',
                            backgroundSize: '24px 24px'
                        }}></div>
                        
                        {/* Route Line Mock */}
                        <div className="absolute top-1/2 left-1/4 right-1/4 h-1 bg-teal-500/30 rounded -translate-y-1/2"></div>
                        
                        {/* Pickup Pin */}
                        <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg -translate-x-1/2 -translate-y-1/2 z-10">
                            <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                        </div>

                        {/* Dropoff Pin */}
                        <div className="absolute top-1/2 right-1/4 w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center shadow-lg translate-x-1/2 -translate-y-1/2 z-10 border-2 border-white">
                            <MapPin className="w-4 h-4 text-white" />
                        </div>
                        
                        <div className="absolute bottom-4 right-4">
                            <Badge variant="default" className="bg-teal-500 text-slate-950 font-black shadow-lg">Est. 12 mins • 4.2 km</Badge>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex-1 w-full">
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge variant="neutral" className="bg-orange-500/20 text-orange-400 border-orange-500/20">Food Delivery</Badge>
                                    <span className="text-xl font-black text-white">$12.50</span>
                                </div>
                                <div className="space-y-3 mt-4">
                                    <div className="flex gap-3">
                                        <Package className="w-5 h-5 text-slate-500 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase">Pickup</p>
                                            <p className="text-sm font-medium text-white">Central Grocers (14 Main St)</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <MapPin className="w-5 h-5 text-teal-500 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase">Dropoff</p>
                                            <p className="text-sm font-medium text-white">400 Oak Lane (Apt 4B)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white flex-1 md:flex-none">Decline</Button>
                                <Button variant="primary" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black flex-1 md:flex-none shadow-[0_0_15px_rgba(45,212,191,0.3)]">
                                    <Navigation className="w-4 h-4 mr-2" />
                                    Accept Request
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
