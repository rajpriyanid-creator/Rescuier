import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

interface Props {
  instruction: string;
  distance: string;
  eta: string;
  onStop: () => void;
}

export function NavigationOverlay({ instruction, distance, eta, onStop }: Props) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.turnRow}>
          <Ionicons name="navigate-outline" size={32} color="#fff" />
          <View style={styles.turnInfo}>
            <Text style={styles.instruction}>{instruction}</Text>
            <Text style={styles.distance}>{distance}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.eta}>ETA: {eta}</Text>
          <TouchableOpacity style={styles.stopBtn} onPress={onStop}>
            <Text style={styles.stopText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 12, left: 12, right: 12 },
  card: { backgroundColor: '#1e3a5f', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#2563eb' },
  turnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  turnInfo: { flex: 1 },
  instruction: { color: '#fff', fontSize: 16, fontWeight: '700' },
  distance: { color: '#93c5fd', fontSize: 13, marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eta: { color: COLORS.muted, fontSize: 13 },
  stopBtn: { backgroundColor: '#dc2626', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  stopText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
