"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const INDIA_CENTER: [number, number] = [22.9734, 78.6569];

const DEFAULT_ICON_URL = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const DEFAULT_ICON_2X_URL = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const DEFAULT_SHADOW_URL = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: DEFAULT_ICON_2X_URL,
  iconUrl: DEFAULT_ICON_URL,
  shadowUrl: DEFAULT_SHADOW_URL,
});

type LocationPickerProps = {
  latitude: number;
  longitude: number;
  center?: [number, number];
  onPick: (latitude: number, longitude: number) => void;
  selectedLocation?: string;
};

function MapClickListener({ onPick }: { onPick: LocationPickerProps["onPick"] }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function RecenterOnChange({
  latitude,
  longitude,
  center,
}: {
  latitude: number;
  longitude: number;
  center: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 13), { animate: true });
      return;
    }

    if (center) {
      map.setView(center, 7, { animate: true });
    }
  }, [center, latitude, longitude, map]);

  return null;
}

export default function LocationPicker({ latitude, longitude, center, onPick, selectedLocation }: LocationPickerProps) {
  const hasPoint =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);
  const mapCenter: [number, number] = center || (hasPoint ? [latitude, longitude] : INDIA_CENTER);

  return (
    <div
      style={{
        position: "relative",
        height: 420,
        width: "100%",
        borderRadius: 24,
        overflow: "hidden",
        border: "1px solid rgba(224, 172, 31, 0.18)",
        boxShadow: "0 18px 40px rgba(15,23,42,0.10)",
      }}
    >
      <MapContainer
        center={mapCenter}
        zoom={hasPoint ? 13 : 5}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: "100%", width: "100%", background: "#eef3f8" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapClickListener onPick={onPick} />
        <RecenterOnChange latitude={latitude} longitude={longitude} center={mapCenter} />
        {hasPoint && (
          <Marker
            position={[latitude, longitude]}
            draggable
            eventHandlers={{
              dragend: (event: L.LeafletEvent) => {
                const marker = event.target as L.Marker;
                const markerLatLng = marker.getLatLng();
                onPick(markerLatLng.lat, markerLatLng.lng);
              },
            }}
          />
        )}
      </MapContainer>

      <div
        style={{
          position: "absolute",
          left: 14,
          top: 14,
          zIndex: 500,
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(224, 172, 31, 0.18)",
          boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
          borderRadius: 16,
          padding: "12px 14px",
          maxWidth: 280,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: "#a06f00", letterSpacing: 1.2, textTransform: "uppercase" }}>
          Detailed location map
        </div>
        <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5, color: "#5f6b7a" }}>
          Search a street, locality, landmark, or house number, then click or drag the marker to fine-tune the point.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 14,
          zIndex: 500,
          background: "rgba(17, 24, 39, 0.90)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 18px 36px rgba(15,23,42,0.22)",
          borderRadius: 18,
          padding: "12px 14px",
          color: "#ffffff",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.3, textTransform: "uppercase", color: "#f3be27" }}>
          Selected location
        </div>
        <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, fontWeight: 600 }}>
          {selectedLocation || "No detailed location selected yet"}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
          Lat {Number(latitude).toFixed(6)} | Long {Number(longitude).toFixed(6)}
        </div>
      </div>
    </div>
  );
}
