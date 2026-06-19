// ──────────── SOS Controller ────────────────────────────────────────────────
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SOSRequest } from '../models/SOSRequest.model';
import { Alert } from '../models/Alert.model';
import { UserLocation } from '../models/index';
import { SeismicDetection } from '../models/index';
import { User } from '../models/User.model';
import { emitToCity, emitToAdmin, emitToResponders } from '../services/socket.service';
import { sendPushNotifications } from '../services/notification.service';
import { analyseWavePropagation } from '../services/seismic.service';
import { DisasterEvent } from '../models/DisasterEvent.model';
import { createSOSNode } from '../services/neo4j.service';
import { v4 as uuidv4 } from 'uuid';

// ─── SOS ──────────────────────────────────────────────────────────────────────

export const createSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId, type, description, peopleCount, photo, latitude, longitude, priority } =
      req.body as {
        eventId: string; type: string; description?: string;
        peopleCount?: number; photo?: string;
        latitude: number; longitude: number; priority?: string;
      };

    const user = await User.findById(req.userId).select('disasterId city');
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const code = user.city.slice(0, 3).toUpperCase();
    const sosId = `DM-SOS-${code}-${new Date().getFullYear()}-${uuidv4().slice(0, 4).toUpperCase()}`;

    const sos = await SOSRequest.create({
      sosId, userId: req.userId, eventId, type, description,
      peopleCount: peopleCount || 1, photo, latitude, longitude,
      priority: priority || 'urgent',
    });

    // Sync to Neo4j
    try {
      await createSOSNode(sosId, type, priority || 'urgent', latitude, longitude, req.userId!);
    } catch { /* non-blocking */ }

    // Notify all responders
    emitToResponders(user.city, 'sos:new', {
      sosId: sos.sosId, type, priority, latitude, longitude,
      description, peopleCount, createdAt: sos.createdAt,
    });
    emitToAdmin(user.city, 'sos:new', { sos });

    // Push to responders
    const responders = await User.find({ city: user.city, role: 'responder', isActive: true }).select('expoPushToken');
    const tokens = responders.map((r) => r.expoPushToken).filter(Boolean) as string[];
    await sendPushNotifications(tokens, `🆘 New SOS — ${type.toUpperCase()}`, description || `Priority: ${priority}`, { sosId });

    res.status(201).json({ sos });
  } catch (err) {
    console.error('[createSOS]', err);
    res.status(500).json({ error: 'Failed to create SOS' });
  }
};

export const getMySOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sos = await SOSRequest.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(20);
    res.json({ sos });
  } catch { res.status(500).json({ error: 'Failed to get SOS history' }); }
};

export const cancelSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sos = await SOSRequest.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, status: { $in: ['sent', 'seen'] } },
      { status: 'cancelled' }, { new: true }
    );
    if (!sos) { res.status(404).json({ error: 'SOS not found or cannot be cancelled' }); return; }
    res.json({ sos });
  } catch { res.status(500).json({ error: 'Failed to cancel SOS' }); }
};

export const getCitySOSQueue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.userCity;
    const activeEvent = await DisasterEvent.findOne({ city, status: 'active' });
    if (!activeEvent) { res.json({ sos: [] }); return; }
    const sos = await SOSRequest.find({ eventId: activeEvent._id, status: { $ne: 'resolved' } })
      .sort({ priority: 1, createdAt: 1 })
      .populate('userId', 'name disasterId medicalProfile');
    res.json({ sos });
  } catch { res.status(500).json({ error: 'Failed to get SOS queue' }); }
};

export const claimSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sos = await SOSRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'assigned', assignedTo: req.userId, assignedAt: new Date() },
      { new: true }
    ).populate('userId', 'name expoPushToken');
    if (!sos) { res.status(404).json({ error: 'SOS not found' }); return; }

    const responder = await User.findById(req.userId).select('name');
    // Notify the SOS sender
    const sosUser = sos.userId as unknown as { expoPushToken?: string };
    if (sosUser?.expoPushToken) {
      await sendPushNotifications(
        [sosUser.expoPushToken],
        '✅ Help is on the way!',
        `${responder?.name} is responding to your SOS.`,
        { sosId: sos.sosId }
      );
    }
    emitToCity(req.userCity!, 'sos:status_update', { sosId: sos.sosId, status: 'assigned', responderName: responder?.name });
    res.json({ sos });
  } catch { res.status(500).json({ error: 'Failed to claim SOS' }); }
};

export const resolveSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sos = await SOSRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolvedAt: new Date() },
      { new: true }
    );
    if (!sos) { res.status(404).json({ error: 'SOS not found' }); return; }
    emitToAdmin(req.userCity!, 'sos:status_update', { sosId: sos.sosId, status: 'resolved' });
    res.json({ sos });
  } catch { res.status(500).json({ error: 'Failed to resolve SOS' }); }
};

// ─── Location ─────────────────────────────────────────────────────────────────

export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId, latitude, longitude, accuracy, status } = req.body as {
      eventId: string; latitude: number; longitude: number;
      accuracy?: number; status?: string;
    };

    // Mark old last-known as false
    await UserLocation.updateMany({ userId: req.userId, eventId, isLastKnown: true }, { isLastKnown: false });

    const loc = await UserLocation.create({
      userId: req.userId, eventId, latitude, longitude, accuracy,
      status: status || 'safe', isLastKnown: true,
    });

    // Update neo4j person node
    const user = await User.findById(req.userId).select('name disasterId medicalProfile');
    if (user) {
      const { upsertPersonNode } = await import('../services/neo4j.service');
      try {
        await upsertPersonNode(req.userId!, user.name, user.disasterId, latitude, longitude, status || 'safe', user.medicalProfile?.bloodGroup);
      } catch { /* non-blocking */ }
    }

    // Emit to admin map
    emitToAdmin(req.userCity!, 'location:update', {
      userId: req.userId,
      latitude,
      longitude,
      status: status || 'safe',
      timestamp: loc.timestamp,
      name: user?.name,
      disasterId: user?.disasterId,
    });

    res.json({ location: loc });
  } catch (err) {
    console.error('[updateLocation]', err);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

export const getFamilyLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { getFamilyMemberLocations } = await import('../services/neo4j.service');
    const locations = await getFamilyMemberLocations(req.userId!);
    res.json({ locations });
  } catch { res.status(500).json({ error: 'Failed to get family locations' }); }
};

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const getAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.userCity;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = 20;
    const alerts = await Alert.find({ city })
      .sort({ sentAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sentBy', 'name role');
    res.json({ alerts });
  } catch { res.status(500).json({ error: 'Failed to get alerts' }); }
};

export const markAlertRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Alert.updateOne({ _id: req.params.id }, { $addToSet: { readBy: req.userId } });
    res.json({ message: 'Marked as read' });
  } catch { res.status(500).json({ error: 'Failed to mark alert as read' }); }
};

export const confirmSafe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Alert.updateOne({ _id: req.params.id }, { $addToSet: { safeConfirmed: req.userId } });
    res.json({ message: 'Marked as safe' });
  } catch { res.status(500).json({ error: 'Failed to confirm safe' }); }
};

export const sendAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId, type, severity, title, message, instructions, targetZones } = req.body as {
      eventId?: string; type: string; severity: string;
      title: string; message: string; instructions?: string; targetZones?: string[];
    };
    const city = req.userCity!;

    const alert = await Alert.create({
      eventId, type, severity, city,
      targetZones: targetZones || [],
      title, message, instructions,
      sentBy: req.userId,
    });

    // Get city users' push tokens
    const users = await User.find({ city, isActive: true }).select('expoPushToken');
    const tokens = users.map((u) => u.expoPushToken).filter(Boolean) as string[];

    emitToCity(city, 'alert:new', { alert });
    await sendPushNotifications(tokens, `⚠️ ${title}`, message, { alertId: alert._id.toString() });

    res.status(201).json({ alert });
  } catch (err) {
    console.error('[sendAlert]', err);
    res.status(500).json({ error: 'Failed to send alert' });
  }
};

// ─── Seismic ──────────────────────────────────────────────────────────────────

export const reportSeismic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deviceId, detectedAt, latitude, longitude, staLtaRatio, phoneState } = req.body as {
      deviceId: string; detectedAt: number; latitude: number; longitude: number;
      staLtaRatio: number; phoneState: 'AT_REST' | 'SLIGHT_MOTION';
    };

    const { processSeismicReport } = await import('../services/seismic.service');
    await processSeismicReport({
      deviceId, userId: req.userId!, detectedAt,
      latitude, longitude, staLtaRatio, phoneState, city: req.userCity!,
    });

    // Run wave analysis
    const result = await analyseWavePropagation(req.userCity!);
    if (result.confirmed) {
      emitToAdmin(req.userCity!, 'seismic:wave_detected', {
        city: req.userCity, deviceCount: result.deviceCount,
        validPairCount: result.validPairCount, reason: result.reason,
      });
    }

    res.json({ message: 'Report received', analysis: result });
  } catch (err) {
    console.error('[reportSeismic]', err);
    res.status(500).json({ error: 'Failed to report seismic event' });
  }
};

export const getSeismicAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.params.city as string;
    const result = await analyseWavePropagation(city);
    res.json(result);
  } catch { res.status(500).json({ error: 'Failed to get seismic analysis' }); }
};
