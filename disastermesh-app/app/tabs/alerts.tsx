import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAppStore } from '../../store/appStore';
import { cacheAlert, getCachedAlerts, markAlertRead as dbMarkRead } from '../../db/database';
import { COLORS } from '../../utils/constants';

const SEVERITY_COLORS: Record<string, string> = {
  critical: COLORS.danger,
  warning: '#ea580c',
  info: '#2563eb',
};

const SEVERITY_BG: Record<string, string> = {
  critical: '#450a0a',
  warning: '#431407',
  info: '#1e3a5f',
};

export default function AlertsScreen() {
  const { alerts, setAlerts, markAlertRead, isOnline } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAlerts();
    setupSocket();
  }, []);

  const loadAlerts = async () => {
    try {
      if (isOnline) {
        const res = await api.get('/alerts');
        const fetched = res.data.alerts || [];
        setAlerts(fetched);
        // Cache for offline
        for (const a of fetched) {
          await cacheAlert({ id: a._id, title: a.title, message: a.message, severity: a.severity, sentAt: new Date(a.sentAt).getTime() });
        }
      } else {
        const cached = await getCachedAlerts();
        setAlerts(cached.map((c) => ({
          _id: c.id, title: c.title, message: c.message,
          severity: c.severity, type: 'general',
          sentAt: new Date(c.sentAt).toISOString(), read: !!c.read,
        })));
      }
    } catch {} finally { setLoading(false); }
  };

  const setupSocket = async () => {
    const socket = await getSocket();
    socket.on('alert:new', (data: any) => {
      const alert = data.alert;
      setAlerts([alert, ...alerts]);
      cacheAlert({ id: alert._id, title: alert.title, message: alert.message, severity: alert.severity, sentAt: Date.now() });
    });
  };

  const handleMarkRead = async (id: string) => {
    markAlertRead(id);
    dbMarkRead(id);
    try { await api.put(`/alerts/${id}/read`); } catch {}
  };

  const handleConfirmSafe = async (id: string) => {
    try {
      await api.put(`/alerts/${id}/safe`);
      markAlertRead(id);
    } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: SEVERITY_COLORS[item.severity] || '#64748b', backgroundColor: SEVERITY_BG[item.severity] || COLORS.panel },
        !item.read && styles.cardUnread]}
      onPress={() => handleMarkRead(item._id)}
      activeOpacity={0.85}
    >
      {!item.read && <View style={styles.unreadDot} />}
      <View style={styles.cardHeader}>
        <View style={styles.severityBadge}>
          <Ionicons
            name={item.severity === 'critical' ? 'warning' : item.severity === 'warning' ? 'alert-circle' : 'information-circle'}
            size={13} color={SEVERITY_COLORS[item.severity] || '#fff'}
          />
          <Text style={[styles.severityText, { color: SEVERITY_COLORS[item.severity] }]}>
            {item.severity?.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.time}>
          {new Date(item.sentAt).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text style={styles.alertTitle}>{item.title}</Text>
      <Text style={styles.alertMessage} numberOfLines={3}>{item.message}</Text>
      {item.instructions && (
        <View style={styles.instructionsBox}>
          <Ionicons name="information-circle-outline" size={13} color="#93c5fd" />
          <Text style={styles.instructions} numberOfLines={2}>{item.instructions}</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.safeBtn}
        onPress={() => handleConfirmSafe(item._id)}
      >
        <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.safe} />
        <Text style={styles.safeBtnText}>I'm Safe</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        {!isOnline && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline-outline" size={12} color="#fbbf24" />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingView}>
          <ActivityIndicator color={COLORS.danger} size="large" />
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(a) => a._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.danger} />}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Ionicons name="notifications-off-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No alerts yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  offlineBadge: { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: '#451a03', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  offlineText: { color: '#fbbf24', fontSize: 11 },
  loadingView: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, gap: 10 },
  card: {
    borderRadius: 14, padding: 14, borderLeftWidth: 4,
    borderWidth: 1, borderColor: COLORS.border, position: 'relative'
  },
  cardUnread: { borderColor: 'rgba(255,255,255,0.15)' },
  unreadDot: {
    position: 'absolute', top: 12, right: 12,
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  severityBadge: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  severityText: { fontSize: 10, fontWeight: '700' },
  time: { color: COLORS.muted, fontSize: 10 },
  alertTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  alertMessage: { fontSize: 13, color: '#cbd5e1', lineHeight: 19 },
  instructionsBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 8, backgroundColor: 'rgba(147,197,253,0.08)', borderRadius: 8, padding: 8 },
  instructions: { flex: 1, color: '#93c5fd', fontSize: 12, lineHeight: 17 },
  safeBtn: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#052e16', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  safeBtnText: { color: COLORS.safe, fontSize: 12, fontWeight: '600' },
  emptyView: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: COLORS.muted, fontSize: 15 },
});
