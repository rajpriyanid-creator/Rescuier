import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '../services/api';
import { useAppStore } from '../store/appStore';

// SDK 53: setNotificationHandler uses shouldShowAlert + shouldShowBanner + shouldShowList
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,   // SDK 53: banner style notification
    shouldShowList: true,     // SDK 53: shows in notification list
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const usePushNotifications = () => {
  const { addAlert, setSeismicAlert } = useAppStore();
  const listenerRef = useRef<Notifications.Subscription | null>(null);
  const responseRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    registerForPush();
    setupListeners();

    return () => {
      listenerRef.current?.remove();
      responseRef.current?.remove();
    };
  }, []);

  const registerForPush = async () => {
    if (!Device.isDevice) {
      console.log('[Push] Must use physical device for Push Notifications');
      return;
    }

    // Android: create notification channels BEFORE requesting permission (SDK 53)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('disaster', {
        name: 'Disaster Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#DC2626',
        bypassDnd: true,
        enableLights: true,
        enableVibrate: true,
      });
      await Notifications.setNotificationChannelAsync('seismic', {
        name: 'Earthquake Early Warning',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 100, 100, 100, 100, 100],
        lightColor: '#EF4444',
        bypassDnd: true,
        enableLights: true,
        enableVibrate: true,
      });
      await Notifications.setNotificationChannelAsync('sos', {
        name: 'SOS Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        enableVibrate: true,
      });
      await Notifications.setNotificationChannelAsync('general', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted');
      return;
    }

    try {
      // SDK 53: projectId is required — read from app.json via Constants
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      const token = tokenData.data;
      console.log('[Push] Token registered:', token.slice(0, 30) + '...');

      // Save token to backend
      await api.put('/user/profile', { expoPushToken: token });
    } catch (err) {
      console.warn('[Push] Token registration failed:', err);
    }
  };

  const setupListeners = () => {
    // Foreground: notification received while app is open
    listenerRef.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as Record<string, any>;
        const body = notification.request.content;

        // Disaster / alert notifications
        if (data?.alertId || data?.type === 'disaster_declared' || data?.type === 'alert') {
          addAlert({
            _id: data.alertId || String(Date.now()),
            title: body.title || 'Alert',
            message: body.body || '',
            severity: data.severity || 'warning',
            type: data.type || 'general',
            sentAt: new Date().toISOString(),
          });
        }

        // Seismic early warning
        if (data?.type === 'early_warning') {
          setSeismicAlert({
            secondsUntilWave: data.secondsUntilWave,
            epicenterLat: data.epicenterLat,
            epicenterLng: data.epicenterLng,
          });
        }
      }
    );

    // Background: user tapped notification to open app
    responseRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, any>;
        console.log('[Push] Notification tapped:', data?.type);
        // Navigation handled by app router based on notification type
      }
    );
  };
};
