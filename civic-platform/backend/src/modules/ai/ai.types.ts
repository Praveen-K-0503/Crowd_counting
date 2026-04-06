export type DraftAnalysisInput = {
  title?: string;
  description?: string;
  addressLine?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  domainId?: string;
  mediaTypes?: Array<"image" | "video" | "audio">;
  visualSignals?: Array<{
    label: string;
    confidence: number;
    matchedSignals: string[];
  }>;
};

export type AiDomainSuggestion = {
  domainId: string | null;
  domainName: string;
  confidence: number;
  matchedSignals: string[];
};

export type AiDuplicateMatch = {
  complaintId: string;
  complaintCode: string;
  title: string;
  distanceKm: number;
  similarityScore: number;
  status: string;
};

export type DraftAnalysisResult = {
  suggestedDomain: AiDomainSuggestion | null;
  suggestedPriority: "P1" | "P2" | "P3" | "P4";
  severityLevel: "critical" | "high" | "medium" | "low";
  emergencyLikelihood: "high" | "medium" | "low";
  duplicateRisk: "high" | "medium" | "low";
  routeDepartmentCode: string | null;
  routeDepartmentName: string | null;
  speechReady: boolean;
  visionReady: boolean;
  reasonSummary: string[];
  matchedKeywords: string[];
  duplicateMatches: AiDuplicateMatch[];
};
