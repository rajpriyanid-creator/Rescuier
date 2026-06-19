import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { useAppStore } from '../store/appStore';
import { COLORS } from '../utils/constants';

const STATUS_COLOR: Record<string, string> = {
  safe: COLORS.safe,
  need_help: COLORS.danger,
  evacuating: '#f97316',
  shelter: '#3b82f6',
  unknown: COLORS.muted,
};

export default function FamilyScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const [group, setGroup] = useState<any>(null);
  const [memberLocations, setMemberLocations] = useState<any[]>([]);
  const [invitePhone, setInvitePhone] = useState('');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [locRes] = await Promise.all([
        api.get('/location/family').catch(() => ({ data: { locations: [] } })),
      ]);
      setMemberLocations(locRes.data.locations || []);
    } catch {} finally { setLoading(false); }
  };

  const createGroup = async () => {
    if (!groupName.trim()) { Alert.alert('Enter a group name'); return; }
    try {
      const res = await api.post('/family', { name: groupName.trim() });
      setGroup(res.data.group);
      setGroupName('');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to create group');
    }
  };

  const inviteMember = async () => {
    if (!invitePhone.trim() || !group) return;
    setInviting(true);
    try {
      await api.post(`/family/${group._id}/invite`, { phone: invitePhone.trim() });
      Alert.alert('✅ Invited!', 'Member added to your family group.');
      setInvitePhone('');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to invite member');
    } finally { setInviting(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Family Safety</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!group ? (
          <View style={styles.createCard}>
            <Ionicons name="people" size={48} color="#2563eb" style={{ marginBottom: 12 }} />
            <Text style={styles.createTitle}>Create Family Group</Text>
            <Text style={styles.createSub}>Link with your family to track each other during emergencies</Text>
            <TextInput
              style={styles.input}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Family group name…"
              placeholderTextColor={COLORS.muted}
            />
            <TouchableOpacity style={styles.createBtn} onPress={createGroup}>
              <Text style={styles.createBtnText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.groupCard}>
              <Ionicons name="people" size={24} color="#2563eb" />
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupSub}>{group.members?.length || 1} members</Text>
              </View>
            </View>

            {/* Invite */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Invite Member</Text>
              <View style={styles.inviteRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={invitePhone}
                  onChangeText={setInvitePhone}
                  placeholder="Phone number…"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity style={styles.inviteBtn} onPress={inviteMember} disabled={inviting}>
                  {inviting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="person-add" size={18} color="#fff" />}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Member Locations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Family Locations {loading && <ActivityIndicator size="small" color={COLORS.muted} />}</Text>
          {memberLocations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="location-outline" size={32} color={COLORS.border} />
              <Text style={styles.emptyText}>
                {group ? 'No family members sharing location yet' : 'Create a group to track family locations'}
              </Text>
            </View>
          ) : (
            memberLocations.map((member, idx) => (
              <View key={idx} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{member.name?.charAt(0) || '?'}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[member.status] || COLORS.muted }]} />
                    <Text style={[styles.memberStatus, { color: STATUS_COLOR[member.status] || COLORS.muted }]}>
                      {member.status?.replace('_', ' ') || 'unknown'}
                    </Text>
                  </View>
                  <Text style={styles.memberTime}>
                    Last seen: {member.lastSeen ? new Date(member.lastSeen).toLocaleTimeString() : 'Unknown'}
                  </Text>
                </View>
                <View style={styles.locationCoords}>
                  <Ionicons name="location" size={12} color={COLORS.muted} />
                  <Text style={styles.coordsText}>
                    {member.latitude?.toFixed(3)}, {member.longitude?.toFixed(3)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Safety Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>🛡️ Family Safety Tips</Text>
          {[
            'Set a family meeting point before disasters',
            'Keep everyone in this group updated on your status',
            'Share your Disaster ID: ' + (user?.disasterId || '—'),
            'Use the vault to store family medical info',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
  scroll: { padding: 16, paddingBottom: 40 },
  createCard: {
    backgroundColor: COLORS.panel, borderRadius: 20, padding: 24, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', marginBottom: 20
  },
  createTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6 },
  createSub: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  input: {
    width: '100%', backgroundColor: '#1a2744', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14, marginBottom: 12
  },
  createBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, width: '100%', alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  groupCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: '#1e3a5f', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2563eb', marginBottom: 16
  },
  groupName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  groupSub: { fontSize: 12, color: '#93c5fd', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  inviteRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inviteBtn: {
    backgroundColor: '#2563eb', width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center'
  },
  emptyCard: { alignItems: 'center', padding: 28, gap: 10, backgroundColor: COLORS.panel, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  memberCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: COLORS.panel, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: '#93c5fd', fontWeight: '700', fontSize: 16 },
  memberInfo: { flex: 1 },
  memberName: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statusRow: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  memberStatus: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  memberTime: { fontSize: 10, color: COLORS.muted, marginTop: 1 },
  locationCoords: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  coordsText: { color: COLORS.muted, fontSize: 10 },
  tipsCard: {
    backgroundColor: COLORS.panel, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 10 },
  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tipBullet: { color: COLORS.muted, fontSize: 13 },
  tipText: { flex: 1, color: COLORS.muted, fontSize: 12, lineHeight: 18 },
});
