"use client";
import { Search, SlidersHorizontal, Building, GraduationCap, PartyPopper, MapPin, Activity, Stethoscope } from 'lucide-react';
import { Card, Button, Badge } from './Shared';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function SearchView({ initialOrgs }: { initialOrgs: any[] }) {
    const router = useRouter();

    const setView = (view: string) => {
        const routes: Record<string, string> = {
            'home': '/',
            'search': '/explore',
            'booking': '/activity',
            'profile': '/profile',
            'healthcare': '/services/healthcare',
            'education': '/services/education',
            'grocery': '/services/grocery',
            'events': '/services/events',
            'rentals': '/services/rentals',
            'services': '/services/local',
        };
        if (routes[view]) router.push(routes[view]);
    };

    const results = initialOrgs.map(org => {
        let icon = Building;
        if (org.type === 'SCHOOL') icon = GraduationCap;
        else if (org.type === 'HEALTHCARE') icon = Stethoscope;
        else if (org.type === 'RESTAURANT') icon = PartyPopper;

        return {
            id: org.id,
            title: org.name,
            type: org.type,
            badge: "Open Now",
            icon,
            desc: org.description || "Local organization in your area.",
            dist: "0.8 km away" // Mock distance for now
        };
    });

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
            {/* Search Header */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-teal-800 transition-colors" />
                    <input
                        type="text"
                        placeholder="Hospitals, stores, schools, events..."
                        autoFocus
                        className="w-full bg-white border border-slate-200 rounded-3xl py-5 pl-16 pr-6 shadow-sm focus:outline-none focus:ring-4 focus:ring-teal-800/10 focus:border-teal-800 transition-all text-slate-900 font-medium text-lg placeholder:text-slate-400"
                    />
                </div>
                <Button variant="outline" size="icon" className="shrink-0 h-[68px] w-[68px] bg-white rounded-3xl hidden sm:flex">
                    <SlidersHorizontal className="w-6 h-6" />
                </Button>
            </div>

            {/* Quick Filters */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                <button className="px-5 py-2.5 text-sm font-bold rounded-full flex items-center gap-2 cursor-pointer bg-teal-800 text-white shadow-sm shrink-0">
                    All Results
                </button>
                <button className="px-5 py-2.5 text-sm font-bold rounded-full flex items-center gap-2 cursor-pointer bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shrink-0">
                    <Building className="w-4 h-4"/> Stores
                </button>
                <button className="px-5 py-2.5 text-sm font-bold rounded-full flex items-center gap-2 cursor-pointer bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shrink-0">
                    <GraduationCap className="w-4 h-4"/> Schools
                </button>
                <button className="px-5 py-2.5 text-sm font-bold rounded-full flex items-center gap-2 cursor-pointer bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shrink-0">
                    <PartyPopper className="w-4 h-4"/> Events
                </button>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {results.map((item, i) => (
                    <Card key={item.id} hoverable className="flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-800 mb-2">
                                <item.icon className="w-6 h-6" />
                            </div>
                            <Badge variant={item.badge === 'Closing Soon' ? 'alert' : 'default'}>{item.badge}</Badge>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2">{item.title}</h3>
                        <p className="text-slate-600 text-sm mb-6 leading-relaxed flex-1">{item.desc}</p>
                        
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider mb-5">
                            <MapPin className="w-3.5 h-3.5" />
                            {item.dist}
                        </div>

                        <div className="flex gap-3 mt-auto">
                            <Button variant="outline" size="sm" className="flex-1 bg-white">Map</Button>
                            <Button variant="primary" size="sm" className="flex-1" onClick={() => {
                                if (item.type === 'HEALTHCARE') setView('healthcare');
                                else setView('booking');
                            }}>Details</Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
