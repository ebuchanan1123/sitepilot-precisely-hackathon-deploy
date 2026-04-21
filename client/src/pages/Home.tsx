import { useState } from 'react';
import InputPanel from '../components/InputPanel';
import ResultsSummary from '../components/ResultsSummary';
import ScoreBreakdown from '../components/ScoreBreakdown';
import StrengthsConcerns from '../components/StrengthsConcerns';
import AISummary from '../components/AISummary';
import LocationMap from '../components/LocationMap';
import CommercialSpacesPanel from '../components/CommercialSpacesPanel';
import SearchHistory from '../components/SearchHistory';
import DecisionHighlights from '../components/DecisionHighlights';
import { evaluateSite, fetchRealEstateMatches } from '../lib/api';
import { downloadPdfReport } from '../lib/report';
import { useSearchHistory } from '../lib/searchHistory';
import type {
  AddressSuggestion,
  BusinessType,
  CommercialSpaceRecommendation,
  EvaluateResponse,
  Priority,
} from '../lib/types';

export default function Home() {
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [commercialSpaces, setCommercialSpaces] = useState<CommercialSpaceRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCommercialSpaces, setIsLoadingCommercialSpaces] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commercialSpacesError, setCommercialSpacesError] = useState<string | null>(null);

  const { history, addEntry, removeEntry, clearHistory, toggleSave } = useSearchHistory();
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const currentEntry = history.find((entry) => entry.id === currentEntryId);

  const handleDownloadReport = () => {
    if (!result) return;

    downloadPdfReport({
      result,
      commercialSpaces,
    });
  };

  const handleSubmit = async (
    address: string,
    businessType: BusinessType,
    priorities: Priority[],
    selectedAddress?: AddressSuggestion | null,
  ) => {
    setError(null);
    setCommercialSpaces([]);
    setCommercialSpacesError(null);
    setIsLoading(true);
    setIsLoadingCommercialSpaces(false);
    setResult(null);
    setCurrentEntryId(null);
    try {
      const data = await evaluateSite({ address, businessType, priorities, selectedAddress });
      setResult(data);
      const entryId = addEntry(data, businessType, priorities);
      setCurrentEntryId(entryId);
      setIsLoadingCommercialSpaces(true);
      try {
        const listings = await fetchRealEstateMatches({
          businessType,
          lat: data.address.lat,
          lng: data.address.lng,
          targetAddress: data.address.normalized,
        });
        setCommercialSpaces(listings);
      } catch (listingError) {
        setCommercialSpacesError((listingError as Error).message || 'Unable to load commercial space recommendations.');
      } finally {
        setIsLoadingCommercialSpaces(false);
      }
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError((err as Error).message || 'Unexpected error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            AI-powered location decision engine
          </h1>
          <p className="mt-3 text-base text-gray-600">
            Enter any address to get a data-driven site evaluation, scoring breakdown, and better nearby alternatives —
            powered by Precisely geospatial intelligence.
          </p>
        </div>

        {/* Input + Results layout */}
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Left: input */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
            <InputPanel
              onSubmit={handleSubmit}
              isLoading={isLoading}
              onSaveLocation={currentEntryId ? () => toggleSave(currentEntryId) : undefined}
              canSaveLocation={Boolean(currentEntryId)}
              isLocationSaved={Boolean(currentEntry?.saved)}
            />
            <SearchHistory history={history} onRemove={removeEntry} onClear={clearHistory} onToggleSave={toggleSave} currentEntryId={currentEntryId} />
          </div>

          {/* Right: results */}
          <div id="results-section" className="space-y-5">
            {!result && !isLoading && !error && (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-stone-200 bg-white">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                    <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-600">Enter an address to begin evaluation</p>
                  <p className="mt-1 text-xs text-gray-400">Results will appear here</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-stone-200 bg-white">
                <div className="text-center">
                  <svg className="mx-auto mb-4 h-8 w-8 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-800">Evaluating location...</p>
                  <p className="mt-1 text-xs text-gray-500">Querying Precisely data • Scoring • Generating insights</p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
                <div className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-red-300">Evaluation failed</p>
                    <p className="mt-1 text-sm text-red-400">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <>
                <ResultsSummary result={result} onDownloadReport={handleDownloadReport} />
                <LocationMap
                  primaryLocation={{
                    address: result.address.normalized,
                    lat: result.address.lat,
                    lng: result.address.lng,
                    score: result.score,
                  }}
                  alternatives={result.alternatives}
                  commercialListings={commercialSpaces}
                />
                <DecisionHighlights
                  businessType={result.businessType}
                  score={result.score}
                  concerns={result.concerns}
                  strengths={result.strengths}
                  alternatives={result.alternatives}
                />
                <div className="grid gap-5 lg:grid-cols-2">
                  <ScoreBreakdown breakdown={result.breakdown} />
                  <StrengthsConcerns strengths={result.strengths} concerns={result.concerns} />
                </div>
                <AISummary summary={result.summary} />
                <CommercialSpacesPanel
                  listings={commercialSpaces}
                  isLoading={isLoadingCommercialSpaces}
                  error={commercialSpacesError}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
