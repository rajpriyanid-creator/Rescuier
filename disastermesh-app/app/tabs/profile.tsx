import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Switch, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../store/appStore';
import { api } from '../../services/api';
import { COLORS } from '../../utils/constants';

const ROLE_COLORS: Record<string, string> = {
  superadmin: COLORS.danger,
  admin: '#ea580c',
  responder: '#2563eb',
  volunteer: '#16a34a',
  user: COLORS.muted,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser, setAuthenticated } = useAppStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try { await api.delete('/auth/logout'); } catch {}
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
          setUser(null);
          setAuthenticated(false);
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const deleteAccount = () => {
    Alert.alert('Delete Account', 'This action is permanent and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/user/account');
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
            setUser(null);
            setAuthenticated(false);
            router.replace('/auth/login');
          } catch {
            Alert.alert('Error', 'Failed to delete account. Try again later.');
          }
        },
      },
    ]);
  };

  if (!user) return null;

  const isAdmin = ['admin', 'superadmin'].includes(user.role);
  const isResponder = ['responder', 'admin', 'superadmin'].includes(user.role);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar + Info */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.phone}>{user.phone}</Text>
          <View style={styles.roleBadge}>
            <Text style={[styles.roleText, { color: ROLE_COLORS[user.role] || COLORS.muted }]}>
              {user.role.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Disaster ID Card */}
        <View style={styles.idCard}>
          <Text style={styles.idLabel}>DISASTER ID</Text>
          <Text style={styles.idValue}>{user.disasterId}</Text>
          <Text style={styles.idSub}>{user.city}</Text>
        </View>

        {/* Medical Summary */}
        {user.medicalProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Profile</Text>
            <View style={styles.medRow}>
              <Ionicons name="water" size={16} color="#ef4444" />
              <Text style={styles.medText}>
                Blood Group: <Text style={styles.medValue}>{user.medicalProfile.bloodGroup || 'Not set'}</Text>
              </Text>
            </View>
            {(user.medicalProfile.conditions?.length ?? 0) > 0 && (
              <View style={styles.medRow}>
                <Ionicons name="medkit" size={16} color="#f97316" />
                <Text style={styles.medText}>
                  Conditions: <Text style={styles.medValue}>{user.medicalProfile.conditions?.join(', ')}</Text>
                </Text>
              </View>
            )}
            {(user.medicalProfile.allergies?.length ?? 0) > 0 && (
              <View style={styles.medRow}>
                <Ionicons name="warning" size={16} color="#eab308" />
                <Text style={styles.medText}>
                  Allergies: <Text style={styles.medValue}>{user.medicalProfile.allergies?.join(', ')}</Text>
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Menu */}
        <View style={styles.menu}>
          {[
            { icon: 'create-outline', label: 'Edit Profile', route: '/settings/edit', show: true },
            { icon: 'lock-closed-outline', label: 'Emergency Vault', route: '/vault', show: true },
            { icon: 'people-outline', label: 'Family Group', route: '/family', show: true },
            { icon: 'shield-outline', label: 'Admin Panel', route: '/admin', show: isAdmin },
            { icon: 'settings-outline', label: 'Settings', route: '/settings', show: true },
          ].filter((i) => i.show).map(({ icon, label, route }) => (
            <TouchableOpacity
              key={label}
              style={styles.menuItem}
              onPress={() => router.push(route as any)}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name={icon as any} size={18} color={COLORS.muted} />
              </View>
              <Text style={styles.menuLabel}>{label}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} disabled={loggingOut}>
          {loggingOut
            ? <ActivityIndicator color={COLORS.danger} />
            : <>
                <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
                <Text style={styles.logoutText}>Log Out</Text>
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={deleteAccount} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DisasterMesh v1.0 · HACKHAZARDS '26</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 20, paddingVertical: 16 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', marginBottom: 12
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  phone: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  roleBadge: {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: COLORS.panel, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border
  },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  idCard: {
    backgroundColor: '#1a1033', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#4c1d95', alignItems: 'center'
  },
  idLabel: { fontSize: 10, color: '#a78bfa', letterSpacing: 2, fontWeight: '700' },
  idValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 4, letterSpacing: 1 },
  idSub: { fontSize: 12, color: '#a78bfa', marginTop: 2 },
  section: {
    backgroundColor: COLORS.panel, borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border, gap: 8
  },
  sectionTitle: { fontSize: 12, color: COLORS.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  medRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  medText: { color: COLORS.muted, fontSize: 13 },
  medValue: { color: '#e2e8f0', fontWeight: '600' },
  menu: {
    backgroundColor: COLORS.panel, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, overflow: 'hidden', marginBottom: 16
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  menuIconWrap: { width: 28 },
  menuLabel: { flex: 1, color: '#e2e8f0', fontSize: 14 },
  logoutBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.danger, marginBottom: 10
  },
  logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
  deleteBtn: { alignItems: 'center', padding: 10, marginBottom: 24 },
  deleteText: { color: COLORS.muted, fontSize: 12, textDecorationLine: 'underline' },
  version: { textAlign: 'center', color: COLORS.border, fontSize: 11 },
});
