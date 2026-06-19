import { Server, Socket } from 'socket.io';
import { analyseWavePropagation } from '../../services/seismic.service';

const cityBuffers = new Map<string, { deviceId: string; userId: string; latitude: number; longitude: number; cityId: string; detectedAt: number }[]>();

export const registerSeismicHandlers = (io: Server, socket: Socket): void => {
  socket.on('seismic:detect', async (data: {
    deviceId: string; userId: string; ratio: number;
    phoneState: 'AT_REST' | 'SLIGHT_MOTION';
    latitude: number; longitude: number; cityId: string; detectedAt: number;
  }) => {
    if (!data.cityId || !data.deviceId) return;

    const now = Date.now();
    if (!cityBuffers.has(data.cityId)) cityBuffers.set(data.cityId, []);
    const buf = cityBuffers.get(data.cityId)!;
    buf.push({ deviceId: data.deviceId, userId: data.userId, latitude: data.latitude, longitude: data.longitude, cityId: data.cityId, detectedAt: data.detectedAt || now });

    // Prune > 60s
    cityBuffers.set(data.cityId, buf.filter((r) => now - r.detectedAt < 60_000));

    io.to(`admin:${data.cityId}`).emit('seismic:detect', { ...data, timestamp: now });

    const fresh = cityBuffers.get(data.cityId)!;
    if (fresh.length >= 3) {
      try {
        const result = await analyseWavePropagation(data.cityId, 3);
        if (result.confirmed) {
          io.to(`admin:${data.cityId}`).emit('seismic:wave_detected', {
            cityId: data.cityId,
            reportCount: fresh.length,
            validPairs: result.validPairCount,
            detections: fresh,
          });
        }
      } catch (err) {
        console.error('[Socket/seismic] Analysis error:', err);
      }
    }
  });
};
