import { CheckCircle2, Wallet, Truck, Clock, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Card, Button, Badge } from './Shared';

export default function BookingView({ setView }: any) {
    return (
        <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setView('home')}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700 shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Order Status</h2>
                </div>
                <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                    <MoreHorizontal className="w-6 h-6" />
                </button>
            </div>

            <Card className="border-t-8 border-t-orange-500 overflow-hidden relative shadow-lg">
                {/* Background Decoration */}
                <div className="absolute -top-10 -right-10 opacity-[0.03] pointer-events-none">
                    <CheckCircle2 className="w-64 h-64 text-orange-900" />
                </div>
                
                <div className="relative z-10 p-2 md:p-4">
                    <Badge variant="alert" className="mb-6 inline-block bg-orange-100 border-none text-orange-700 shadow-sm">Active Order</Badge>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Order Confirmed!</h3>
                    <p className="text-slate-600 mb-8 font-medium text-lg leading-relaxed">Your items are being prepared by FreshMart. Estimated delivery in <span className="font-bold text-slate-900">25 mins</span>.</p>

                    {/* Payment Summary Box */}
                    <div className="bg-slate-50 rounded-2xl p-5 flex items-center justify-between mb-8 border border-slate-200 shadow-inner">
                        <div className="flex items-center gap-4 text-slate-700 font-bold">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-800">
                                <Wallet className="w-5 h-5" />
                            </div>
                            CityWallet Payment
                        </div>
                        <span className="text-xl font-black text-slate-900">$42.50</span>
                    </div>

                    {/* Timeline */}
                    <div className="px-2">
                        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px before:h-full before:w-1 before:bg-slate-100 before:rounded-full">
                            
                            {/* Step 1: Completed */}
                            <div className="relative flex items-center gap-6 group">
                                <div className="w-12 h-12 rounded-full bg-teal-800 border-4 border-white shadow-md flex items-center justify-center shrink-0 relative z-10">
                                    <CheckCircle2 className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <h4 className="font-bold text-slate-900 text-lg">Order Placed</h4>
                                    <p className="text-sm text-slate-500 font-medium">10:42 AM</p>
                                </div>
                            </div>
                            
                            {/* Step 2: Active */}
                            <div className="relative flex items-center gap-6 group">
                                <div className="w-12 h-12 rounded-full bg-orange-500 border-4 border-white shadow-md flex items-center justify-center shrink-0 relative z-10 animate-pulse">
                                    <Clock className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                    <h4 className="font-bold text-orange-900 text-lg">Preparing</h4>
                                    <p className="text-sm text-orange-700 font-bold">Currently packing your items</p>
                                </div>
                            </div>
                            
                            {/* Step 3: Pending */}
                            <div className="relative flex items-center gap-6 group opacity-50">
                                <div className="w-12 h-12 rounded-full bg-slate-200 border-4 border-white shadow-sm flex items-center justify-center shrink-0 relative z-10">
                                    <Truck className="w-6 h-6 text-slate-400" />
                                </div>
                                <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100">
                                    <h4 className="font-bold text-slate-400 text-lg">Out for Delivery</h4>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button variant="outline" className="flex-1 bg-white border-slate-200 text-slate-700" onClick={() => setView('home')}>Back to Dashboard</Button>
                <Button variant="primary" className="flex-1 py-4 text-lg">View Digital Receipt</Button>
            </div>
        </div>
    )
}
