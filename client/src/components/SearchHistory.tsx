import { useState } from 'react';
import type { SearchHistoryEntry } from '../lib/searchHistory';

interface SearchHistoryProps {
  history: SearchHistoryEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onToggleSave: (id: string) => void;
  currentEntryId: string | null;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 65) return 'text-lime-600';
  if (score >= 45) return 'text-amber-600';
  return 'text-red-500';
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SearchHistory({ history, onRemove, onClear, onToggleSave, currentEntryId }: SearchHistoryProps) {
  const [open, setOpen] = useState(false);

  if (history.length === 0) return null;

  const savedCount = history.filter((e) => e.saved).length;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="text-sm font-semibold text-gray-800">Recent Searches</span>
          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
            {history.length}
          </span>
          {savedCount > 0 && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
              {savedCount} saved
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-stone-100">
          <div className="max-h-72 overflow-y-auto">
            {history.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-start gap-3 border-b border-stone-100 px-5 py-3 last:border-0 ${
                  entry.id === currentEntryId ? 'bg-stone-50' : 'hover:bg-stone-50'
                }`}
              >
                {/* Score */}
                <div className="flex-shrink-0 w-8 text-center pt-0.5">
                  <span className={`text-base font-bold leading-none ${scoreColor(entry.score)}`}>{entry.score}</span>
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-900">{entry.address}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {entry.businessLabel}
                    {entry.priorities.length > 0 && (
                      <> · {entry.priorities.length} {entry.priorities.length === 1 ? 'priority' : 'priorities'}</>
                    )}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(entry.timestamp)}</p>
                </div>

                {/* Confidence badge */}
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    entry.confidenceLevel === 'High'
                      ? 'bg-emerald-50 text-emerald-700'
                      : entry.confidenceLevel === 'Medium'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {entry.confidenceLevel}
                </span>

                {/* Save toggle */}
                <button
                  type="button"
                  onClick={() => onToggleSave(entry.id)}
                  className={`flex-shrink-0 rounded p-0.5 transition-colors ${
                    entry.saved ? 'text-green-600 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'
                  }`}
                  aria-label={entry.saved ? 'Unsave' : 'Save'}
                >
                  <svg className="h-3.5 w-3.5" fill={entry.saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                  </svg>
                </button>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  className="flex-shrink-0 rounded p-0.5 text-gray-300 hover:text-gray-500 transition-colors"
                  aria-label="Remove"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-100 px-5 py-2.5">
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
