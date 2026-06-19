import { View, Text, StyleSheet } from 'react-native';

const STATUS_COLORS: Record<string, string> = {
  safe: '#22c55e',
  need_help: '#dc2626',
  evacuating: '#f59e0b',
  shelter: '#3b82f6',
  checkin: '#a855f7',
  unknown: '#64748b',
  active: '#dc2626',
  monitoring: '#f59e0b',
  resolved: '#22c55e',
};

interface Props { status: string; size?: 'sm' | 'md'; }

export function StatusBadge({ status, size = 'md' }: Props) {
  const color = STATUS_COLORS[status] ?? '#64748b';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }, size === 'sm' && styles.sm]}>
      <Text style={[styles.text, { color }, size === 'sm' && styles.smText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
  sm: { paddingHorizontal: 7, paddingVertical: 2 },
  smText: { fontSize: 10 },
});
