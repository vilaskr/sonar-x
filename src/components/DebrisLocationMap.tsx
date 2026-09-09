import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { SonarAnalysisResult, SurveyLocation } from '../types';
import { MapPin, Navigation, Compass, Info } from 'lucide-react';

interface DebrisLocationMapProps {
  analysisResult: SonarAnalysisResult | null;
  location: SurveyLocation | null;
  onLocationChange: (location: SurveyLocation) => void;
}

// NIOT survey coordinates off the coast of Chennai (Bay of Bengal)
const DEMO_LAT = 13.0878;
const DEMO_LNG = 80.2985;

export const DebrisLocationMap: React.FC<DebrisLocationMapProps> = ({
  analysisResult,
  location,
  onLocationChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [inputLat, setInputLat] = useState<string>(
    location ? location.latitude.toString() : DEMO_LAT.toString()
  );
  const [inputLng, setInputLng] = useState<string>(
    location ? location.longitude.toString() : DEMO_LNG.toString()
  );
  const [inputError, setInputError] = useState<string | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = location?.latitude ?? DEMO_LAT;
    const initialLng = location?.longitude ?? DEMO_LNG;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 11,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update or create marker when location or analysis changes
  useEffect(() => {
    if (!mapInstanceRef.current || !location) return;

    const map = mapInstanceRef.current;
    const { latitude, longitude } = location;

    // Custom marker icon with pulsed sonar radar beacon style
    const iconHtml = `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(239, 68, 68, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #ef4444; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'sonarx-map-marker',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      markerRef.current = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
    }

    const objectName = analysisResult?.objectType || 'Potential Underwater Anomaly';
    const severity = analysisResult?.severity || 'HIGH';
    const confidence = analysisResult ? `${Math.round(analysisResult.confidence * 100)}%` : '89%';

    const popupContent = `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; line-height: 1.4; color: #0f172a; min-width: 190px; padding: 2px;">
        <div style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.05em; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
          SONARX DETECTION
        </div>
        <div style="margin-top: 4px;"><span style="color: #64748b; font-size: 11px;">Object:</span> <strong style="color: #0f172a;">${objectName}</strong></div>
        <div><span style="color: #64748b; font-size: 11px;">Severity:</span> <strong style="color: ${severity === 'HIGH' ? '#dc2626' : severity === 'MEDIUM' ? '#d97706' : '#16a34a'};">${severity}</strong></div>
        <div><span style="color: #64748b; font-size: 11px;">Confidence:</span> <strong style="color: #1e40af;">${confidence}</strong></div>
        <div style="margin-top: 6px; font-size: 11px; color: #64748b; background: #f1f5f9; padding: 4px 6px; border-radius: 4px;">
          Pos: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E
        </div>
      </div>
    `;

    markerRef.current.bindPopup(popupContent).openPopup();
    map.setView([latitude, longitude], 12);
  }, [location, analysisResult]);

  const handleApplyLocation = () => {
    setInputError(null);
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setInputError('Please enter a valid latitude between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setInputError('Please enter a valid longitude between -180 and 180.');
      return;
    }

    onLocationChange({
      latitude: lat,
      longitude: lng,
      source: 'Manual Survey Input',
    });
  };

  const handleUseDemoLocation = () => {
    setInputError(null);
    setInputLat(DEMO_LAT.toString());
    setInputLng(DEMO_LNG.toString());
    onLocationChange({
      latitude: DEMO_LAT,
      longitude: DEMO_LNG,
      source: 'Demo Survey Coordinates',
      label: 'Bay of Bengal Survey Sector 4',
    });
  };

  return (
    <div id="debris-location-section" className="border border-slate-200 bg-white rounded-lg p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">4. DEBRIS LOCATION</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic survey coordinates associated with the acoustic anomaly observation.
          </p>
        </div>

        {location && (
          <div className="inline-flex items-center gap-2 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded border border-slate-200">
            <Navigation className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-mono font-medium">
              {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600 font-semibold">{location.source}</span>
          </div>
        )}
      </div>

      {/* Coordinate Input Controls */}
      <div className="my-5 bg-slate-50 p-4 rounded-md border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label htmlFor="survey-latitude-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Survey Latitude (°N)
            </label>
            <input
              id="survey-latitude-input"
              type="text"
              value={inputLat}
              onChange={(e) => setInputLat(e.target.value)}
              placeholder="e.g. 13.0878"
              className="w-full text-sm font-mono px-3 py-2 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="survey-longitude-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Survey Longitude (°E)
            </label>
            <input
              id="survey-longitude-input"
              type="text"
              value={inputLng}
              onChange={(e) => setInputLng(e.target.value)}
              placeholder="e.g. 80.2985"
              className="w-full text-sm font-mono px-3 py-2 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 text-slate-900"
            />
          </div>

          <div className="flex gap-2">
            <button
              id="mark-location-btn"
              type="button"
              onClick={handleApplyLocation}
              className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              Mark Location
            </button>
          </div>

          <div>
            <button
              id="use-demo-location-btn"
              type="button"
              onClick={handleUseDemoLocation}
              className="w-full px-4 py-2 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-sky-700" />
              Use Demo Location
            </button>
          </div>
        </div>

        {inputError && <p className="text-xs text-red-600 mt-2 font-medium">{inputError}</p>}
      </div>

      {/* Leaflet Map Canvas */}
      <div className="relative rounded-md overflow-hidden border border-slate-300 shadow-inner">
        <div
          ref={mapContainerRef}
          id="debris-leaflet-map"
          className="w-full h-80 z-0"
          style={{ minHeight: '320px' }}
        />
      </div>

      {/* Mandatory Engineering Note */}
      <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-slate-700">Prototype location note:</span> In the production system,
          coordinates would be obtained automatically from sonar navigation / NMEA survey metadata.
        </p>
      </div>
    </div>
  );
};
