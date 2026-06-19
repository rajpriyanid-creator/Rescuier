import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Pin { userId: string; latitude: number; longitude: number; status: string; name?: string; disasterId?: string; }
interface Marker { _id: string; type: string; latitude: number; longitude: number; label?: string; }
interface SOSItem { _id: string; latitude: number; longitude: number; type: string; priority: string; status: string; }

interface Props { pins: Pin[]; markers: Marker[]; sosList: SOSItem[]; center?: [number, number]; }

const STATUS_COLOR: Record<string, string> = {
  safe: '#22c55e', need_help: '#dc2626', evacuating: '#f59e0b', shelter: '#3b82f6', unknown: '#64748b',
};
const PRIORITY_COLOR: Record<string, string> = { critical: '#dc2626', urgent: '#f59e0b', standard: '#3b82f6' };

export function AdminMap({ pins, markers, sosList, center = [20.5937, 78.9629] }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current).setView(center, 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19,
    }).addTo(mapRef.current);
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Clear existing layers (keep tile layer)
    map.eachLayer((layer) => { if (!(layer instanceof L.TileLayer)) map.removeLayer(layer); });

    // User location pins
    pins.forEach((pin) => {
      const color = STATUS_COLOR[pin.status] ?? '#64748b';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 6px ${color}88"></div>`,
        iconSize: [14, 14],
      });
      L.marker([pin.latitude, pin.longitude], { icon })
        .bindPopup(`<b>${pin.name ?? 'User'}</b><br>${pin.disasterId ?? ''}<br>Status: ${pin.status}`)
        .addTo(map);
    });

    // SOS markers
    sosList.filter((s) => s.status !== 'resolved').forEach((sos) => {
      const color = PRIORITY_COLOR[sos.priority] ?? '#dc2626';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:4px;background:${color};display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid #fff;box-shadow:0 0 8px ${color}">🆘</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      L.marker([sos.latitude, sos.longitude], { icon })
        .bindPopup(`<b>SOS — ${sos.type}</b><br>Priority: ${sos.priority}<br>Status: ${sos.status}`)
        .addTo(map);
    });

    // Map markers (safe zones, resources, etc.)
    markers.forEach((m) => {
      const MARKER_EMOJI: Record<string, string> = {
        safe_zone: '🟢', water_point: '💧', medical: '🏥', high_ground: '⛰️',
        relief_camp: '🏫', food_station: '🍱', hazard: '⚠️',
      };
      const emoji = MARKER_EMOJI[m.type] ?? '📍';
      const icon = L.divIcon({ className: '', html: `<div style="font-size:20px;line-height:1">${emoji}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] });
      L.marker([m.latitude, m.longitude], { icon })
        .bindPopup(`<b>${m.label ?? m.type.replace('_', ' ')}</b>`)
        .addTo(map);
    });
  }, [pins, markers, sosList]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }} />;
}
