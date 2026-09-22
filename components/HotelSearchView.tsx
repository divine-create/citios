"use client";

import { Calendar, MapPin, Search, Users } from 'lucide-react';

/**
 * Resident Hotel discovery is intentionally database-backed only.
 * The previous hard-coded hotel catalog was removed so demo inventory cannot
 * be presented as real availability. Phase 6 will wire this surface to the
 * canonical HotelOS inventory and availability engine.
 */
export default function HotelSearchView() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="bg-white border rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center border p-3 rounded text-gray-700">
            <MapPin className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-500">Where are you going?</span>
          </div>
          <div className="flex-1 flex items-center border p-3 rounded text-gray-700">
            <Calendar className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-500">Check-in - Check-out</span>
          </div>
          <div className="flex-1 flex items-center border p-3 rounded text-gray-700">
            <Users className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-500">2 adults · 0 children · 1 room</span>
          </div>
          <button type="button" disabled className="bg-gray-300 text-gray-600 font-bold py-3 px-6 rounded flex items-center justify-center cursor-not-allowed">
            <Search className="w-5 h-5 mr-2" />
            Search
          </button>
        </div>
      </div>

      <section className="bg-white border rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Hotel discovery is being connected</h2>
        <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
          No sample hotels or fake availability are shown here. This resident
          marketplace will use real HotelOS organizations, rooms, rates, and
          availability once the marketplace phase is implemented.
        </p>
      </section>
    </div>
  );
}
