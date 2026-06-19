import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../ui/StatusBadge';
import { COLORS } from '../../utils/constants';

interface SOS {
  _id: string; sosId?: string; type: string; description?: string;
  priority: string; status: string; peopleCount?: number; createdAt: string;
  latitude?: number; longitude?: number;
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#dc2626', urgent: '#f59e0b', standard: '#3b82f6',
};

interface Props { sos: SOS; onPress?: () => void; showDistance?: string; }

export function SOSCard({ sos, onPress, showDistance }: Props) {
  const color = PRIORITY_COLOR[sos.priority] ?? COLORS.muted;
  const elapsed = Math.round((Date.now() - new Date(sos.createdAt).getTime()) / 60000);

  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <View style={[styles.priorityDot, { backgroundColor: color }]} />
        <Text style={styles.type}>{sos.type.replace(/_/g, ' ').toUpperCase()}</Text>
        <StatusBadge status={sos.status} size="sm" />
      </View>
      {sos.description ? <Text style={styles.desc} numberOfLines={2}>{sos.description}</Text> : null}
      <View style={styles.meta}>
        <Text style={styles.metaText}>👥 {sos.peopleCount ?? 1} person{sos.peopleCount !== 1 ? 's' : ''}</Text>
        <Text style={styles.metaText}>⏱ {elapsed}m ago</Text>
        {showDistance ? <Text style={styles.metaText}>📍 {showDistance}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.panel, borderRadius: 12, padding: 14,
    marginBottom: 10, borderLeftWidth: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  type: { color: '#fff', fontWeight: '700', fontSize: 13, flex: 1 },
  desc: { color: COLORS.muted, fontSize: 13, marginBottom: 8 },
  meta: { flexDirection: 'row', gap: 16 },
  metaText: { color: COLORS.muted, fontSize: 11 },
});
