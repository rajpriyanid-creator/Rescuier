import { useEffect, useRef, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { SEISMIC } from '../utils/constants';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { useAppStore } from '../store/appStore';

interface AccelSample {
  x: number;
  y: number;
  z: number;
  t: number;
}

/**
 * STA/LTA earthquake early-warning hook.
 * Analyses accelerometer data at ~20 Hz.
 * Triggers when STA/LTA ratio exceeds threshold on a still device.
 */
export const useSeismicDetection = (enabled: boolean) => {
  const samplesRef = useRef<AccelSample[]>([]);
  const lastTriggerRef = useRef<number>(0);
  const { lastLatitude, lastLongitude, user, activeEvent, setSeismicAlert } = useAppStore();

  const calcMagnitude = (x: number, y: number, z: number) =>
    Math.sqrt(x * x + y * y + z * z);

  const calcSTALTA = useCallback((samples: AccelSample[]): { ratio: number; phoneState: string } => {
    if (samples.length < 10) return { ratio: 0, phoneState: 'AT_REST' };

    const now = Date.now();
    const staWindow = samples.filter((s) => s.t >= now - SEISMIC.STA_WINDOW * 1000);
    const ltaWindow = samples.filter((s) => s.t >= now - SEISMIC.LTA_WINDOW * 1000);

    if (!staWindow.length || !ltaWindow.length) return { ratio: 0, phoneState: 'AT_REST' };

    const sta = staWindow.reduce((sum, s) => sum + calcMagnitude(s.x, s.y, s.z), 0) / staWindow.length;
    const lta = ltaWindow.reduce((sum, s) => sum + calcMagnitude(s.x, s.y, s.z), 0) / ltaWindow.length;

    if (lta < 0.001) return { ratio: 0, phoneState: 'AT_REST' };

    const ratio = sta / lta;

    // Determine if phone is at rest (resting on surface)
    const recentMag = staWindow.map((s) => calcMagnitude(s.x, s.y, s.z));
    const avgMag = recentMag.reduce((a, b) => a + b, 0) / recentMag.length;
    const phoneState = avgMag < 1.2 ? 'AT_REST' : 'SLIGHT_MOTION';

    return { ratio, phoneState };
  }, []);

  const handleTrigger = useCallback(async (ratio: number, phoneState: string) => {
    const now = Date.now();
    if (now - lastTriggerRef.current < SEISMIC.COOLDOWN_MS) return;
    lastTriggerRef.current = now;

    // Only trigger on AT_REST or SLIGHT_MOTION phones
    if (phoneState !== 'AT_REST' && phoneState !== 'SLIGHT_MOTION') return;
    if (!lastLatitude || !lastLongitude || !user) return;

    console.log(`[Seismic] Triggered! Ratio: ${ratio.toFixed(2)}, State: ${phoneState}`);

    // Haptic alert
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    // Get unique device ID
    const deviceId = `${user._id}-${require('expo-device').modelId || 'device'}`;

    // Report to backend
    try {
      const res = await api.post('/seismic/report', {
        deviceId,
        detectedAt: now,
        latitude: lastLatitude,
        longitude: lastLongitude,
        staLtaRatio: ratio,
        phoneState,
      });

      // Check if wave analysis returned confirmation + ETA
      if (res.data.waveETA) {
        setSeismicAlert({
          secondsUntilWave: res.data.waveETA,
          epicenterLat: res.data.epicenterLat,
          epicenterLng: res.data.epicenterLng,
        });
      }
    } catch {
      // Non-blocking — still emit via socket
    }

    // Emit directly via socket for lower latency
    try {
      const socket = await getSocket();
      socket.emit('seismic:detect', {
        deviceId,
        ratio,
        phoneState,
        latitude: lastLatitude,
        longitude: lastLongitude,
        cityId: user.city,
      });
    } catch { /* non-blocking */ }
  }, [lastLatitude, lastLongitude, user, setSeismicAlert]);

  useEffect(() => {
    if (!enabled) return;

    Accelerometer.setUpdateInterval(SEISMIC.SAMPLE_INTERVAL);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const sample = { x, y, z, t: Date.now() };
      samplesRef.current.push(sample);

      // Keep only last LTA window worth of samples
      const cutoff = Date.now() - SEISMIC.LTA_WINDOW * 1000;
      samplesRef.current = samplesRef.current.filter((s) => s.t >= cutoff);

      const { ratio, phoneState } = calcSTALTA(samplesRef.current);

      if (ratio >= SEISMIC.TRIGGER_RATIO) {
        handleTrigger(ratio, phoneState);
      }
    });

    return () => sub.remove();
  }, [enabled, calcSTALTA, handleTrigger]);
};
