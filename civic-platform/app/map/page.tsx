import { AppShell } from "@/components/app-shell";
import { IssueMapBoard } from "@/components/issue-map-board";
import { getCurrentUser } from "@/lib/auth";
import {
  getMapComplaints,
  getPublicHotspots,
  type ComplaintHotspotItem,
  type ComplaintMapItem,
} from "@/lib/api";

const fallbackComplaints: ComplaintMapItem[] = [];
const fallbackHotspots: ComplaintHotspotItem[] = [];

export default async function MapPage() {
  const user = await getCurrentUser();
  const mapboxToken = process.env.MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const isOperationsView =
    user?.role === "department_operator" || user?.role === "municipal_admin" || user?.role === "field_officer";

  let complaints = fallbackComplaints;
  let hotspots = fallbackHotspots;

  try {
    [complaints, hotspots] = await Promise.all([
      getMapComplaints({ publicOnly: !isOperationsView }),
      getPublicHotspots(),
    ]);
  } catch {
    complaints = fallbackComplaints;
    hotspots = fallbackHotspots;
  }

  return (
    <AppShell>
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">
          {isOperationsView ? "Operations map" : "Public map"}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-civic-text">
          {isOperationsView
            ? "Monitor live civic issue activity with city-wide visibility."
            : "Explore active civic issues and hotspots across the city."}
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-civic-muted">
          {isOperationsView
            ? "Use the live operations map to spot workload clusters, emergency incidents, and active complaint zones."
            : "Residents can browse public-safe complaint activity, see active clusters, and understand where issues are already being addressed."}
        </p>
      </section>

      <IssueMapBoard
        complaints={complaints}
        hotspots={hotspots}
        mapboxToken={mapboxToken}
        mode={isOperationsView ? "operations" : "public"}
      />
    </AppShell>
  );
}
