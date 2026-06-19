import { Server } from 'socket.io';

let io: Server;

export const setIO = (socketIo: Server): void => {
  io = socketIo;
};

export const getIO = (): Server => io;

export const emitToCity = (cityId: string, event: string, data: unknown): void => {
  if (!io) return;
  io.to(`city:${cityId}`).emit(event, data);
};

export const emitToAdmin = (cityId: string, event: string, data: unknown): void => {
  if (!io) return;
  io.to(`admin:${cityId}`).emit(event, data);
};

export const emitToChat = (cityId: string, event: string, data: unknown): void => {
  if (!io) return;
  io.to(`chat:${cityId}`).emit(event, data);
};

export const emitToFamily = (groupId: string, event: string, data: unknown): void => {
  if (!io) return;
  io.to(`family:${groupId}`).emit(event, data);
};

export const emitToResponders = (cityId: string, event: string, data: unknown): void => {
  if (!io) return;
  io.to(`responder:${cityId}`).emit(event, data);
};

export const emitToDisaster = (eventId: string, event: string, data: unknown): void => {
  if (!io) return;
  io.to(`disaster:${eventId}`).emit(event, data);
};
