import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, ScrollView, Alert, Modal, Switch, TextInput
} from 'react-native';

import MapView, { Marker, Circle, Callout, UrlTile, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { COLORS } from '../../utils/constants';

const MARKER_ICONS: Record<string, string> = {
  safe_zone: '🟢',
  water: '💧',
  hospital: '🏥',
  high_ground: '⛰️',
  shelter: '🏠',
  food: '🍱',
  hazard: '⚠️',
  fire_station: '🚒',
  police: '🚔',
  custom: '📍',
};

const FILTER_OPTIONS = ['all', 'safe_zone', 'hospital', 'shelter', 'water', 'hazard'];

const tileDir = `${FileSystem.documentDirectory}tiles/`;

const lon2tile = (lon: number, zoom: number) => {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
};

const lat2tile = (lat: number, zoom: number) => {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const { user, activeEvent, isOnline } = useAppStore();
  const { evacuationMode } = useLocalSearchParams<{ evacuationMode?: string }>();
  const [markers, setMarkers] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showResources, setShowResources] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<any | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  // Routing states
  const [navMode, setNavMode] = useState<'foot' | 'bicycle' | 'driving'>('foot');
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);
  const lastFetchedLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Evacuation mode (Neo4j)
  const [evacuationRoute, setEvacuationRoute] = useState<any>(null);
  const [evacuationPolyline, setEvacuationPolyline] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [hazardZones, setHazardZones] = useState<any[]>([]);
  const [isEvacuationMode, setIsEvacuationMode] = useState(false);
  const [fetchingEvacRoute, setFetchingEvacRoute] = useState(false);

  // Offline maps state
  const [currentRegion, setCurrentRegion] = useState<{
    latitude: number; longitude: number;
    latitudeDelta: number; longitudeDelta: number;
  } | null>(null);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const [useOfflineMode, setUseOfflineMode] = useState(false);
  const [downloadRadius, setDownloadRadius] = useState<'2km' | '5km' | '10km'>('5km');

  // Offline A→B navigation
  const [offlineNavFrom, setOfflineNavFrom] = useState('');
  const [offlineNavTo, setOfflineNavTo] = useState('');
  const [offlineNavMode, setOfflineNavMode] = useState<'foot' | 'bicycle' | 'driving'>('foot');
  const [offlineNavRoute, setOfflineNavRoute] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [offlineNavStats, setOfflineNavStats] = useState<{ dist: number; dur: number } | null>(null);
  const [offlineNavLoading, setOfflineNavLoading] = useState(false);
  const [offlineNavPolyline, setOfflineNavPolyline] = useState<Array<{ latitude: number; longitude: number }>>([]);

  useEffect(() => {
    initMap();
    checkCachedCount();
  }, []);

  // Auto-trigger evacuation route when navigated from home screen
  useEffect(() => {
    if (evacuationMode === '1' && userLocation && !evacuationRoute) {
      fetchEvacuationRoute();
    }
  }, [evacuationMode, userLocation]);

  const initMap = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setCurrentRegion(region);
        mapRef.current?.animateToRegion(region, 600);
      }
      await Promise.all([loadMarkers(), loadResources()]);
    } catch {} finally { setLoading(false); }
  };

  const checkCachedCount = async () => {
    const count = await getCachedTilesCount();
    setCachedCount(count);
  };

  const getCachedTilesCount = async (): Promise<number> => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(tileDir);
      if (!dirInfo.exists) return 0;
      
      let count = 0;
      const zDirs = await FileSystem.readDirectoryAsync(tileDir);
      for (const zDir of zDirs) {
        try {
          const xDirs = await FileSystem.readDirectoryAsync(`${tileDir}${zDir}/`);
          for (const xDir of xDirs) {
            try {
              const files = await FileSystem.readDirectoryAsync(`${tileDir}${zDir}/${xDir}/`);
              count += files.filter(f => f.endsWith('.png')).length;
            } catch {}
          }
        } catch {}
      }
      return count;
    } catch {
      return 0;
    }
  };

  const loadMarkers = async () => {
    if (!user?.city) return;
    try {
      const res = await api.get(`/markers/${user.city}`);
      setMarkers(res.data.markers || []);
    } catch {}
  };

  const loadResources = async () => {
    if (!activeEvent) return;
    try {
      const res = await api.get('/resources', { params: { eventId: activeEvent._id } });
      setResources(res.data.resources || []);
    } catch {}
  };

  const goToMyLocation = async () => {
    if (userLocation) {
      mapRef.current?.animateToRegion({
        ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02,
      }, 600);
    }
  };

  // ─── Neo4j Evacuation Route ────────────────────────────────────────────────
  const fetchEvacuationRoute = async () => {
    if (!userLocation) { Alert.alert('Location needed', 'Please allow location access.'); return; }
    setFetchingEvacRoute(true);
    try {
      const [routeRes, hazardRes] = await Promise.allSettled([
        api.get('/evacuation/route', {
          params: { latitude: userLocation.latitude, longitude: userLocation.longitude },
        }),
        api.get('/evacuation/hazards'),
      ]);

      if (hazardRes.status === 'fulfilled') {
        setHazardZones(hazardRes.value.data.hazards || []);
      }

      if (routeRes.status === 'fulfilled' && routeRes.value.data.route) {
        const route = routeRes.value.data.route;
        setEvacuationRoute(route);
        setIsEvacuationMode(true);

        // Build OSRM road route to the safe zone
        const dest = route.safeZone;
        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${userLocation.longitude},${userLocation.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`;
          const osrmRes = await fetch(osrmUrl);
          const osrmData = await osrmRes.json();
          if (osrmData.code === 'Ok' && osrmData.routes?.length > 0) {
            const coords = osrmData.routes[0].geometry.coordinates.map((c: [number, number]) => ({
              latitude: c[1], longitude: c[0],
            }));
            setEvacuationPolyline(coords);
          } else {
            setEvacuationPolyline(route.waypoints.map((wp: any) => ({ latitude: wp.latitude, longitude: wp.longitude })));
          }
        } catch {
          setEvacuationPolyline(route.waypoints.map((wp: any) => ({ latitude: wp.latitude, longitude: wp.longitude })));
        }

        // Fit map to show full evacuation route
        const allCoords = [userLocation, { latitude: dest.latitude, longitude: dest.longitude }];
        mapRef.current?.fitToCoordinates(allCoords, {
          edgePadding: { top: 120, bottom: 280, left: 60, right: 60 }, animated: true,
        });
      } else {
        Alert.alert('No Safe Zone Found', routeRes.status === 'fulfilled'
          ? (routeRes.value.data.message || 'No registered safe zones near you.')
          : 'Could not fetch evacuation route. Check connection.');
      }
    } catch (e) {
      console.error('[fetchEvacuationRoute]', e);
      Alert.alert('Error', 'Failed to compute evacuation route.');
    } finally {
      setFetchingEvacRoute(false);
    }
  };

  const clearEvacuationMode = () => {
    setIsEvacuationMode(false);
    setEvacuationRoute(null);
    setEvacuationPolyline([]);
    setHazardZones([]);
  };


  // ── Geocode a place name via Nominatim ─────────────────────────────────────
  const geocode = async (query: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'DisasterMeshApp/1.0' } });
      const data = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      return null;
    } catch { return null; }
  };

  // ── Hazard-aware offline A→B routing ──────────────────────────────────
  // Computes route via OSRM, adding waypoints to skirt around admin hazard zones
  const computeHazardAwareRoute = async (
    fromLat: number, fromLng: number,
    toLat: number, toLng: number,
    mode: 'foot' | 'bicycle' | 'driving'
  ): Promise<{ coords: Array<{ latitude: number; longitude: number }>; dist: number; dur: number }> => {
    // Fetch active hazard zones from admin markers
    let hazards: Array<{ lat: number; lng: number; radius: number }> = [];
    try {
      const mRes = await api.get(`/markers/${user?.city}`);
      hazards = (mRes.data.markers || [])
        .filter((m: any) => m.type === 'hazard' && m.info?.radius)
        .map((m: any) => ({ lat: m.latitude, lng: m.longitude, radius: m.info.radius as number }));
    } catch {}

    // Build waypoints: for each hazard on the straight-line path, add a detour point
    const midpoints: Array<[number, number]> = [];
    for (const h of hazards) {
      // Check if straight line path passes within hazard radius
      const dFromSrc = haversineM(fromLat, fromLng, h.lat, h.lng);
      const dToSrc = haversineM(fromLat, fromLng, toLat, toLng);
      const dToHazard = haversineM(toLat, toLng, h.lat, h.lng);
      // Rough check: hazard is between src and dest and close to path
      if (dFromSrc + dToHazard < dToSrc * 1.4 && dFromSrc < dToSrc) {
        // Offset 90° perpendicular from path at hazard center + radius + 20% buffer
        const bearing = getBearing(fromLat, fromLng, toLat, toLng);
        const perpBearing = (bearing + 90) % 360;
        const offsetM = h.radius * 1.3;
        const R = 6371000;
        const offLat = h.lat + (offsetM / R) * (180 / Math.PI) * Math.cos(perpBearing * Math.PI / 180);
        const offLng = h.lng + (offsetM / R) * (180 / Math.PI) / Math.cos(h.lat * Math.PI / 180) * Math.sin(perpBearing * Math.PI / 180);
        midpoints.push([offLat, offLng]);
      }
    }

    // Build OSRM coordinate string: from ; [waypoints] ; to
    const waypointStr = midpoints.map(([la, lo]) => `${lo},${la}`).join(';');
    const coordStr = `${fromLng},${fromLat}${waypointStr ? ';' + waypointStr : ''};${toLng},${toLat}`;
    const url = `https://router.project-osrm.org/route/v1/${mode}/${coordStr}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.length > 0) {
        const route = data.routes[0];
        return {
          coords: route.geometry.coordinates.map((c: [number, number]) => ({ latitude: c[1], longitude: c[0] })),
          dist: route.distance,
          dur: route.duration,
        };
      }
    } catch {}

    // Fallback: straight line with hazard midpoints
    const fallbackCoords = [
      { latitude: fromLat, longitude: fromLng },
      ...midpoints.map(([la, lo]) => ({ latitude: la, longitude: lo })),
      { latitude: toLat, longitude: toLng },
    ];
    const dist = haversineM(fromLat, fromLng, toLat, toLng);
    const speed = mode === 'foot' ? 1.4 : mode === 'bicycle' ? 4.5 : 12;
    return { coords: fallbackCoords, dist, dur: dist / speed };
  };

  const startOfflineNav = async () => {
    if (!offlineNavFrom.trim() || !offlineNavTo.trim()) {
      Alert.alert('Enter both locations', 'Type a start and destination to navigate.');
      return;
    }
    setOfflineNavLoading(true);
    setOfflineNavPolyline([]);
    setOfflineNavStats(null);
    try {
      // Geocode both addresses
      const [fromCoord, toCoord] = await Promise.all([
        offlineNavFrom.toLowerCase() === 'my location' && userLocation
          ? Promise.resolve({ lat: userLocation.latitude, lng: userLocation.longitude })
          : geocode(`${offlineNavFrom}, ${user?.city || ''}`),
        geocode(`${offlineNavTo}, ${user?.city || ''}`),
      ]);

      if (!fromCoord) { Alert.alert('Not found', `Could not locate: "${offlineNavFrom}"`); return; }
      if (!toCoord)   { Alert.alert('Not found', `Could not locate: "${offlineNavTo}"`); return; }

      const result = await computeHazardAwareRoute(
        fromCoord.lat, fromCoord.lng, toCoord.lat, toCoord.lng, offlineNavMode
      );

      setOfflineNavPolyline(result.coords);
      setOfflineNavStats({ dist: result.dist, dur: result.dur });

      // Show the route on map
      mapRef.current?.fitToCoordinates(result.coords, {
        edgePadding: { top: 120, bottom: 300, left: 60, right: 60 }, animated: true,
      });
    } catch (e) {
      Alert.alert('Routing failed', 'Could not compute route. Check your connection.');
    } finally {
      setOfflineNavLoading(false);
    }
  };

  const downloadTiles = async () => {
    if (!currentRegion) {
      Alert.alert('Error', 'Move the map first to set the centre of the area to download.');
      return;
    }
    setDownloading(true);
    setDownloadProgress(0);
    try {
      // Convert radius preset to delta degrees (approx)
      const radiusKm = downloadRadius === '2km' ? 2 : downloadRadius === '5km' ? 5 : 10;
      const latDelta = (radiusKm * 2) / 111;        // 1° lat ≈ 111 km
      const lngDelta = (radiusKm * 2) / (111 * Math.cos(currentRegion.latitude * Math.PI / 180));

      const { latitude, longitude } = currentRegion;
      const minLat = latitude - latDelta / 2;
      const maxLat = latitude + latDelta / 2;
      const minLng = longitude - lngDelta / 2;
      const maxLng = longitude + lngDelta / 2;

      // Zoom levels: 11 (city) → 15 (street-level)
      const zoomLevels = downloadRadius === '2km' ? [13, 14, 15]
        : downloadRadius === '5km' ? [12, 13, 14, 15]
        : [11, 12, 13, 14];

      const downloadQueue: Array<{ url: string; dest: string; dir: string }> = [];
      for (const z of zoomLevels) {
        const xStart = Math.min(lon2tile(minLng, z), lon2tile(maxLng, z));
        const xEnd   = Math.max(lon2tile(minLng, z), lon2tile(maxLng, z));
        const yStart = Math.min(lat2tile(maxLat, z), lat2tile(minLat, z));
        const yEnd   = Math.max(lat2tile(maxLat, z), lat2tile(minLat, z));
        for (let x = xStart; x <= xEnd; x++) {
          for (let y = yStart; y <= yEnd; y++) {
            const dir  = `${tileDir}${z}/${x}`;
            const dest = `${dir}/${y}.png`;
            downloadQueue.push({ url: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, dest, dir });
          }
        }
      }

      if (downloadQueue.length > 3000) {
        Alert.alert('Area Too Large', `${downloadQueue.length} tiles needed. Choose a smaller radius or lower zoom.`);
        setDownloading(false); return;
      }
      if (downloadQueue.length === 0) {
        Alert.alert('Error', 'No tiles found. Try zooming out or moving the map.'); setDownloading(false); return;
      }

      await FileSystem.makeDirectoryAsync(tileDir, { intermediates: true });
      let completed = 0;
      for (const item of downloadQueue) {
        await FileSystem.makeDirectoryAsync(item.dir, { intermediates: true });
        try { await FileSystem.downloadAsync(item.url, item.dest); } catch {}
        completed++;
        setDownloadProgress(Math.round((completed / downloadQueue.length) * 100));
      }
      const count = await getCachedTilesCount();
      setCachedCount(count);
      Alert.alert('Done! ✅', `${count} tiles saved. Radius: ${downloadRadius}. Usable offline.`);
    } catch (err) {
      Alert.alert('Error', 'Failed to download tiles. Check your connection.');
    } finally {
      setDownloading(false);
    }
  };

  const clearCachedTiles = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to delete all downloaded map tiles?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(tileDir, { idempotent: true });
              setCachedCount(0);
              setUseOfflineMode(false);
              Alert.alert('Cleared', 'All offline tiles removed.');
            } catch {}
          }
        }
      ]
    );
  };

  const filteredMarkers = filter === 'all'
    ? markers
    : markers.filter((m) => m.type === filter);

  // Haversine distance in metres
  const haversineM = (la1: number, lo1: number, la2: number, lo2: number) => {
    const R = 6371000;
    const dLat = (la2 - la1) * Math.PI / 180;
    const dLon = (lo2 - lo1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const fmtDist = (m: number) => m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1)} km`;

  const fmtDuration = (sec: number) => {
    const mins = Math.ceil(sec / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  const getBearing = (la1: number, lo1: number, la2: number, lo2: number) => {
    const dLon = (lo2 - lo1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(la2 * Math.PI / 180);
    const x = Math.cos(la1 * Math.PI / 180) * Math.sin(la2 * Math.PI / 180) -
              Math.sin(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.cos(dLon);
    const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    return brng;
  };

  const bearingToDirection = (deg: number) => {
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8];
  };

  const updateRoute = async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    mode: 'foot' | 'bicycle' | 'driving',
    force: boolean = false
  ) => {
    if (!force && lastFetchedLocationRef.current) {
      const dist = haversineM(
        startLat,
        startLng,
        lastFetchedLocationRef.current.latitude,
        lastFetchedLocationRef.current.longitude
      );
      if (dist < 15) return;
    }

    lastFetchedLocationRef.current = { latitude: startLat, longitude: startLng };

    if (useOfflineMode || !isOnline) {
      setRouteCoordinates([
        { latitude: startLat, longitude: startLng },
        { latitude: endLat, longitude: endLng }
      ]);
      const dist = haversineM(startLat, startLng, endLat, endLng);
      setRouteDistance(dist);
      const speed = mode === 'foot' ? 1.4 : mode === 'bicycle' ? 4.5 : 12;
      setRouteDuration(dist / speed);
      return;
    }

    setRoutingLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/${mode}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c: [number, number]) => ({
          latitude: c[1],
          longitude: c[0]
        }));
        setRouteCoordinates(coords);
        setRouteDistance(route.distance);
        setRouteDuration(route.duration);
      } else {
        throw new Error('OSRM route not found');
      }
    } catch (err) {
      console.warn('[Routing] Failed to fetch OSRM route:', err);
      setRouteCoordinates([
        { latitude: startLat, longitude: startLng },
        { latitude: endLat, longitude: endLng }
      ]);
      const dist = haversineM(startLat, startLng, endLat, endLng);
      setRouteDistance(dist);
      const speed = mode === 'foot' ? 1.4 : mode === 'bicycle' ? 4.5 : 12;
      setRouteDuration(dist / speed);
    } finally {
      setRoutingLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMarker && userLocation) {
      updateRoute(
        userLocation.latitude,
        userLocation.longitude,
        selectedMarker.latitude,
        selectedMarker.longitude,
        navMode,
        true
      );
    } else {
      setRouteCoordinates([]);
      setRouteDistance(null);
      setRouteDuration(null);
      lastFetchedLocationRef.current = null;
    }
  }, [selectedMarker, navMode, useOfflineMode, isOnline]);

  const startNavigation = async () => {
    if (!selectedMarker) return;
    setNavigating(true);

    if (routeCoordinates.length > 0) {
      mapRef.current?.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 100, bottom: 250, left: 60, right: 60 },
        animated: true,
      });
    } else if (userLocation) {
      mapRef.current?.fitToCoordinates(
        [userLocation, { latitude: selectedMarker.latitude, longitude: selectedMarker.longitude }],
        { edgePadding: { top: 100, bottom: 250, left: 60, right: 60 }, animated: true }
      );
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied'); setNavigating(false); return; }
      locationWatchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
        (loc) => {
          const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setLiveLocation(pos);
          setUserLocation(pos);
          updateRoute(
            pos.latitude,
            pos.longitude,
            selectedMarker.latitude,
            selectedMarker.longitude,
            navMode,
            false
          );
        }
      );
    } catch { setNavigating(false); }
  };

  const stopNavigation = () => {
    setNavigating(false);
    setLiveLocation(null);
    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
  };

  const panToMarker = (lat: number, lng: number) => {
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 600);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Disaster Map</Text>
          <Text style={styles.sub}>{user?.city} {useOfflineMode && '• Offline Mode'}</Text>
        </View>
        {useOfflineMode && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>OFFLINE</Text>
          </View>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterScroll} contentContainerStyle={styles.filterContent}
      >
        {FILTER_OPTIONS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'all' ? 'All' : `${MARKER_ICONS[f] || ''} ${f.replace('_', ' ')}`}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, showResources && styles.chipActive]}
          onPress={() => setShowResources((v) => !v)}
        >
          <Text style={[styles.chipText, showResources && styles.chipTextActive]}>📦 Resources</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Map */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={COLORS.danger} size="large" />
          </View>
        ) : null}

        <MapView
          ref={mapRef}
          style={styles.map}
          mapType={useOfflineMode ? 'none' : 'standard'}
          userInterfaceStyle="dark"
          showsUserLocation
          showsMyLocationButton={false}
          initialRegion={{
            latitude: userLocation?.latitude ?? 11.6643,
            longitude: userLocation?.longitude ?? 78.146,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onRegionChangeComplete={(region) => setCurrentRegion(region)}
        >
          {/* Custom Offline Tile Overlay */}
          {useOfflineMode && (
            <UrlTile
              urlTemplate={`${tileDir}{z}/{x}/{y}.png`}
              offlineMode={true}
              zIndex={1}
            />
          )}

          {/* Admin markers */}
          {filteredMarkers.map((marker) => (
            <Marker
              key={marker._id}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              onPress={() => { setSelectedMarker(marker); panToMarker(marker.latitude, marker.longitude); }}
            >
              <View style={[
                styles.markerBubble,
                selectedMarker?._id === marker._id && styles.markerBubbleSelected
              ]}>
                <Text style={styles.markerEmoji}>{MARKER_ICONS[marker.type] || '📍'}</Text>
              </View>
            </Marker>
          ))}

          {/* Navigation route polyline */}
          {selectedMarker && userLocation && routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={navigating ? "#10b981" : "#3b82f6"}
              strokeWidth={4}
            />
          )}

          {/* Navigation fallback straight-line polyline */}
          {selectedMarker && userLocation && routeCoordinates.length === 0 && (
            <Polyline
              coordinates={[
                { latitude: userLocation.latitude, longitude: userLocation.longitude },
                { latitude: selectedMarker.latitude, longitude: selectedMarker.longitude },
              ]}
              strokeColor="#64748b"
              strokeWidth={3}
              lineDashPattern={[8, 4]}
            />
          )}

          {/* Resource markers */}
          {showResources && resources.map((res) => (
            <Marker
              key={res._id}
              coordinate={{ latitude: res.latitude, longitude: res.longitude }}
              title={res.type.toUpperCase()}
              description={res.description}
            >
              <View style={[styles.markerBubble, { backgroundColor: '#052e1680', borderColor: COLORS.safe }]}>
                <Text style={styles.markerEmoji}>📦</Text>
              </View>
            </Marker>
          ))}

          {/* Hazard radius circles (from admin map markers) */}
          {filteredMarkers
            .filter((m) => m.type === 'hazard' && m.info?.radius)
            .map((m) => (
              <Circle
                key={`circle-${m._id}`}
                center={{ latitude: m.latitude, longitude: m.longitude }}
                radius={m.info.radius}
                fillColor="rgba(220,38,38,0.15)"
                strokeColor="rgba(220,38,38,0.6)"
                strokeWidth={1}
              />
            ))}

          {/* Neo4j Hazard Zones (from /evacuation/hazards) */}
          {hazardZones.map((hz, i) => (
            <Circle
              key={`neo4j-hz-${i}`}
              center={{ latitude: Number(hz.centerLat), longitude: Number(hz.centerLng) }}
              radius={Number(hz.radius) || 2000}
              fillColor="rgba(239,68,68,0.18)"
              strokeColor="rgba(239,68,68,0.8)"
              strokeWidth={2}
            />
          ))}

          {/* Offline Nav Polyline (A→B hazard-aware route) */}
          {offlineNavPolyline.length > 0 && (
            <Polyline
              coordinates={offlineNavPolyline}
              strokeColor="#f97316"
              strokeWidth={4}
              lineDashPattern={[8, 4]}
            />
          )}

          {/* Evacuation Route Polyline (Neo4j-computed safe path) */}
          {isEvacuationMode && evacuationPolyline.length > 0 && (
            <Polyline
              coordinates={evacuationPolyline}
              strokeColor="#22c55e"
              strokeWidth={5}
            />
          )}

          {/* Safe Zone Destination Marker */}
          {isEvacuationMode && evacuationRoute?.safeZone && (
            <Marker
              coordinate={{ latitude: evacuationRoute.safeZone.latitude, longitude: evacuationRoute.safeZone.longitude }}
              title={`🟢 ${evacuationRoute.safeZone.name}`}
              description={`Safety: ${evacuationRoute.safetyScore}% • ${evacuationRoute.estimatedMinutes} min walk`}
            >
              <View style={styles.safeZoneMarker}>
                <Text style={{ fontSize: 22 }}>🏥</Text>
              </View>
            </Marker>
          )}
        </MapView>

        {/* Offline Map Download FAB */}
        <TouchableOpacity style={[styles.locationFab, { bottom: 80 }]} onPress={() => setShowOfflineModal(true)}>
          <Ionicons name="cloud-download-outline" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Evacuation Route FAB */}
        {activeEvent && (
          <TouchableOpacity
            style={[styles.locationFab, { bottom: 140, backgroundColor: fetchingEvacRoute ? '#374151' : '#15803d' }]}
            onPress={isEvacuationMode ? clearEvacuationMode : fetchEvacuationRoute}
            disabled={fetchingEvacRoute}
          >
            {fetchingEvacRoute
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name={isEvacuationMode ? 'close-circle' : 'shield'} size={22} color="#fff" />}
          </TouchableOpacity>
        )}

        {/* My Location FAB */}
        <TouchableOpacity style={styles.locationFab} onPress={goToMyLocation}>
          <Ionicons name="locate" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Evacuation Info Panel — shown when evacuation mode is active */}
      {isEvacuationMode && evacuationRoute && (
        <View style={styles.evacPanel}>
          <View style={styles.evacHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20 }}>🛡️</Text>
              <View>
                <Text style={styles.evacTitle}>Evacuation Route</Text>
                <Text style={styles.evacSub}>Neo4j shortest safe path</Text>
              </View>
            </View>
            <TouchableOpacity onPress={clearEvacuationMode} style={{ padding: 4 }}>
              <Ionicons name="close" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
          <View style={styles.evacStats}>
            <View style={styles.evacStat}>
              <Text style={styles.evacStatVal}>{evacuationRoute.safeZone.name}</Text>
              <Text style={styles.evacStatLabel}>Safe Zone</Text>
            </View>
            <View style={styles.evacStat}>
              <Text style={[styles.evacStatVal, { color: evacuationRoute.safetyScore >= 70 ? '#22c55e' : '#f59e0b' }]}>
                {evacuationRoute.safetyScore}%
              </Text>
              <Text style={styles.evacStatLabel}>Safety Score</Text>
            </View>
            <View style={styles.evacStat}>
              <Text style={styles.evacStatVal}>{evacuationRoute.estimatedMinutes} min</Text>
              <Text style={styles.evacStatLabel}>Walk ETA</Text>
            </View>
            <View style={styles.evacStat}>
              <Text style={styles.evacStatVal}>
                {evacuationRoute.distanceMeters < 1000
                  ? `${evacuationRoute.distanceMeters}m`
                  : `${(evacuationRoute.distanceMeters / 1000).toFixed(1)}km`}
              </Text>
              <Text style={styles.evacStatLabel}>Distance</Text>
            </View>
          </View>
          <View style={styles.evacHint}>
            <Ionicons name="warning" size={12} color="#fbbf24" />
            <Text style={styles.evacHintText}>Red circles = hazard zones. Stay on green route.</Text>
          </View>
        </View>
      )}


      {/* Navigation bottom sheet — shown when a marker is selected */}
      {!isEvacuationMode && selectedMarker && (
        <View style={styles.navSheet}>
          <View style={styles.navSheetRow}>
            <Text style={styles.navIcon}>{MARKER_ICONS[selectedMarker.type] || '📍'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.navName} numberOfLines={1}>{selectedMarker.name}</Text>
              <Text style={styles.navType}>{selectedMarker.type.replace(/_/g,' ').toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={() => { stopNavigation(); setSelectedMarker(null); }} style={styles.navClose}>
              <Ionicons name="close" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          {/* Transportation Mode Selector */}
          <View style={styles.modeContainer}>
            {([
              { id: 'foot', label: 'Walk', icon: 'walk' },
              { id: 'bicycle', label: 'Bike', icon: 'bicycle' },
              { id: 'driving', label: 'Drive', icon: 'car' }
            ] as const).map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.modeBtn,
                  navMode === m.id && styles.modeBtnActive
                ]}
                onPress={() => setNavMode(m.id)}
              >
                <Ionicons
                  name={m.icon as any}
                  size={14}
                  color={navMode === m.id ? '#fff' : COLORS.muted}
                />
                <Text style={[
                  styles.modeBtnText,
                  navMode === m.id && styles.modeBtnTextActive
                ]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Live navigation info */}
          {navigating && (liveLocation || userLocation) ? (
            <View style={styles.liveNavCard}>
              <View style={styles.liveNavRow}>
                <View style={styles.liveNavStat}>
                  <Ionicons name="navigate" size={18} color={COLORS.blue} />
                  <Text style={styles.liveNavValue}>
                    {routeDistance !== null ? fmtDist(routeDistance) : '...'}
                  </Text>
                  <Text style={styles.liveNavLabel}>Distance</Text>
                </View>
                <View style={styles.liveNavStat}>
                  <Ionicons name="compass" size={18} color="#f59e0b" />
                  <Text style={styles.liveNavValue}>
                    {bearingToDirection(getBearing(
                      (liveLocation || userLocation)!.latitude, (liveLocation || userLocation)!.longitude,
                      selectedMarker.latitude, selectedMarker.longitude
                    ))}
                  </Text>
                  <Text style={styles.liveNavLabel}>Direction</Text>
                </View>
                <View style={styles.liveNavStat}>
                  <Ionicons
                    name={navMode === 'foot' ? 'walk' : navMode === 'bicycle' ? 'bicycle' : 'car'}
                    size={18}
                    color={COLORS.safe}
                  />
                  <Text style={styles.liveNavValue}>
                    {routeDuration !== null ? fmtDuration(routeDuration) : '...'}
                  </Text>
                  <Text style={styles.liveNavLabel}>ETA</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.stopNavBtn} onPress={stopNavigation}>
                <Ionicons name="stop-circle" size={16} color="#fff" />
                <Text style={styles.navBtnText}>Stop Navigation</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Info pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {routeDistance !== null && (
                  <View style={styles.pill}>
                    <Ionicons name="navigate-outline" size={12} color={COLORS.blue} />
                    <Text style={styles.pillText}>{fmtDist(routeDistance)}</Text>
                  </View>
                )}
                {routeDuration !== null && (
                  <View style={styles.pill}>
                    <Ionicons
                      name={navMode === 'foot' ? 'walk-outline' : navMode === 'bicycle' ? 'bicycle-outline' : 'car-outline'}
                      size={12}
                      color={COLORS.safe}
                    />
                    <Text style={styles.pillText}>{fmtDuration(routeDuration)}</Text>
                  </View>
                )}
                {selectedMarker.info?.capacity && (
                  <View style={styles.pill}><Text style={styles.pillText}>Cap: {selectedMarker.info.capacity}</Text></View>
                )}
                {selectedMarker.info?.phone && (
                  <View style={styles.pill}><Ionicons name="call-outline" size={12} color={COLORS.safe} /><Text style={styles.pillText}>{selectedMarker.info.phone}</Text></View>
                )}
                {selectedMarker.info?.open24h && (
                  <View style={[styles.pill,{borderColor:COLORS.safe}]}><Text style={[styles.pillText,{color:COLORS.safe}]}>24h Open</Text></View>
                )}
              </ScrollView>

              <View style={styles.navBtns}>
                <TouchableOpacity
                  style={[styles.navBtn, { backgroundColor: COLORS.blue }]}
                  onPress={startNavigation}
                >
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={styles.navBtnText}>Navigate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.navBtn, { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border }]}
                  onPress={() => panToMarker(selectedMarker.latitude, selectedMarker.longitude)}
                >
                  <Ionicons name="eye-outline" size={16} color="#fff" />
                  <Text style={styles.navBtnText}>Focus</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Legend — always visible at bottom */}
      <View style={styles.legend}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legendScroll}
        >
          {([
            { key: 'safe_zone', label: 'Safe Zone' },
            { key: 'hospital',  label: 'Hospital' },
            { key: 'shelter',   label: 'Shelter' },
            { key: 'hazard',    label: 'Hazard' },
            { key: 'water',     label: 'Water' },
            { key: 'food',      label: 'Food' },
            { key: 'police',    label: 'Police' },
            { key: 'fire_station', label: 'Fire Stn' },
          ]).map(({ key, label }) => (
            <View key={key} style={styles.legendItem}>
              <Text style={styles.legendIcon}>{MARKER_ICONS[key] ?? '📍'}</Text>
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Offline Maps Modal */}
      <Modal
        visible={showOfflineModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOfflineModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="map-outline" size={24} color={COLORS.danger} />
              <Text style={styles.modalTitle}>Offline Map Manager</Text>
              <TouchableOpacity onPress={() => setShowOfflineModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            {(() => {
              const [tab, setTab] = useState<'download' | 'navigate'>('download');
              return (
                <>
                  <View style={styles.offlineTabs}>
                    {(['download', 'navigate'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.offlineTab, tab === t && styles.offlineTabActive]}
                        onPress={() => setTab(t)}
                      >
                        <Ionicons
                          name={t === 'download' ? 'download-outline' : 'navigate-outline'}
                          size={14}
                          color={tab === t ? '#fff' : COLORS.muted}
                        />
                        <Text style={[styles.offlineTabText, tab === t && { color: '#fff' }]}>
                          {t === 'download' ? 'Download Area' : 'Navigate'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <ScrollView contentContainerStyle={styles.modalBody}>
                    {tab === 'download' ? (
                      <>
                        <Text style={styles.modalDesc}>
                          Download map tiles for offline use. Choose a radius around the map centre. Larger areas take longer but cover more ground.
                        </Text>

                        {/* Radius presets */}
                        <Text style={[styles.statLabel, { marginBottom: 6 }]}>Download Radius</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                          {(['2km', '5km', '10km'] as const).map((r) => (
                            <TouchableOpacity
                              key={r}
                              style={[
                                styles.radiusBtn,
                                downloadRadius === r && styles.radiusBtnActive
                              ]}
                              onPress={() => setDownloadRadius(r)}
                            >
                              <Text style={[styles.radiusBtnText, downloadRadius === r && { color: '#fff' }]}>{r}</Text>
                              <Text style={[{ fontSize: 9, color: COLORS.muted }, downloadRadius === r && { color: '#94a3b8' }]}>
                                {r === '2km' ? '~120 tiles' : r === '5km' ? '~600 tiles' : '~1200 tiles'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <View style={styles.statsCard}>
                          <View style={styles.statRow}>
                            <Text style={styles.statLabel}>Cached Tiles</Text>
                            <Text style={styles.statValue}>{cachedCount}</Text>
                          </View>
                          <View style={styles.statRow}>
                            <Text style={styles.statLabel}>Zoom Levels</Text>
                            <Text style={styles.statSubValue}>
                              {downloadRadius === '2km' ? '13–15' : downloadRadius === '5km' ? '12–15' : '11–14'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.switchRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.switchLabel}>Offline Map Mode</Text>
                            <Text style={styles.switchSubLabel}>Use downloaded tiles only</Text>
                          </View>
                          <Switch
                            value={useOfflineMode}
                            onValueChange={(v) => {
                              if (v && cachedCount === 0) {
                                Alert.alert('No tiles', 'Download a map area first.');
                                return;
                              }
                              setUseOfflineMode(v);
                            }}
                            trackColor={{ false: '#334155', true: COLORS.danger }}
                            thumbColor="#fff"
                          />
                        </View>

                        {downloading ? (
                          <View style={styles.downloadProgressCard}>
                            <ActivityIndicator color={COLORS.danger} size="small" />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.progressText}>Downloading tiles…</Text>
                              <Text style={styles.progressPercent}>{downloadProgress}% complete</Text>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.downloadBtn} onPress={downloadTiles}>
                            <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.downloadBtnText}>Download {downloadRadius} Around Map Centre</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.clearBtn} onPress={clearCachedTiles}>
                          <Ionicons name="trash-outline" size={16} color={COLORS.danger} style={{ marginRight: 6 }} />
                          <Text style={styles.clearBtnText}>Clear Downloaded Maps</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={styles.modalDesc}>
                          Route from A to B avoiding admin-marked danger zones. Works with or without internet (OSRM + hazard detour).
                        </Text>

                        {/* Mode selector */}
                        <View style={[styles.modeContainer, { marginBottom: 14 }]}>
                          {([
                            { id: 'foot',     label: 'Walk',  icon: 'walk' },
                            { id: 'bicycle',  label: 'Bike',  icon: 'bicycle' },
                            { id: 'driving',  label: 'Drive', icon: 'car' },
                          ] as const).map((m) => (
                            <TouchableOpacity
                              key={m.id}
                              style={[styles.modeBtn, offlineNavMode === m.id && styles.modeBtnActive]}
                              onPress={() => setOfflineNavMode(m.id)}
                            >
                              <Ionicons name={m.icon as any} size={15} color={offlineNavMode === m.id ? '#fff' : COLORS.muted} />
                              <Text style={[styles.modeBtnText, offlineNavMode === m.id && styles.modeBtnTextActive]}>
                                {m.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* From / To inputs */}
                        <Text style={styles.statLabel}>From</Text>
                        <View style={styles.navInputRow}>
                          <Ionicons name="radio-button-on" size={14} color={COLORS.safe} style={{ marginRight: 6 }} />
                          <TextInput
                            style={styles.navInput}
                            placeholder='"My Location" or type address'
                            placeholderTextColor={COLORS.muted}
                            value={offlineNavFrom}
                            onChangeText={setOfflineNavFrom}
                          />
                          {userLocation && (
                            <TouchableOpacity onPress={() => setOfflineNavFrom('My Location')} style={{ padding: 4 }}>
                              <Ionicons name="locate" size={16} color={COLORS.blue} />
                            </TouchableOpacity>
                          )}
                        </View>

                        <Text style={[styles.statLabel, { marginTop: 10 }]}>To</Text>
                        <View style={styles.navInputRow}>
                          <Ionicons name="location" size={14} color={COLORS.danger} style={{ marginRight: 6 }} />
                          <TextInput
                            style={styles.navInput}
                            placeholder="Destination address"
                            placeholderTextColor={COLORS.muted}
                            value={offlineNavTo}
                            onChangeText={setOfflineNavTo}
                          />
                        </View>

                        {/* Hazard warning */}
                        {markers.filter(m => m.type === 'hazard').length > 0 && (
                          <View style={styles.hazardWarningRow}>
                            <Ionicons name="warning" size={13} color="#fbbf24" />
                            <Text style={styles.hazardWarningText}>
                              {markers.filter(m => m.type === 'hazard').length} danger zone(s) will be avoided automatically
                            </Text>
                          </View>
                        )}

                        {/* Route stats */}
                        {offlineNavStats && (
                          <View style={styles.statsCard}>
                            <View style={styles.statRow}>
                              <Text style={styles.statLabel}>Distance</Text>
                              <Text style={styles.statValue}>{fmtDist(offlineNavStats.dist)}</Text>
                            </View>
                            <View style={styles.statRow}>
                              <Text style={styles.statLabel}>ETA</Text>
                              <Text style={styles.statValue}>{fmtDuration(offlineNavStats.dur)}</Text>
                            </View>
                            <View style={styles.statRow}>
                              <Text style={styles.statLabel}>Mode</Text>
                              <Text style={styles.statSubValue}>{offlineNavMode}</Text>
                            </View>
                          </View>
                        )}

                        <TouchableOpacity
                          style={[styles.downloadBtn, offlineNavLoading && { opacity: 0.6 }]}
                          onPress={startOfflineNav}
                          disabled={offlineNavLoading}
                        >
                          {offlineNavLoading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Ionicons name="navigate" size={18} color="#fff" style={{ marginRight: 6 }} />}
                          <Text style={styles.downloadBtnText}>
                            {offlineNavLoading ? 'Computing route…' : 'Get Route'}
                          </Text>
                        </TouchableOpacity>

                        {offlineNavPolyline.length > 0 && (
                          <TouchableOpacity
                            style={[styles.clearBtn, { marginTop: 6 }]}
                            onPress={() => { setOfflineNavPolyline([]); setOfflineNavStats(null); }}
                          >
                            <Ionicons name="close-circle-outline" size={16} color={COLORS.muted} style={{ marginRight: 6 }} />
                            <Text style={[styles.clearBtnText, { color: COLORS.muted }]}>Clear Route</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  sub: { fontSize: 12, color: COLORS.muted },
  offlineBadge: { backgroundColor: COLORS.danger, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  offlineBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  filterScroll: { maxHeight: 44 },
  filterContent: { paddingHorizontal: 12, gap: 8, paddingVertical: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border
  },
  chipActive: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  chipText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10
  },
  markerBubble: {
    backgroundColor: 'rgba(30,41,59,0.85)', borderRadius: 20, padding: 6,
    borderWidth: 1.5, borderColor: COLORS.border
  },
  markerEmoji: { fontSize: 20 },
  callout: { padding: 8, minWidth: 120 },
  calloutTitle: { fontWeight: '700', fontSize: 14 },
  calloutSub: { color: '#666', fontSize: 11, marginTop: 2 },
  calloutInfo: { color: '#333', fontSize: 12, marginTop: 4 },
  locationFab: {
    position: 'absolute', bottom: 16, right: 16,
    backgroundColor: COLORS.danger, width: 48, height: 48,
    borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
    elevation: 6, shadowColor: COLORS.danger, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }
  },
  legend: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#0a1628',
  },
  legendTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendScroll: {
    gap: 10,
    paddingRight: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  legendIcon: { fontSize: 18, lineHeight: 22 },
  markerBubbleSelected: { borderColor: COLORS.blue, borderWidth: 2.5, backgroundColor: 'rgba(59,130,246,0.2)' },
  navSheet: {
    backgroundColor: COLORS.panel, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20,
  },
  navSheetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  navIcon: { fontSize: 24 },
  navName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  navType: { color: COLORS.muted, fontSize: 10, marginTop: 1 },
  navClose: { padding: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0f172a', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.border, marginRight: 6,
  },
  pillText: { color: COLORS.muted, fontSize: 11 },
  navBtns: { flexDirection: 'row', gap: 10 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 10 },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  liveNavCard: { backgroundColor: '#0f172a', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.blue, marginBottom: 4 },
  liveNavRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  liveNavStat: { alignItems: 'center', gap: 3 },
  liveNavValue: { color: '#fff', fontWeight: '800', fontSize: 16 },
  liveNavLabel: { color: COLORS.muted, fontSize: 10 },
  stopNavBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.danger, borderRadius: 12, paddingVertical: 10,
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 9,
  },
  modeBtnActive: {
    backgroundColor: COLORS.blue,
  },
  modeBtnText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  legendText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  // Modal Styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.panel,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderColor: COLORS.border },
  modalTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', marginLeft: 10 },
  closeBtn: { padding: 4 },
  modalBody: { paddingTop: 16 },
  modalDesc: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginBottom: 16 },
  statsCard: { backgroundColor: '#0f172a', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10, marginBottom: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: COLORS.muted, fontSize: 12 },
  statValue: { color: '#fff', fontWeight: '800', fontSize: 15 },
  statSubValue: { color: COLORS.muted, fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingVertical: 8 },
  switchLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  switchSubLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.blue, borderRadius: 12, paddingVertical: 12, marginBottom: 10
  },
  downloadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 12
  },
  clearBtnText: { color: COLORS.danger, fontWeight: '600', fontSize: 13 },
  downloadProgressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e3a8a30', borderWidth: 1, borderColor: COLORS.blue, borderRadius: 12, padding: 14, marginBottom: 10
  },
  progressText: { color: '#93c5fd', fontSize: 13, fontWeight: '600' },
  progressPercent: { color: '#60a5fa', fontSize: 11, marginTop: 2 },
  safeZoneMarker: {
    backgroundColor: 'rgba(21,128,61,0.9)', borderRadius: 20, padding: 8,
    borderWidth: 2, borderColor: '#22c55e',
  },
  evacPanel: {
    backgroundColor: '#0c1f14', borderTopWidth: 2, borderTopColor: '#22c55e',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20,
  },
  evacHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  evacTitle: { color: '#86efac', fontSize: 15, fontWeight: '700' },
  evacSub: { color: '#4ade80', fontSize: 11, marginTop: 1 },
  evacStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  evacStat: { alignItems: 'center', flex: 1 },
  evacStatVal: { color: '#fff', fontWeight: '800', fontSize: 14 },
  evacStatLabel: { color: '#4ade80', fontSize: 10, marginTop: 2 },
  evacHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  evacHintText: { color: '#92400e', fontSize: 11 },
  // Offline modal tabs
  offlineTabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e293b',
    marginHorizontal: 16, marginTop: 4, marginBottom: 0,
  },
  offlineTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  offlineTabActive: { borderBottomWidth: 2, borderBottomColor: '#dc2626' },
  offlineTabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  // Radius preset buttons
  radiusBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 10, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a',
  },
  radiusBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' },
  radiusBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },
  // Nav address inputs
  navInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1,
    borderColor: '#334155', paddingHorizontal: 10, marginTop: 4, marginBottom: 2,
  },
  navInput: {
    flex: 1, color: '#f1f5f9', fontSize: 13, paddingVertical: 10,
  },
  hazardWarningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, marginTop: 10,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)',
  },
  hazardWarningText: { color: '#fbbf24', fontSize: 11, flex: 1 },
});
