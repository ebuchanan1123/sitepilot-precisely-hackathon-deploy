import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { fetchAddressSuggestions } from '../lib/api';
import type { AddressSuggestion, BusinessType, Priority } from '../lib/types';

interface InputPanelProps {
  onSubmit: (
    address: string,
    businessType: BusinessType,
    priorities: Priority[],
    selectedAddress?: AddressSuggestion | null,
  ) => void;
  isLoading: boolean;
  onSaveLocation?: () => void;
  canSaveLocation?: boolean;
  isLocationSaved?: boolean;
}

const BUSINESS_TYPES: Array<{ value: BusinessType; label: string; icon: string }> = [
  { value: 'coffee_shop', label: 'Coffee Shop', icon: '☕' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'bar', label: 'Bar / Pub', icon: '🍺' },
  { value: 'grocery', label: 'Grocery Store', icon: '🛒' },
  { value: 'retail', label: 'Retail Boutique', icon: '🏪' },
  { value: 'clinic', label: 'Medical Clinic', icon: '🏥' },
  { value: 'pharmacy', label: 'Pharmacy', icon: '💊' },
  { value: 'gym', label: 'Fitness Center', icon: '💪' },
  { value: 'salon', label: 'Salon / Spa', icon: '✂️' },
];

const PRIORITIES: Array<{ value: Priority; label: string }> = [
  { value: 'high_foot_traffic', label: 'High Foot Traffic' },
  { value: 'low_competition', label: 'Low Competition' },
  { value: 'family_area', label: 'Family-Heavy Area' },
  { value: 'premium_demographic', label: 'Premium Demographics' },
  { value: 'accessibility', label: 'Strong Accessibility' },
];

export default function InputPanel({
  onSubmit,
  isLoading,
  onSaveLocation,
  canSaveLocation = false,
  isLocationSaved = false,
}: InputPanelProps) {
  const [address, setAddress] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('coffee_shop');
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const togglePriority = (p: Priority) =>
    setPriorities((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  useEffect(() => {
    if (selectedAddress && selectedAddress.formattedAddress === address.trim()) {
      return;
    }

    setSelectedAddress(null);

    const trimmed = address.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      setSuggestionError(null);
      setHasFetchedSuggestions(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setIsSuggesting(true);
        setSuggestionError(null);
        const nextSuggestions = await fetchAddressSuggestions(trimmed);
        setSuggestions(nextSuggestions);
        setShowSuggestions(true);
        setHasFetchedSuggestions(true);
        setHighlightedIndex(nextSuggestions.length > 0 ? 0 : -1);
      } catch (error) {
        setSuggestions([]);
        setShowSuggestions(true);
        setHasFetchedSuggestions(true);
        setSuggestionError((error as Error).message || 'Unable to fetch address suggestions.');
      } finally {
        setIsSuggesting(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [address, selectedAddress]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applySuggestion = (suggestion: AddressSuggestion) => {
    setAddress(suggestion.formattedAddress);
    setSelectedAddress(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleAddressKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault();
      applySuggestion(suggestions[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    onSubmit(address.trim(), businessType, priorities, selectedAddress);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-800">Business Address</label>
          <p className="mt-0.5 text-xs text-gray-500">Enter the address you want to evaluate</p>
          <div ref={containerRef} className="relative mt-2">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleAddressKeyDown}
              placeholder="e.g. 150 Elgin St, Ottawa, ON"
              className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              disabled={isLoading}
            />
            {isSuggesting && (
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-4 w-4 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
            {showSuggestions && (suggestions.length > 0 || suggestionError || (hasFetchedSuggestions && !isSuggesting)) && (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-stone-200 bg-white py-2 shadow-xl shadow-stone-300/40">
                {suggestionError ? (
                  <div className="px-3 py-3 text-sm text-red-300">{suggestionError}</div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.formattedAddress}-${index}`}
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      className={`block w-full px-3 py-2 text-left transition-colors ${
                        highlightedIndex === index ? 'bg-green-50' : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">{suggestion.mainAddressLine}</div>
                      <div className="text-xs text-gray-500">{suggestion.addressLastLine}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm text-gray-500">No Precisely suggestions found for this input yet.</div>
                )}
              </div>
            )}
          </div>
          <p className={`mt-2 text-xs ${selectedAddress ? 'text-emerald-600' : 'text-gray-500'}`}>
            {selectedAddress
              ? 'Using Precisely suggestion for exact map placement.'
              : 'Choose a Precisely suggestion for the most exact location match.'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800">Business Type</label>
          <div className="relative mt-2">
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              disabled={isLoading}
              className="w-full appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-4 pr-9 text-sm text-gray-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:opacity-40"
            >
              {BUSINESS_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value} className="bg-white text-gray-900">
                  {bt.icon} {bt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800">
            Priorities <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <p className="mt-0.5 text-xs text-gray-500">Boost weight on factors that matter most</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePriority(p.value)}
                disabled={isLoading}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  priorities.includes(p.value)
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-stone-200 bg-white text-gray-600 hover:border-stone-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !address.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-green-700 hover:to-green-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing location...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              Evaluate This Location
            </>
          )}
        </button>

        {onSaveLocation ? (
          <button
            type="button"
            onClick={onSaveLocation}
            disabled={!canSaveLocation}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              isLocationSaved
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-stone-200 bg-white text-gray-700 hover:border-stone-300 hover:bg-stone-50'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <svg
              className="h-4 w-4"
              fill={isLocationSaved ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
            {isLocationSaved ? 'Saved location' : 'Save location'}
          </button>
        ) : null}
      </div>
    </form>
  );
}
