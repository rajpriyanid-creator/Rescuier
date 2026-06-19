import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import { COLORS } from '../../utils/constants';

interface Props { seconds: number; onExpired?: () => void; }

export function AlertCountdown({ seconds, onExpired }: Props) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    Vibration.vibrate([0, 300, 200, 300, 200, 300]);
    const interval = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onExpired?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { clearInterval(interval); Vibration.cancel(); };
  }, [seconds]);

  const color = remaining <= 5 ? '#dc2626' : remaining <= 15 ? '#f59e0b' : '#22c55e';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>⚠️ EARTHQUAKE WAVE APPROACHING</Text>
      <Text style={[styles.countdown, { color }]}>{remaining}</Text>
      <Text style={styles.unit}>SECONDS</Text>
      <Text style={styles.instruction}>TAKE COVER NOW · DROP · COVER · HOLD ON</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24, backgroundColor: '#1a0a0a', borderRadius: 20, borderWidth: 2, borderColor: '#dc2626' },
  label: { color: '#dc2626', fontWeight: '800', fontSize: 13, letterSpacing: 1, marginBottom: 8 },
  countdown: { fontSize: 96, fontWeight: '900', lineHeight: 100 },
  unit: { color: COLORS.muted, fontSize: 14, fontWeight: '600', letterSpacing: 4, marginTop: 4 },
  instruction: { color: '#fff', fontWeight: '700', fontSize: 13, marginTop: 16, textAlign: 'center' },
});
