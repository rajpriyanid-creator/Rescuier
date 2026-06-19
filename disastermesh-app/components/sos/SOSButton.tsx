import { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export function SOSButton() {
  const router = useRouter();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/sos');
  };

  return (
    <Animated.View style={[styles.shadow, { transform: [{ scale: pulse }] }]}>
      <TouchableOpacity style={styles.btn} onPress={handlePress} activeOpacity={0.85}>
        <Text style={styles.icon}>🆘</Text>
        <Text style={styles.label}>SOS</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 12,
  },
  btn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#ff4444',
  },
  icon: { fontSize: 24 },
  label: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 2, marginTop: 2 },
});
