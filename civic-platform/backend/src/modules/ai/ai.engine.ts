import type { ComplaintMapItem, NearbyComplaintItem } from "../complaints/complaint.types.js";
import type { AiDomainSuggestion, DraftAnalysisInput, DraftAnalysisResult } from "./ai.types.js";

type DomainRule = {
  id: string;
  name: string;
  departmentCode: string;
  departmentName: string;
  emergency: boolean;
  keywords: string[];
};

const domainRules: DomainRule[] = [
  {
    id: "40000000-0000-0000-0000-000000000001",
    name: "Roads and Transportation",
    departmentCode: "roads-public-works",
    departmentName: "Roads and Public Works",
    emergency: false,
    keywords: ["pothole", "road", "traffic", "signal", "divider", "footpath", "sidewalk", "junction", "blockage"],
  },
  {
    id: "40000000-0000-0000-0000-000000000002",
    name: "Sanitation and Waste Management",
    departmentCode: "sanitation-solid-waste",
    departmentName: "Sanitation and Solid Waste",
    emergency: false,
    keywords: ["garbage", "waste", "overflowing bin", "dumping", "trash", "unclean", "sanitation"],
  },
  {
    id: "40000000-0000-0000-0000-000000000003",
    name: "Water Supply, Sewerage, and Drainage",
    departmentCode: "water-sewerage",
    departmentName: "Water and Sewerage",
    emergency: false,
    keywords: ["sewage", "drain", "drainage", "waterlogging", "leak", "pipe", "overflow", "manhole overflow", "water supply"],
  },
  {
    id: "40000000-0000-0000-0000-000000000004",
    name: "Street Lighting and Electrical Infrastructure",
    departmentCode: "electrical-street-lighting",
    departmentName: "Electrical and Street Lighting",
    emergency: false,
    keywords: ["streetlight", "pole", "light", "transformer", "wire", "power", "electric", "electrical"],
  },
  {
    id: "40000000-0000-0000-0000-000000000005",
    name: "Public Infrastructure and Amenities",
    departmentCode: "municipal-maintenance",
    departmentName: "Municipal Maintenance",
    emergency: false,
    keywords: ["manhole", "bus stop", "bench", "toilet", "park", "amenity", "public facility", "damaged structure"],
  },
  {
    id: "40000000-0000-0000-0000-000000000006",
    name: "Environment and Public Health",
    departmentCode: "sanitation-solid-waste",
    departmentName: "Sanitation and Solid Waste",
    emergency: false,
    keywords: ["mosquito", "stagnant water", "dead animal", "fallen tree", "smoke", "public health", "hygiene", "pollution"],
  },
  {
    id: "40000000-0000-0000-0000-000000000007",
    name: "Fire Emergencies",
    departmentCode: "disaster-management",
    departmentName: "Disaster Management Authority",
    emergency: true,
    keywords: ["fire", "smoke", "burning", "flame", "blast"],
  },
  {
    id: "40000000-0000-0000-0000-000000000008",
    name: "Flood and Water Disaster",
    departmentCode: "disaster-management",
    departmentName: "Disaster Management Authority",
    emergency: true,
    keywords: ["flood", "rescue", "collapse", "landslide", "disaster", "storm", "water disaster"],
  },
];

const criticalKeywords = ["fire", "flood", "collapse", "live wire", "electrocution", "blast", "rescue"];
const highKeywords = ["sewage", "waterlogging", "open manhole", "transformer", "wire", "unsafe", "hazard", "blocked"];
const sensitiveLocationKeywords = ["school", "hospital", "market", "junction", "bus stop", "bridge", "underpass"];

function tokenize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function jaccardSimilarity(source: string, target: string) {
  const sourceTokens = new Set(tokenize(source));
  const targetTokens = new Set(tokenize(target));

  if (sourceTokens.size === 0 || targetTokens.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const token of sourceTokens) {
    if (targetTokens.has(token)) {
      intersection += 1;
    }
  }

  return intersection / (sourceTokens.size + targetTokens.size - intersection);
}

export function analyzeDraft(
  input: DraftAnalysisInput,
  nearbyComplaints: NearbyComplaintItem[],
): DraftAnalysisResult {
  const text = [input.title, input.description, input.addressLine, input.landmark].filter(Boolean).join(" ").toLowerCase();
  const visualSignals = input.visualSignals ?? [];
  const matchedKeywords = unique(
    [...criticalKeywords, ...highKeywords, ...sensitiveLocationKeywords].filter((keyword) => text.includes(keyword)),
  );

  const domainScored = domainRules
    .map((domain) => {
      const matchedSignals = domain.keywords.filter((keyword) => text.includes(keyword));
      const visualMatch = visualSignals.find((signal) => signal.label === domain.name);
      const score = matchedSignals.length + (visualMatch ? visualMatch.confidence * 2 : 0) + (domain.emergency ? 0.2 : 0);

      return {
        domain,
        matchedSignals: unique([...matchedSignals, ...(visualMatch?.matchedSignals ?? [])]),
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  const suggestedDomain: AiDomainSuggestion | null = domainScored[0]
    ? {
        domainId: domainScored[0].domain.id,
        domainName: domainScored[0].domain.name,
        confidence: Math.min(0.98, 0.45 + domainScored[0].score * 0.12),
        matchedSignals: domainScored[0].matchedSignals,
      }
    : null;

  const hasCriticalSignal = criticalKeywords.some((keyword) => text.includes(keyword));
  const hasHighSignal = highKeywords.some((keyword) => text.includes(keyword));
  const hasSensitiveLocation = sensitiveLocationKeywords.some((keyword) => text.includes(keyword));
  const duplicateMatches = nearbyComplaints
    .map((complaint) => ({
      complaintId: complaint.id,
      complaintCode: complaint.complaintCode,
      title: complaint.title,
      distanceKm: complaint.distanceKm,
      similarityScore: jaccardSimilarity(`${input.title ?? ""} ${input.description ?? ""}`, complaint.title),
      status: complaint.status,
    }))
    .filter((complaint) => complaint.distanceKm <= 0.75 && complaint.similarityScore >= 0.15)
    .sort((left, right) => {
      if (right.similarityScore !== left.similarityScore) {
        return right.similarityScore - left.similarityScore;
      }

      return left.distanceKm - right.distanceKm;
    })
    .slice(0, 4);

  const duplicateRisk =
    duplicateMatches.some((item) => item.distanceKm <= 0.35 && item.similarityScore >= 0.45)
      ? "high"
      : duplicateMatches.length > 0
        ? "medium"
        : "low";

  const suggestedPriority =
    hasCriticalSignal || suggestedDomain?.domainName === "Fire Emergencies" || suggestedDomain?.domainName === "Flood and Water Disaster"
      ? "P1"
      : hasHighSignal || hasSensitiveLocation
        ? "P2"
        : matchedKeywords.length > 0
          ? "P3"
          : "P4";

  const severityLevel =
    suggestedPriority === "P1"
      ? "critical"
      : suggestedPriority === "P2"
        ? "high"
        : suggestedPriority === "P3"
          ? "medium"
          : "low";

  const emergencyLikelihood =
    hasCriticalSignal || suggestedDomain?.domainName === "Fire Emergencies" || suggestedDomain?.domainName === "Flood and Water Disaster"
      ? "high"
      : hasHighSignal
        ? "medium"
        : "low";

  const reasonSummary = unique([
    suggestedDomain
      ? `Suggested domain: ${suggestedDomain.domainName} based on keywords like ${suggestedDomain.matchedSignals.join(", ")}.`
      : "No strong domain signal detected yet. A manual operator review may still be needed.",
    visualSignals.length
      ? `Image evidence contributed ${visualSignals.map((signal) => `${signal.label} (${(signal.confidence * 100).toFixed(0)}%)`).join(", ")}.`
      : "",
    hasSensitiveLocation ? "The location text suggests a sensitive area, so the complaint is treated as higher impact." : "",
    duplicateRisk !== "low" ? `Nearby complaint similarity suggests ${duplicateRisk} duplicate risk.` : "",
    input.mediaTypes?.length ? `Evidence includes ${input.mediaTypes.join(", ")} support, which improves routing confidence.` : "",
  ]).filter(Boolean);

  return {
    suggestedDomain,
    suggestedPriority,
    severityLevel,
    emergencyLikelihood,
    duplicateRisk,
    routeDepartmentCode: suggestedDomain
      ? domainRules.find((domain) => domain.id === suggestedDomain.domainId)?.departmentCode ?? null
      : null,
    routeDepartmentName: suggestedDomain
      ? domainRules.find((domain) => domain.id === suggestedDomain.domainId)?.departmentName ?? null
      : null,
    speechReady: true,
    visionReady: true,
    reasonSummary,
    matchedKeywords,
    duplicateMatches,
  };
}

export function analyzeComplaintForOperators(complaint: ComplaintMapItem | (ComplaintMapItem & { description?: string | null }), nearby: NearbyComplaintItem[]) {
  return analyzeDraft(
    {
      title: complaint.title,
      description: "description" in complaint ? complaint.description ?? undefined : undefined,
      addressLine: complaint.addressLine ?? undefined,
      landmark: complaint.landmark ?? undefined,
      latitude: Number(complaint.latitude),
      longitude: Number(complaint.longitude),
    },
    nearby,
  );
}
