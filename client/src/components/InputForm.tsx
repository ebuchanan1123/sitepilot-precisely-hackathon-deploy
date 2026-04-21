import { useState, type FormEvent } from 'react';

interface InputFormProps {
  onSubmit: (prompt: string, context: string, candidates: string[]) => void;
}

export default function InputForm({ onSubmit }: InputFormProps) {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [candidates, setCandidates] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const items = candidates
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!prompt || items.length === 0) {
      return;
    }

    onSubmit(prompt, context.trim(), items);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
      <div>
        <label className="block text-sm font-semibold text-slate-700">Prompt</label>
        <textarea
          className="mt-2 w-full rounded-md border border-slate-300 bg-slate-50 p-3 text-sm focus:border-sky-500 focus:outline-none"
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the task, question, or workflow you want the agent to analyze."
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700">Context</label>
        <p className="mt-1 text-xs text-slate-500">
          Optional. Add domain notes, constraints, user intent, geography, or API context for the sample analysis.
        </p>
        <input
          className="mt-2 w-full rounded-md border border-slate-300 bg-slate-50 p-3 text-sm focus:border-sky-500 focus:outline-none"
          value={context}
          onChange={(event) => setContext(event.target.value)}
          placeholder="Retail expansion, Ottawa market, prioritize data trust and explainability"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700">Candidate items</label>
        <p className="mt-1 text-xs text-slate-500">Enter one candidate, option, agent action, or asset per line.</p>
        <textarea
          className="mt-2 w-full rounded-md border border-slate-300 bg-slate-50 p-3 text-sm focus:border-sky-500 focus:outline-none"
          rows={5}
          value={candidates}
          onChange={(event) => setCandidates(event.target.value)}
          placeholder="Geocoding agent\nFraud detection scout\nReal estate intelligence app"
        />
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
      >
        Run sample analysis
      </button>
    </form>
  );
}
