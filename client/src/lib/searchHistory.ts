import { useCallback, useEffect, useState } from 'react';
import type { BusinessType, EvaluateResponse, Priority } from './types';

const STORAGE_KEY = 'sitepilot_search_history';
const MAX_ENTRIES = 20;

export interface SearchHistoryEntry {
  id: string;
  timestamp: number;
  address: string;
  businessType: BusinessType;
  businessLabel: string;
  priorities: Priority[];
  score: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  decision: string;
  lat: number;
  lng: number;
  saved: boolean;
}

function loadHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SearchHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: SearchHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage quota exceeded — silently skip
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadHistory);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const addEntry = useCallback(
    (
      result: EvaluateResponse,
      businessType: BusinessType,
      priorities: Priority[],
    ): string => {
      const entry: SearchHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        address: result.address.normalized,
        businessType,
        businessLabel: result.businessLabel,
        priorities,
        score: result.score,
        confidenceLevel: result.confidenceLevel,
        decision: result.decision,
        lat: result.address.lat,
        lng: result.address.lng,
        saved: false,
      };

      setHistory((prev) => [entry, ...prev.filter((e) => e.address !== entry.address || e.businessType !== entry.businessType)].slice(0, MAX_ENTRIES));
      return entry.id;
    },
    [],
  );

  const toggleSave = useCallback((id: string) => {
    setHistory((prev) => prev.map((e) => (e.id === id ? { ...e, saved: !e.saved } : e)));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addEntry, removeEntry, toggleSave, clearHistory };
}
