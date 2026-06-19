import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { TTSButton } from '../../components/chat/TTSButton';
import { COLORS } from '../../utils/constants';

const SEV_COLOR: Record<string, string> = { info: '#3b82f6', warning: '#f59e0b', critical: '#dc2626' };

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { alerts, markAlertRead } = useAppStore();
  const alert = alerts.find((a) => a._id === id);
  useEffect(() => { if (id) markAlertRead(id); }, [id]);

  if (!alert) return (
    <View style={[styles.container, styles.center]}>
      <Text style={styles.empty}>Alert not found</Text>
      <TouchableOpacity onPress={() => router.back()}><Text style={styles.link}>← Go Back</Text></TouchableOpacity>
    </View>
  );

  const color = SEV_COLOR[alert.severity] ?? COLORS.muted;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Alert Details</Text>
        <TTSButton text={`${alert.title}. ${alert.message}`} size={20} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.band, { backgroundColor: color }]}>
          <Text style={styles.bandSev}>{alert.severity.toUpperCase()} ALERT</Text>
          <Text style={styles.bandType}>{alert.type.toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>{alert.title}</Text>
        <Text style={styles.time}>{new Date(alert.sentAt).toLocaleString()}</Text>
        <Text style={styles.message}>{alert.message}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#22c55e' }]} onPress={() => api.put(`/alerts/${id}/safe`)}>
            <Text style={styles.btnText}>✅ I Am Safe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#dc2626' }]} onPress={() => router.push('/sos' as any)}>
            <Text style={styles.btnText}>🆘 Need Help</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, borderBottomWidth: 1, borderColor: COLORS.border, gap: 12 },
  headerTitle: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 17 },
  content: { padding: 20 },
  band: { borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between' },
  bandSev: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  bandType: { color: '#ffffffcc', fontSize: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  time: { color: COLORS.muted, fontSize: 12, marginBottom: 16 },
  message: { color: COLORS.text, fontSize: 15, lineHeight: 24, marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  empty: { color: COLORS.muted, fontSize: 16, marginBottom: 12 },
  link: { color: COLORS.blue, fontSize: 15 },
});
