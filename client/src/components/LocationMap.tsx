import { useEffect, useMemo } from 'react';
import L, { type DivIcon, type LatLngExpression } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { AlternativeLocation, CommercialSpaceRecommendation } from '../lib/types';

interface LocationMapProps {
  primaryLocation: {
    address: string;
    lat: number;
    lng: number;
    score: number;
  };
  alternatives: AlternativeLocation[];
  commercialListings?: CommercialSpaceRecommendation[];
}

type MapPoint = {
  id: string;
  address: string;
  lat: number;
  lng: number;
  kind: 'primary' | 'alternative' | 'listing';
  score?: number;
  delta?: number;
  rank?: number;
  title?: string;
  propertyType?: string;
  rent?: number;
  distanceKm?: number;
};

function createPinIcon(kind: MapPoint['kind'], rank?: number): DivIcon {
  const label = kind === 'primary' ? 'P' : kind === 'listing' ? '$' : String(rank ?? '');
  const variantClass = kind === 'primary'
    ? 'map-pin--primary'
    : kind === 'listing'
      ? 'map-pin--listing'
      : 'map-pin--alternative';

  return L.divIcon({
    className: '',
    html: `
      <div class="map-pin ${variantClass}">
        <span class="map-pin__label">${label}</span>
      </div>
    `,
    iconSize: [34, 46],
    iconAnchor: [17, 42],
    popupAnchor: [0, -36],
  });
}

function FitToMarkers({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [36, 36], animate: true, maxZoom: 15 });
  }, [map, points]);

  return null;
}

function formatRent(value: number | undefined): string | null {
  if (typeof value !== 'number') return null;
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function LocationMap({ primaryLocation, alternatives, commercialListings = [] }: LocationMapProps) {
  const points = useMemo<MapPoint[]>(
    () => [
      {
        id: 'primary',
        address: primaryLocation.address,
        lat: primaryLocation.lat,
        lng: primaryLocation.lng,
        score: primaryLocation.score,
        kind: 'primary',
      },
      ...alternatives.map((alternative, index) => ({
        id: `${alternative.lat}-${alternative.lng}-${index}`,
        address: alternative.address,
        lat: alternative.lat,
        lng: alternative.lng,
        score: alternative.score,
        kind: 'alternative' as const,
        delta: alternative.delta,
        rank: index + 1,
      })),
      ...commercialListings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        address: listing.address,
        lat: listing.lat,
        lng: listing.lng,
        score: listing.fitScore,
        kind: 'listing' as const,
        propertyType: listing.propertyType,
        rent: listing.askingRentMonthly,
        distanceKm: listing.distanceKm,
      })),
    ],
    [alternatives, commercialListings, primaryLocation.address, primaryLocation.lat, primaryLocation.lng, primaryLocation.score],
  );

  const center: LatLngExpression = [primaryLocation.lat, primaryLocation.lng];

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-600">Location Map</h2>
          <p className="mt-1 text-xs text-gray-500">
            Proposed site and nearby alternatives plotted from the evaluation coordinates
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-gray-700">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Proposed
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-gray-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Alternatives
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-gray-700">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Commercial spaces
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200">
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom={true}
          className="h-[360px] w-full bg-stone-100"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToMarkers points={points} />

          {points.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={createPinIcon(point.kind, point.rank)}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{point.address}</p>
                  <p className="text-xs text-slate-600">
                    {point.kind === 'primary'
                      ? 'Proposed location'
                      : point.kind === 'listing'
                        ? point.title ?? 'Commercial space'
                        : `Alternative #${point.rank}`}
                  </p>
                  {typeof point.score === 'number' ? (
                    <p className="text-xs font-medium text-slate-700">
                      {point.kind === 'listing' ? 'Fit score' : 'Score'}: {point.score}/100
                    </p>
                  ) : null}
                  {point.kind === 'alternative' && typeof point.delta === 'number' ? (
                    <p className="text-xs font-medium text-emerald-700">+{point.delta} vs proposed site</p>
                  ) : null}
                  {point.kind === 'listing' ? (
                    <div className="space-y-1">
                      {point.propertyType ? (
                        <p className="text-xs font-medium text-slate-700">{point.propertyType}</p>
                      ) : null}
                      {formatRent(point.rent) ? (
                        <p className="text-xs text-slate-700">{formatRent(point.rent)}/month</p>
                      ) : null}
                      {typeof point.distanceKm === 'number' ? (
                        <p className="text-xs text-slate-600">{point.distanceKm.toFixed(1)} km away</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}
