"use client";
import { User, CreditCard, HeartPulse, Settings, LogOut, ChevronRight, GraduationCap, ShieldCheck } from 'lucide-react';
import { Card, Button, Badge } from './Shared';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function ProfileView({ initialData }: { initialData: any }) {
    const router = useRouter();

    if (!initialData) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 text-center py-20">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-4">Please Sign In</h2>
                <p className="text-slate-600 mb-6">You need to sign in to view your profile and CityWallet.</p>
            </div>
        );
    }

    const { user, wallet } = initialData;
    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight md:hidden">My Profile</h2>
            
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                {/* Left Sidebar / Profile Card */}
                <Card className="w-full md:w-80 flex flex-col items-center text-center p-8 sticky top-24 shrink-0">
                    <div className="relative mb-6">
                        <div className="w-28 h-28 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 text-4xl font-black shadow-inner border-4 border-white overflow-hidden">
                            {user.image ? (
                                <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                initial
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                            <ShieldCheck className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{user.name || 'Resident'}</h2>
                    <p className="text-slate-500 font-medium mb-6">{user.email}</p>
                    <Badge variant="alert" className="mb-6 px-4 py-1.5 text-sm">Verified Resident</Badge>
                    <Button variant="outline" className="w-full bg-slate-50 border-slate-200 text-slate-700">Edit Profile</Button>
                </Card>

                {/* Main Content */}
                <div className="w-full flex-1 space-y-6 md:space-y-8">
                    {/* Wallet Section */}
                    <Card className="p-1">
                        <div className="bg-gradient-to-br from-teal-800 to-teal-950 rounded-3xl p-8 text-white shadow-xl shadow-teal-900/10 relative overflow-hidden">
                            {/* Decorative background circle */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                            
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <CreditCard className="w-5 h-5 text-teal-300" />
                                        <h3 className="font-bold text-teal-100 uppercase tracking-widest text-sm">CityWallet Balance</h3>
                                    </div>
                                    <p className="text-5xl font-black tracking-tighter mt-2">${wallet.balance.toFixed(2)}</p>
                                </div>
                                <Badge className="bg-white/20 text-white border-none backdrop-blur-md">Active</Badge>
                            </div>
                            
                            <div className="mt-10 flex justify-between items-end relative z-10">
                                <div>
                                    <p className="text-teal-300/80 text-xs font-bold uppercase tracking-wider mb-1">Linked Card</p>
                                    <p className="font-mono text-lg opacity-90">•••• •••• •••• 4242</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm" />
                                    <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm -ml-5" />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 flex gap-3">
                            <Button variant="primary" className="flex-1">Top Up Balance</Button>
                            <Button variant="outline" className="flex-1 border-slate-200 bg-white">History</Button>
                        </div>
                    </Card>

                    {/* Quick Access Modules */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
                        <Card hoverable className="flex items-center justify-between group p-6">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-100 group-hover:scale-105 transition-all">
                                    <HeartPulse className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-lg">Health Records</p>
                                    <p className="text-sm text-slate-500 font-medium">Family of 4</p>
                                </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </Card>

                        <Card hoverable className="flex items-center justify-between group p-6">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-teal-50 text-teal-800 rounded-2xl group-hover:bg-teal-100 group-hover:scale-105 transition-all">
                                    <GraduationCap className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-lg">School Portal</p>
                                    <p className="text-sm text-orange-600 font-bold">2 Fees pending</p>
                                </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </Card>
                    </div>

                    {/* Settings List */}
                    <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
                        {[
                            { icon: Settings, label: "Settings & Privacy" },
                            { icon: User, label: "Manage Family Members" },
                            { icon: LogOut, label: "Sign Out", alert: true, onClick: () => signOut() },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-6 hover:bg-slate-50 cursor-pointer transition-colors" onClick={item.onClick}>
                                <div className={`flex items-center gap-4 font-bold text-lg ${item.alert ? 'text-red-500' : 'text-slate-700'}`}>
                                    <item.icon className={`w-6 h-6 ${item.alert ? 'text-red-500' : 'text-slate-400'}`} />
                                    {item.label}
                                </div>
                                <ChevronRight className={`w-5 h-5 ${item.alert ? 'text-red-300' : 'text-slate-300'}`} />
                            </div>
                        ))}
                    </Card>
                </div>
            </div>
        </div>
    )
}
