import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../store/appStore';
import { api } from '../../services/api';
import { COLORS } from '../../utils/constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, setAuthenticated, setUser } = useAppStore();
  const [bgLocation, setBgLocation] = useState(true);
  const [seismicDetection, setSeismicDetection] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [language, setLanguage] = useState('en');

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'hi', label: 'हिंदी (Hindi)' },
    { code: 'te', label: 'తెలుగు (Telugu)' },
    { code: 'ml', label: 'മലയാളം (Malayalam)' },
    { code: 'bn', label: 'বাংলা (Bengali)' },
  ];

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          try { await api.delete('/auth/logout'); } catch {}
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
          setUser(null); setAuthenticated(false);
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This action is permanent and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete('/user/account');
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
            setUser(null); setAuthenticated(false);
            router.replace('/auth/login');
          } catch { Alert.alert('Error', 'Failed to delete account.'); }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Account */}
        <Text style={styles.section}>Account</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Disaster ID</Text>
            <Text style={styles.infoValue}>{user?.disasterId ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{user?.name ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>{user?.city ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{user?.role ?? '—'}</Text>
          </View>
        </View>

        {/* Preferences */}
        <Text style={styles.section}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Background Location</Text>
              <Text style={styles.toggleSub}>Share location during active disasters</Text>
            </View>
            <Switch value={bgLocation} onValueChange={setBgLocation} trackColor={{ true: COLORS.blue }} thumbColor="#fff" />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Seismic Detection</Text>
              <Text style={styles.toggleSub}>Earthquake early warning via accelerometer</Text>
            </View>
            <Switch value={seismicDetection} onValueChange={setSeismicDetection} trackColor={{ true: COLORS.blue }} thumbColor="#fff" />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Push Notifications</Text>
              <Text style={styles.toggleSub}>Disaster alerts and SOS updates</Text>
            </View>
            <Switch value={pushNotifs} onValueChange={setPushNotifs} trackColor={{ true: COLORS.blue }} thumbColor="#fff" />
          </View>
        </View>

        {/* Language */}
        <Text style={styles.section}>Language</Text>
        <View style={styles.card}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity key={lang.code} style={styles.langRow} onPress={() => setLanguage(lang.code)}>
              <Text style={styles.langLabel}>{lang.label}</Text>
              {language === lang.code && <Ionicons name="checkmark" size={20} color={COLORS.blue} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Danger Zone */}
        <Text style={styles.section}>Account Actions</Text>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f97316' }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#dc2626', marginTop: 10 }]} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, borderBottomWidth: 1, borderColor: COLORS.border, gap: 12 },
  title: { color: '#fff', fontWeight: '800', fontSize: 18 },
  content: { padding: 16, paddingBottom: 40 },
  section: { color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 20, marginBottom: 8, paddingLeft: 4 },
  card: { backgroundColor: COLORS.panel, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderColor: COLORS.border },
  infoLabel: { color: COLORS.muted, fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  toggleLabel: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  toggleSub: { color: COLORS.muted, fontSize: 11 },
  divider: { height: 1, backgroundColor: COLORS.border },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderColor: COLORS.border },
  langLabel: { color: '#fff', fontSize: 14 },
  actionBtn: { borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
