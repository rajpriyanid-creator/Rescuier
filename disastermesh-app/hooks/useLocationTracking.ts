import { useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import { emitLocationUpdate } from '../services/socket';
import { LOCATION } from '../utils/constants';

export const useLocationTracking = (enabled: boolean) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user, activeEvent, setLocation, locationStatus, isOnline } = useAppStore();

  const sendLocation = useCallback(async () => {
    if (!user || !activeEvent) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      setLocation(latitude, longitude);

      const payload = {
        eventId: activeEvent._id,
        latitude,
        longitude,
        accuracy: loc.coords.accuracy || undefined,
        status: locationStatus,
      };

      if (isOnline) {
        // REST update
        await api.post('/location/update', payload);
        // Socket update for real-time map
        await emitLocationUpdate({
          userId: user._id,
          latitude,
          longitude,
          status: locationStatus,
          eventId: activeEvent._id,
          cityId: user.city,
        });
      }
    } catch (err) {
      console.warn('[Location] Update failed:', err);
    }
  }, [user, activeEvent, setLocation, locationStatus, isOnline]);

  useEffect(() => {
    if (!enabled || !user || !activeEvent) return;

    // Immediate first update
    sendLocation();

    intervalRef.current = setInterval(sendLocation, LOCATION.UPDATE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, user, activeEvent, sendLocation]);

  const updateStatusManually = useCallback(
    async (status: string) => {
      useAppStore.getState().setLocationStatus(status);
      if (user && activeEvent && isOnline) {
        const { lastLatitude, lastLongitude } = useAppStore.getState();
        if (lastLatitude && lastLongitude) {
          await api.post('/location/update', {
            eventId: activeEvent._id,
            latitude: lastLatitude,
            longitude: lastLongitude,
            status,
          });
        }
      }
    },
    [user, activeEvent, isOnline]
  );

  return { updateStatusManually, sendLocation };
};
