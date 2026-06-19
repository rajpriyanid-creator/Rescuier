import { Server, Socket } from 'socket.io';

export const registerSOSHandlers = (io: Server, socket: Socket): void => {
  // Responder viewed an SOS — update status to 'seen'
  socket.on('sos:viewed', ({ sosId, responderId, cityId }: {
    sosId: string;
    responderId: string;
    cityId: string;
  }) => {
    // Notify the city (SOS sender sees status update)
    io.to(`city:${cityId}`).emit('sos:status_update', {
      sosId,
      status: 'seen',
      responderId,
      timestamp: Date.now(),
    });

    // Notify responder room
    io.to(`responder:${cityId}`).emit('sos:status_update', {
      sosId,
      status: 'seen',
      responderId,
      timestamp: Date.now(),
    });
  });

  // Responder on the way
  socket.on('sos:responding', ({ sosId, responderId, responderName, cityId, eta }: {
    sosId: string;
    responderId: string;
    responderName: string;
    cityId: string;
    eta?: number; // minutes
  }) => {
    io.to(`city:${cityId}`).emit('sos:status_update', {
      sosId,
      status: 'assigned',
      responderId,
      responderName,
      eta,
      timestamp: Date.now(),
    });
  });

  // Responder arrived on scene
  socket.on('sos:on_scene', ({ sosId, responderId, cityId }: {
    sosId: string;
    responderId: string;
    cityId: string;
  }) => {
    io.to(`city:${cityId}`).emit('sos:status_update', {
      sosId,
      status: 'on_scene',
      responderId,
      timestamp: Date.now(),
    });
  });
};
