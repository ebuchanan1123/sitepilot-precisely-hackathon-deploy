import { useEffect, useState } from 'react';
import ScoreGauge from './ScoreGauge';
import type { EvaluateResponse } from '../lib/types';

interface ResultsSummaryProps {
  result: EvaluateResponse;
  onDownloadReport?: () => void;
}

function verdictForScore(score: number) {
  if (score >= 80) {
    return {
      label: 'STRONG OPPORTUNITY',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (score >= 65) {
    return {
      label: 'PROCEED WITH CAUTION',
      className: 'bg-lime-50 text-lime-700 border-lime-200',
    };
  }

  if (score >= 45) {
    return {
      label: 'HIGH RISK',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  return {
    label: 'NOT VIABLE',
    className: 'bg-red-50 text-red-700 border-red-200',
  };
}

function DecisionBadge({ score }: { score: number }) {
  const verdict = verdictForScore(score);
  return (
    <span className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-black tracking-wide ${verdict.className}`}>
      {verdict.label}
    </span>
  );
}

export default function ResultsSummary({ result, onDownloadReport }: ResultsSummaryProps) {
  const [shouldAnimateGauge, setShouldAnimateGauge] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    setShouldAnimateGauge(false);

    let frameA = 0;
    let frameB = 0;
    frameA = window.requestAnimationFrame(() => {
      frameB = window.requestAnimationFrame(() => {
        setShouldAnimateGauge(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameA);
      window.cancelAnimationFrame(frameB);
    };
  }, [result.address.normalized, result.score]);

  const confCls: Record<string, string> = {
    High: 'text-emerald-700 bg-emerald-50',
    Medium: 'text-amber-700 bg-amber-50',
    Low: 'text-red-700 bg-red-50',
  };

  const confidenceReason = {
    High: 'Strong address and market signal alignment across the evaluated area.',
    Medium: 'Some signals are reliable, but not every factor is equally strong or complete.',
    Low: 'Limited or mixed signals reduce how confidently we can trust this recommendation.',
  }[result.confidenceLevel];

  const factorEntries = Object.entries(result.breakdown);

  return (
    <>
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
          <div className="flex-shrink-0 sm:w-64">
          <ScoreGauge score={result.score} animate={shouldAnimateGauge} />
            <button
              type="button"
              onClick={() => setShowMethodology(true)}
              className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-stone-400 hover:text-gray-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25h.008v.008H12V8.25Zm-.75 3h1.5v4.5h-1.5v-4.5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              How scoring works
            </button>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Site Evaluation</p>
              <p className="mt-1 text-xl font-bold text-gray-900 line-clamp-2">{result.address.normalized}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-stone-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {result.businessLabel}
                </span>
                {result.address.fromPrecisely && (
                  <span className="rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    Precisely verified
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <DecisionBadge score={result.score} />
                {onDownloadReport && (
                  <button
                    type="button"
                    onClick={onDownloadReport}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 transition hover:border-stone-400 hover:text-gray-900"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V4.5m0 12 4.5-4.5M12 16.5l-4.5-4.5M4.5 19.5h15" />
                    </svg>
                    Print / Save PDF
                  </button>
                )}
              </div>
              <p className="text-sm font-medium text-gray-600">{result.decision}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-stone-100 p-3">
                <p className="text-xs text-gray-500">Confidence</p>
                <p className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-sm font-bold ${confCls[result.confidenceLevel] ?? ''}`}>
                  {result.confidenceLevel}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{confidenceReason}</p>
              </div>
              <div className="rounded-lg bg-stone-100 p-3">
                <p className="text-xs text-gray-500">Competitors Nearby</p>
                <p className="mt-0.5 text-sm font-bold text-gray-900">{result.nearbyCompetitorCount}</p>
              </div>
              <div className="rounded-lg bg-stone-100 p-3">
                <p className="text-xs text-gray-500">Address Match</p>
                <p className="mt-0.5 text-sm font-bold text-gray-900">{result.address.confidence}%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showMethodology && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">How Scoring Works</h3>
                <p className="mt-1 text-sm text-gray-600">
                  The overall site score is a weighted blend of real location signals for this business type. Listing fit scores below use a separate listing-ranking model.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMethodology(false)}
                className="rounded-full p-2 text-gray-500 transition hover:bg-stone-100 hover:text-gray-700"
                aria-label="Close scoring methodology"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {factorEntries.map(([key, factor]) => (
                <div key={key} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{factor.preciselySource}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{factor.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{factor.score}/100</p>
                      <p className="text-[11px] text-gray-500">Weight {Math.round(factor.weight * 100)}%</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-gray-600">
                    {factor.fromPrecisely ? 'Live data-backed signal.' : 'Fallback or derived local signal used when live data is unavailable.'}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Overall site score and commercial listing fit are intentionally different:
              the site score rates the location itself, while listing fit ranks nearby available units around that location.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
