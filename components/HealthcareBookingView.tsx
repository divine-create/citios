'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, Calendar, Clock, ShieldCheck, Globe, Stethoscope, Activity, Sun, Brain, Eye } from 'lucide-react';
import { getHealthcareSpecialties, searchHealthcareProviders, bookAppointment } from '@/lib/actions/healthcare';

export default function HealthcareBookingView() {
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const specs = await getHealthcareSpecialties();
      setSpecialties(specs);
      const provs = await searchHealthcareProviders();
      setProviders(provs);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    const provs = await searchHealthcareProviders(searchQuery, selectedSpecialty || undefined);
    setProviders(provs);
    setLoading(false);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Stethoscope': return <Stethoscope className="w-6 h-6" />;
      case 'Activity': return <Activity className="w-6 h-6" />;
      case 'Sun': return <Sun className="w-6 h-6" />;
      case 'Brain': return <Brain className="w-6 h-6" />;
      case 'Eye': return <Eye className="w-6 h-6" />;
      default: return <Stethoscope className="w-6 h-6" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      {/* Search Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Find and book a doctor</h1>
        <p className="text-lg text-gray-600">Verified reviews. Real-time availability.</p>
        
        <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row gap-4 max-w-3xl mx-auto border border-gray-100">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Condition, procedure, or doctor name"
              className="w-full pl-10 pr-4 py-2 border-b md:border-b-0 md:border-r border-gray-200 focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="City, state, or zip"
              className="w-full pl-10 pr-4 py-2 focus:outline-none"
              defaultValue="New York, NY"
            />
          </div>
          <button 
            onClick={handleSearch}
            className="bg-blue-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Specialties */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Top Specialties</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {specialties.map(spec => (
            <button
              key={spec.id}
              onClick={() => {
                setSelectedSpecialty(selectedSpecialty === spec.name ? null : spec.name);
                handleSearch();
              }}
              className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 border transition-colors ${
                selectedSpecialty === spec.name 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'
              }`}
            >
              <div className={selectedSpecialty === spec.name ? 'text-blue-600' : 'text-gray-600'}>
                {getIcon(spec.icon)}
              </div>
              <span className="text-sm font-medium">{spec.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Provider Results */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Available Providers</h2>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading providers...</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No providers found.</div>
        ) : (
          <div className="space-y-6">
            {providers.map(provider => (
              <div key={provider.id} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col lg:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow">
                
                {/* Provider Info */}
                <div className="flex-1 flex gap-4">
                  <img src={provider.imageUrl} alt={provider.name} className="w-24 h-24 rounded-full object-cover border border-gray-200" />
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 hover:text-blue-600 cursor-pointer">{provider.name}</h3>
                      <p className="text-gray-600">{provider.specialty}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{provider.rating}</span>
                      <span className="text-gray-500 hover:underline cursor-pointer">({provider.reviews} reviews)</span>
                    </div>
                    <div className="space-y-1 mt-3">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{provider.location}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{provider.certifications.join(', ')}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <Globe className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Speaks {provider.languages.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Availability Slots */}
                <div className="lg:w-1/2">
                  <div className="bg-gray-50 p-4 rounded-xl space-y-4 h-full">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <span className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4"/> Schedule</span>
                      <span className="text-sm text-blue-600 font-medium">Next: {provider.nextAvailable}</span>
                    </div>
                    
                    <div className="space-y-4">
                      {provider.availability.map((day: any, i: number) => (
                        <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                          <span className="w-24 text-sm font-medium text-gray-700">{day.date}</span>
                          <div className="flex flex-wrap gap-2">
                            {day.slots.map((slot: string, j: number) => (
                              <button 
                                key={j}
                                onClick={() => bookAppointment(provider.id, day.date, slot, 'General Visit')}
                                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white rounded-md font-medium transition-colors"
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <button className="w-full py-2 text-sm text-blue-600 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors mt-4">
                      See more availability
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
