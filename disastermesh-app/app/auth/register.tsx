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

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser, setAuthenticated } = useAppStore();
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !phone.trim() || !password.trim() || !city.trim()) {
      setError('All fields are required'); return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/register', {
        username: username.trim(),
        phone: phone.trim(),
        password: password.trim(),
        city: city.trim(),
      });
      await AsyncStorage.setItem('accessToken', res.data.accessToken);
      await AsyncStorage.setItem('refreshToken', res.data.refreshToken);
      setUser(res.data.user);
      setAuthenticated(true);
      router.replace('/tabs/home');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Ionicons name="shield-half" size={40} color={COLORS.danger} />
          <Text style={styles.title}>Create Account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Details</Text>

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={16} color={COLORS.muted} style={styles.icon} />
              <TextInput
                style={styles.input} placeholder="Choose a username"
                placeholderTextColor={COLORS.muted}
                value={username} onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={16} color={COLORS.muted} style={styles.icon} />
              <TextInput
                style={styles.input} placeholder="+91 98765 43210"
                placeholderTextColor={COLORS.muted}
                keyboardType="phone-pad" value={phone} onChangeText={setPhone}
              />
            </View>
          </View>

          {/* City */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>City / Town</Text>
            <View style={styles.inputRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.muted} style={styles.icon} />
              <TextInput
                style={styles.input} placeholder="City or town name"
                placeholderTextColor={COLORS.muted}
                value={city} onChangeText={setCity}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.muted} style={styles.icon} />
              <TextInput
                style={styles.input} placeholder="Min. 6 characters"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showPassword}
                value={password} onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={16} color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.muted} style={styles.icon} />
              <TextInput
                style={styles.input} placeholder="Re-enter password"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showPassword}
                value={confirmPassword} onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Register</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.link}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, padding: 24 },
  header: { alignItems: 'center', marginBottom: 28, marginTop: 16 },
  back: { position: 'absolute', left: 0, top: 0, padding: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 8 },
  card: {
    backgroundColor: COLORS.panel, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 12, color: COLORS.muted, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a2744', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 12,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 15, height: 48 },
  eyeBtn: { paddingLeft: 8 },
  btn: {
    backgroundColor: COLORS.danger, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 12,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#f87171', fontSize: 12, marginBottom: 10 },
  link: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: COLORS.muted, fontSize: 14 },
});
