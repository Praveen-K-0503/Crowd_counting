"use client";

import { useEffect, useMemo } from "react";
import type { LeafletMouseEvent } from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

type LocationPickerMapProps = {
  latitude: number;
  longitude: number;
  onSelect: (latitude: number, longitude: number) => void;
};

function ClickHandler({ onSelect }: { onSelect: LocationPickerMapProps["onSelect"] }) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

export function LocationPickerMap({ latitude, longitude, onSelect }: LocationPickerMapProps) {
  const center = useMemo<[number, number]>(() => [latitude, longitude], [latitude, longitude]);

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200">
      <MapContainer center={center} zoom={16} scrollWheelZoom={false} className="h-80 w-full bg-slate-100">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={center}
          pathOptions={{
            color: "#0F4C81",
            fillColor: "#14B8A6",
            fillOpacity: 0.9,
            weight: 3,
          }}
          radius={12}
        />
        <RecenterMap center={center} />
        <ClickHandler onSelect={onSelect} />
      </MapContainer>
    </div>
  );
}
