import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../services/api';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { COLORS } from '../../utils/constants';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fetchGroup = async () => {
    setLoading(true);
    try {
      const [gRes, mRes] = await Promise.all([api.get(`/family/group/${id}`), api.get(`/family/group/${id}/members`)]);
      setGroup(gRes.data.group); setMembers(mRes.data.members);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { if (id) fetchGroup(); }, [id]);

  const qrData = group ? JSON.stringify({ groupId: id, inviteCode: group.inviteCode }) : '{}';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{group?.name ?? 'Family Group'}</Text>
        <TouchableOpacity onPress={() => setShowQR((v) => !v)}><Ionicons name="qr-code-outline" size={24} color="#fff" /></TouchableOpacity>
      </View>
      {showQR && (
        <View style={styles.qrBox}>
          <Text style={styles.qrLabel}>Invite family members</Text>
          <QRCode value={qrData} size={160} color="#fff" backgroundColor={COLORS.panel} />
        </View>
      )}
      <FlatList
        data={members}
        keyExtractor={(m) => m._id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar name={item.name} photo={item.photo} size={44} role={item.role} />
            <View style={styles.info}><Text style={styles.name}>{item.name}</Text><Text style={styles.did}>{item.disasterId}</Text></View>
            <StatusBadge status={item.currentStatus || 'unknown'} size="sm" />
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchGroup} tintColor={COLORS.danger} />}
        ListEmptyComponent={<Text style={styles.empty}>No members yet. Share the QR!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, borderBottomWidth: 1, borderColor: COLORS.border, gap: 12 },
  title: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 18 },
  qrBox: { alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel },
  qrLabel: { color: COLORS.muted, fontSize: 13, marginBottom: 14 },
  list: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.panel, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  info: { flex: 1 },
  name: { color: '#fff', fontWeight: '700', fontSize: 15 },
  did: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
