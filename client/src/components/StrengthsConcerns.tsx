interface StrengthsConcernsProps {
  strengths: string[];
  concerns: string[];
}

export default function StrengthsConcerns({ strengths, concerns }: StrengthsConcernsProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-600">Strengths & Concerns</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Strengths
          </p>
          {strengths.length === 0 ? (
            <p className="text-sm text-gray-500">No significant strengths identified.</p>
          ) : (
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            Concerns
          </p>
          {concerns.length === 0 ? (
            <p className="text-sm text-gray-500">No significant concerns identified.</p>
          ) : (
            <ul className="space-y-2">
              {concerns.map((c, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
