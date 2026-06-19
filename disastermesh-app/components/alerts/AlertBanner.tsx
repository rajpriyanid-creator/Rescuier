import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  severity: string;
  onClose: () => void;
  onSafe?: () => void;
  onSOS?: () => void;
}

export function AlertBanner({ visible, title, message, severity, onClose, onSafe, onSOS }: Props) {
  const color = severity === 'critical' ? '#dc2626' : severity === 'warning' ? '#f59e0b' : '#3b82f6';
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.banner, { borderColor: color }]}>
          <View style={[styles.header, { backgroundColor: color }]}>
            <Ionicons name="warning" size={28} color="#fff" />
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {onSafe && (
              <TouchableOpacity style={[styles.btn, styles.safeBtn]} onPress={onSafe}>
                <Text style={styles.btnText}>✅ I Am Safe</Text>
              </TouchableOpacity>
            )}
            {onSOS && (
              <TouchableOpacity style={[styles.btn, styles.sosBtn]} onPress={onSOS}>
                <Text style={styles.btnText}>🆘 Need Help</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'center', padding: 20 },
  banner: { backgroundColor: COLORS.panel, borderRadius: 20, overflow: 'hidden', borderWidth: 2 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  title: { color: '#fff', fontWeight: '800', fontSize: 18, flex: 1 },
  message: { color: COLORS.text, padding: 16, fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  safeBtn: { backgroundColor: '#22c55e' },
  sosBtn: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  closeBtn: { alignItems: 'center', paddingVertical: 14 },
  closeText: { color: COLORS.muted, fontSize: 14 },
});
