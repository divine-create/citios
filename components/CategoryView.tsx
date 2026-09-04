import { Map, Star, Filter, Phone, MapPin } from 'lucide-react';
import { Card, Button, Badge } from './Shared';
import Image from 'next/image';
import React from 'react';

export default function CategoryView({ setView, title, filters, items, mapImageId, mapWidget }: any) {
    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full animate-in fade-in duration-500">
            {/* Left/Main Column - List */}
            <div className="flex-1 flex flex-col space-y-6">
                <div className="flex items-center justify-between lg:hidden">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
                    <Button variant="outline" size="sm" className="shadow-sm bg-white"><Map className="w-4 h-4" /> Map</Button>
                </div>

                {/* Filters */}
                <div className="flex gap-2.5 overflow-x-auto md:flex-wrap md:overflow-visible pb-2 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
                    <Button variant="primary" size="sm" className="shrink-0 whitespace-nowrap"><Filter className="w-4 h-4" /> Filters</Button>
                    {filters.map((f: string, i: number) => (
                        <Button key={i} variant="outline" size="sm" className="shrink-0 whitespace-nowrap bg-white text-slate-600 border-slate-200">{f}</Button>
                    ))}
                </div>

                {/* Results List */}
                <div className="space-y-5">
                    {items.map((item: any, i: number) => (
                        <Card key={i} hoverable className="flex flex-col md:flex-row gap-6 p-4 md:p-5">
                            <div className="h-48 w-full md:w-56 md:h-auto bg-slate-100 rounded-2xl overflow-hidden shrink-0 relative">
                                <Image src={`https://picsum.photos/id/${item.img}/600/400`} alt={item.name} fill className="object-cover" referrerPolicy="no-referrer" />
                                {item.badge && (
                                    <div className="absolute top-3 right-3 shadow-lg rounded-full">
                                        <Badge variant={item.badgeVariant || "default"} className="bg-white/90 backdrop-blur border-none shadow-sm">{item.badge}</Badge>
                                    </div>
                                )}
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
                                        {item.dist} away • {item.address}
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {item.tags.map((tag: string, j: number) => (
                                            <span key={j} className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-200">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <Button variant="accent" className="flex-1" onClick={() => setView('booking')}>{item.primaryAction}</Button>
                                    <Button variant="outline" className="flex-1 bg-white">{item.secondaryAction}</Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Right Column - Map (Desktop only) */}
            <div className="hidden lg:block lg:w-96 xl:w-[480px] bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-xl relative sticky top-8 h-[calc(100vh-8rem)]">
                <Image src={`https://picsum.photos/id/${mapImageId}/800/1200`} alt="Map View" fill className="object-cover opacity-90" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-teal-900/10 mix-blend-multiply" />
                
                {mapWidget}
            </div>
        </div>
    )
}
