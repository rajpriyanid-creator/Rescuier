import { Server, Socket } from 'socket.io';
import { UserLocation } from '../../models/index';

export const registerLocationHandlers = (io: Server, socket: Socket): void => {
  // Persist location update to DB and broadcast to admin
  socket.on('location:update', async (data: {
    userId: string;
    latitude: number;
    longitude: number;
    status: string;
    eventId: string;
    cityId: string;
    accuracy?: number;
  }) => {
    try {
      await UserLocation.findOneAndUpdate(
        { userId: data.userId, eventId: data.eventId },
        {
          userId: data.userId,
          eventId: data.eventId,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          status: data.status,
          timestamp: new Date(),
          isLastKnown: true,
        },
        { upsert: true }
      );

      // Broadcast to admin room
      io.to(`admin:${data.cityId}`).emit('location:update', {
        userId: data.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
        accuracy: data.accuracy,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('[Socket/location] Error saving location:', err);
    }
  });

  socket.on('status:update', (data: {
    userId: string;
    status: string;
    cityId: string;
    groupIds?: string[];
  }) => {
    io.to(`admin:${data.cityId}`).emit('user:status_update', data);
    if (data.groupIds?.length) {
      for (const groupId of data.groupIds) {
        io.to(`family:${groupId}`).emit('family:member_status', data);
      }
    }
  });
};
