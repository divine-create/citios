"use client";
import { Map, Star, Filter, Phone, MapPin } from 'lucide-react';
import { Card, Button, Badge } from './Shared';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function HealthcareView({ initialData }: { initialData: any[] }) {
    const router = useRouter();

    const setView = (view: string) => {
        const routes: Record<string, string> = {
            'booking': '/activity',
        };
        if (routes[view]) router.push(routes[view]);
    };

    const results = initialData.map((org, idx) => ({
        id: org.id,
        name: org.name,
        wait: Math.floor((idx * 7) % 30 + 5) + "m", // mock wait time
        rating: ((idx * 3) % 10 / 10 + 4).toFixed(1), // mock rating between 4.0 - 5.0
        dist: ((idx * 2) % 50 / 10 + 0.5).toFixed(1) + " km", // mock distance
        img: (10 * (idx + 1)).toString() // mock image id
    }));

    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full animate-in fade-in duration-500">
            {/* Left/Main Column - List */}
            <div className="flex-1 flex flex-col space-y-6">
                <div className="flex items-center justify-between lg:hidden">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Find Care</h2>
                    <Button variant="outline" size="sm" className="shadow-sm bg-white"><Map className="w-4 h-4" /> Map</Button>
                </div>

                {/* Filters */}
                <div className="flex gap-2.5 overflow-x-auto md:flex-wrap md:overflow-visible pb-2 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
                    <Button variant="primary" size="sm" className="shrink-0 whitespace-nowrap"><Filter className="w-4 h-4" /> Filters</Button>
                    <Button variant="outline" size="sm" className="shrink-0 whitespace-nowrap bg-white">Open Now</Button>
                    <Button variant="outline" size="sm" className="shrink-0 whitespace-nowrap bg-white text-slate-600 border-slate-200">Under 5km</Button>
                    <Button variant="outline" size="sm" className="shrink-0 whitespace-nowrap bg-white text-slate-600 border-slate-200">Pediatrics</Button>
                    <Button variant="outline" size="sm" className="shrink-0 whitespace-nowrap bg-white text-slate-600 border-slate-200">Dentistry</Button>
                </div>

                {/* Results List */}
                <div className="space-y-5">
                    {results.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">No healthcare organizations found in the database.</div>
                    ) : results.map((item, i) => (
                        <Card key={item.id} hoverable className="flex flex-col md:flex-row gap-6 p-4 md:p-5">
                            <div className="h-48 w-full md:w-56 md:h-auto bg-slate-100 rounded-2xl overflow-hidden shrink-0 relative">
                                <Image src={`https://picsum.photos/id/${item.img}/600/400`} alt={item.name} fill className="object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute top-3 right-3 shadow-lg rounded-full">
                                    <Badge variant="alert" className="bg-white/90 backdrop-blur border-none shadow-sm">{item.wait} wait</Badge>
                                </div>
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{item.name}</h3>
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 bg-orange-50 px-2 py-1 rounded-lg text-orange-700">
                                            <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
                                            {item.rating}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium mb-4">
                                        <MapPin className="w-4 h-4" />
                                        {item.dist} away • 1245 Wellness Ave
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-200">ER Open</span>
                                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-200">Pediatrics</span>
                                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-200">Pharmacy</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <Button variant="accent" className="flex-1" onClick={() => setView('booking')}>Book Visit</Button>
                                    <Button variant="outline" className="flex-1 bg-white">Order Meds</Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Right Column - Map (Desktop only) */}
            <div className="hidden lg:block lg:w-96 xl:w-[480px] bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-xl relative sticky top-8 h-[calc(100vh-8rem)]">
                <Image src="https://picsum.photos/id/28/800/1200" alt="Map View" fill className="object-cover opacity-90" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-teal-900/10 mix-blend-multiply" />
                
                {/* Fake Map Markers */}
                <div className="absolute top-1/3 left-1/4">
                    <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
                        <span className="font-bold text-sm">12m</span>
                    </div>
                </div>
                <div className="absolute top-1/2 left-2/3">
                    <div className="w-10 h-10 bg-teal-800 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform">
                        <Phone className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </div>
    )
}
