import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { saveOfflineSOS } from '../db/database';
import { useAppStore } from '../store/appStore';
import { SOS_TYPES, COLORS } from '../utils/constants';
import { v4 as uuidv4 } from 'uuid';

export default function SOSScreen() {
  const router = useRouter();
  const { activeEvent, user, isOnline } = useAppStore();
  const [selectedType, setSelectedType] = useState('');
  const [priority, setPriority] = useState('urgent');
  const [description, setDescription] = useState('');
  const [peopleCount, setPeopleCount] = useState('1');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendSOS = async () => {
    if (!selectedType) { Alert.alert('Select SOS type', 'Please select the type of help you need'); return; }
    if (!activeEvent) { Alert.alert('No Active Disaster', 'SOS can only be sent during an active disaster'); return; }

    setLoading(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      const locResult = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = locResult.coords;

      const payload = {
        eventId: activeEvent._id,
        type: selectedType,
        description: description.trim(),
        peopleCount: parseInt(peopleCount, 10) || 1,
        latitude,
        longitude,
        priority,
      };

      if (isOnline) {
        await api.post('/sos', payload);
      } else {
        // Save offline — will sync when connection restores
        await saveOfflineSOS(uuidv4(), payload);
      }

      setSent(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to send SOS. It will be queued offline.');
      await saveOfflineSOS(uuidv4(), {
        eventId: activeEvent?._id, type: selectedType, description,
        peopleCount: parseInt(peopleCount, 10), priority,
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="checkmark-circle" size={80} color={COLORS.safe} />
        <Text style={styles.sentTitle}>SOS Sent!</Text>
        <Text style={styles.sentSub}>
          {isOnline ? 'Help is on the way. Keep your phone on.' : 'Saved offline. Will be sent when connected.'}
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={COLORS.muted} />
        </TouchableOpacity>
        <Text style={styles.title}>Send SOS</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>What do you need? *</Text>
        <View style={styles.typeGrid}>
          {SOS_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeBtn, selectedType === t.id && { borderColor: t.color, borderWidth: 2, backgroundColor: t.color + '22' }]}
              onPress={() => setSelectedType(t.id)}
            >
              <Text style={styles.typeIcon}>{t.icon}</Text>
              <Text style={styles.typeLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {['critical', 'urgent', 'standard'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.priorityBtn, priority === p && styles.priorityActive]}
              onPress={() => setPriority(p)}
            >
              <Text style={[styles.priorityText, priority === p && styles.priorityActiveText]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Number of people</Text>
        <TextInput
          style={styles.input}
          value={peopleCount}
          onChangeText={setPeopleCount}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor={COLORS.muted}
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your situation…"
          placeholderTextColor={COLORS.muted}
          multiline numberOfLines={3}
          textAlignVertical="top"
        />

        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color="#fbbf24" />
            <Text style={styles.offlineText}>Offline — SOS will be queued until connected</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
          onPress={sendSOS}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="alert-circle" size={24} color="#fff" />
              <Text style={styles.sendBtnText}>SEND SOS NOW</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeBtn: {
    width: '30%', backgroundColor: COLORS.panel, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 6
  },
  typeIcon: { fontSize: 28 },
  typeLabel: { fontSize: 11, color: '#e2e8f0', fontWeight: '600', textAlign: 'center' },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  priorityBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center'
  },
  priorityActive: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  priorityText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  priorityActiveText: { color: '#fff' },
  input: {
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 15, marginBottom: 20
  },
  textArea: { height: 80, paddingTop: 12 },
  offlineBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: '#451a03', borderRadius: 10, padding: 10, marginBottom: 16
  },
  offlineText: { color: '#fbbf24', fontSize: 12 },
  sendBtn: {
    backgroundColor: COLORS.danger, borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    elevation: 8, shadowColor: COLORS.danger, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sentTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 20 },
  sentSub: { fontSize: 14, color: COLORS.muted, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  doneBtn: {
    backgroundColor: COLORS.safe, borderRadius: 14, paddingHorizontal: 48, paddingVertical: 14, marginTop: 32
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
