
'use client';
import { X, Building2, LogIn, Sparkles, MapPin } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { Button } from './Shared';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
}

export default function LoginModal({ 
    isOpen, 
    onClose, 
    title = 'Join Your Community', 
    message = 'Connect with your neighbors, participate in local discussions, and discover what makes your city special.' 
}: LoginModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            {/* Backdrop with a slightly stylized blur */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 slide-in-from-bottom-4">
                
                {/* Decorative Top Accent */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-teal-50 via-teal-100/50 to-white -z-10" />

                <button 
                    onClick={onClose}
                    className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="px-8 pt-10 pb-8 text-center relative">
                    
                    {/* Logo & Branding */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-teal-900/10 rotate-3 transition-transform hover:rotate-6">
                            <Building2 className="w-8 h-8 text-white -rotate-3" />
                        </div>
                        <h1 className="text-2xl font-black text-teal-900 tracking-tight">CityConnect</h1>
                        <p className="text-[10px] text-teal-600/70 font-bold uppercase tracking-[0.2em] mt-1">Urban Integration</p>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-sm mx-auto">{message}</p>

                    <div className="space-y-3">
                        <Button 
                            variant="accent" 
                            className="w-full py-4 text-sm flex items-center justify-center gap-3 shadow-lg shadow-teal-900/10 hover:shadow-teal-900/20 group"
                            onClick={() => signIn('google')}
                        >
                            <LogIn className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Continue with Google
                            <Sparkles className="w-4 h-4 text-teal-200 ml-auto mr-1" />
                        </Button>
                        {process.env.NODE_ENV !== 'production' && (
                            <Button
                                variant="outline"
                                className="w-full py-4 text-sm flex items-center justify-center gap-3"
                                onClick={() =>
                                    signIn('demo', {
                                        email: 'demo@cityconnect.local',
                                        password: '1234',
                                    })
                                }
                            >
                                <Sparkles className="w-4 h-4" />
                                Demo Login (all verticals)
                            </Button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-wider"
                        >
                            Not now, maybe later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
