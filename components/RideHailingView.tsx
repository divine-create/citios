'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Car, Clock, Star, Phone, Shield, ArrowLeft } from 'lucide-react';
import { Button } from './Shared';

export default function RideHailingView({ setView, organizations = [] }: { setView: any, organizations?: any[] }) {
    // 1: LOCATION, 2: FARE, 3: BIDDING, 4: ACTIVE
    const [step, setStep] = useState(1);
    
    // Form state
    const [pickup, setPickup] = useState('Downtown District');
    const [dropoff, setDropoff] = useState('');
    const [selectedClass, setSelectedClass] = useState('Economy');
    const [offerPrice, setOfferPrice] = useState('12.00');

    // Bidding state
    const [bids, setBids] = useState<any[]>([]);
    const [acceptedDriver, setAcceptedDriver] = useState<any>(null);

    // Simulated driver generation
    useEffect(() => {
        if (step === 3) {
            const timers = [
                setTimeout(() => setBids(prev => [...prev, {
                    id: 1, name: 'Michael', rating: 4.8, car: 'Toyota Camry', time: '5 mins', price: (parseFloat(offerPrice) + 1.5).toFixed(2), isMatch: false
                }]), 2000),
                setTimeout(() => setBids(prev => [...prev, {
                    id: 2, name: 'Sarah', rating: 4.9, car: 'Honda Civic', time: '2 mins', price: (parseFloat(offerPrice) + 3.0).toFixed(2), isMatch: false
                }]), 4500),
                setTimeout(() => setBids(prev => [...prev, {
                    id: 3, name: 'David', rating: 4.7, car: 'Hyundai Elantra', time: '7 mins', price: offerPrice, isMatch: true
                }]), 7000)
            ];
            return () => timers.forEach(clearTimeout);
        }
    }, [step, offerPrice]);

    const handleAcceptBid = (driver: any) => {
        setAcceptedDriver(driver);
        setStep(4);
    };

    return (
        <div className="relative h-screen w-full bg-slate-100 overflow-hidden font-sans flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start pointer-events-none">
                <button 
                    onClick={() => step > 1 ? setStep(step - 1) : setView('home')} 
                    className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-auto hover:bg-slate-50 transition"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-800" />
                </button>
                <div className="bg-white px-4 py-2 rounded-full shadow-lg pointer-events-auto flex items-center gap-2 font-bold text-slate-800">
                    <Shield className="w-4 h-4 text-teal-600" />
                    CityConnect
                </div>
            </div>

            {/* Mock Map Background */}
            <div className="absolute inset-0 z-0 bg-[#e5e3df] overflow-hidden">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#d5d3cf" strokeWidth="6"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Animated Cars */}
                <div className="absolute top-[30%] left-[40%] w-4 h-8 bg-slate-800 rounded-sm shadow-md transform rotate-45 animate-pulse"></div>
                <div className="absolute top-[60%] left-[70%] w-4 h-8 bg-slate-800 rounded-sm shadow-md transform -rotate-12"></div>
                <div className="absolute top-[20%] left-[80%] w-4 h-8 bg-slate-800 rounded-sm shadow-md transform rotate-90"></div>
                
                {/* User Pin */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full animate-ping absolute -top-4 -left-4"></div>
                    <div className="w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-xl relative z-10 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                </div>

                {/* Destination Pin */}
                {step > 1 && (
                    <div className="absolute top-[30%] left-[60%] transform -translate-x-1/2 -translate-y-1/2">
                        <MapPin className="w-10 h-10 text-red-500 drop-shadow-xl" />
                    </div>
                )}
            </div>

            {/* Bottom Sheet */}
            <div className={`absolute bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl transition-all duration-500 ease-in-out flex flex-col ${step === 4 ? 'h-[40vh]' : 'h-[60vh] lg:h-[70vh]'}`}>
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-2"></div>
                
                <div className="flex-1 overflow-y-auto px-6 pb-8">
                    
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                            <h2 className="text-2xl font-black text-slate-900 mb-6 mt-2">Where to?</h2>
                            
                            <div className="relative flex flex-col gap-4 mb-6">
                                <div className="absolute left-3.5 top-4 bottom-8 w-0.5 bg-slate-200 z-0"></div>
                                <div className="relative z-10 flex items-center bg-slate-100 rounded-xl p-3 border border-slate-200">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-4 ml-1"></div>
                                    <input 
                                        type="text" 
                                        value={pickup}
                                        onChange={(e) => setPickup(e.target.value)}
                                        className="bg-transparent border-none outline-none flex-1 font-bold text-slate-700" 
                                    />
                                </div>
                                <div className="relative z-10 flex items-center bg-slate-50 rounded-xl p-3 border-2 border-teal-500 shadow-[0_0_0_4px_rgba(20,184,166,0.1)]">
                                    <div className="w-2.5 h-2.5 bg-teal-500 mr-4 ml-1"></div>
                                    <input 
                                        type="text" 
                                        placeholder="Enter dropoff location" 
                                        value={dropoff}
                                        onChange={(e) => setDropoff(e.target.value)}
                                        autoFocus
                                        className="bg-transparent border-none outline-none flex-1 font-bold text-slate-900 placeholder:text-slate-400" 
                                    />
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Suggested</h3>
                                <div className="flex items-center gap-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 rounded-lg px-2" onClick={() => { setDropoff('Central Station'); setStep(2); }}>
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600"><MapPin className="w-5 h-5" /></div>
                                    <div>
                                        <p className="font-bold text-slate-800">Central Station</p>
                                        <p className="text-xs text-slate-500">Transit Hub</p>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                variant="accent" 
                                className="w-full py-6 text-lg rounded-2xl disabled:opacity-50 mt-4" 
                                disabled={!dropoff}
                                onClick={() => setStep(2)}
                            >
                                Continue
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
                            <h2 className="text-2xl font-black text-slate-900 mb-6 mt-2">Offer your fare</h2>
                            
                            <div className="flex gap-4 overflow-x-auto pb-4 mb-2 -mx-6 px-6 [&::-webkit-scrollbar]:hidden">
                                {['Economy', 'Comfort', 'XL', 'Courier'].map(cls => (
                                    <div 
                                        key={cls} 
                                        onClick={() => setSelectedClass(cls)}
                                        className={`shrink-0 w-28 p-3 rounded-2xl border-2 cursor-pointer transition-all ${selectedClass === cls ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                    >
                                        <Car className={`w-8 h-8 mb-2 ${selectedClass === cls ? 'text-teal-600' : 'text-slate-400'}`} />
                                        <p className={`font-bold text-sm ${selectedClass === cls ? 'text-teal-900' : 'text-slate-600'}`}>{cls}</p>
                                        <p className="text-xs text-slate-400">~ 4 min</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-100 rounded-3xl p-6 mb-6 flex flex-col items-center border border-slate-200">
                                <p className="text-sm font-bold text-slate-500 mb-2">Recommended: $12.50</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-4xl font-black text-slate-400">$</span>
                                    <input 
                                        type="number" 
                                        value={offerPrice}
                                        onChange={(e) => setOfferPrice(e.target.value)}
                                        className="bg-transparent border-none outline-none text-5xl font-black text-slate-900 w-32 text-center"
                                    />
                                </div>
                                <div className="w-full flex justify-between mt-6">
                                    <button onClick={() => setOfferPrice((parseFloat(offerPrice) - 1).toFixed(2))} className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center font-bold text-xl text-slate-600 hover:bg-slate-50">-</button>
                                    <button onClick={() => setOfferPrice((parseFloat(offerPrice) + 1).toFixed(2))} className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center font-bold text-xl text-slate-600 hover:bg-slate-50">+</button>
                                </div>
                            </div>

                            <Button 
                                variant="accent" 
                                className="w-full py-6 text-xl rounded-2xl shadow-xl shadow-teal-500/20 mt-auto" 
                                onClick={() => { setBids([]); setStep(3); }}
                            >
                                Request Ride
                            </Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in fade-in duration-500 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6 mt-2">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                        <span className="relative flex h-4 w-4">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-4 w-4 bg-teal-500"></span>
                                        </span>
                                        Finding drivers...
                                    </h2>
                                    <p className="text-sm font-bold text-slate-500 mt-1">Your offer: <span className="text-teal-700">${offerPrice}</span></p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setStep(2)}>Cancel</Button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-4">
                                {bids.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 pb-12">
                                        <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-teal-500 animate-spin"></div>
                                        <p className="font-bold">Waiting for offers...</p>
                                    </div>
                                ) : (
                                    bids.map((bid, i) => (
                                        <div key={bid.id} className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm animate-in slide-in-from-bottom-4 flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-slate-200 rounded-full overflow-hidden relative">
                                                        <img src={`https://i.pravatar.cc/150?u=${bid.id}`} alt={bid.name} className="object-cover w-full h-full" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-lg">{bid.name}</p>
                                                        <div className="flex items-center gap-1 text-sm font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded w-fit">
                                                            <Star className="w-3 h-3 fill-orange-500" /> {bid.rating}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-2xl font-black ${bid.isMatch ? 'text-teal-600' : 'text-slate-900'}`}>${bid.price}</p>
                                                    <p className="text-xs font-bold text-slate-500 flex items-center justify-end gap-1"><Clock className="w-3 h-3"/> {bid.time} away</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between text-sm text-slate-500 font-medium px-1">
                                                <span className="flex items-center gap-1.5"><Car className="w-4 h-4" /> {bid.car}</span>
                                            </div>

                                            <Button variant="accent" className="w-full py-4 text-base rounded-xl" onClick={() => handleAcceptBid(bid)}>
                                                Accept Offer
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {step === 4 && acceptedDriver && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 h-full flex flex-col pt-2">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900">{acceptedDriver.name} is on the way</h2>
                                    <p className="text-teal-700 font-bold flex items-center gap-1.5 mt-1">
                                        <Navigation className="w-4 h-4" /> Arriving in {acceptedDriver.time}
                                    </p>
                                </div>
                                <div className="w-16 h-16 bg-slate-200 rounded-full overflow-hidden shadow-lg border-2 border-white">
                                    <img src={`https://i.pravatar.cc/150?u=${acceptedDriver.id}`} alt={acceptedDriver.name} className="object-cover w-full h-full" />
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center border border-slate-100 mb-6">
                                <div>
                                    <p className="font-black text-xl text-slate-900 tracking-wider">ABC-1234</p>
                                    <p className="text-sm font-bold text-slate-500">{acceptedDriver.car} • White</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition">
                                        <Shield className="w-5 h-5" />
                                    </button>
                                    <button className="w-12 h-12 bg-teal-100 rounded-full shadow-sm border border-teal-200 flex items-center justify-center text-teal-700 hover:bg-teal-200 transition">
                                        <Phone className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1"></div>

                            <div className="flex gap-4">
                                <div className="flex-1 bg-slate-100 p-4 rounded-xl flex flex-col items-center justify-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Fare</p>
                                    <p className="text-xl font-black text-slate-900">${acceptedDriver.price}</p>
                                </div>
                                <div className="flex-1 bg-slate-100 p-4 rounded-xl flex flex-col items-center justify-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Payment</p>
                                    <p className="text-xl font-black text-slate-900">Wallet</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
