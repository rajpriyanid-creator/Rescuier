import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAppStore } from '../../store/appStore';
import { COLORS } from '../../utils/constants';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setAuthenticated } = useAppStore();
  const [disasterId, setDisasterId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!disasterId.trim()) { setError('Enter your Disaster ID'); return; }
    if (!password.trim()) { setError('Enter your password'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', {
        disasterId: disasterId.trim(),
        password: password.trim(),
      });
      await AsyncStorage.setItem('accessToken', res.data.accessToken);
      await AsyncStorage.setItem('refreshToken', res.data.refreshToken);
      setUser(res.data.user);
      setAuthenticated(true);
      router.replace('/tabs/home');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Login failed. Check your ID and password.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoBox}>
          <Ionicons name="shield-half" size={64} color={COLORS.danger} />
          <Text style={styles.appName}>DisasterMesh</Text>
          <Text style={styles.tagline}>Your lifeline in crisis</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in</Text>
          <Text style={styles.cardSub}>Enter your Disaster ID and password</Text>

          {/* Disaster ID */}
          <View style={styles.inputRow}>
            <Ionicons name="id-card-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="DM-MUM-2026-XXXX"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="characters"
              value={disasterId}
              onChangeText={setDisasterId}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.muted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={COLORS.muted}
              />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Login</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.link}>
            <Text style={styles.linkText}>New user? Register here</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>HACKHAZARDS '26 · DisasterMesh v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoBox: { alignItems: 'center', marginBottom: 32 },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 12 },
  tagline: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  card: {
    backgroundColor: COLORS.panel, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardSub: { fontSize: 13, color: COLORS.muted, marginBottom: 20 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a2744', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 12, marginBottom: 16,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 15, height: 48 },
  eyeBtn: { paddingLeft: 8 },
  btn: {
    backgroundColor: COLORS.danger, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#f87171', fontSize: 12, marginBottom: 10 },
  link: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: COLORS.muted, fontSize: 14 },
  footer: { color: COLORS.border, fontSize: 11, textAlign: 'center', marginTop: 32 },
});
