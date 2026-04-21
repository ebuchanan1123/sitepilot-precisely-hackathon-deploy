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

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        <div className="flex-shrink-0 sm:w-64">
          <ScoreGauge score={result.score} animate={shouldAnimateGauge} />
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
                  Download PDF Report
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
  );
}
