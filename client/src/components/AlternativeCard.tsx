import type { AlternativeLocation } from '../lib/types';

interface AlternativeCardProps {
  alternative: AlternativeLocation;
  rank: number;
}

function ScoreDelta({ delta }: { delta: number }) {
  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
      </svg>
      +{delta} pts
    </span>
  );
}

export default function AlternativeCard({ alternative, rank }: AlternativeCardProps) {
  const scoreColor =
    alternative.score >= 80 ? 'text-emerald-400' :
    alternative.score >= 65 ? 'text-lime-400' :
    alternative.score >= 45 ? 'text-amber-400' :
    'text-red-400';

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 transition-all hover:border-blue-500/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-gray-400">
            #{rank}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-100">{alternative.address}</p>
            <p className="text-xs text-gray-500">{alternative.distanceKm}km {alternative.direction}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-2xl font-bold ${scoreColor}`}>{alternative.score}</span>
          <ScoreDelta delta={alternative.delta} />
        </div>
      </div>

      {alternative.reasons.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {alternative.reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
              <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-blue-400" />
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
