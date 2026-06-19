import { useEffect } from 'react';
import { View, StyleSheet, Modal, Vibration } from 'react-native';
import { AlertCountdown } from '../alerts/AlertCountdown';
import { useAppStore } from '../../store/appStore';
import { Audio } from 'expo-av';

export function EarlyWarningAlert() {
  const { seismicAlert, clearSeismicAlert } = useAppStore();

  useEffect(() => {
    if (!seismicAlert) return;
    // Trigger strong vibration pattern
    Vibration.vibrate([0, 500, 200, 500, 200, 500, 200, 500]);
    // Auto-clear after wave arrives
    const timer = setTimeout(clearSeismicAlert, (seismicAlert.secondsUntilWave + 10) * 1000);
    return () => { clearTimeout(timer); Vibration.cancel(); };
  }, [seismicAlert]);

  if (!seismicAlert) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <AlertCountdown
          seconds={seismicAlert.secondsUntilWave}
          onExpired={clearSeismicAlert}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: '#cc000066',
    justifyContent: 'center', padding: 24,
  },
});
