import { SeismicDetection } from '../models/index';
import { triangulateEpicenter, createSeismicNode } from './neo4j.service';

const EARTH_RADIUS_KM = 6371;

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export interface SeismicReport {
  deviceId: string;
  userId: string;
  detectedAt: number;
  latitude: number;
  longitude: number;
  staLtaRatio: number;
  phoneState: 'AT_REST' | 'SLIGHT_MOTION';
  city: string;
}

export interface WavePropagationResult {
  confirmed: boolean;
  validPairCount: number;
  deviceCount: number;
  reason: string;
}

/**
 * Analyse seismic reports within 60-second window
 * Returns whether a consistent wave pattern is detected
 */
export const analyseWavePropagation = async (
  city: string,
  minDevices: number = 10
): Promise<WavePropagationResult> => {
  const windowStart = Date.now() - 60_000;

  const reports = await SeismicDetection.find({
    createdAt: { $gte: new Date(windowStart) },
    phoneState: { $in: ['AT_REST', 'SLIGHT_MOTION'] },
    confirmedEarthquake: false,
  })
    .sort({ detectedAt: 1 })
    .lean();

  if (reports.length < 3) {
    return { confirmed: false, validPairCount: 0, deviceCount: reports.length, reason: 'Not enough reports' };
  }

  let validPairs = 0;
  let totalPairs = 0;

  for (let i = 0; i < reports.length - 1; i++) {
    for (let j = i + 1; j < reports.length; j++) {
      const r1 = reports[i];
      const r2 = reports[j];
      const distKm = haversine(r1.latitude, r1.longitude, r2.latitude, r2.longitude);
      const timeDiffSec = Math.abs(r2.detectedAt - r1.detectedAt) / 1000;

      if (timeDiffSec < 0.001) continue; // same device or duplicate
      totalPairs++;

      const speedKmS = distKm / timeDiffSec;
      // Valid seismic wave: 2–8 km/s
      if (speedKmS >= 2 && speedKmS <= 8) {
        validPairs++;
      }
    }
  }

  const pairRatio = totalPairs > 0 ? validPairs / totalPairs : 0;
  const confirmed = reports.length >= minDevices && pairRatio >= 0.6;

  return {
    confirmed,
    validPairCount: validPairs,
    deviceCount: reports.length,
    reason: confirmed
      ? `Wave confirmed: ${validPairs}/${totalPairs} pairs show consistent wave (${(pairRatio * 100).toFixed(0)}%)`
      : `Not enough consistent pairs: ${validPairs}/${totalPairs}`,
  };
};

/**
 * Calculate early warning time for a phone given epicenter and wave speed
 */
export const calcEarlyWarning = (
  phoneLat: number,
  phoneLng: number,
  epicenterLat: number,
  epicenterLng: number,
  waveSpeedKmS: number
): number => {
  const dist = haversine(phoneLat, phoneLng, epicenterLat, epicenterLng);
  return dist / waveSpeedKmS; // seconds until wave arrives
};

export const processSeismicReport = async (report: SeismicReport): Promise<void> => {
  const detection = await SeismicDetection.create({
    deviceId: report.deviceId,
    userId: report.userId,
    detectedAt: report.detectedAt,
    latitude: report.latitude,
    longitude: report.longitude,
    staLtaRatio: report.staLtaRatio,
    phoneState: report.phoneState,
  });

  // Sync to Neo4j for triangulation
  try {
    await createSeismicNode(
      detection._id.toString(),
      report.deviceId,
      report.detectedAt,
      report.latitude,
      report.longitude,
      report.staLtaRatio,
      'pending'
    );
  } catch {
    // Neo4j errors don't block the main flow
  }
};
