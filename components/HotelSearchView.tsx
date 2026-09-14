"use client";

import React, { useState } from 'react';
import { Calendar, Users, MapPin, Search, Star, Coffee, Wifi, Check, AlertCircle } from 'lucide-react';

// Mock data
const mockHotels = [
  {
    id: 'h1',
    name: 'Grand City Hotel',
    location: 'Downtown, City Center',
    rating: 4.8,
    reviews: 1245,
    stars: 5,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    scarcity: 'Only 2 rooms left at this price!',
    description: 'Luxury hotel located in the heart of the city with stunning views.',
    rooms: [
      {
        id: 'r1',
        type: 'Standard Double Room',
        size: '25 m²',
        beds: '1 large double bed',
        options: [
          {
            id: 'o1',
            name: 'Room Only',
            features: ['Non-refundable', 'Pay in advance'],
            price: 150,
            scarcity: null,
          },
          {
            id: 'o2',
            name: 'Breakfast Included',
            features: ['Free cancellation before Aug 30', 'No prepayment needed'],
            price: 180,
            scarcity: 'In high demand!',
          }
        ]
      },
      {
        id: 'r2',
        type: 'Deluxe Suite',
        size: '45 m²',
        beds: '1 extra-large double bed',
        options: [
          {
            id: 'o3',
            name: 'Breakfast Included',
            features: ['Free cancellation before Aug 30', 'Pay at property'],
            price: 280,
            scarcity: 'Only 1 left on our site',
          }
        ]
      }
    ]
  },
  {
    id: 'h2',
    name: 'Boutique Urban Lodge',
    location: 'Arts District',
    rating: 4.5,
    reviews: 832,
    stars: 4,
    image: 'https://images.unsplash.com/photo-1551882547-ff40c0dfe097?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    scarcity: null,
    description: 'Chic and modern lodge close to museums and galleries.',
    rooms: [
      {
        id: 'r3',
        type: 'Compact Room',
        size: '18 m²',
        beds: '1 double bed',
        options: [
          {
            id: 'o4',
            name: 'Room Only',
            features: ['Non-refundable'],
            price: 110,
            scarcity: 'Only 3 left',
          }
        ]
      }
    ]
  }
];

export default function HotelSearchView() {
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would filter results
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Search Bar (Booking.com style) */}
      <div className="bg-yellow-400 p-4 rounded-lg shadow-lg">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center bg-white p-3 rounded text-gray-700">
            <MapPin className="w-5 h-5 text-gray-400 mr-2" />
            <input type="text" placeholder="Where are you going?" className="w-full outline-none bg-transparent" />
          </div>
          <div className="flex-1 flex items-center bg-white p-3 rounded text-gray-700">
            <Calendar className="w-5 h-5 text-gray-400 mr-2" />
            <input type="text" placeholder="Check-in - Check-out" className="w-full outline-none bg-transparent" />
          </div>
          <div className="flex-1 flex items-center bg-white p-3 rounded text-gray-700">
            <Users className="w-5 h-5 text-gray-400 mr-2" />
            <input type="text" placeholder="2 adults · 0 children · 1 room" className="w-full outline-none bg-transparent" />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded transition-colors flex items-center justify-center">
            <Search className="w-5 h-5 mr-2" />
            Search
          </button>
        </form>
      </div>

      {/* Results / Room Selection */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Available Hotels</h2>
        
        {mockHotels.map(hotel => (
          <div key={hotel.id} className="bg-white border rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="flex flex-col md:flex-row p-4 gap-4">
              {/* Hotel Image */}
              <div className="w-full md:w-64 h-48 flex-shrink-0">
                <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover rounded-md" />
              </div>
              
              {/* Hotel Info */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 mb-1 text-yellow-500">
                    {[...Array(hotel.stars)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <h3 className="text-xl font-bold text-blue-600 hover:underline cursor-pointer" onClick={() => setSelectedHotel(selectedHotel === hotel.id ? null : hotel.id)}>
                    {hotel.name}
                  </h3>
                  <div className="flex items-center text-sm text-blue-600 mb-2 hover:underline cursor-pointer">
                    <MapPin className="w-4 h-4 mr-1" />
                    {hotel.location}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {hotel.description}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-4">
                    <span className="flex items-center bg-gray-100 px-2 py-1 rounded"><Wifi className="w-3 h-3 mr-1" /> Free WiFi</span>
                    <span className="flex items-center bg-gray-100 px-2 py-1 rounded"><Coffee className="w-3 h-3 mr-1" /> Restaurant</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="flex items-center">
                    <div className="bg-blue-800 text-white font-bold rounded-t rounded-br px-2 py-1 mr-2 text-sm">
                      {hotel.rating}
                    </div>
                    <span className="text-sm text-gray-600">{hotel.reviews} reviews</span>
                  </div>
                  <button 
                    onClick={() => setSelectedHotel(selectedHotel === hotel.id ? null : hotel.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-semibold"
                  >
                    {selectedHotel === hotel.id ? 'Hide Rooms' : 'See Availability'}
                  </button>
                </div>
              </div>
            </div>

            {/* Room Selection Matrix */}
            {selectedHotel === hotel.id && (
              <div className="border-t bg-gray-50 p-4 overflow-x-auto">
                {hotel.scarcity && (
                  <div className="mb-4 bg-red-50 text-red-700 p-3 rounded flex items-center border border-red-200">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span className="font-semibold">{hotel.scarcity}</span>
                  </div>
                )}
                
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden text-sm min-w-[600px]">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="p-3 border-r border-blue-500 w-1/3">Room Type</th>
                      <th className="p-3 border-r border-blue-500 w-1/3">Choices</th>
                      <th className="p-3 w-1/3">Price & Booking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotel.rooms.map((room, rIdx) => (
                      <React.Fragment key={room.id}>
                        {room.options.map((option, oIdx) => (
                          <tr key={option.id} className="border-b border-gray-200 hover:bg-gray-50">
                            {oIdx === 0 && (
                              <td rowSpan={room.options.length} className="p-3 border-r border-gray-200 align-top bg-white">
                                <div className="font-bold text-blue-600 text-base mb-1 hover:underline cursor-pointer">{room.type}</div>
                                <div className="text-gray-600 mb-2">{room.beds}</div>
                                <div className="text-gray-500 text-xs">{room.size}</div>
                              </td>
                            )}
                            <td className="p-3 border-r border-gray-200 align-top">
                              <div className="font-semibold mb-2">{option.name}</div>
                              <ul className="space-y-1">
                                {option.features.map((feature, fIdx) => (
                                  <li key={fIdx} className="flex items-start text-green-700">
                                    <Check className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="p-3 align-top">
                              <div className="text-xl font-bold text-gray-900 mb-1">${option.price}</div>
                              <div className="text-xs text-gray-500 mb-2">Includes taxes and charges</div>
                              {option.scarcity && (
                                <div className="text-xs font-bold text-red-600 mb-3">{option.scarcity}</div>
                              )}
                              <button className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors">
                                Reserve
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
