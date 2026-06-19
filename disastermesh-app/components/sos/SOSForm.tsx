import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { COLORS, SOS_TYPES } from '../../utils/constants';

interface Props { onSuccess: () => void; onCancel: () => void; }

export function SOSForm({ onSuccess, onCancel }: Props) {
  const { lastLatitude, lastLongitude, activeEvent } = useAppStore();
  const [type, setType] = useState('trapped');
  const [description, setDescription] = useState('');
  const [peopleCount, setPeopleCount] = useState('1');
  const [priority, setPriority] = useState<'critical' | 'urgent' | 'standard'>('urgent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!activeEvent) { setError('No active disaster event'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/sos', {
        type, description, peopleCount: parseInt(peopleCount) || 1,
        priority, latitude: lastLatitude, longitude: lastLongitude,
        eventId: activeEvent._id,
      });
      onSuccess();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to send SOS');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Type of Emergency</Text>
      <View style={styles.typeGrid}>
        {SOS_TYPES.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.typeBtn, type === t.id && { borderColor: t.color, backgroundColor: t.color + '22' }]}
            onPress={() => setType(t.id)}
          >
            <Text style={styles.typeIcon}>{t.icon}</Text>
            <Text style={[styles.typeLabel, type === t.id && { color: t.color }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Priority</Text>
      <View style={styles.priorityRow}>
        {(['critical', 'urgent', 'standard'] as const).map((p) => {
          const colors: Record<string, string> = { critical: '#dc2626', urgent: '#f59e0b', standard: '#3b82f6' };
          return (
            <TouchableOpacity
              key={p}
              style={[styles.priorityBtn, priority === p && { borderColor: colors[p], backgroundColor: colors[p] + '22' }]}
              onPress={() => setPriority(p)}
            >
              <Text style={[styles.priorityText, priority === p && { color: colors[p] }]}>{p.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Description (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Briefly describe the situation..."
        placeholderTextColor={COLORS.muted}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <Text style={styles.sectionLabel}>People Count</Text>
      <TextInput
        style={[styles.input, styles.countInput]}
        placeholder="1"
        placeholderTextColor={COLORS.muted}
        value={peopleCount}
        onChangeText={setPeopleCount}
        keyboardType="number-pad"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="warning" size={20} color="#fff" />
            <Text style={styles.submitText}>SEND SOS NOW</Text>
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 16, letterSpacing: 1 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { width: '30%', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel },
  typeIcon: { fontSize: 22 },
  typeLabel: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  priorityText: { color: COLORS.muted, fontWeight: '700', fontSize: 11 },
  input: { backgroundColor: '#1a2744', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, color: '#fff', padding: 12, fontSize: 14 },
  countInput: { width: 80 },
  error: { color: '#f87171', fontSize: 12, marginTop: 8 },
  submitBtn: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  cancelBtn: { alignItems: 'center', paddingVertical: 16 },
  cancelText: { color: COLORS.muted, fontSize: 14 },
});
