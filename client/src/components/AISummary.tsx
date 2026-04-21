interface AISummaryProps {
  summary: string;
}

function emphasizeInsight(text: string): string {
  const parts = text.split(/[:\u2192-]/);
  return parts[0]?.trim() ?? text.trim();
}

export default function AISummary({ summary }: AISummaryProps) {
  const bulletInsights = summary
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <section className="rounded-2xl border border-green-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
          <svg className="h-3.5 w-3.5 text-green-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-green-700">AI Analysis</h2>
        <span className="ml-auto rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
          Powered by OpenAI
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {bulletInsights.length > 0 ? (
          bulletInsights.map((insight, index) => (
            <div key={`${insight}-${index}`} className="flex items-start gap-3 rounded-xl bg-green-50/60 px-4 py-3">
              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
              <p className="text-sm leading-relaxed text-gray-700">
                <span className="font-semibold text-gray-900">{emphasizeInsight(insight)}</span>
                {insight.startsWith(emphasizeInsight(insight)) ? ` ${insight.slice(emphasizeInsight(insight).length).trimStart()}` : ''}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
        )}
      </div>
    </section>
  );
}
