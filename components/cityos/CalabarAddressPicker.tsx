'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  Building2,
  Compass,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
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
  scoreAddressConfidence,
  StabilizedAddress,
} from '@/lib/mapping/address-stabilizer';
import { getMapTileConfig } from '@/lib/mapping/config';

interface CalabarAddressPickerProps {
  initialAddress?: string | null;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialVisualDescription?: string | null;
  onChange: (stabilized: StabilizedAddress) => void;
  showMapPreview?: boolean;
  className?: string;
}

// Popular Calabar landmark quick chips for 1-tap anchoring
const POPULAR_LANDMARKS = [
  { id: 'effio-ette-roundabout', label: 'Effio-Ette' },
  { id: 'marian-market', label: 'Marian Market' },
  { id: 'unical-main-gate', label: 'Unical Gate' },
  { id: 'watt-market-roundabout', label: 'Watt Market' },
  { id: 'eight-miles-roundabout', label: '8 Miles' },
  { id: 'transcorp-hotels', label: 'State Housing' },
  { id: 'ucth-teaching-hospital-gate', label: 'UCTH' },
];

export function CalabarAddressPicker({
  initialAddress = '',
  initialLatitude = null,
  initialLongitude = null,
  initialVisualDescription = '',
  onChange,
  showMapPreview = false,
  className = '',
}: CalabarAddressPickerProps) {
  // Primary 2 fields
  const [streetText, setStreetText] = useState<string>(initialAddress || '');
  const [visualNotes, setVisualNotes] = useState<string>(initialVisualDescription || '');

  // Background automated state (inferred from streetText, GPS, or landmark)
  const [selectedLgaId, setSelectedLgaId] = useState<'calabar-municipal' | 'calabar-south'>('calabar-municipal');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('marian-road');
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string>('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialLatitude && initialLongitude
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : null
  );

  // UI state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mapOpen, setMapOpen] = useState(showMapPreview);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const tileConfig = useMemo(() => getMapTileConfig(), []);

  // Live landmark autocomplete suggestions based on what the user types
  const matchingLandmarks = useMemo(() => {
    if (!streetText || streetText.trim().length < 2) return [];
    return searchLocalLandmarks(streetText).slice(0, 5);
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

  // Notify parent of updated stabilized address
  useEffect(() => {
    onChange(currentStabilized);
  }, [currentStabilized, onChange]);

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
        alert('Could not detect your current GPS location. Please type your street or tap a landmark.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [streetText]);

  // Handle selecting a landmark (from suggestions or quick chips)
  const handleSelectLandmark = (landmarkId: string) => {
    const landmark = EXPANDED_CALABAR_LANDMARKS.find((l) => l.id === landmarkId);
    if (!landmark) return;

    setSelectedLandmarkId(landmark.id);
    setSelectedZoneId(landmark.zoneId);
    setSelectedLgaId(landmark.lgaId);

    const pin = landmark.entrancePin || landmark.center;
    setCoords({ latitude: pin.latitude, longitude: pin.longitude });

    // Intelligently append or format the address text
    if (!streetText.trim()) {
      setStreetText(landmark.name);
    } else if (!streetText.toLowerCase().includes(landmark.name.toLowerCase())) {
      setStreetText(`${streetText.trim()}, near ${landmark.name}`);
    }

    setShowSuggestions(false);
  };

  // Map style config
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

  const confidence = currentStabilized.confidenceScore;
  const isHighReady = confidence >= 70;
  const hasLandmark = Boolean(selectedLandmarkId || currentStabilized.landmarkId);

  return (
    <div className={`space-y-3 ${className}`} ref={wrapperRef}>
      {/* ─── FIELD 1: Delivery Address & Nearest Landmark ─── */}
      <div className="space-y-1.5 relative">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-700" />
            <span>Delivery Address & Nearest Landmark</span>
          </label>
          <button
            type="button"
            onClick={handleCaptureGps}
            disabled={gpsLoading}
            className="text-[11px] font-bold text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
          >
            {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin text-teal-800" /> : <Navigation className="w-3 h-3 text-teal-800" />}
            <span>Pin GPS</span>
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={streetText}
            onChange={(e) => {
              setStreetText(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (matchingLandmarks.length > 0) setShowSuggestions(true);
            }}
            placeholder="e.g. 14 Asari Eso Lane, off Parliamentary Road"
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

        {/* Live Landmark Autocomplete Suggestions */}
        {showSuggestions && matchingLandmarks.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100">
            <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Suggested Calabar Landmarks
            </div>
            {matchingLandmarks.map((lm) => (
              <button
                key={lm.id}
                type="button"
                onClick={() => handleSelectLandmark(lm.id)}
                className="w-full px-3.5 py-2.5 text-left hover:bg-teal-50 flex items-start gap-2.5 transition-colors cursor-pointer"
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

        {/* Quick Landmark Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Pin:</span>
          {POPULAR_LANDMARKS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectLandmark(item.id)}
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                selectedLandmarkId === item.id || currentStabilized.landmarkId === item.id
                  ? 'bg-teal-900 text-white border-teal-900 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-900'
              }`}
            >
              📍 {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── FIELD 2: Driver Directions & Doorstep Cues (Optional) ─── */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Driver Directions & Doorstep Cues</span>
          <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
        </label>
        <input
          type="text"
          value={visualNotes}
          onChange={(e) => setVisualNotes(e.target.value)}
          placeholder="e.g. Yellow duplex, black gate opposite pharmacy, call on arrival"
          className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-400 placeholder:font-normal transition-all"
        />
      </div>

      {/* ─── Automatic Location Resolution & Verification Bar ─── */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-teal-800 shrink-0" />
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold text-slate-900 truncate">
              {currentStabilized.zoneName || 'Calabar'}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {currentStabilized.lgaName}
              {currentStabilized.landmarkName && ` · Near ${currentStabilized.landmarkName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isHighReady ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Verified
            </span>
          ) : hasLandmark ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200 bg-teal-50 text-teal-800">
              📍 Linked
            </span>
          ) : null}

          {/* Toggle Map preview */}
          <button
            type="button"
            onClick={() => setMapOpen(!mapOpen)}
            className="text-[11px] font-bold text-slate-600 hover:text-teal-900 bg-white border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {mapOpen ? 'Hide Map' : '🗺 Map'}
          </button>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            title="Adjust Zone or LGA"
            className="text-[11px] font-bold text-slate-500 hover:text-slate-900 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Optional Interactive OpenStreetMap Fine-Tuning ─── */}
      {mapOpen && coords && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Fine-Tune Dropoff Gate</span>
            <span>Tap map to reposition delivery pin</span>
          </div>
          <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative">
            <Map
              initialViewState={{
                latitude: coords.latitude,
                longitude: coords.longitude,
                zoom: 14,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle={mapStyle as any}
              onClick={(e) => {
                setCoords({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
              }}
            >
              <NavigationControl position="top-right" />
              <Marker latitude={coords.latitude} longitude={coords.longitude} color="#0f766e" />
            </Map>
          </div>
        </div>
      )}

      {/* ─── Optional Advanced Overrides (Collapsed by Default) ─── */}
      {showAdvanced && (
        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Manual Area Overrides</span>
            <button
              type="button"
              onClick={() => setShowAdvanced(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                LGA / Municipality
              </label>
              <select
                value={selectedLgaId}
                onChange={(e) => {
                  const newLga = e.target.value as 'calabar-municipal' | 'calabar-south';
                  setSelectedLgaId(newLga);
                  const firstZone = CALABAR_OPERATIONAL_ZONES.find((z) => z.lgaId === newLga);
                  if (firstZone) setSelectedZoneId(firstZone.id);
                }}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[12px] font-bold text-slate-900"
              >
                <option value="calabar-municipal">Calabar Municipal</option>
                <option value="calabar-south">Calabar South</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Operational Zone
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => {
                  setSelectedZoneId(e.target.value);
                  const zone = CALABAR_OPERATIONAL_ZONES.find((z) => z.id === e.target.value);
                  if (zone && !coords) {
                    setCoords({ latitude: zone.center.latitude, longitude: zone.center.longitude });
                  }
                }}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[12px] font-bold text-slate-900"
              >
                {CALABAR_OPERATIONAL_ZONES.filter((z) => z.lgaId === selectedLgaId).map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.shortName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
