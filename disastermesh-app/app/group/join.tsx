import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../../services/api';
import { COLORS } from '../../utils/constants';

export default function JoinGroupScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onScan = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true); setLoading(true); setError('');
    try {
      const parsed = JSON.parse(data);
      await api.post('/family/join', { groupId: parsed.groupId, inviteCode: parsed.inviteCode });
      router.replace(`/group/${parsed.groupId}` as any);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Invalid QR code');
      setTimeout(() => setScanned(false), 2000);
    } finally { setLoading(false); }
  };

  if (!permission?.granted) return (
    <View style={[styles.container, styles.center]}>
      <Ionicons name="camera-outline" size={56} color={COLORS.muted} style={{ marginBottom: 16 }} />
      <Text style={styles.permText}>Camera permission needed to scan QR</Text>
      <TouchableOpacity style={styles.permBtn} onPress={requestPermission}><Text style={styles.permBtnText}>Allow Camera</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>Scan Group QR</Text>
      </View>
      <CameraView style={styles.camera} facing="back" onBarcodeScanned={scanned ? undefined : onScan} barcodeScannerSettings={{ barcodeTypes: ['qr'] }}>
        <View style={styles.overlay}>
          <View style={styles.frame} />
          {loading && <ActivityIndicator color="#fff" size="large" style={{ marginTop: 24 }} />}
          {error ? <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View> : null}
          <Text style={styles.hint}>Point at the group QR code</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, gap: 12, position: 'absolute', top: 0, zIndex: 10, left: 0, right: 0 },
  title: { color: '#fff', fontWeight: '800', fontSize: 18 },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000066' },
  frame: { width: 240, height: 240, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  errBox: { backgroundColor: '#dc2626cc', borderRadius: 8, padding: 10, marginTop: 16 },
  errText: { color: '#fff', fontWeight: '600' },
  hint: { color: '#ffffffcc', fontSize: 14, marginTop: 24 },
  permText: { color: COLORS.muted, fontSize: 15, textAlign: 'center', marginBottom: 20, paddingHorizontal: 32 },
  permBtn: { backgroundColor: COLORS.blue, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
