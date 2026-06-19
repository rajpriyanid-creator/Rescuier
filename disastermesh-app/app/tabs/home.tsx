import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, Animated, Vibration, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/appStore';
import { useSeismicDetection } from '../../hooks/useSeismicDetection';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { api } from '../../services/api';
import { getSocket, joinCityRoom, joinDisasterRoom } from '../../services/socket';
import { COLORS, DISASTER_TYPES } from '../../utils/constants';
import * as Location from 'expo-location';

const STATUS_OPTIONS = [
  { id: 'safe', label: 'I am Safe', icon: 'checkmark-circle', color: '#22c55e' },
  { id: 'evacuating', label: 'Evacuating', icon: 'walk', color: '#f97316' },
  { id: 'shelter', label: 'In Shelter', icon: 'home', color: '#3b82f6' },
  { id: 'need_help', label: 'Need Help', icon: 'alert-circle', color: COLORS.danger },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, activeEvent, setActiveEvent, seismicAlert, clearSeismicAlert, locationStatus } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [evacuationRoute, setEvacuationRoute] = useState<any>(null);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const pulseAnim = new Animated.Value(1);


  // Enable seismic detection and location tracking when there's an active event
  useSeismicDetection(!!activeEvent);
  const { updateStatusManually, sendLocation } = useLocationTracking(!!activeEvent);

  useEffect(() => {
    if (user?.city) {
      joinCityRoom(user.city);
    }
    loadEvent();
    setupSocket();
  }, [user?.city]);

  // Pulse animation for active event
  useEffect(() => {
    if (!activeEvent) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [activeEvent]);

  // Seismic alert — vibrate and show warning
  useEffect(() => {
    if (seismicAlert) {
      if (Platform.OS !== 'web') Vibration.vibrate([500, 200, 500, 200, 500]);
      const timer = setTimeout(clearSeismicAlert, 30000);
      return () => clearTimeout(timer);
    }
  }, [seismicAlert]);

  const loadEvent = async () => {
    try {
      if (user?.city) {
        await joinCityRoom(user.city);
      }
      const res = await api.get('/events/active');
      if (res.data.event) {
        setActiveEvent(res.data.event);
        await joinCityRoom(res.data.event.city);
        await joinDisasterRoom(res.data.event._id);
      } else {
        setActiveEvent(null);
      }
    } catch {
      setActiveEvent(null);
    }
  };

  const setupSocket = async () => {
    try {
      const socket = await getSocket();

      socket.on('disaster:declared', async (data: any) => {
        // 1. Save event to store
        setActiveEvent(data);
        // 2. Join rooms for real-time updates
        await joinCityRoom(data.city);
        await joinDisasterRoom(data.eventId);
        // 3. Immediately push location so admin sees this user on the map
        setTimeout(() => sendLocation(), 1000); // slight delay ensures activeEvent is set
        // 4. Alert the user
        Vibration.vibrate([1000, 500, 1000]);
      });

      // Server-side pull: admin/system can request fresh locations at any time
      socket.on('location:requested', async () => {
        await sendLocation();
      });

      socket.on('disaster:resolved', () => setActiveEvent(null));

      socket.on('seismic:wave_detected', () => {
        if (!seismicAlert) {
          // Show alert in UI
        }
      });
    } catch {}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvent();
    setRefreshing(false);
  }, []);

  const fetchEvacuationRoute = async () => {
    setFetchingRoute(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setFetchingRoute(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const res = await api.get('/evacuation/route', {
        params: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
      });
      if (res.data.route) {
        setEvacuationRoute(res.data.route);
        // Navigate to map with evacuation route
        router.push({ pathname: '/tabs/map', params: { evacuationMode: '1' } });
      }
    } catch (e) {
      console.warn('[fetchEvacuationRoute]', e);
    } finally {
      setFetchingRoute(false);
    }
  };

  const handleStatusChange = async (statusId: string) => {
    await updateStatusManually(statusId);
  };

  const disasterInfo = activeEvent
    ? DISASTER_TYPES.find((d) => d.id === activeEvent.type)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.danger} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.disasterId}>{user?.disasterId}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        {/* Seismic Early Warning Banner */}
        {seismicAlert && (
          <View style={styles.seismicBanner}>
            <Text style={styles.seismicTitle}>⚠️ EARTHQUAKE WAVE INCOMING</Text>
            <Text style={styles.seismicTime}>
              Estimated arrival: {Math.round(seismicAlert.secondsUntilWave)} seconds
            </Text>
            <Text style={styles.seismicInstructions}>DROP · COVER · HOLD ON</Text>
          </View>
        )}

        {/* Active Disaster Banner */}
        {activeEvent ? (
          <Animated.View style={[styles.eventBanner, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.eventIcon}>{disasterInfo?.icon || '⚠️'}</Text>
            <View style={styles.eventInfo}>
              <Text style={styles.eventType}>
                {activeEvent.type.toUpperCase()} — {activeEvent.severity.toUpperCase()}
              </Text>
              <Text style={styles.eventCity}>{activeEvent.city}</Text>
              {activeEvent.instructions && (
                <Text style={styles.eventInstructions} numberOfLines={2}>
                  {activeEvent.instructions}
                </Text>
              )}
            </View>
          </Animated.View>
        ) : (
          <View style={styles.safeCard}>
            <Ionicons name="shield-checkmark" size={28} color={COLORS.safe} />
            <Text style={styles.safeText}>No active disaster in your area</Text>
          </View>
        )}

        {/* Evacuation Route CTA — shown when disaster is active */}
        {activeEvent && (
          <TouchableOpacity
            style={styles.evacuateBtn}
            onPress={fetchEvacuationRoute}
            activeOpacity={0.85}
            disabled={fetchingRoute}
          >
            <Ionicons name="navigate" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.evacuateBtnText}>
                {fetchingRoute ? 'Finding Safe Route…' : '🛡️ Get Evacuation Route'}
              </Text>
              <Text style={styles.evacuateBtnSub}>Neo4j shortest safe path to nearest shelter</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        )}

        {/* SOS Button */}
        <TouchableOpacity
          style={[styles.sosButton, !activeEvent && styles.sosDisabled]}
          onPress={() => router.push('/sos')}
          activeOpacity={0.85}
          disabled={!activeEvent}
        >
          <Ionicons name="alert-circle" size={32} color="#fff" />
          <Text style={styles.sosText}>SEND SOS</Text>
          <Text style={styles.sosSub}>
            {activeEvent ? 'Tap to request emergency help' : 'Active during disaster only'}
          </Text>
        </TouchableOpacity>

        {/* Status Update */}
        {activeEvent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Your Status</Text>
            <View style={styles.statusGrid}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.statusBtn, locationStatus === s.id && { borderColor: s.color, borderWidth: 2 }]}
                  onPress={() => handleStatusChange(s.id)}
                >
                  <Ionicons name={s.icon as any} size={22} color={s.color} />
                  <Text style={styles.statusLabel}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'lock-closed', label: 'Emergency\nVault', route: '/vault', color: '#7c3aed' },
              { icon: 'people', label: 'Family\nSafety', route: '/family', color: '#2563eb' },
              { icon: 'person-add', label: 'Missing\nPerson', route: '/tabs/chat', color: '#d97706' },
              { icon: 'water', label: 'Resources\nMap', route: '/tabs/map', color: '#0891b2' },
            ].map(({ icon, label, route, color }) => (
              <TouchableOpacity
                key={icon}
                style={styles.actionBtn}
                onPress={() => router.push(route as any)}
              >
                <View style={[styles.actionIcon, { backgroundColor: color + '22' }]}>
                  <Ionicons name={icon as any} size={24} color={color} />
                </View>
                <Text style={styles.actionLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 20, fontWeight: '700', color: '#fff' },
  disasterId: { fontSize: 11, color: COLORS.muted, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  seismicBanner: {
    backgroundColor: '#7f1d1d', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 2, borderColor: COLORS.danger, alignItems: 'center'
  },
  seismicTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  seismicTime: { fontSize: 24, fontWeight: '800', color: '#fbbf24', marginTop: 8 },
  seismicInstructions: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 8, letterSpacing: 2 },
  eventBanner: {
    backgroundColor: '#450a0a', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.danger, flexDirection: 'row', alignItems: 'center', gap: 12
  },
  eventIcon: { fontSize: 36 },
  eventInfo: { flex: 1 },
  eventType: { fontSize: 16, fontWeight: '800', color: '#fca5a5' },
  eventCity: { fontSize: 13, color: COLORS.muted, marginTop: 1 },
  eventInstructions: { fontSize: 12, color: '#fca5a5', marginTop: 6, opacity: 0.9 },
  safeCard: {
    backgroundColor: '#052e16', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.safe, flexDirection: 'row', alignItems: 'center', gap: 10
  },
  safeText: { color: '#86efac', fontSize: 14 },
  sosButton: {
    backgroundColor: COLORS.danger, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 20, elevation: 8,
    shadowColor: COLORS.danger, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }
  },
  sosDisabled: { backgroundColor: '#374151', shadowOpacity: 0 },
  sosText: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 6 },
  sosSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.panel, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 6
  },
  statusLabel: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: {
    flex: 1, minWidth: '44%', backgroundColor: COLORS.panel, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 8
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: '#e2e8f0', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  evacuateBtn: {
    backgroundColor: '#1d4034', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1.5, borderColor: '#22c55e', flexDirection: 'row', alignItems: 'center', gap: 12
  },
  evacuateBtnText: { color: '#86efac', fontSize: 15, fontWeight: '700' },
  evacuateBtnSub: { color: '#4ade80', fontSize: 11, marginTop: 2, opacity: 0.8 },
});
