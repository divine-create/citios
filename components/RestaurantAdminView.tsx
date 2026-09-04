'use client';

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Shared';
import { Badge } from '@/components/Shared';
import { Button } from '@/components/Shared';

export function RestaurantAdminView({ initialData }: { initialData: any }) {
    const { restaurant, menuItems, orders } = initialData;
    const [activeTab, setActiveTab] = useState<'pos' | 'kds' | 'menu'>('pos');

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-teal-900 text-white p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-bl-full -z-0" />
                <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">{restaurant.name}</h2>
                        <p className="text-teal-200 text-sm font-bold uppercase tracking-widest mt-2">POS & KDS Portal</p>
                    </div>
                </div>

                <div className="relative z-10 grid grid-cols-3 gap-8 border-t border-teal-800/50 pt-8">
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">{orders.length}</p>
                        <p className="text-xs text-teal-300 font-bold uppercase tracking-wider mt-2">Active Orders</p>
                    </div>
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">{menuItems.length}</p>
                        <p className="text-xs text-teal-300 font-bold uppercase tracking-wider mt-2">Menu Items</p>
                    </div>
                    <div>
                        <p className="text-4xl font-black tracking-tighter text-white">$ {orders.reduce((acc: number, o: any) => acc + o.totalAmount, 0).toFixed(2)}</p>
                        <p className="text-xs text-teal-300 font-bold uppercase tracking-wider mt-2">Today's Sales</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-slate-200 px-6 overflow-x-auto">
                <div className="flex space-x-8 min-w-max">
                    <button onClick={() => setActiveTab('pos')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Front of House (POS)</button>
                    <button onClick={() => setActiveTab('kds')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Kitchen Display (KDS)</button>
                    <button onClick={() => setActiveTab('menu')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Menu Management</button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
                {activeTab === 'pos' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        <div className="lg:col-span-2 space-y-6">
                            <h3 className="text-xl font-bold text-slate-900">Menu</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {menuItems.map((item: any) => (
                                    <Card key={item.id} hoverable className="p-4 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-transform">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full mb-3 flex items-center justify-center text-2xl">🍔</div>
                                        <h4 className="font-bold text-sm text-slate-900 leading-tight mb-1">{item.name}</h4>
                                        <p className="text-teal-700 font-black text-sm"></p>
                                    </Card>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-900">Current Ticket</h3>
                            <Card className="p-6 flex flex-col h-[500px]">
                                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                                    <div className="text-center text-slate-400 text-sm font-medium mt-10">Select items to add to ticket...</div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 space-y-3">
                                    <div className="flex justify-between text-sm text-slate-600 font-medium">
                                        <span>Subtotal</span>
                                        <span>.00</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-black text-slate-900">
                                        <span>Total</span>
                                        <span>.00</span>
                                    </div>
                                    <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold h-12 text-lg mt-2">Charge</Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'kds' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <h3 className="text-xl font-bold text-slate-900">Kitchen Display System</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {orders.filter((o: any) => o.status === 'PREPARING').map((order: any) => (
                                <Card key={order.id} className="flex flex-col border-t-4 border-t-orange-500 shadow-md">
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{order.type}</p>
                                            <h4 className="font-black text-lg text-slate-900 leading-none mt-1">#{order.id.slice(0,4).toUpperCase()}</h4>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-orange-600">04:32</p>
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 space-y-3">
                                        {order.items.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-start text-sm">
                                                <div className="flex gap-2 font-bold text-slate-900">
                                                    <span>{item.quantity}x</span>
                                                    <span>{item.menuItem?.name || 'Unknown'}</span>
                                                </div>
                                                {item.notes && <p className="text-xs text-red-500 font-bold block mt-1">** {item.notes}</p>}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 pt-0 mt-auto">
                                        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10">BUMP</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'menu' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">Menu Items</h3>
                            <Button className="bg-teal-700 hover:bg-teal-800 text-white font-bold">+ Add Item</Button>
                        </div>
                        <Card className="p-0 overflow-hidden">
                            <div className="divide-y divide-slate-100">
                                {menuItems.map((item: any) => (
                                    <div key={item.id} className="p-4 md:p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-900">{item.name}</p>
                                            <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-teal-700 text-lg"></p>
                                            <Badge variant="outline" className="mt-1 text-xs font-bold text-slate-500">{item.category}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
