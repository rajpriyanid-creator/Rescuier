import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../services/api';
import { getSocket, joinAdminRoom } from '../services/socket';
import { useAdminStore } from '../store/adminStore';
import {
  AlertTriangle, Users, Activity, CheckCircle,
  Loader2, RefreshCw, Radio, MapPin, X
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// ── Click-to-pin handler inside a Leaflet map ─────────────────────────────────
function EpicenterPinner({ onPin }: { onPin: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPin(e.latlng.lat, e.latlng.lng); } });
  return null;
}

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS: Record<string, string> = {
  safe: '#22c55e',
  need_help: '#ef4444',
  evacuating: '#f97316',
  shelter: '#3b82f6',
  checkin: '#8b5cf6',
};

const SOS_COLORS: Record<string, string> = {
  critical: '#dc2626',
  urgent: '#ea580c',
  standard: '#2563eb',
};

export default function DashboardPage() {
  const { activeEvent, setActiveEvent, locationPins, upsertPin, sosQueue, setSosQueue, analytics, setAnalytics } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'flood',
    severity: 'critical',
    description: '',
    instructions: '',
  });
  // Epicenter — set by clicking on the mini map
  const [pinnedEpicenter, setPinnedEpicenter] = useState<{ lat: number; lng: number } | null>(null);
  // Safe zones — loaded from DB markers, admin checks which to seed
  const [dbSafeZones, setDbSafeZones] = useState<any[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<Set<string>>(new Set());
  const [loadingZones, setLoadingZones] = useState(false);
  const [declareResult, setDeclareResult] = useState<{ usersNotified: number } | null>(null);
  const [declaring, setDeclaring] = useState(false);
  const [resolving, setResolving] = useState(false);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    loadInitialData();
    setupSocket();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const profileRes = await api.get('/user/profile');
      const userCity = profileRes.data.user.city;
      setCity(userCity);
      useAdminStore.getState().setCurrentUser(profileRes.data.user);

      await Promise.all([
        fetchEvent(userCity),
        fetchLocations(),
        fetchSOS(),
        fetchAnalytics(),
      ]);

      joinAdminRoom(userCity);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvent = async (cityId?: string) => {
    try {
      const res = await api.get('/events/active');
      setActiveEvent(res.data.event);
    } catch {}
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/admin/users/locations');
      for (const loc of res.data.locations || []) {
        upsertPin({
          userId: loc.userId?._id || loc.userId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          status: loc.status,
          name: loc.userId?.name,
          disasterId: loc.userId?.disasterId,
          timestamp: new Date(loc.timestamp).getTime(),
        });
      }
    } catch {}
  };

  const fetchSOS = async () => {
    try {
      const res = await api.get('/admin/sos');
      setSosQueue(res.data.sos || []);
    } catch {}
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data);
    } catch {}
  };

  const refreshData = () => {
    fetchLocations();
    fetchSOS();
    fetchAnalytics();
  };

  const setupSocket = () => {
    const socket = socketRef.current;
    socket.on('location:update', (data: any) => {
      upsertPin({ ...data, timestamp: Date.now() });
    });
    socket.on('sos:new', (data: any) => {
      setSosQueue([data.sos, ...sosQueue]);
    });
    socket.on('disaster:declared', (data: any) => {
      fetchEvent(data.city);
    });
  };

  const declareEvent = async (type: string, severity: string) => {
    if (!city) return;
    try {
      await api.post('/admin/event/declare', { type, severity, city });
      await fetchEvent(city);
    } catch (e) {
      console.error('Declare event error:', e);
    }
  };

  // Load safe_zone markers from DB when modal opens
  const openAnnounceModal = async () => {
    setShowAnnounceModal(true);
    setPinnedEpicenter(null);
    setSelectedZoneIds(new Set());
    if (!city) return;
    setLoadingZones(true);
    try {
      const res = await api.get(`/markers/${city}`);
      const zones = (res.data.markers || []).filter((m: any) =>
        ['safe_zone', 'shelter', 'hospital', 'high_ground', 'relief_camp'].includes(m.type)
      );
      setDbSafeZones(zones);
      // Auto-select all by default
      setSelectedZoneIds(new Set(zones.map((z: any) => z._id)));
    } catch {
      setDbSafeZones([]);
    } finally {
      setLoadingZones(false);
    }
  };

  const toggleZone = (id: string) => {
    setSelectedZoneIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAnnounceDisaster = async (data: typeof formData) => {
    if (!city || declaring) return;
    setDeclaring(true);
    try {
      const payload: any = {
        type: data.type,
        severity: data.severity,
        description: data.description,
        instructions: data.instructions,
        city,
      };
      // Epicenter from map pin
      if (pinnedEpicenter) {
        payload.epicenterLat = pinnedEpicenter.lat;
        payload.epicenterLng = pinnedEpicenter.lng;
      }
      // Safe zones from DB selection
      const chosen = dbSafeZones.filter(z => selectedZoneIds.has(z._id));
      if (chosen.length > 0) {
        payload.safeZones = chosen.map(z => ({
          name: z.name || z.label || z.type,
          latitude: z.latitude,
          longitude: z.longitude,
          capacity: z.info?.capacity ?? 500,
        }));
      }
      const res = await api.post('/admin/event/declare', payload);
      setDeclareResult({ usersNotified: res.data.usersNotified ?? 0 });
      await fetchEvent(city);
      await fetchLocations();
    } catch (e) {
      console.error('Declare event error:', e);
      alert('Failed to declare disaster. Check connection.');
    } finally {
      setDeclaring(false);
    }
  };

  const resolveEvent = async () => {
    if (!activeEvent || resolving) return;
    setResolving(true);
    try {
      await api.put(`/admin/event/${activeEvent._id}/resolve`);
      setActiveEvent(null);
    } catch (e) {
      console.error('Resolve error:', e);
      alert('Failed to resolve event.');
    } finally {
      setResolving(false);
    }
  };

  const pins = Object.values(locationPins);
  const activeSOS = sosQueue.filter((s) => s.status !== 'resolved' && s.status !== 'cancelled');
  const mapCenter: [number, number] = pins.length > 0
    ? [pins[0].latitude, pins[0].longitude]
    : [11.6643, 78.1460]; // Salem, TN default

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Map (main area) */}
      <div className="flex-1 flex flex-col">
        {/* Event Banner */}
        {activeEvent ? (
          <div className="bg-red-900/40 border-b border-red-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="text-red-300 text-sm font-semibold">
                ACTIVE: {activeEvent.type.toUpperCase()} ({activeEvent.severity}) — {activeEvent.city}
              </span>
            </div>
            <button
              onClick={resolveEvent}
              disabled={resolving}
              className="text-xs text-red-400 hover:text-white border border-red-700 hover:border-red-400 px-2 py-1 rounded transition-colors disabled:opacity-50"
            >
              {resolving ? 'Resolving…' : 'Mark Resolved'}
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/50 border-b border-disaster-border px-4 py-2 flex items-center justify-between">
            <span className="text-slate-400 text-xs">No active event in {city || 'your city'}.</span>
            <button
              onClick={openAnnounceModal}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1 rounded transition-colors flex items-center gap-1"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Announce Disaster
            </button>
          </div>
        )}

        {/* Analytics strip */}
        {analytics && (
          <div className="grid grid-cols-6 border-b border-disaster-border text-center">
            {[
              { label: 'Total Users', value: analytics.totalUsers, icon: Users, color: 'text-blue-400' },
              { label: 'Active (30m)', value: analytics.activeUsers, icon: Activity, color: 'text-green-400' },
              { label: 'Total SOS', value: analytics.totalSOS, icon: AlertTriangle, color: 'text-red-400' },
              { label: 'Resolved SOS', value: analytics.resolvedSOS, icon: CheckCircle, color: 'text-green-400' },
              { label: 'Volunteers', value: analytics.volunteers, icon: Users, color: 'text-purple-400' },
              { label: 'Missing', value: analytics.missing, icon: AlertTriangle, color: 'text-yellow-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="py-2 px-3 border-r border-disaster-border last:border-r-0">
                <Icon className={`w-4 h-4 ${color} mx-auto mb-0.5`} />
                <div className="text-lg font-bold text-white">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Leaflet Map */}
        <div className="flex-1">
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {/* User location pins */}
            {pins.map((pin) => (
              <CircleMarker
                key={pin.userId}
                center={[pin.latitude, pin.longitude]}
                radius={7}
                fillColor={STATUS_COLORS[pin.status] || '#94a3b8'}
                color="#fff"
                weight={1.5}
                fillOpacity={0.9}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{pin.name || 'Unknown'}</p>
                    <p className="text-gray-500 text-xs">{pin.disasterId}</p>
                    <p className="capitalize mt-1">Status: <strong>{pin.status}</strong></p>
                    <p className="text-xs text-gray-400">
                      {new Date(pin.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* SOS markers */}
            {activeSOS.map((sos) => (
              <CircleMarker
                key={sos._id}
                center={[sos.latitude, sos.longitude]}
                radius={12}
                fillColor={SOS_COLORS[sos.priority] || '#ea580c'}
                color="#fff"
                weight={2}
                fillOpacity={0.85}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-red-600">🆘 SOS — {sos.type}</p>
                    <p>Priority: <strong>{sos.priority}</strong></p>
                    <p>Status: {sos.status}</p>
                    {sos.description && <p className="text-gray-600 text-xs mt-1">{sos.description}</p>}
                    <p className="text-xs text-gray-400">{sos.sosId}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Right sidebar — SOS Queue */}
      <div className="w-72 flex flex-col bg-disaster-panel border-l border-disaster-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-disaster-border">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            SOS Queue ({activeSOS.length})
          </span>
          <button onClick={refreshData} className="text-slate-400 hover:text-white">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-disaster-border">
          {activeSOS.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No active SOS</div>
          ) : (
            activeSOS.map((sos) => (
              <SOSCard key={sos._id} sos={sos} onRefresh={fetchSOS} />
            ))
          )}
        </div>
      </div>

      {/* Announce Disaster Modal */}
      {declareResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
          <div className="bg-disaster-panel border border-green-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
            <div className="text-4xl mb-3">📡</div>
            <h2 className="text-lg font-bold text-white mb-2">Disaster Declared & Broadcast!</h2>
            <p className="text-slate-300 text-sm mb-1">City-wide alert sent to all users.</p>
            <p className="text-green-400 font-bold text-xl mb-4">{declareResult.usersNotified} users notified</p>
            <p className="text-slate-500 text-xs mb-4">Neo4j hazard zone seeded. Users will receive evacuation routes automatically.</p>
            <button onClick={() => setDeclareResult(null)} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors">Done</button>
          </div>
        </div>
      )}

      {showAnnounceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
          <div className="bg-disaster-panel border border-disaster-border w-full max-w-lg rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center gap-2 mb-4 border-b border-disaster-border pb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-bold text-white">Declare Disaster & Broadcast to City</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Disaster Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-800 border border-disaster-border text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-red-500">
                    {['flood', 'earthquake', 'cyclone', 'storm', 'tsunami', 'fire', 'custom'].map((t) => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Severity Level</label>
                  <select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full bg-slate-800 border border-disaster-border text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-red-500">
                    {['low', 'moderate', 'high', 'critical'].map((s) => (
                      <option key={s} value={s} className="capitalize">{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description / Situation Details</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the ongoing crisis..." rows={2}
                  className="w-full bg-slate-800 border border-disaster-border text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-red-500 resize-none placeholder-slate-500" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Public Safety Instructions</label>
                <textarea value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Actions citizens should take (e.g. evacuate to higher ground)..." rows={2}
                  className="w-full bg-slate-800 border border-disaster-border text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-red-500 resize-none placeholder-slate-500" />
              </div>

              {/* ── Epicenter: click-to-pin on mini map ──────────────────── */}
              <div className="border border-orange-800/50 rounded-xl overflow-hidden bg-orange-900/10">
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                  <p className="text-xs font-semibold text-orange-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Pin Epicenter / Hazard Centre
                  </p>
                  {pinnedEpicenter && (
                    <button onClick={() => setPinnedEpicenter(null)}
                      className="text-slate-500 hover:text-white transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {pinnedEpicenter ? (
                  <p className="px-3 pb-2 text-xs text-orange-300 font-mono">
                    {pinnedEpicenter.lat.toFixed(5)}, {pinnedEpicenter.lng.toFixed(5)}
                    <span className="text-slate-500 ml-2">— click map to move</span>
                  </p>
                ) : (
                  <p className="px-3 pb-2 text-xs text-slate-500">Click anywhere on the map below to mark the disaster epicentre</p>
                )}
                {/* Mini Leaflet map inside modal */}
                <div style={{ height: 200 }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <EpicenterPinner onPin={(lat, lng) => setPinnedEpicenter({ lat, lng })} />
                    {pinnedEpicenter && (
                      <Marker position={[pinnedEpicenter.lat, pinnedEpicenter.lng]} />
                    )}
                  </MapContainer>
                </div>
              </div>

              {/* ── Safe Zones: auto-loaded from DB markers ───────────────── */}
              <div className="border border-green-800/50 rounded-xl p-3 bg-green-900/10">
                <p className="text-xs font-semibold text-green-400 mb-2">
                  🟢 Safe Zones — seed into Neo4j for evacuation routing
                </p>
                {loadingZones ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading shelters from database…
                  </div>
                ) : dbSafeZones.length === 0 ? (
                  <p className="text-xs text-slate-500 py-1">
                    No safe_zone / shelter markers found in DB for <strong className="text-slate-300">{city}</strong>.
                    Add map markers of type <em>safe_zone</em> first.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {dbSafeZones.map((z) => (
                      <label key={z._id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedZoneIds.has(z._id) ? 'bg-green-900/40 border border-green-700' : 'bg-slate-800/60 border border-slate-700'
                        }`}>
                        <input type="checkbox" checked={selectedZoneIds.has(z._id)}
                          onChange={() => toggleZone(z._id)}
                          className="accent-green-500 w-3.5 h-3.5" />
                        <span className="text-lg leading-none">
                          {z.type === 'hospital' ? '🏥' : z.type === 'high_ground' ? '⛰️' : z.type === 'shelter' ? '🏠' : '🟢'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{z.name || z.label || z.type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-slate-400">{z.latitude?.toFixed(4)}, {z.longitude?.toFixed(4)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-600 mt-2">
                  {selectedZoneIds.size}/{dbSafeZones.length} zones selected — all will be seeded into Neo4j graph
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAnnounceModal(false)}
                  className="flex-1 bg-slate-850 hover:bg-slate-800 border border-disaster-border text-slate-300 font-semibold py-2 rounded-lg transition-colors text-sm">
                  Cancel
                </button>
                <button disabled={declaring}
                  onClick={async () => {
                    await handleAnnounceDisaster(formData);
                    setShowAnnounceModal(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                  {declaring ? (<><Loader2 className="w-4 h-4 animate-spin" /> Broadcasting…</>) : '🚨 Declare & Broadcast to City'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SOSCard({ sos, onRefresh }: { sos: any; onRefresh: () => void }) {
  const [claiming, setClaiming] = useState(false);

  const claim = async () => {
    setClaiming(true);
    try {
      await api.put(`/sos/${sos._id}/claim`);
      onRefresh();
    } catch {}
    setClaiming(false);
  };

  const resolve = async () => {
    try {
      await api.put(`/sos/${sos._id}/resolve`);
      onRefresh();
    } catch {}
  };

  const priorityClass = sos.priority === 'critical'
    ? 'border-l-red-500'
    : sos.priority === 'urgent'
    ? 'border-l-orange-500'
    : 'border-l-blue-500';

  return (
    <div className={`px-3 py-2.5 border-l-2 ${priorityClass}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-white capitalize">{sos.type}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          sos.priority === 'critical' ? 'badge-critical' : sos.priority === 'urgent' ? 'badge-urgent' : 'badge-standard'
        }`}>
          {sos.priority}
        </span>
      </div>
      {sos.description && (
        <p className="text-xs text-slate-400 mb-1 truncate">{sos.description}</p>
      )}
      <p className="text-xs text-slate-500 mb-2">
        {sos.userId?.name || 'Unknown'} · {new Date(sos.createdAt).toLocaleTimeString()}
      </p>
      <div className="flex gap-1.5">
        {sos.status === 'sent' && (
          <button
            onClick={claim}
            disabled={claiming}
            className="flex-1 text-xs bg-blue-700 hover:bg-blue-600 text-white py-1 rounded transition-colors"
          >
            Claim
          </button>
        )}
        {['assigned', 'on_scene'].includes(sos.status) && (
          <button
            onClick={resolve}
            className="flex-1 text-xs bg-green-700 hover:bg-green-600 text-white py-1 rounded transition-colors"
          >
            Resolve
          </button>
        )}
        <span className="text-xs text-slate-500 py-1 px-1 capitalize">{sos.status}</span>
      </div>
    </div>
  );
}
