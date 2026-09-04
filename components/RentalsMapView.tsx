"use client";

import React, { useState } from 'react';
import { MapPin, Bed, Bath, Square, Heart, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const MOCK_PROPERTIES = [
  {
    id: '1',
    title: 'Luxury Downtown Loft',
    price: '$2,500',
    beds: 2,
    baths: 2,
    sqft: 1200,
    rating: 4.9,
    reviews: 128,
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
    ],
    lat: 40.7128,
    lng: -74.0060,
    address: '123 Main St, Downtown'
  },
  {
    id: '2',
    title: 'Modern Highrise Apartment',
    price: '$3,200',
    beds: 3,
    baths: 2,
    sqft: 1500,
    rating: 4.8,
    reviews: 84,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&q=80'
    ],
    lat: 40.7580,
    lng: -73.9855,
    address: '456 Broadway, Midtown'
  },
  {
    id: '3',
    title: 'Cozy Studio near Park',
    price: '$1,800',
    beds: 1,
    baths: 1,
    sqft: 650,
    rating: 4.7,
    reviews: 210,
    images: [
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7def511?w=800&q=80'
    ],
    lat: 40.7829,
    lng: -73.9654,
    address: '789 Park Ave, Uptown'
  },
  {
    id: '4',
    title: 'Sunny Brooklyn Brownstone',
    price: '$2,800',
    beds: 2,
    baths: 1.5,
    sqft: 1100,
    rating: 4.9,
    reviews: 342,
    images: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'
    ],
    lat: 40.6782,
    lng: -73.9442,
    address: '101 Bedford Ave, Brooklyn'
  }
];

export default function RentalsMapView() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      {/* List View */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto p-4 md:p-6 border-r border-gray-200">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties for Rent</h1>
            <p className="text-gray-500">{MOCK_PROPERTIES.length} homes available</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button className="whitespace-nowrap px-4 py-2 border border-gray-300 rounded-full text-sm font-medium hover:border-gray-400 transition-colors">
              Price
            </button>
            <button className="whitespace-nowrap px-4 py-2 border border-gray-300 rounded-full text-sm font-medium hover:border-gray-400 transition-colors">
              Beds & Baths
            </button>
            <button className="whitespace-nowrap px-4 py-2 border border-gray-300 rounded-full text-sm font-medium hover:border-gray-400 transition-colors">
              Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MOCK_PROPERTIES.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </div>

      {/* Map View */}
      <div className="hidden lg:block w-1/2 h-full bg-gray-100 relative">
        {/* Fake Map Background */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1600&q=80')] bg-cover bg-center opacity-40"></div>
        
        {/* Map Pins */}
        {MOCK_PROPERTIES.map((property, idx) => (
          <div 
            key={property.id} 
            className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 cursor-pointer"
            style={{ 
              top: `${20 + (idx * 20)}%`, 
              left: `${30 + (idx % 2 === 0 ? 10 : 30)}%` 
            }}
          >
            <div className="bg-white px-3 py-1.5 rounded-full shadow-lg font-bold text-sm border border-gray-200 text-gray-900">
              {property.price}
            </div>
            {/* Pin triangle */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
          </div>
        ))}

        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium text-gray-700">
          <MapPin size={16} /> Search as I move the map
        </div>
      </div>
    </div>
  );
}

function PropertyCard({ property }: { property: typeof MOCK_PROPERTIES[0] }) {
  const [imageIndex, setImageIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
  };

  return (
    <div className="group flex flex-col gap-3 cursor-pointer">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
        <img 
          src={property.images[imageIndex]} 
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <button 
          className="absolute top-3 right-3 text-white hover:text-red-500 transition-colors drop-shadow-md"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <Heart size={24} className="hover:fill-current" />
        </button>
        
        {/* Carousel Controls */}
        <div className="absolute inset-y-0 left-0 flex items-center">
          <button 
            onClick={prevImage}
            className="p-1 ml-2 rounded-full bg-white/70 hover:bg-white text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button 
            onClick={nextImage}
            className="p-1 mr-2 rounded-full bg-white/70 hover:bg-white text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Indicators */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {property.images.map((_, idx) => (
            <div 
              key={idx} 
              className={`w-1.5 h-1.5 rounded-full shadow-sm transition-colors ${idx === imageIndex ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{property.price}</h3>
            <p className="text-sm font-medium text-gray-600 truncate max-w-[180px] sm:max-w-[150px] lg:max-w-[200px]">{property.title}</p>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
            <Star size={14} className="fill-current" />
            <span>{property.rating}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
          <div className="flex items-center gap-1">
            <Bed size={16} />
            <span>{property.beds} bds</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath size={16} />
            <span>{property.baths} ba</span>
          </div>
          <div className="flex items-center gap-1">
            <Square size={16} />
            <span>{property.sqft} sqft</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mt-1 truncate">{property.address}</p>
      </div>
    </div>
  );
}
