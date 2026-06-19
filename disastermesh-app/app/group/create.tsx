import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { COLORS } from '../../utils/constants';

export default function CreateGroupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Group name is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/family/group', { name: name.trim(), description: description.trim() });
      router.replace(`/group/${res.data.group._id}` as any);
    } catch (e: any) { setError(e.response?.data?.error || 'Failed to create group'); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>Create Family Group</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Group Name *</Text>
        <TextInput style={styles.input} placeholder="e.g. The Sharma Family" placeholderTextColor={COLORS.muted} value={name} onChangeText={setName} />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Notes..." placeholderTextColor={COLORS.muted} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.blue} />
          <Text style={styles.infoText}>Share the group QR code with family members to invite them.</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Group</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, borderBottomWidth: 1, borderColor: COLORS.border, gap: 12 },
  title: { color: '#fff', fontWeight: '800', fontSize: 18 },
  content: { padding: 20 },
  label: { color: COLORS.muted, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 16, letterSpacing: 0.5 },
  input: { backgroundColor: '#1a2744', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, color: '#fff', padding: 14, fontSize: 15 },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#1a2744', borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: COLORS.blue },
  infoText: { color: COLORS.muted, fontSize: 13, flex: 1, lineHeight: 19 },
  error: { color: '#f87171', fontSize: 12, marginTop: 12 },
  btn: { backgroundColor: COLORS.blue, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
