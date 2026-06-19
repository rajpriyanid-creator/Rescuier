import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { COLORS, LANGUAGES } from '../../utils/constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, setUser } = useAppStore();
  const [name, setName] = useState(user?.name || '');
  const [bloodGroup, setBloodGroup] = useState(user?.medicalProfile?.bloodGroup || '');
  const [conditions, setConditions] = useState(user?.medicalProfile?.conditions?.join(', ') || '');
  const [allergies, setAllergies] = useState(user?.medicalProfile?.allergies?.join(', ') || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/user/profile', {
        name: name.trim(),
        language,
        medicalProfile: {
          bloodGroup: bloodGroup.trim(),
          conditions: conditions.split(',').map((s) => s.trim()).filter(Boolean),
          allergies: allergies.split(',').map((s) => s.trim()).filter(Boolean),
        },
      });
      setUser(res.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    } finally { setSaving(false); }
  };

  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.danger} /> :
            <Text style={[styles.saveText, saved && styles.savedText]}>{saved ? '✓ Saved' : 'Save'}</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Profile */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input} value={name} onChangeText={setName}
            placeholder="Your name" placeholderTextColor={COLORS.muted}
          />
        </View>

        {/* Language */}
        <Text style={styles.sectionTitle}>Language</Text>
        <View style={styles.langGrid}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
              onPress={() => setLanguage(lang.code)}
            >
              <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>{lang.label}</Text>
              <Text style={[styles.langName, language === lang.code && styles.langLabelActive]}>{lang.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Medical Profile */}
        <Text style={styles.sectionTitle}>Medical Profile</Text>
        <Text style={styles.medNote}>This info is shared with responders during emergencies</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Blood Group</Text>
          <View style={styles.bloodGrid}>
            {BLOOD_GROUPS.map((bg) => (
              <TouchableOpacity
                key={bg}
                style={[styles.bloodBtn, bloodGroup === bg && styles.bloodBtnActive]}
                onPress={() => setBloodGroup(bg)}
              >
                <Text style={[styles.bloodText, bloodGroup === bg && styles.bloodTextActive]}>{bg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Medical Conditions (comma-separated)</Text>
          <TextInput
            style={styles.input} value={conditions} onChangeText={setConditions}
            placeholder="e.g. Diabetes, Asthma" placeholderTextColor={COLORS.muted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Allergies (comma-separated)</Text>
          <TextInput
            style={styles.input} value={allergies} onChangeText={setAllergies}
            placeholder="e.g. Penicillin, Shellfish" placeholderTextColor={COLORS.muted}
          />
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color="#93c5fd" />
          <Text style={styles.infoText}>
            Your Disaster ID <Text style={styles.infoBold}>{user?.disasterId}</Text> is used by
            emergency responders to identify you. Keep it safe.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  saveText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
  savedText: { color: COLORS.safe },
  scroll: { padding: 16, paddingBottom: 50 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10
  },
  field: { marginBottom: 14 },
  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14
  },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center'
  },
  langBtnActive: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  langLabel: { color: COLORS.muted, fontSize: 16, fontWeight: '700' },
  langName: { color: COLORS.muted, fontSize: 10 },
  langLabelActive: { color: '#fff' },
  medNote: { fontSize: 11, color: COLORS.muted, marginBottom: 10, fontStyle: 'italic' },
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bloodBtn: {
    width: 48, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border
  },
  bloodBtnActive: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  bloodText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  bloodTextActive: { color: '#fff' },
  infoCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 20,
    backgroundColor: '#1e3a5f', borderRadius: 12, padding: 12
  },
  infoText: { flex: 1, color: '#93c5fd', fontSize: 12, lineHeight: 18 },
  infoBold: { fontWeight: '700', color: '#fff' },
});
