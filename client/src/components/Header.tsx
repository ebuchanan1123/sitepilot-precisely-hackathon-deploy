export default function Header() {
  return (
    <header className="border-b border-stone-200 bg-[#FAFAF8]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green-600 to-green-700">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-gray-900">SitePilot</span>
            <span className="ml-2 hidden text-xs text-gray-500 sm:inline">Geospatial Site Intelligence</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-100 px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-gray-700">Powered by Precisely</span>
        </div>
      </div>
    </header>
  );
}
