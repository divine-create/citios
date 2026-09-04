'use client';

import React, { useState } from 'react';
import { Card, Button, Badge } from './Shared';
import { ArrowLeft, Star, MapPin, Phone, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ResidentServiceView({ title, description, orgs, items, itemLabel }: { title: string, description: string, orgs: any[], items?: any[], itemLabel?: string }) {
    const router = useRouter();
    const [cart, setCart] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);

    const handleCheckout = () => {
        setShowModal(true);
        setCart([]);
    };

    return (
        <div className="animate-in fade-in duration-300 pb-24">
            {/* Header */}
            <div className="bg-teal-900 text-white px-6 pt-12 pb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-bl-full -z-0" />
                <button onClick={() => router.push('/')} className="relative z-10 flex items-center text-teal-200 hover:text-white mb-6 text-sm font-bold transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
                </button>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black tracking-tight">{title}</h1>
                    <p className="text-teal-100 mt-2 max-w-md">{description}</p>
                </div>
            </div>

            {/* Organizations */}
            <div className="px-6 -mt-4 relative z-20 space-y-4 max-w-2xl mx-auto">
                {orgs.map((org) => (
                    <Card key={org.id} className="p-5 shadow-lg border-0 bg-white">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">{org.name}</h2>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" /> Downtown District
                                </p>
                            </div>
                            <Badge className="bg-teal-50 text-teal-700">Open</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">{org.description}</p>
                        <div className="flex gap-2">
                            <Button className="flex-1 bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs h-9">View Profile</Button>
                            <Button variant="outline" className="w-9 h-9 p-0 flex items-center justify-center">
                                <Phone className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Items (Menus, Products, etc.) */}
            {items && items.length > 0 && (
                <div className="px-6 mt-8 max-w-2xl mx-auto">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">{itemLabel || 'Available Items'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {items.map((item) => (
                            <Card key={item.id} className="p-4 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm mb-1">{item.name}</h4>
                                    {item.description && <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>}
                                </div>
                                <div className="mt-4 flex justify-between items-end">
                                    <span className="font-black text-teal-800">${Number(item.price || 0).toFixed(2)}</span>
                                    <button onClick={() => setCart([...cart, item])} className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-lg font-bold hover:bg-teal-200 transition-colors">
                                        +
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Cart Checkout Bar */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)] z-40">
                    <div className="max-w-2xl mx-auto flex justify-between items-center">
                        <div>
                            <p className="font-bold text-slate-900">{cart.length} item(s) in cart</p>
                            <p className="text-sm font-medium text-slate-600">Total: ${cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0).toFixed(2)}</p>
                        </div>
                        <Button onClick={handleCheckout} className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2">
                            Checkout
                        </Button>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 px-4">
                    <Card className="max-w-sm w-full p-6 text-center shadow-2xl">
                        <CheckCircle className="w-16 h-16 text-teal-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Success!</h2>
                        <p className="text-slate-600 mb-6">Your checkout using CityWallet was successful.</p>
                        <Button onClick={() => setShowModal(false)} className="w-full">
                            Close
                        </Button>
                    </Card>
                </div>
            )}
        </div>
    );
}
