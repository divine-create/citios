'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Building2,
  Compass,
  Info,
  Loader2,
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

export function CalabarAddressPicker({
  initialAddress = '',
  initialLatitude = null,
  initialLongitude = null,
  initialVisualDescription = '',
  onChange,
  showMapPreview = true,
  className = '',
}: CalabarAddressPickerProps) {
  // 1. Unified LGA selection ('calabar-municipal' merges Calabar & Calabar Municipality)
  const [selectedLgaId, setSelectedLgaId] = useState<'calabar-municipal' | 'calabar-south'>('calabar-municipal');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('marian-road');
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string>('');
  const [streetText, setStreetText] = useState<string>(initialAddress || '');
  const [visualNotes, setVisualNotes] = useState<string>(initialVisualDescription || '');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialLatitude && initialLongitude
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : null
  );
  const [gpsLoading, setGpsLoading] = useState(false);
  const [landmarkSearch, setLandmarkSearch] = useState('');

  const tileConfig = useMemo(() => getMapTileConfig(), []);

  // Filter zones by LGA
  const availableZones = useMemo(() => {
    return CALABAR_OPERATIONAL_ZONES.filter((z) => z.lgaId === selectedLgaId);
  }, [selectedLgaId]);

  // Filter landmarks by LGA and search query
  const availableLandmarks = useMemo(() => {
    return searchLocalLandmarks(landmarkSearch, selectedLgaId);
  }, [landmarkSearch, selectedLgaId]);

  // Recalculate stabilized address whenever inputs change
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

  // Notify parent
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

        // Stabilize to find nearest zone & landmark
        const result = stabilizeAddressInput({
          latitude: newCoords.latitude,
          longitude: newCoords.longitude,
          addressText: streetText,
        });

        if (result.lgaId) setSelectedLgaId(result.lgaId);
        if (result.zoneId) setSelectedZoneId(result.zoneId);
        if (result.landmarkId) setSelectedLandmarkId(result.landmarkId);
      },
      (err) => {
        setGpsLoading(false);
        console.warn('GPS capture error:', err.message);
        alert('Could not detect your current GPS location. Please choose a nearby landmark.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [streetText]);

  // Handle landmark select
  const handleSelectLandmark = (landmarkId: string) => {
    setSelectedLandmarkId(landmarkId);
    const landmark = EXPANDED_CALABAR_LANDMARKS.find((l) => l.id === landmarkId);
    if (landmark) {
      const pin = landmark.entrancePin || landmark.center;
      setCoords({ latitude: pin.latitude, longitude: pin.longitude });
      setSelectedZoneId(landmark.zoneId);
      setSelectedLgaId(landmark.lgaId);
    }
  };

  // Map style config
  const mapStyle = useMemo(() => ({
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
  }), [tileConfig]);

  const confidence = currentStabilized.confidenceScore;
  const isHighReady = confidence >= 80;
  const hasLandmark = Boolean(selectedLandmarkId);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Unified LGA / Municipality Selector */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-teal-800" />
            Metropolitan Area
          </span>
          {isHighReady ? (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-1">
              ✓ {confidence}% Delivery Ready
            </span>
          ) : hasLandmark ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200 bg-teal-50 text-teal-800 flex items-center gap-1">
              📍 Landmark Linked
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 flex items-center gap-1">
              📍 Choose landmark below
            </span>
          )}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedLgaId('calabar-municipal');
              const firstZone = CALABAR_OPERATIONAL_ZONES.find((z) => z.lgaId === 'calabar-municipal');
              if (firstZone) setSelectedZoneId(firstZone.id);
            }}
            className={`px-3 py-2.5 rounded-xl text-left border transition-all ${
              selectedLgaId === 'calabar-municipal'
                ? 'bg-teal-50 border-teal-500 text-teal-950 font-black shadow-sm ring-1 ring-teal-500'
                : 'bg-white border-slate-200 text-slate-600 font-bold hover:bg-slate-50'
            }`}
          >
            <p className="text-[13px] leading-tight">Calabar / Municipality</p>
            <p className="text-[10px] text-slate-400 font-medium">Marian, State Housing, Unical, 8 Miles</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedLgaId('calabar-south');
              const firstZone = CALABAR_OPERATIONAL_ZONES.find((z) => z.lgaId === 'calabar-south');
              if (firstZone) setSelectedZoneId(firstZone.id);
            }}
            className={`px-3 py-2.5 rounded-xl text-left border transition-all ${
              selectedLgaId === 'calabar-south'
                ? 'bg-teal-50 border-teal-500 text-teal-950 font-black shadow-sm ring-1 ring-teal-500'
                : 'bg-white border-slate-200 text-slate-600 font-bold hover:bg-slate-50'
            }`}
          >
            <p className="text-[13px] leading-tight">Calabar South</p>
            <p className="text-[10px] text-slate-400 font-medium">Watt Market, Target, Goldie, Anantigha</p>
          </button>
        </div>
      </div>

      {/* 2. Operational Delivery Zone & Nearest Landmark */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
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
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
          >
            {availableZones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.shortName} ({z.name})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Nearest Verified Landmark
            </label>
            <button
              type="button"
              onClick={handleCaptureGps}
              disabled={gpsLoading}
              className="text-[11px] font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
              Pin My GPS
            </button>
          </div>
          <select
            value={selectedLandmarkId}
            onChange={(e) => handleSelectLandmark(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
          >
            <option value="">-- Choose Nearest Landmark / Junction --</option>
            {availableLandmarks.map((l) => (
              <option key={l.id} value={l.id}>
                📍 {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Street Address & Doorstep Visual Cue */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            Street / Compound Details
          </label>
          <input
            type="text"
            value={streetText}
            onChange={(e) => setStreetText(e.target.value)}
            placeholder="e.g. 14 Asari Eso Lane, Off Parliamentary Road"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Doorstep Identifier (Visual Cues for Rider)
          </label>
          <input
            type="text"
            value={visualNotes}
            onChange={(e) => setVisualNotes(e.target.value)}
            placeholder="e.g. Yellow two-storey building, black gate with spike railing"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* 4. OpenStreetMap MapLibre Interactive Pin */}
      {showMapPreview && coords && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>OpenStreetMap Verification Pin</span>
            <span>Tap map to fine-tune exact gate location</span>
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

      {/* 5. Live Address Preview Card */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
        <MapPin className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />
        <div className="text-[12px] leading-relaxed">
          <p className="font-black text-slate-900">{currentStabilized.formattedAddress}</p>
          {currentStabilized.visualDescription && (
            <p className="text-slate-500 text-[11px] mt-0.5">
              <span className="font-bold">Visual Cue:</span> {currentStabilized.visualDescription}
            </p>
          )}
          {currentStabilized.driverNotes && (
            <p className="text-teal-800 text-[11px] font-semibold mt-0.5">
              <span className="font-bold">Courier Tip:</span> {currentStabilized.driverNotes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
