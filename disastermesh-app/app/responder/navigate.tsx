import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

export default function ResponderNavigateScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>Navigate to SOS</Text>
      </View>
      <View style={styles.center}>
        <Ionicons name="navigate-circle-outline" size={64} color={COLORS.muted} />
        <Text style={styles.info}>Open the Map tab and tap an SOS pin to start offline navigation.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/tabs/map' as any)}>
          <Text style={styles.btnText}>Open Map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, borderBottomWidth: 1, borderColor: COLORS.border, gap: 12 },
  title: { color: '#fff', fontWeight: '800', fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  info: { color: COLORS.muted, fontSize: 15, textAlign: 'center', marginTop: 16, lineHeight: 22 },
  btn: { backgroundColor: COLORS.blue, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 32, marginTop: 24 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
