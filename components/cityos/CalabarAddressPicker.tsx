'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  Building2,
  Loader2,
  SlidersHorizontal,
  X,
  Search,
  Check,
  Edit3,
} from 'lucide-react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  CALABAR_OPERATIONAL_ZONES,
  CALABAR_ADMINISTRATIVE_LGAS,
} from '@/lib/mapping/calabar-coverage';
import {
  EXPANDED_CALABAR_LANDMARKS,
  searchLocalLandmarks,
  stabilizeAddressInput,
  StabilizedAddress,
} from '@/lib/mapping/address-stabilizer';
import { getMapTileConfig } from '@/lib/mapping/config';

const STORAGE_KEY = 'cityos_chowdeck_delivery_address';

interface CalabarAddressPickerProps {
  initialAddress?: string | null;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialVisualDescription?: string | null;
  onChange: (stabilized: StabilizedAddress) => void;
  showMapPreview?: boolean;
  className?: string;
}

export function CalabarAddressPicker({
  initialAddress = '',
  initialLatitude = null,
  initialLongitude = null,
  initialVisualDescription = '',
  onChange,
  showMapPreview = false,
  className = '',
}: CalabarAddressPickerProps) {
  // Primary 2 fields (Chowdeck Option A)
  const [streetText, setStreetText] = useState<string>(initialAddress || '');
  const [visualNotes, setVisualNotes] = useState<string>(initialVisualDescription || '');

  // Spatial metadata
  const [selectedLgaId, setSelectedLgaId] = useState<'calabar-municipal' | 'calabar-south'>('calabar-municipal');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('marian-road');
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string>('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialLatitude && initialLongitude
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : null
  );

  // UI States
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [tempCoords, setTempCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(!initialAddress);
  const [hasLoadedSaved, setHasLoadedSaved] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tileConfig = useMemo(() => getMapTileConfig(), []);

  // 1. Chowdeck-style Saved Address Memory (Load on first mount)
  useEffect(() => {
    if (hasLoadedSaved) return;
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (savedRaw && !initialAddress) {
        const saved = JSON.parse(savedRaw);
        if (saved.streetText) {
          setStreetText(saved.streetText);
          setVisualNotes(saved.visualNotes || '');
          if (saved.latitude && saved.longitude) {
            setCoords({ latitude: saved.latitude, longitude: saved.longitude });
          }
          if (saved.landmarkId) setSelectedLandmarkId(saved.landmarkId);
          if (saved.zoneId) setSelectedZoneId(saved.zoneId);
          if (saved.lgaId) setSelectedLgaId(saved.lgaId);
          setIsEditing(false); // Display collapsed summary card
        }
      }
    } catch (e) {
      console.warn('Could not read saved address from localStorage:', e);
    }
    setHasLoadedSaved(true);
  }, [hasLoadedSaved, initialAddress]);

  // Live landmark autocomplete suggestions based on what the user types
  const matchingLandmarks = useMemo(() => {
    if (!streetText || streetText.trim().length < 2) return [];
    return searchLocalLandmarks(streetText).slice(0, 6);
  }, [streetText]);

  // Close suggestion dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Stabilize address automatically whenever primary fields or coordinates change
  const currentStabilized = useMemo(() => {
    return stabilizeAddressInput({
      addressText: streetText,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      landmarkId: selectedLandmarkId || null,
      zoneId: selectedZoneId,
      lgaId: selectedLgaId,
      visualDescription: visualNotes,
    });
  }, [streetText, coords, selectedLandmarkId, selectedZoneId, selectedLgaId, visualNotes]);

  // Keep internal zone & LGA in sync with stabilized resolution
  useEffect(() => {
    if (currentStabilized.zoneId && currentStabilized.zoneId !== selectedZoneId) {
      setSelectedZoneId(currentStabilized.zoneId);
    }
    if (currentStabilized.lgaId && currentStabilized.lgaId !== selectedLgaId) {
      setSelectedLgaId(currentStabilized.lgaId);
    }
    if (currentStabilized.landmarkId && currentStabilized.landmarkId !== selectedLandmarkId) {
      setSelectedLandmarkId(currentStabilized.landmarkId);
    }
  }, [currentStabilized.zoneId, currentStabilized.lgaId, currentStabilized.landmarkId]);

  // Notify parent and persist to localStorage
  useEffect(() => {
    onChange(currentStabilized);
    if (streetText.trim().length > 3) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            streetText,
            visualNotes,
            latitude: currentStabilized.latitude,
            longitude: currentStabilized.longitude,
            landmarkId: currentStabilized.landmarkId,
            zoneId: currentStabilized.zoneId,
            lgaId: currentStabilized.lgaId,
            formattedAddress: currentStabilized.formattedAddress,
          })
        );
      } catch (e) {
        // Ignore quota/private browsing errors
      }
    }
  }, [currentStabilized, onChange, streetText, visualNotes]);

  // Handle GPS location capture
  const handleCaptureGps = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const newCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setCoords(newCoords);

        // Stabilize to find nearest zone & landmark in Calabar
        const result = stabilizeAddressInput({
          latitude: newCoords.latitude,
          longitude: newCoords.longitude,
          addressText: streetText,
        });

        if (result.lgaId) setSelectedLgaId(result.lgaId);
        if (result.zoneId) setSelectedZoneId(result.zoneId);
        if (result.landmarkId) {
          setSelectedLandmarkId(result.landmarkId);
          if (!streetText.trim()) {
            setStreetText(`Near ${result.landmarkName || 'Landmark'}`);
          }
        }
      },
      (err) => {
        setGpsLoading(false);
        console.warn('GPS capture error:', err.message);
        alert('Could not detect your current GPS location. Please type your street or nearest landmark.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [streetText]);

  // Handle selecting a landmark suggestion
  const handleSelectLandmark = (landmark: (typeof EXPANDED_CALABAR_LANDMARKS)[0]) => {
    setSelectedLandmarkId(landmark.id);
    setSelectedZoneId(landmark.zoneId);
    setSelectedLgaId(landmark.lgaId);

    const pin = landmark.entrancePin || landmark.center;
    setCoords({ latitude: pin.latitude, longitude: pin.longitude });

    if (!streetText.trim()) {
      setStreetText(landmark.name);
    } else if (!streetText.toLowerCase().includes(landmark.name.toLowerCase())) {
      setStreetText(`${streetText.trim()}, near ${landmark.name}`);
    }

    setShowSuggestions(false);
  };

  // Open "Confirm Pin on Map" modal
  const handleOpenMapModal = () => {
    setTempCoords(coords || { latitude: currentStabilized.latitude, longitude: currentStabilized.longitude });
    setMapModalOpen(true);
  };

  const handleConfirmMapPin = () => {
    if (tempCoords) {
      setCoords(tempCoords);
    }
    setMapModalOpen(false);
  };

  // MapLibre raster style config
  const mapStyle = useMemo(
    () => ({
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [tileConfig.tileUrl],
          tileSize: 256,
          attribution: tileConfig.attribution,
        },
      },
      layers: [
        {
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    }),
    [tileConfig]
  );

  return (
    <div className={`space-y-3 ${className}`} ref={wrapperRef}>
      {/* ─── Chowdeck Saved Address Card (Fast 1-Tap Reorder) ─── */}
      {!isEditing && streetText ? (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex items-start justify-between gap-3 transition-all">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-emerald-800" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Delivery Destination
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {currentStabilized.zoneName} · {currentStabilized.lgaName}
                </span>
              </div>
              <p className="text-[13px] font-black text-slate-900 mt-1 leading-snug">
                {currentStabilized.formattedAddress}
              </p>
              {visualNotes && (
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
                  <span className="font-bold text-slate-700">Doorstep:</span> {visualNotes}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="text-[11px] font-black text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-full flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
            <span>Change</span>
          </button>
        </div>
      ) : (
        /* ─── Chowdeck Option A: Clean 2-Field Address Form ─── */
        <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
          {/* FIELD 1: Street, Landmark, or Junction Search */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-extrabold text-slate-800 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-teal-700" />
                <span>Delivery Address & Landmark</span>
              </label>

              {/* Chowdeck-style "Use Current Location" button */}
              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={gpsLoading}
                className="text-[11px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                {gpsLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-teal-800" />
                ) : (
                  <Navigation className="w-3 h-3 text-teal-800" />
                )}
                <span>Use Current Location</span>
              </button>
            </div>

            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={streetText}
                onChange={(e) => {
                  setStreetText(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (matchingLandmarks.length > 0) setShowSuggestions(true);
                }}
                placeholder="Type street, plaza, or landmark (e.g. Asari Eso, Rabana, Unical)"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-400 placeholder:font-normal transition-all"
              />
              {streetText && (
                <button
                  type="button"
                  onClick={() => {
                    setStreetText('');
                    setSelectedLandmarkId('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Instant Calabar Landmark Autocomplete Dropdown */}
            {showSuggestions && matchingLandmarks.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Suggested Calabar Landmarks</span>
                  <span className="text-teal-800 font-extrabold">{matchingLandmarks.length} found</span>
                </div>
                {matchingLandmarks.map((lm) => (
                  <button
                    key={lm.id}
                    type="button"
                    onClick={() => handleSelectLandmark(lm)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-teal-50/80 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-900 truncate">{lm.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {lm.zoneId} · {lm.lgaId === 'calabar-municipal' ? 'Calabar Municipal' : 'Calabar South'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* FIELD 2: Doorstep & Rider Instructions */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-extrabold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Apartment / Compound & Rider Instructions</span>
              <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={visualNotes}
              onChange={(e) => setVisualNotes(e.target.value)}
              placeholder="e.g. Yellow duplex, black gate opposite pharmacy, call on arrival"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-400 placeholder:font-normal transition-all"
            />
          </div>

          {/* Chowdeck-style Status Bar with "Adjust Pin on Map" Action */}
          <div className="pt-1 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0 text-slate-500 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-bold text-slate-800 truncate">
                {currentStabilized.zoneName || 'Calabar'}
              </span>
              <span className="text-slate-400 truncate">· {currentStabilized.lgaName}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenMapModal}
                className="text-[11px] font-extrabold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <MapPin className="w-3 h-3 text-teal-800" />
                <span>Adjust Pin</span>
              </button>

              {streetText && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-1 transition-colors cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Chowdeck "Confirm Pin on Map" Bottom Sheet / Modal ─── */}
      {mapModalOpen && tempCoords && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Confirm Pin Location</h3>
                <p className="text-[11px] text-slate-500">Tap anywhere on the map to place your delivery pin</p>
              </div>
              <button
                type="button"
                onClick={() => setMapModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Map Canvas */}
            <div className="w-full h-72 sm:h-80 relative bg-slate-100">
              <Map
                initialViewState={{
                  latitude: tempCoords.latitude,
                  longitude: tempCoords.longitude,
                  zoom: 15,
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle={mapStyle as any}
                onClick={(e) => {
                  setTempCoords({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
                }}
              >
                <NavigationControl position="top-right" />
                <Marker latitude={tempCoords.latitude} longitude={tempCoords.longitude} color="#0f766e" />
              </Map>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Selected Coordinates</p>
                <p className="text-[12px] font-extrabold text-slate-800 truncate">
                  {tempCoords.latitude.toFixed(4)}, {tempCoords.longitude.toFixed(4)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleConfirmMapPin}
                className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-[12px] font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Pin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
