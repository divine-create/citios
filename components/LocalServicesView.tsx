'use client';

import React, { useState } from 'react';
import { 
  Wrench, 
  Paintbrush, 
  Trash2, 
  Truck, 
  Hammer, 
  Monitor, 
  Star,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react';

interface Pro {
  id: string;
  name: string;
  category: string;
  hourlyRate: number;
  rating: number;
  jobsCompleted: number;
  avatar: string;
  bio: string;
}

const CATEGORIES = [
  { id: 'plumbing', name: 'Plumbing', icon: Wrench, color: 'bg-blue-100 text-blue-600' },
  { id: 'cleaning', name: 'Cleaning', icon: Trash2, color: 'bg-green-100 text-green-600' },
  { id: 'moving', name: 'Moving', icon: Truck, color: 'bg-yellow-100 text-yellow-600' },
  { id: 'assembly', name: 'Assembly', icon: Hammer, color: 'bg-purple-100 text-purple-600' },
  { id: 'painting', name: 'Painting', icon: Paintbrush, color: 'bg-pink-100 text-pink-600' },
  { id: 'tech', name: 'Tech Help', icon: Monitor, color: 'bg-gray-100 text-gray-600' },
];

const MOCK_PROS: Pro[] = [
  {
    id: '1',
    name: 'Michael T.',
    category: 'plumbing',
    hourlyRate: 65,
    rating: 4.9,
    jobsCompleted: 142,
    avatar: 'https://i.pravatar.cc/150?u=michael',
    bio: 'Licensed plumber with 10 years of experience. Quick and reliable.'
  },
  {
    id: '2',
    name: 'Sarah J.',
    category: 'cleaning',
    hourlyRate: 40,
    rating: 4.8,
    jobsCompleted: 89,
    avatar: 'https://i.pravatar.cc/150?u=sarah',
    bio: 'Detail-oriented cleaner. I bring all my own eco-friendly supplies.'
  },
  {
    id: '3',
    name: 'David W.',
    category: 'assembly',
    hourlyRate: 45,
    rating: 5.0,
    jobsCompleted: 310,
    avatar: 'https://i.pravatar.cc/150?u=david',
    bio: 'IKEA master. I can build anything without looking at the instructions.'
  },
  {
    id: '4',
    name: 'Jessica R.',
    category: 'moving',
    hourlyRate: 55,
    rating: 4.7,
    jobsCompleted: 56,
    avatar: 'https://i.pravatar.cc/150?u=jessica',
    bio: 'Strong and careful. I have a large van and moving blankets.'
  }
];

export default function LocalServicesView({ initialOrgs }: { initialOrgs?: any[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPro, setSelectedPro] = useState<Pro | null>(null);
  const [bookingStep, setBookingStep] = useState<number>(0);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [jobSize, setJobSize] = useState('medium');

  const filteredPros = selectedCategory 
    ? MOCK_PROS.filter(p => p.category === selectedCategory)
    : MOCK_PROS;

  const handleBook = (pro: Pro) => {
    setSelectedPro(pro);
    setBookingStep(1);
  };

  const confirmBooking = () => {
    setBookingStep(2);
    // In a real app, this would call an API
  };

  const closeBooking = () => {
    setSelectedPro(null);
    setBookingStep(0);
    setBookingDate('');
    setBookingTime('');
    setJobSize('medium');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Local Services</h1>
        <p className="text-gray-500">Hire trusted locals for your everyday tasks.</p>
      </div>

      {/* Categories Grid */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">What do you need help with?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                selectedCategory === cat.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-transparent bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <div className={`p-3 rounded-full mb-3 ${cat.color}`}>
                <cat.icon className="w-6 h-6" />
              </div>
              <span className="font-medium text-sm text-gray-700">{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Pros List */}
      <section>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {selectedCategory ? `Available for ${CATEGORIES.find(c => c.id === selectedCategory)?.name}` : 'Featured Taskers'}
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {filteredPros.map(pro => (
            <div key={pro.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center sm:items-start gap-2">
                <img src={pro.avatar} alt={pro.name} className="w-24 h-24 rounded-full object-cover" />
                <div className="text-center sm:text-left">
                  <div className="text-lg font-bold text-gray-900">{pro.name}</div>
                  <div className="flex items-center justify-center sm:justify-start text-yellow-500 text-sm gap-1">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-medium">{pro.rating}</span>
                    <span className="text-gray-400">({pro.jobsCompleted} jobs)</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md capitalize">
                      {pro.category}
                    </span>
                    <span className="text-xl font-bold text-gray-900">${pro.hourlyRate}<span className="text-sm font-normal text-gray-500">/hr</span></span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">{pro.bio}</p>
                </div>
                
                <button 
                  onClick={() => handleBook(pro)}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Select & Book
                </button>
              </div>
            </div>
          ))}
          {filteredPros.length === 0 && (
            <div className="col-span-2 text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-500">No taskers found for this category right now.</p>
            </div>
          )}
        </div>
      </section>

      {/* Booking Modal */}
      {selectedPro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            {bookingStep === 1 ? (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Book {selectedPro.name}</h3>
                  <button onClick={closeBooking} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input 
                      type="date" 
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input 
                      type="time" 
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Size</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['small', 'medium', 'large'].map(size => (
                        <button
                          key={size}
                          onClick={() => setJobSize(size)}
                          className={`py-2 text-sm capitalize rounded-lg border ${
                            jobSize === size 
                              ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                    <span>Estimated Rate</span>
                    <span className="font-semibold text-gray-900">${selectedPro.hourlyRate}/hr</span>
                  </div>
                  <button 
                    onClick={confirmBooking}
                    disabled={!bookingDate || !bookingTime}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                  >
                    Confirm Booking
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Booking Confirmed!</h3>
                <p className="text-gray-600 mb-6">
                  {selectedPro.name} will arrive on {bookingDate} at {bookingTime}.
                </p>
                <button 
                  onClick={closeBooking}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
