'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getCityMapEntities } from '@/app/actions/org';
import { SectionHead, Pill } from '@/components/cityos/CityUI';
import { MapPin } from 'lucide-react';

interface MapEntity {
  id: string;
  name: string;
  sub: string;
  href: string;
  kind: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export default function CityMap() {
  const [entities, setEntities] = useState<MapEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [bounds, setBounds] = useState<{ n: number, s: number, e: number, w: number } | null>(null);

  useEffect(() => {
    getCityMapEntities().then((data) => {
      setEntities(data.entities as MapEntity[]);
      setLoading(false);
    });
  }, []);

  const validEntities = useMemo(() => {
    return entities.filter(e => {
      if (e.latitude === null || e.longitude === null) return false;
      if (bounds) {
        return e.latitude <= bounds.n && e.latitude >= bounds.s &&
               e.longitude <= bounds.e && e.longitude >= bounds.w;
      }
      return true;
    });
  }, [entities, bounds]);

  if (loading) {
    return (
      <div className="py-20 text-center animate-pulse text-slate-400 font-bold text-sm">
        Loading Map...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <SectionHead title="City Map" sub="Calabar Geographic Context — V1 implementation using open tiles." />
        <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
          <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal-700" /> OpenStreetMap standard tiles</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-3xl overflow-hidden border border-slate-100 bg-white h-[600px] relative">
          <Map
            initialViewState={{
              longitude: 8.335,
              latitude: 4.975,
              zoom: 13,
            }}
            mapStyle={{
              version: 8,
              sources: {
                osm: {
                  type: 'raster',
                  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                  tileSize: 256,
                  attribution: '&copy; OpenStreetMap Contributors'
                }
              },
              layers: [
                {
                  id: 'osm',
                  type: 'raster',
                  source: 'osm',
                  minzoom: 0,
                  maxzoom: 19
                }
              ]
            }}
            onMove={(e) => {
              const b = e.target.getBounds();
              setBounds({
                n: b.getNorth(),
                s: b.getSouth(),
                e: b.getEast(),
                w: b.getWest()
              });
            }}
            onLoad={(e) => {
              const b = e.target.getBounds();
              setBounds({
                n: b.getNorth(),
                s: b.getSouth(),
                e: b.getEast(),
                w: b.getWest()
              });
            }}
          >
            <NavigationControl position="top-right" />
            
            {validEntities.map(e => (
              <Marker 
                key={e.id} 
                longitude={e.longitude!} 
                latitude={e.latitude!} 
                anchor="bottom"
              >
                <Link 
                  href={e.href}
                  className="group relative flex flex-col items-center"
                >
                  <div className="px-2 py-1 bg-white rounded-lg shadow-md border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 whitespace-nowrap z-10 pointer-events-none">
                    <p className="text-xs font-bold text-slate-800">{e.name}</p>
                    <p className="text-[10px] text-slate-500">{e.kind}</p>
                  </div>
                  <div className="w-6 h-6 bg-teal-600 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white cursor-pointer hover:bg-teal-700 transition-colors">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </Marker>
            ))}
          </Map>
        </div>

        <div className="lg:col-span-2 space-y-4 h-[600px] overflow-y-auto pr-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-black text-ink">Calabar</p>
                <p className="text-[11px] font-bold text-slate-400">Cross River State</p>
              </div>
              <Pill tone="teal">{`${validEntities.length} places`}</Pill>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {validEntities.length ? (
              validEntities.map((e) => (
                <Link key={e.id} href={e.href} className="flex items-center gap-3 rounded-xl p-3 hover:bg-teal-50/60 transition-colors bg-white border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{e.name}</p>
                    <p className="text-[11px] text-slate-500 font-medium truncate">{e.sub}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-sm font-bold text-slate-500">No locations found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}