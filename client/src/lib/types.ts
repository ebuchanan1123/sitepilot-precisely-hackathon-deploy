export type BusinessType = 'coffee_shop' | 'clinic' | 'gym' | 'grocery' | 'restaurant' | 'pharmacy' | 'bar' | 'retail' | 'salon';
export type Priority = 'high_foot_traffic' | 'low_competition' | 'family_area' | 'premium_demographic' | 'accessibility';

export interface FactorScore {
  score: number;
  label: string;
  weight: number;
  preciselySource: string;
  fromPrecisely: boolean;
}

export interface ScoreBreakdown {
  addressQuality: FactorScore;
  demographicFit: FactorScore;
  competitionDensity: FactorScore;
  accessibility: FactorScore;
  commercialSuitability: FactorScore;
}

export interface AlternativeLocation {
  address: string;
  lat: number;
  lng: number;
  score: number;
  delta: number;
  distanceKm: number;
  direction: string;
  reasons: string[];
}

export interface AddressSuggestion {
  formattedAddress: string;
  mainAddressLine: string;
  addressLastLine: string;
  lat?: number;
  lng?: number;
  country: string;
  city?: string;
  region?: string;
  postalCode?: string;
}

export interface EvaluateRequest {
  address: string;
  businessType: BusinessType;
  priorities: Priority[];
  selectedAddress?: AddressSuggestion | null;
}

export interface EvaluateResponse {
  address: {
    raw: string;
    normalized: string;
    lat: number;
    lng: number;
    confidence: number;
    confidenceLabel: 'High' | 'Medium' | 'Low';
    fromPrecisely: boolean;
  };
  businessType: BusinessType;
  businessLabel: string;
  score: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  nearbyCompetitorCount: number;
  decision: string;
  breakdown: ScoreBreakdown;
  strengths: string[];
  concerns: string[];
  summary: string;
  alternatives: AlternativeLocation[];
}

export type CommercialPropertyType =
  | 'Storefront'
  | 'Office'
  | 'Mixed Use'
  | 'Restaurant'
  | 'Medical'
  | 'Flex'
  | 'Community Retail';

export interface LocationDemographics {
  averageHouseholdIncome: number | null;
  population: number | null;
  averageHomeValue: number | null;
  educationBachelorsPct: number | null;
  fromPrecisely: boolean;
}

export interface CommercialSpaceRecommendation {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  propertyType: CommercialPropertyType;
  askingRentMonthly: number;
  squareFeet: number;
  zoningOrUse: string;
  parkingSpaces: number | null;
  distanceKm: number;
  fitScore: number;
  matchReasons: string[];
  shortDescription: string;
  demographics: LocationDemographics | null;
}

export interface RealEstateMatchRequest {
  businessType: BusinessType;
  lat: number;
  lng: number;
  targetAddress?: string;
  budget?: number;
  desiredSquareFeet?: number;
  preferredPropertyType?: CommercialPropertyType | 'Any';
}
