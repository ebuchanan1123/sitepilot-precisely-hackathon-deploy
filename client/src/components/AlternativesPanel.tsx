import AlternativeCard from './AlternativeCard';
import type { AlternativeLocation } from '../lib/types';

interface AlternativesPanelProps {
  alternatives: AlternativeLocation[];
  baseScore: number;
}

export default function AlternativesPanel({ alternatives, baseScore }: AlternativesPanelProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Better Nearby Alternatives</h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
          Base: {baseScore}/100
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Locations within 2km scored by the same model — ranked best first
      </p>

      {alternatives.length === 0 ? (
        <div className="mt-6 rounded-xl border border-white/5 bg-white/5 p-6 text-center">
          <p className="text-sm font-medium text-gray-300">No better alternatives found nearby</p>
          <p className="mt-1 text-xs text-gray-500">This location scores among the best in the area</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {alternatives.map((alt, i) => (
            <AlternativeCard key={`${alt.lat}-${alt.lng}`} alternative={alt} rank={i + 1} />
          ))}
        </div>
      )}
    </section>
  );
}
