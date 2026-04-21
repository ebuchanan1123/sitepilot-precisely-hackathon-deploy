import { useMemo, useState } from 'react';
import type { CommercialPropertyType, CommercialSpaceRecommendation, LocationDemographics } from '../lib/types';

interface CommercialSpacesPanelProps {
  listings: CommercialSpaceRecommendation[];
  isLoading: boolean;
  error: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 65) return 'text-lime-600';
  if (score >= 45) return 'text-amber-600';
  return 'text-red-500';
}

function DemographicsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800">{value}</span>
    </div>
  );
}

function ListingCard({ listing }: { listing: CommercialSpaceRecommendation }) {
  const [open, setOpen] = useState(false);
  const d: LocationDemographics | null = listing.demographics;

  return (
    <article className="rounded-xl border border-stone-200 bg-white transition-all hover:border-stone-300">
      {/* Always-visible summary row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 p-4 text-left"
      >
        {/* Score badge */}
        <div className="flex-shrink-0 text-center w-12">
          <p className={`text-2xl font-bold leading-none ${scoreColor(listing.fitScore)}`}>{listing.fitScore}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">fit</p>
        </div>

        {/* Title + address + description */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{listing.title}</h3>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              {listing.propertyType}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-600">{listing.address}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{listing.shortDescription}</p>
        </div>

        {/* Chevron */}
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform mt-1 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable details */}
      {open && (
        <div className="border-t border-stone-100 px-4 pb-4 pt-3 space-y-4">
          {/* Property details */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Property Details</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-stone-100 p-2.5 text-center">
                <p className="text-[10px] text-gray-500">Monthly rent</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">{formatCurrency(listing.askingRentMonthly)}</p>
              </div>
              <div className="rounded-lg bg-stone-100 p-2.5 text-center">
                <p className="text-[10px] text-gray-500">Square feet</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">{listing.squareFeet.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-stone-100 p-2.5 text-center">
                <p className="text-[10px] text-gray-500">Distance</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">{listing.distanceKm.toFixed(1)} km</p>
              </div>
            </div>
            <div className="mt-2 rounded-lg bg-stone-100 p-2.5">
              <p className="text-[10px] text-gray-500">Zoning / use</p>
              <p className="mt-0.5 text-xs font-medium text-gray-800">
                {listing.zoningOrUse}{listing.parkingSpaces !== null ? ` · ${listing.parkingSpaces} parking spaces` : ''}
              </p>
            </div>
          </div>

          {/* Match reasons */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Why it fits</p>
            <ul className="space-y-1.5">
              {listing.matchReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Area Demographics */}
          {d && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Area Demographics</p>
                <span className="rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-green-700">Precisely</span>
              </div>
              <div className="rounded-lg bg-stone-100 px-3 py-1">
                {d.averageHouseholdIncome !== null && (
                  <DemographicsRow label="Avg. household income" value={formatCurrency(d.averageHouseholdIncome)} />
                )}
                {d.population !== null && (
                  <DemographicsRow label="Block group population" value={d.population.toLocaleString()} />
                )}
                {d.averageHomeValue !== null && (
                  <DemographicsRow label="Avg. home value" value={formatCurrency(d.averageHomeValue)} />
                )}
                {d.educationBachelorsPct !== null && (
                  <DemographicsRow label="Bachelor's degree %" value={`${d.educationBachelorsPct.toFixed(1)}%`} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function CommercialSpacesPanel({
  listings,
  isLoading,
  error,
}: CommercialSpacesPanelProps) {
  const [maxRent, setMaxRent] = useState('');
  const [minSquareFeet, setMinSquareFeet] = useState('');
  const [propertyType, setPropertyType] = useState<'Any' | CommercialPropertyType>('Any');

  const propertyTypes = useMemo(
    () => ['Any', ...new Set(listings.map((listing) => listing.propertyType))] as Array<'Any' | CommercialPropertyType>,
    [listings],
  );

  const filteredListings = useMemo(() => {
    const rentLimit = maxRent ? Number(maxRent) : null;
    const sizeFloor = minSquareFeet ? Number(minSquareFeet) : null;

    return listings.filter((listing) => {
      if (rentLimit && listing.askingRentMonthly > rentLimit) return false;
      if (sizeFloor && listing.squareFeet < sizeFloor) return false;
      if (propertyType !== 'Any' && listing.propertyType !== propertyType) return false;
      return true;
    });
  }, [listings, maxRent, minSquareFeet, propertyType]);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-600">
            Available Commercial Spaces Nearby
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-gray-500">
            Commercial listings near the evaluated area, ranked by how well they fit the business type and location priorities.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-gray-600">
            <span className="mb-1 block font-medium uppercase tracking-wide text-gray-500">Max monthly rent</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={maxRent}
              onChange={(event) => setMaxRent(event.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              placeholder="Any"
            />
          </label>
          <label className="text-xs text-gray-600">
            <span className="mb-1 block font-medium uppercase tracking-wide text-gray-500">Min square feet</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={minSquareFeet}
              onChange={(event) => setMinSquareFeet(event.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              placeholder="Any"
            />
          </label>
          <label className="text-xs text-gray-600">
            <span className="mb-1 block font-medium uppercase tracking-wide text-gray-500">Property type</span>
            <select
              value={propertyType}
              onChange={(event) => setPropertyType(event.target.value as 'Any' | CommercialPropertyType)}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              {propertyTypes.map((type) => (
                <option key={type} value={type} className="bg-white text-gray-900">
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 rounded-xl border border-stone-100 bg-stone-50 p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
            <svg className="h-5 w-5 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-700">Finding commercial spaces that fit this concept...</p>
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
          {error}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="mt-6 rounded-xl border border-stone-100 bg-stone-50 p-6 text-center">
          <p className="text-sm font-medium text-gray-700">No commercial spaces match the current filters</p>
          <p className="mt-1 text-xs text-gray-500">Try widening the rent or size filters to see more listings.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </section>
  );
}
