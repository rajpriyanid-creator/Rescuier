import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { setIO } from '../services/socket.service';
import { registerLocationHandlers } from './handlers/location.handler';
import { registerChatHandlers } from './handlers/chat.handler';
import { registerSeismicHandlers } from './handlers/seismic.handler';
import { registerSOSHandlers } from './handlers/sos.handler';

export const setupSocket = (io: Server): void => {
  setIO(io);

  // JWT auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(); // Allow unauthenticated (public rooms)
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id} user=${socket.data.userId || 'anon'}`);

    // ── Room joins ────────────────────────────────────────────────────────────
    socket.on('join:city', ({ cityId }: { cityId: string }) => {
      socket.join(`city:${cityId}`);
      socket.join(`chat:${cityId}`);
      socket.data.cityId = cityId;
      console.log(`[Socket] ${socket.id} joined city:${cityId}`);
    });

    socket.on('join:admin', ({ cityId }: { cityId: string }) => {
      socket.join(`admin:${cityId}`);
    });

    socket.on('join:responder', ({ cityId }: { cityId: string }) => {
      socket.join(`responder:${cityId}`);
    });

    socket.on('join:family', ({ groupId }: { groupId: string }) => {
      socket.join(`family:${groupId}`);
    });

    socket.on('join:disaster', ({ eventId }: { eventId: string }) => {
      socket.join(`disaster:${eventId}`);
    });

    // ── Register domain handlers ──────────────────────────────────────────────
    registerLocationHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerSeismicHandlers(io, socket);
    registerSOSHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err);
    });
  });
};
