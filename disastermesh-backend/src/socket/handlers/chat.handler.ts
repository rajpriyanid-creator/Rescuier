import { Server, Socket } from 'socket.io';
import { ChatMessage } from '../../models/ChatMessage.model';

export const registerChatHandlers = (io: Server, socket: Socket): void => {
  // Typing indicator
  socket.on('chat:typing', ({ cityId, userId, name }: {
    cityId: string;
    userId: string;
    name: string;
  }) => {
    socket.to(`chat:${cityId}`).emit('chat:typing', { userId, name });
  });

  // Real-time chat message (mirrored from REST POST /chat, for instant delivery)
  socket.on('chat:message', async (data: {
    cityId: string;
    eventId: string;
    senderId: string;
    senderName: string;
    senderDisasterId: string;
    senderRole: string;
    type: string;
    text: string;
    latitude?: number;
    longitude?: number;
  }) => {
    try {
      const msg = await ChatMessage.create({
        cityId: data.cityId,
        eventId: data.eventId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderDisasterId: data.senderDisasterId,
        senderRole: data.senderRole,
        type: data.type || 'text',
        text: data.text,
        latitude: data.latitude,
        longitude: data.longitude,
        isAdminMessage: data.senderRole === 'admin' || data.senderRole === 'superadmin',
      });

      // Broadcast to city chat room
      io.to(`chat:${data.cityId}`).emit('chat:message', msg.toObject());
    } catch (err) {
      console.error('[Socket/chat] Error saving message:', err);
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  });
};
