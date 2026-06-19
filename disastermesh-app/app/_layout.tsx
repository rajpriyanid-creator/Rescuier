import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/appStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { api } from '../services/api';
import { openDatabase } from '../db/database';
import NetInfo from '@react-native-community/netinfo';

export default function RootLayout() {
  const { setUser, setAuthenticated, setOnline } = useAppStore();
  const router = useRouter();
  usePushNotifications();

  useEffect(() => {
    bootstrapApp();
    setupNetworkListener();
  }, []);

  const bootstrapApp = async () => {
    await openDatabase();
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) { router.replace('/auth/login'); return; }
    try {
      const res = await api.get('/user/profile');
      setUser(res.data.user);
      setAuthenticated(true);
      router.replace('/tabs/home');
    } catch {
      router.replace('/auth/login');
    }
  };

  const setupNetworkListener = () => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected);
    });
    return unsub;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f172a' } }}>
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="tabs" />
        <Stack.Screen name="sos" options={{ presentation: 'modal' }} />
        <Stack.Screen name="alert/[id]" />
        <Stack.Screen name="vault" />
        <Stack.Screen name="family" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/edit" />
      </Stack>
    </GestureHandlerRootView>
  );
}
