import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { COLORS } from '../../utils/constants';

export default function AdminPanelScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try { const res = await api.get('/admin/stats'); setStats(res.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  if (!['admin', 'superadmin'].includes(user?.role ?? '')) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="lock-closed-outline" size={48} color={COLORS.muted} />
        <Text style={styles.denied}>Admin access required</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.link}>← Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const ACTIONS = [
    { icon: 'warning-outline', label: 'Declare Event', color: '#dc2626', route: '/admin/declare' },
    { icon: 'notifications-outline', label: 'Send Alert', color: '#f59e0b', route: '/admin/alert' },
    { icon: 'people-outline', label: 'Manage Users', color: '#3b82f6', route: '/admin/users' },
    { icon: 'analytics-outline', label: 'Analytics', color: '#22c55e', route: '/admin/analytics' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
        <View style={styles.roleBadge}><Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStats} tintColor={COLORS.danger} />}>
        {stats && (
          <View style={styles.statsGrid}>
            {[
              { label: 'Active SOS', value: stats.activeSOS ?? 0, color: '#dc2626' },
              { label: 'Users Online', value: stats.onlineUsers ?? 0, color: '#22c55e' },
              { label: 'Total Alerts', value: stats.totalAlerts ?? 0, color: '#f59e0b' },
              { label: 'City Users', value: stats.cityUsers ?? 0, color: '#3b82f6' },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { borderColor: s.color }]}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.section}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {ACTIONS.map((a) => (
            <TouchableOpacity key={a.label} style={[styles.actionCard, { borderColor: a.color }]} onPress={() => router.push(a.route as any)}>
              <Ionicons name={a.icon as any} size={28} color={a.color} />
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, borderBottomWidth: 1, borderColor: COLORS.border, gap: 12 },
  title: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 18 },
  roleBadge: { backgroundColor: '#dc262620', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#dc2626' },
  roleText: { color: '#dc2626', fontWeight: '700', fontSize: 11 },
  content: { padding: 16, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: COLORS.panel, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 28, fontWeight: '900' },
  statLabel: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  section: { color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { flex: 1, minWidth: '44%', backgroundColor: COLORS.panel, borderRadius: 12, padding: 18, alignItems: 'center', borderWidth: 1, gap: 8 },
  actionLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  denied: { color: COLORS.muted, fontSize: 16, marginTop: 14, marginBottom: 12 },
  link: { color: COLORS.blue, fontSize: 15 },
});
