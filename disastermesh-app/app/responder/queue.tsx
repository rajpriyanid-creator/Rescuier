import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { SOSCard } from '../../components/sos/SOSCard';
import { COLORS } from '../../utils/constants';

export default function ResponderQueueScreen() {
  const router = useRouter();
  const [sosList, setSosList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try { const res = await api.get('/sos/city'); setSosList(res.data.sos || []); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, []);

  const claim = async (sosId: string) => {
    try { await api.put(`/sos/${sosId}/claim`); fetchQueue(); } catch {}
  };

  const sorted = [...sosList].sort((a, b) => {
    const o: Record<string, number> = { critical: 0, urgent: 1, standard: 2 };
    return (o[a.priority] ?? 3) - (o[b.priority] ?? 3);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>SOS Queue</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>{sorted.length}</Text></View>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.itemWrap}>
            <SOSCard sos={item} />
            {(item.status === 'sent' || item.status === 'seen') && (
              <TouchableOpacity style={styles.respondBtn} onPress={() => claim(item._id)}>
                <Text style={styles.respondText}>Respond</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchQueue} tintColor={COLORS.danger} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No active SOS requests</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, borderBottomWidth: 1, borderColor: COLORS.border, gap: 12 },
  title: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 18 },
  badge: { backgroundColor: COLORS.danger, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { padding: 16 },
  itemWrap: { marginBottom: 12 },
  respondBtn: { backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: -4 },
  respondText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.muted, fontSize: 15 },
});
