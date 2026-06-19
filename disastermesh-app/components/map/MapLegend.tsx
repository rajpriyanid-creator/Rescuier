import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../utils/constants';

const LEGEND_ITEMS = [
  { icon: '🟢', label: 'Safe Zone' },
  { icon: '🔵', label: 'Water Point' },
  { icon: '🏥', label: 'Medical Post' },
  { icon: '⛰️', label: 'High Ground' },
  { icon: '🏫', label: 'Relief Camp' },
  { icon: '🍱', label: 'Food Station' },
  { icon: '⚠️', label: 'Hazard Zone' },
  { icon: '📍', label: 'Active SOS' },
  { icon: '👪', label: 'Family Member' },
];

interface Props { visible: boolean; onClose: () => void; }

export function MapLegend({ visible, onClose }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Map Legend</Text>
        <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
      </View>
      {LEGEND_ITEMS.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text style={styles.icon}>{item.icon}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute', bottom: 80, left: 12, backgroundColor: COLORS.panel,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, minWidth: 180,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  title: { color: '#fff', fontWeight: '700', fontSize: 13 },
  close: { color: COLORS.muted, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  icon: { fontSize: 16, width: 26 },
  label: { color: COLORS.muted, fontSize: 12 },
});
