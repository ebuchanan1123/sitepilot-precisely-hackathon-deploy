import type { ScoreBreakdown as ScoreBreakdownType } from '../lib/types';

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType;
}

const FACTOR_META: Record<keyof ScoreBreakdownType, { label: string; description: string }> = {
  addressQuality:       { label: 'Address Quality',       description: 'Location data confidence & precision' },
  demographicFit:       { label: 'Demographic Fit',       description: 'Population profile & spending power' },
  competitionDensity:   { label: 'Competition Density',   description: 'Nearby competitor saturation' + '\n' + ' (higher = less competition)' },
  accessibility:        { label: 'Accessibility',         description: 'Transit, walkability & foot traffic' },
  commercialSuitability:{ label: 'Commercial Suitability',description: 'Zoning, retail mix & area character' },
};

function FactorBar({ score, fromPrecisely }: { score: number; fromPrecisely: boolean }) {
  const color =
    score >= 75 ? 'bg-emerald-500' :
    score >= 60 ? 'bg-lime-500' :
    score >= 40 ? 'bg-amber-500' :
    'bg-red-500';

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-stone-200">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color} ${fromPrecisely ? 'opacity-100' : 'opacity-80'}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

export default function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  const factors = (Object.entries(breakdown) as Array<[keyof ScoreBreakdownType, (typeof breakdown)[keyof ScoreBreakdownType]]>)
    .filter(([key]) => key !== 'addressQuality');

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-600">Score Breakdown</h2>
        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Precisely Data</span>
      </div>

      <div className="mt-4 space-y-4">
        {factors.map(([key, factor]) => {
          const meta = FACTOR_META[key];
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{meta.label}</span>
                  {factor.fromPrecisely && (
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Precisely</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{Math.round(factor.weight * 100)}% wt.</span>
                  <span className="w-8 text-right font-bold text-gray-900">{factor.score}</span>
                </div>
              </div>
              <FactorBar score={factor.score} fromPrecisely={factor.fromPrecisely} />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">{meta.description}</span>
                <span className="text-xs text-gray-600">{factor.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
