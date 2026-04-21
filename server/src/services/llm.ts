import Anthropic from '@anthropic-ai/sdk';
import type { ScoreBreakdown, BusinessType, Priority } from './scoring.js';
import type { AlternativeLocation } from './alternatives.js';

export interface LLMExplanation {
  decision: string;
  strengths: string[];
  concerns: string[];
  summary: string;
  alternativeReasons: string[][];
}

const BUSINESS_LABELS: Record<BusinessType, string> = {
  coffee_shop: 'coffee shop',
  clinic: 'medical clinic',
  gym: 'fitness center',
  grocery: 'grocery store',
  restaurant: 'restaurant',
  pharmacy: 'pharmacy',
  bar: 'bar or pub',
  retail: 'retail boutique',
  salon: 'salon or spa',
};

const STRENGTH_TEXT: Record<string, (score: number) => string> = {
  addressQuality: (s) => s >= 85 ? 'Precise address validation — high location confidence' : 'Acceptable address data quality',
  demographicFit: (s) => s >= 80 ? 'Strong demographic alignment for target customer base' : s >= 65 ? 'Favorable population profile for the business type' : 'Moderate demographic fit',
  competitionDensity: (s) => s >= 80 ? 'Low competitor saturation — significant market opportunity' : s >= 65 ? 'Manageable competitive landscape in the area' : 'Moderate competitive pressure',
  accessibility: (s) => s >= 80 ? 'Excellent walkability and transit access' : s >= 65 ? 'Good foot traffic potential and transit connectivity' : 'Adequate accessibility',
  commercialSuitability: (s) => s >= 80 ? 'Strong commercial zoning and retail environment' : s >= 65 ? 'Compatible land use and commercial surroundings' : 'Reasonable commercial fit',
};

const CONCERN_TEXT: Record<string, (score: number, count?: number) => string> = {
  addressQuality: () => 'Limited address data precision — lower geocoding confidence',
  demographicFit: (s) => s < 35 ? 'Weak demographic match for target customers' : 'Below-average population profile for this business type',
  competitionDensity: (s, count) => s < 35 ? `Highly saturated market — ${count ?? 'multiple'} competitors within 500m` : 'Elevated competition density in the immediate area',
  accessibility: (s) => s < 35 ? 'Poor walkability and limited transit access' : 'Below-average foot traffic and accessibility metrics',
  commercialSuitability: (s) => s < 35 ? 'Unfavorable commercial environment or zoning' : 'Mixed commercial surroundings — limited retail synergy',
};

function buildFallbackExplanation(
  score: number,
  businessType: BusinessType,
  breakdown: ScoreBreakdown,
  alternatives: AlternativeLocation[],
  nearbyCompetitorCount?: number,
): LLMExplanation {
  const label = BUSINESS_LABELS[businessType] ?? businessType;
  const decision = score >= 75 ? `Strong candidate for a ${label}` : score >= 55 ? `Viable option for a ${label}` : score >= 40 ? `Proceed with caution for a ${label}` : `Not recommended for a ${label}`;

  const factorEntries = Object.entries(breakdown) as Array<[string, (typeof breakdown)[keyof typeof breakdown]]>;

  const strengths = factorEntries
    .filter(([, f]) => f.score >= 65)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 3)
    .map(([key, f]) => STRENGTH_TEXT[key]?.(f.score) ?? `${f.label} — ${f.preciselySource}`);

  const concerns = factorEntries
    .filter(([, f]) => f.score < 50)
    .sort(([, a], [, b]) => a.score - b.score)
    .slice(0, 3)
    .map(([key, f]) => CONCERN_TEXT[key]?.(f.score, key === 'competitionDensity' ? nearbyCompetitorCount : undefined) ?? `${f.label} — ${f.preciselySource}`);

  const topFactor = factorEntries.sort(([, a], [, b]) => b.score - a.score)[0];
  const bottomFactor = factorEntries.sort(([, a], [, b]) => a.score - b.score)[0];
  const summary = `Precisely data scores this location ${score}/100 for a ${label}. ${
    score >= 75
      ? `The strongest signal is ${topFactor?.[0]?.replace(/([A-Z])/g, ' $1').toLowerCase().trim() ?? 'overall fit'}, indicating genuine commercial viability.`
      : score >= 55
      ? `While ${topFactor?.[0]?.replace(/([A-Z])/g, ' $1').toLowerCase().trim() ?? 'some factors'} show promise, ${bottomFactor?.[0]?.replace(/([A-Z])/g, ' $1').toLowerCase().trim() ?? 'other factors'} present risk.`
      : `The site faces significant challenges, particularly in ${bottomFactor?.[0]?.replace(/([A-Z])/g, ' $1').toLowerCase().trim() ?? 'key scoring areas'}.`
  } ${alternatives.length > 0 ? `${alternatives.length} higher-scoring alternatives were identified within 2km — worth evaluating before committing to this location.` : 'This location compares favorably to nearby options in the same area.'}`;

  const alternativeReasons = alternatives.map((alt) => {
    const reasons: string[] = [];
    if (alt.delta >= 10) reasons.push(`+${alt.delta} point advantage on the same scoring model`);
    reasons.push(`${alt.distanceKm}km ${alt.direction} — minimal relocation distance`);
    return reasons;
  });

  return { decision, strengths, concerns, summary, alternativeReasons };
}

export async function generateExplanation(
  address: string,
  businessType: BusinessType,
  priorities: Priority[],
  score: number,
  breakdown: ScoreBreakdown,
  alternatives: AlternativeLocation[],
  nearbyCompetitorCount?: number,
): Promise<LLMExplanation> {
  const label = BUSINESS_LABELS[businessType] ?? businessType;

  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    return buildFallbackExplanation(score, businessType, breakdown, alternatives, nearbyCompetitorCount);
  }

  const factorLines = Object.entries(breakdown)
    .map(([, f]) => `- ${f.preciselySource}: ${f.score}/100 (${f.label}, weight ${Math.round(f.weight * 100)}%)`)
    .join('\n');

  const altLines = alternatives.map((a, i) =>
    `${i + 1}. Score ${a.score}/100 (+${a.delta} pts), ${a.distanceKm}km ${a.direction} — ${a.address}`,
  ).join('\n');

  const prompt = `You are SitePilot, a professional business site strategy assistant powered by Precisely geospatial data.

A business operator is evaluating the following location for a ${label}:
Address: ${address}
Priorities: ${priorities.length > 0 ? priorities.join(', ') : 'none specified'}

SCORING RESULTS (deterministic, data-driven):
Overall Site Score: ${score}/100
${factorLines}

TOP NEARBY ALTERNATIVES (scored by same model):
${altLines.length > 0 ? altLines : 'No better alternatives found within 2km.'}

Based ONLY on the above scores, provide a professional site assessment. Return valid JSON:
{
  "decision": "one of: Strong candidate / Viable option / Proceed with caution / Not recommended — for a ${label}",
  "strengths": ["3 specific strengths grounded in the factor scores above, concise noun phrases"],
  "concerns": ["2-3 specific concerns grounded in the factor scores above, concise noun phrases"],
  "summary": "3 sentences max. Professional, specific, grounded in the scores. Reference Precisely data where relevant.",
  "alternativeReasons": [["reason1", "reason2"], ["reason1", "reason2"], ["reason1", "reason2"]]
}

Rules: Do not invent data not in the scores. Match the number of alternativeReasons arrays to the number of alternatives provided. Be concise and specific.`;

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as LLMExplanation;
        while (parsed.alternativeReasons.length < alternatives.length) parsed.alternativeReasons.push([]);
        return parsed;
      }
    }

    if (process.env.OPENAI_API_KEY) {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const resp = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
      });
      const text = resp.choices[0]?.message?.content?.trim() ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as LLMExplanation;
        while (parsed.alternativeReasons.length < alternatives.length) parsed.alternativeReasons.push([]);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('LLM explanation failed, using fallback:', err);
  }

  return buildFallbackExplanation(score, businessType, breakdown, alternatives);
}
