import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

interface Props { onSubmit: (pin: string) => void; isSetup?: boolean; error?: string; }

export function VaultPinEntry({ onSubmit, isSetup, error }: Props) {
  const [pin, setPin] = useState('');
  const MAX = 6;
  const pad = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  const press = (key: string) => {
    if (key === '⌫') { setPin((p) => p.slice(0, -1)); return; }
    if (!key || pin.length >= MAX) return;
    const next = pin + key;
    setPin(next);
    if (next.length === MAX) { onSubmit(next); setPin(''); }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={40} color={COLORS.danger} style={styles.icon} />
      <Text style={styles.title}>{isSetup ? 'Set Vault PIN' : 'Enter Vault PIN'}</Text>
      <Text style={styles.subtitle}>{isSetup ? 'Choose a 6-digit PIN' : 'Your vault is protected'}</Text>
      <View style={styles.dots}>
        {Array.from({ length: MAX }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.pad}>
        {pad.map((key, i) => (
          <TouchableOpacity key={i} style={[styles.key, !key && styles.keyEmpty]} onPress={() => press(key)} disabled={!key && key !== ''}>
            <Text style={styles.keyText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { marginBottom: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: COLORS.muted, fontSize: 13, marginBottom: 32 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: COLORS.border, backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  error: { color: '#f87171', fontSize: 13, marginBottom: 12 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 0 },
  key: { width: 80, height: 72, alignItems: 'center', justifyContent: 'center' },
  keyEmpty: { opacity: 0 },
  keyText: { color: '#fff', fontSize: 24, fontWeight: '600' },
});
