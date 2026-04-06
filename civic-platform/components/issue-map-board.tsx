"use client";

import { useMemo, useState } from "react";
import Map, { Source, Layer, Marker, NavigationControl, Popup as MapboxPopup } from "react-map-gl/mapbox";
import { Filter, MapPinned, Siren } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LiveSyncBadge } from "@/components/live-sync-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import type { ComplaintHotspotItem, ComplaintMapItem } from "@/lib/api";

type IssueMapBoardProps = {
  complaints: ComplaintMapItem[];
  hotspots: ComplaintHotspotItem[];
  mode: "public" | "operations";
  mapboxToken?: string;
};

function markerColor(priority: string, isEmergency: boolean) {
  if (isEmergency || priority === "P1") {
    return "#DC2626";
  }

  if (priority === "P2") {
    return "#F59E0B";
  }

  if (priority === "P3") {
    return "#14B8A6";
  }

  return "#0F4C81";
}

function heatColor(count: number, emergencyCount: number) {
  if (emergencyCount > 0) return "#DC2626";
  if (count >= 12) return "#B91C1C";
  if (count >= 8) return "#F97316";
  if (count >= 4) return "#F59E0B";
  return "#14B8A6";
}

function heatLabel(count: number) {
  if (count >= 12) return "Very high";
  if (count >= 8) return "High";
  if (count >= 4) return "Medium";
  return "Low";
}

export function IssueMapBoard({ complaints, hotspots, mode, mapboxToken }: IssueMapBoardProps) {
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [showEmergenciesOnly, setShowEmergenciesOnly] = useState(false);
  const [showHeatLayer, setShowHeatLayer] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const matchesStatus = selectedStatus === "All" || complaint.status === selectedStatus;
      const matchesPriority = selectedPriority === "All" || complaint.priorityLevel === selectedPriority;
      const matchesEmergency = !showEmergenciesOnly || complaint.isEmergency;

      return matchesStatus && matchesPriority && matchesEmergency;
    });
  }, [complaints, selectedPriority, selectedStatus, showEmergenciesOnly]);

  const center = useMemo<{ latitude: number; longitude: number }>(() => {
    const source = filteredComplaints[0] ?? complaints[0];

    if (!source) {
      return { latitude: 13.0827, longitude: 80.2707 }; // Chennai default
    }

    return { latitude: Number(source.latitude), longitude: Number(source.longitude) };
  }, [complaints, filteredComplaints]);

  const [popupInfo, setPopupInfo] = useState<ComplaintMapItem | null>(null);

  const stats = [
    { label: "Visible issues", value: String(filteredComplaints.length) },
    { label: "Emergency", value: String(filteredComplaints.filter((item) => item.isEmergency).length) },
    { label: "Hotspots", value: String(hotspots.length) },
  ];

  const tileLayer = mapboxToken
    ? {
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap',
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
        tileSize: 512,
        zoomOffset: -1,
      }
    : {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        tileSize: 256,
        zoomOffset: 0,
      };

  return (
    <section className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
      <aside className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">
                {mode === "public" ? "Public map" : "Operations map"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-civic-text">
                {mode === "public" ? "Live civic issues across the city" : "Live complaint visibility for operations"}
              </h2>
            </div>
            <LiveSyncBadge label={mode === "public" ? "Public map refresh" : "Operations map refresh"} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-civic-text">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-civic-text">Status</p>
              <div className="flex flex-wrap gap-2">
                {["All", "submitted", "assigned", "accepted", "in_progress", "resolved", "reopened"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatus(status)}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      selectedStatus === status ? "bg-civic-primary text-white" : "bg-slate-100 text-slate-700",
                    ].join(" ")}
                  >
                    {status === "All" ? status : status.replaceAll("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-civic-text">Priority</p>
              <div className="flex flex-wrap gap-2">
                {["All", "P1", "P2", "P3", "P4"].map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setSelectedPriority(priority)}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      selectedPriority === priority ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700",
                    ].join(" ")}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEmergenciesOnly((current) => !current)}
              className={[
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                showEmergenciesOnly ? "bg-civic-danger text-white" : "bg-slate-100 text-slate-700",
              ].join(" ")}
            >
              <Siren className="h-4 w-4" />
              {showEmergenciesOnly ? "Showing emergency only" : "Show emergency only"}
            </button>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowHeatLayer((current) => !current)}
                className={[
                  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                  showHeatLayer ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700",
                ].join(" ")}
              >
                {showHeatLayer ? "Heat layer on" : "Heat layer off"}
              </button>
              <button
                type="button"
                onClick={() => setShowMarkers((current) => !current)}
                className={[
                  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                  showMarkers ? "bg-civic-primary text-white" : "bg-slate-100 text-slate-700",
                ].join(" ")}
              >
                {showMarkers ? "Markers on" : "Markers off"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-secondary/15 text-civic-secondary">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">Hotspots</p>
              <h2 className="text-xl font-semibold text-civic-text">Active clusters</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {hotspots.length === 0 ? (
              <EmptyState
                icon={MapPinned}
                title="No hotspots right now"
                description="Hotspots will appear once multiple nearby issues are reported."
              />
            ) : (
              hotspots.map((hotspot) => (
                <div key={hotspot.hotspotKey} className="rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-civic-text">{hotspot.topDomain ?? "Mixed issues"}</p>
                      <p className="mt-1 text-sm text-civic-muted">
                        {hotspot.complaintCount} issues, {hotspot.criticalCount} critical, {hotspot.emergencyCount} emergency
                      </p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: heatColor(hotspot.complaintCount, hotspot.emergencyCount) }}
                    >
                      {heatLabel(hotspot.complaintCount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm">
        {filteredComplaints.length === 0 ? (
          <div className="p-3">
            <EmptyState
              icon={MapPinned}
              title="No complaints match this map view"
              description="Try adjusting the filters to bring issue markers back into view."
            />
          </div>
        ) : (
          <div className="h-[42rem] w-full overflow-hidden rounded-[1.5rem] bg-slate-100">
            <Map
              mapboxAccessToken={mapboxToken || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""} // Use provided or public mapbox token
              initialViewState={{
                longitude: center.longitude,
                latitude: center.latitude,
                zoom: 12,
                pitch: 45,
                bearing: -17.6,
              }}
              mapStyle={mode === "operations" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
              terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
            >
              <Source
                id="mapbox-dem"
                type="raster-dem"
                url="mapbox://mapbox.mapbox-terrain-dem-v1"
                tileSize={512}
                maxzoom={14}
              />
              <NavigationControl />

              {showHeatLayer && hotspots.length > 0 && (
                <Source
                  id="hotspots"
                  type="geojson"
                  data={{
                    type: "FeatureCollection",
                    features: hotspots.map((h) => ({
                      type: "Feature",
                      geometry: { type: "Point", coordinates: [h.longitude, h.latitude] },
                      properties: { count: h.complaintCount, emergency: h.emergencyCount },
                    })),
                  }}
                >
                  <Layer
                    id="heatmap"
                    type="heatmap"
                    paint={{
                      "heatmap-weight": ["interpolate", ["linear"], ["get", "count"], 0, 0, 10, 1],
                      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
                      "heatmap-color": [
                        "interpolate",
                        ["linear"],
                        ["heatmap-density"],
                        0, "rgba(0,0,0,0)",
                        0.2, "#14B8A6",
                        0.5, "#F59E0B",
                        0.8, "#F97316",
                        1.0, "#DC2626",
                      ],
                      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 15, 30],
                      "heatmap-opacity": 0.8,
                    }}
                  />
                </Source>
              )}

              {showMarkers &&
                filteredComplaints.map((complaint) => (
                  <Marker
                    key={complaint.id}
                    longitude={Number(complaint.longitude)}
                    latitude={Number(complaint.latitude)}
                    onClick={(e: any) => {
                      e.originalEvent.stopPropagation();
                      setPopupInfo(complaint);
                    }}
                  >
                    <div
                      className="cursor-pointer rounded-full border-2 border-white shadow-md transition hover:scale-110"
                      style={{
                        backgroundColor: markerColor(complaint.priorityLevel, complaint.isEmergency),
                        width: complaint.isEmergency || complaint.priorityLevel === "P1" ? 22 : 16,
                        height: complaint.isEmergency || complaint.priorityLevel === "P1" ? 22 : 16,
                      }}
                    />
                  </Marker>
                ))}

              {popupInfo && (
                <MapboxPopup
                  longitude={Number(popupInfo.longitude)}
                  latitude={Number(popupInfo.latitude)}
                  anchor="bottom"
                  onClose={() => setPopupInfo(null)}
                  closeOnClick={false}
                >
                  <div className="min-w-60 space-y-3 p-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={popupInfo.status} />
                      <PriorityBadge priority={popupInfo.priorityLevel} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-civic-text">{popupInfo.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{popupInfo.domainName ?? "Domain pending"}</p>
                    </div>
                    <div className="text-sm text-slate-500">
                      {popupInfo.addressLine ?? popupInfo.landmark ?? popupInfo.wardName ?? "Map location"}
                    </div>
                  </div>
                </MapboxPopup>
              )}
            </Map>
          </div>
        )}

        <div className="mt-3 grid gap-3 rounded-[1.5rem] bg-slate-50 p-4 text-sm text-civic-muted sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Low", color: "#14B8A6" },
            { label: "Medium", color: "#F59E0B" },
            { label: "High", color: "#F97316" },
            { label: "Emergency / very high", color: "#DC2626" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
