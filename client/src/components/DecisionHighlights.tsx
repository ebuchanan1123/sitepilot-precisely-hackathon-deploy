import type { AlternativeLocation, BusinessType } from '../lib/types';

interface DecisionHighlightsProps {
  businessType: BusinessType;
  score: number;
  concerns: string[];
  strengths: string[];
  alternatives: AlternativeLocation[];
}

function revenuePotential(score: number, businessType: BusinessType): string {
  const baseRange: Record<BusinessType, [number, number]> = {
    coffee_shop: [14000, 24000],
    clinic: [22000, 36000],
    gym: [18000, 32000],
    grocery: [28000, 52000],
    restaurant: [22000, 42000],
    pharmacy: [26000, 46000],
    bar: [16000, 34000],
    retail: [17000, 35000],
    salon: [12000, 22000],
  };

  const [lowBase, highBase] = baseRange[businessType] ?? baseRange.coffee_shop;
  const multiplier = 0.7 + score / 100;
  const low = Math.round((lowBase * multiplier) / 500) * 500;
  const high = Math.round((highBase * multiplier) / 500) * 500;

  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(low) + ' - ' + new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(high);
}

export default function DecisionHighlights({
  businessType,
  score,
  concerns,
  strengths,
  alternatives,
}: DecisionHighlightsProps) {
  const topReasons = (concerns.length > 0 ? concerns : strengths).slice(0, 3);
  const bestAlternative = alternatives[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-600">Top 3 Reasons This {score >= 70 ? 'Works' : 'Fails'}</h2>
        <p className="mt-1 text-xs text-gray-500">
          The clearest signals driving the recommendation for this {businessType.replace('_', ' ')} concept.
        </p>

        <div className="mt-4 space-y-3">
          {topReasons.length > 0 ? topReasons.map((reason, index) => (
            <div key={`${reason}-${index}`} className="flex gap-3 rounded-xl bg-stone-50 px-4 py-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-white">
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-gray-700">{reason}</p>
            </div>
          )) : (
            <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-gray-600">
              No major blockers surfaced. This location is performing well against the current evaluation model.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Better Area Found Nearby</h2>
        <p className="mt-1 text-xs text-gray-500">
          A stronger nearby option surfaced by the same evaluation model.
        </p>

        {bestAlternative ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-emerald-50 px-4 py-3">
              <p className="text-base font-bold text-gray-900">{bestAlternative.address}</p>
              <p className="mt-1 text-sm text-emerald-700">
                Score {bestAlternative.score} • {bestAlternative.distanceKm} km away
              </p>
            </div>

            <ul className="space-y-2">
              {bestAlternative.reasons.slice(0, 3).map((reason, index) => (
                <li key={`${reason}-${index}`} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-stone-50 px-4 py-3 text-sm text-gray-600">
            No clearly stronger nearby trade area surfaced in this pass.
          </p>
        )}

        <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Estimated revenue potential</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{revenuePotential(score, businessType)}</p>
          <p className="mt-1 text-xs text-gray-500">Directional demo estimate based on business type and overall location score.</p>
        </div>
      </section>
    </div>
  );
}
