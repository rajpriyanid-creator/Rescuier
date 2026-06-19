import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../utils/constants';

let socket: Socket | null = null;

export const getSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;

  const token = await AsyncStorage.getItem('accessToken');
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 10000,
  });

  socket.on('connect', () => console.log('[Socket] Connected'));
  socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));

  return socket;
};

export const joinCityRoom = async (cityId: string) => {
  const s = await getSocket();
  s.emit('join:city', { cityId });
};

export const joinFamilyRoom = async (groupId: string) => {
  const s = await getSocket();
  s.emit('join:family', { groupId });
};

export const joinDisasterRoom = async (eventId: string) => {
  const s = await getSocket();
  s.emit('join:disaster', { eventId });
};

export const emitLocationUpdate = async (data: {
  userId: string; latitude: number; longitude: number;
  status: string; eventId: string; cityId: string;
}) => {
  const s = await getSocket();
  s.emit('location:update', data);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
