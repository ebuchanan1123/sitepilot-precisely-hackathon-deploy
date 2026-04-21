import type { CommercialSpaceRecommendation, EvaluateResponse } from './types';

interface DownloadReportOptions {
  result: EvaluateResponse;
  commercialSpaces: CommercialSpaceRecommendation[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

function sectionList(items: string[], emptyText: string): string {
  if (items.length === 0) {
    return `<p class="empty">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="pill-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
}

function scoreRows(result: EvaluateResponse): string {
  const rows = [
    ['Address Quality', result.breakdown.addressQuality],
    ['Demographic Fit', result.breakdown.demographicFit],
    ['Competition Density', result.breakdown.competitionDensity],
    ['Accessibility', result.breakdown.accessibility],
    ['Commercial Suitability', result.breakdown.commercialSuitability],
  ] as const;

  return rows.map(([label, factor]) => `
    <tr>
      <td>${label}</td>
      <td>${factor.score}</td>
      <td>${Math.round(factor.weight * 100)}%</td>
      <td>${escapeHtml(factor.label)}</td>
    </tr>
  `).join('');
}

function alternativesMarkup(result: EvaluateResponse): string {
  const alternatives = result.alternatives.slice(0, 3);

  if (alternatives.length === 0) {
    return '<p class="empty">No stronger nearby alternatives were returned in this evaluation.</p>';
  }

  return alternatives.map((alt) => `
    <div class="card">
      <div class="card-head">
        <h4>${escapeHtml(alt.address)}</h4>
        <span class="score-badge">${alt.score}</span>
      </div>
      <p class="meta">${alt.distanceKm.toFixed(1)} km away • ${escapeHtml(alt.direction)}</p>
      <ul class="bullet-list">
        ${alt.reasons.slice(0, 3).map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

function commercialSpacesMarkup(commercialSpaces: CommercialSpaceRecommendation[]): string {
  const listings = commercialSpaces.slice(0, 5);

  if (listings.length === 0) {
    return '<p class="empty">No commercial space recommendations were available for this report.</p>';
  }

  return listings.map((listing) => `
    <div class="card">
      <div class="card-head">
        <h4>${escapeHtml(listing.title)}</h4>
        <span class="score-badge">${listing.fitScore}</span>
      </div>
      <p class="meta">${escapeHtml(listing.address)} • ${escapeHtml(listing.propertyType)} • ${listing.distanceKm.toFixed(1)} km</p>
      <p class="meta">${formatCurrency(listing.askingRentMonthly)} / month • ${listing.squareFeet.toLocaleString()} sq ft</p>
      <ul class="bullet-list">
        ${listing.matchReasons.slice(0, 3).map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

function buildReportHtml({ result, commercialSpaces }: DownloadReportOptions): string {
  const generatedAt = new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>SitePilot Report - ${escapeHtml(result.address.normalized)}</title>
        <style>
          :root {
            color-scheme: light;
            --ink: #0f172a;
            --muted: #475569;
            --line: #dbe2ea;
            --panel: #f8fafc;
            --green: #059669;
            --blue: #2563eb;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 40px;
            font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: var(--ink);
            background: white;
          }
          h1, h2, h3, h4, p { margin: 0; }
          .topbar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            border-bottom: 2px solid var(--line);
            padding-bottom: 20px;
          }
          .brand {
            font-size: 30px;
            font-weight: 800;
            letter-spacing: -0.03em;
          }
          .subtitle {
            margin-top: 6px;
            color: var(--muted);
            font-size: 14px;
          }
          .generated {
            text-align: right;
            color: var(--muted);
            font-size: 12px;
          }
          .hero {
            display: grid;
            grid-template-columns: 180px 1fr;
            gap: 24px;
            margin-top: 24px;
            align-items: start;
          }
          .score-panel {
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 20px;
            background: linear-gradient(180deg, #f8fffb 0%, #f8fafc 100%);
            text-align: center;
          }
          .score-number {
            font-size: 64px;
            line-height: 1;
            font-weight: 800;
            color: var(--green);
          }
          .score-label {
            margin-top: 8px;
            font-size: 12px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--muted);
          }
          .score-decision {
            margin-top: 14px;
            display: inline-block;
            padding: 8px 12px;
            border-radius: 999px;
            background: #ecfdf5;
            color: var(--green);
            font-weight: 700;
            font-size: 12px;
            letter-spacing: 0.08em;
          }
          .details-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-top: 16px;
          }
          .metric {
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 14px;
            background: var(--panel);
          }
          .metric-label {
            color: var(--muted);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }
          .metric-value {
            margin-top: 6px;
            font-size: 20px;
            font-weight: 700;
          }
          .section {
            margin-top: 26px;
          }
          .section h2 {
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: var(--muted);
            margin-bottom: 12px;
          }
          .two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            overflow: hidden;
            border-radius: 16px;
            border: 1px solid var(--line);
          }
          .table th, .table td {
            padding: 12px 14px;
            text-align: left;
            font-size: 13px;
            border-bottom: 1px solid var(--line);
          }
          .table th {
            background: var(--panel);
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 11px;
          }
          .pill-list, .bullet-list {
            padding: 0;
            margin: 0;
            list-style: none;
          }
          .pill-list li, .bullet-list li {
            margin-bottom: 8px;
            border-radius: 12px;
            padding: 10px 12px;
            background: var(--panel);
            border: 1px solid var(--line);
            font-size: 13px;
            line-height: 1.5;
          }
          .card {
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 14px;
            background: white;
            margin-bottom: 12px;
          }
          .card-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
          }
          .card h4 {
            font-size: 16px;
            line-height: 1.3;
          }
          .score-badge {
            flex-shrink: 0;
            min-width: 40px;
            text-align: center;
            border-radius: 999px;
            padding: 6px 10px;
            background: #eff6ff;
            color: var(--blue);
            font-weight: 700;
            font-size: 13px;
          }
          .meta {
            margin-top: 6px;
            color: var(--muted);
            font-size: 12px;
          }
          .empty {
            color: var(--muted);
            font-size: 13px;
          }
          @media print {
            body { padding: 24px; }
            .section { break-inside: avoid; }
            .card { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <header class="topbar">
          <div>
            <div class="brand">SitePilot</div>
            <p class="subtitle">Geospatial Intelligence for Smarter Business Decisions</p>
          </div>
          <div class="generated">
            <p><strong>Powered by Precisely</strong></p>
            <p>Generated ${escapeHtml(generatedAt)}</p>
          </div>
        </header>

        <section class="hero">
          <div class="score-panel">
            <div class="score-number">${result.score}</div>
            <div class="score-label">Site score</div>
            <div class="score-decision">${escapeHtml(result.decision)}</div>
          </div>
          <div>
            <h1>${escapeHtml(result.address.normalized)}</h1>
            <p class="subtitle">${escapeHtml(result.businessLabel)} • Address match ${result.address.confidence}%</p>
            <div class="details-grid">
              <div class="metric">
                <div class="metric-label">Confidence</div>
                <div class="metric-value">${escapeHtml(result.confidenceLevel)}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Competitors Nearby</div>
                <div class="metric-value">${result.nearbyCompetitorCount}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Precisely Verified</div>
                <div class="metric-value">${result.address.fromPrecisely ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <h2>AI Analysis</h2>
          <p class="empty">${escapeHtml(result.summary)}</p>
        </section>

        <section class="section two-col">
          <div>
            <h2>Strengths</h2>
            ${sectionList(result.strengths, 'No major strengths were identified.')}
          </div>
          <div>
            <h2>Concerns</h2>
            ${sectionList(result.concerns, 'No major concerns were identified.')}
          </div>
        </section>

        <section class="section">
          <h2>Score Breakdown</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Score</th>
                <th>Weight</th>
                <th>Assessment</th>
              </tr>
            </thead>
            <tbody>
              ${scoreRows(result)}
            </tbody>
          </table>
        </section>

        <section class="section">
          <h2>Better Nearby Alternatives</h2>
          ${alternativesMarkup(result)}
        </section>

        <section class="section">
          <h2>Recommended Commercial Spaces</h2>
          ${commercialSpacesMarkup(commercialSpaces)}
        </section>
      </body>
    </html>
  `;
}

export function downloadPdfReport(options: DownloadReportOptions): void {
  const reportWindow = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=900');

  if (!reportWindow) {
    throw new Error('Unable to open the PDF report window. Please allow pop-ups and try again.');
  }

  reportWindow.document.open();
  reportWindow.document.write(buildReportHtml(options));
  reportWindow.document.close();
  reportWindow.focus();

  window.setTimeout(() => {
    reportWindow.print();
  }, 250);
}
