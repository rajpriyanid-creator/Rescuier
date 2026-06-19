import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../utils/constants';

const SEVERITY_COLOR: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  critical: '#dc2626',
};
const TYPE_ICON: Record<string, string> = {
  earthquake: 'earth', flood: 'water', cyclone: 'thunderstorm-outline',
  fire: 'flame', tsunami: 'water', alert: 'warning', general: 'notifications',
};

interface Props {
  alert: { _id: string; title: string; message: string; severity: string; type: string; sentAt: string; read?: boolean };
}

export function AlertCard({ alert }: Props) {
  const router = useRouter();
  const color = SEVERITY_COLOR[alert.severity] ?? COLORS.muted;
  const icon = (TYPE_ICON[alert.type] ?? 'notifications') as any;
  const time = new Date(alert.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity
      style={[styles.card, !alert.read && styles.unread, { borderLeftColor: color }]}
      onPress={() => router.push(`/alert/${alert._id}` as any)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{alert.title}</Text>
        <Text style={styles.message} numberOfLines={2}>{alert.message}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      {!alert.read && <View style={[styles.dot, { backgroundColor: color }]} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: COLORS.panel, borderRadius: 12,
    padding: 12, marginBottom: 10, borderLeftWidth: 4, borderColor: COLORS.border,
    borderWidth: 1,
  },
  unread: { backgroundColor: '#1e2d45' },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content: { flex: 1 },
  title: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 3 },
  message: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  time: { color: COLORS.border, fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4, marginLeft: 6 },
});
