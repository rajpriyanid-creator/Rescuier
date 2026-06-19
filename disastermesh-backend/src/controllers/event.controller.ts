import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DisasterEvent } from '../models/DisasterEvent.model';
import { User } from '../models/User.model';
import { emitToCity, emitToAdmin } from '../services/socket.service';
import { sendPushNotifications } from '../services/notification.service';
import {
  seedDisasterInNeo4j,
  computeEvacuationRoute,
  resolveDisasterInNeo4j,
  getActiveHazardZones,
  upsertSafeZoneNode,
} from '../services/neo4j.service';

// ─── Hazard radius per disaster type (meters) ─────────────────────────────────
const HAZARD_RADIUS: Record<string, number> = {
  earthquake: 5000,
  flood: 3000,
  cyclone: 8000,
  storm: 4000,
  tsunami: 6000,
  fire: 2000,
  custom: 3000,
};

// GET /events/active
export const getActiveEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.userCity || (req.query.city as string);
    const event = await DisasterEvent.findOne({ city, status: { $in: ['active', 'monitoring'] } })
      .sort({ declaredAt: -1 })
      .populate('declaredBy', 'name role');
    res.json({ event: event || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get active event' });
  }
};

// GET /events/:id
export const getEventById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await DisasterEvent.findById(req.params.id).populate('declaredBy', 'name role');
    if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
    res.json({ event });
  } catch {
    res.status(500).json({ error: 'Failed to get event' });
  }
};

// POST /events/report  — user reports a disaster
export const reportDisaster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, description, latitude, longitude } = req.body as {
      type: string; description: string; latitude: number; longitude: number;
    };
    // TODO: count reports per city per 30 min and notify admin if threshold reached
    res.json({ message: 'Report submitted. Admin will review.', type });
  } catch {
    res.status(500).json({ error: 'Failed to submit report' });
  }
};

// POST /admin/event/declare — Admin marks a disaster and broadcasts to entire city
export const declareDisaster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      type, severity, city,
      affectedZones, description, instructions,
      epicenterLat, epicenterLng,
      safeZones, // Optional: [{name, latitude, longitude, capacity}]
    } = req.body as {
      type: string; severity: string; city: string;
      affectedZones?: string[]; description?: string; instructions?: string;
      epicenterLat?: number; epicenterLng?: number;
      safeZones?: Array<{ name: string; latitude: number; longitude: number; capacity?: number }>;
    };

    // 1. Create MongoDB event record
    const event = await DisasterEvent.create({
      type, severity, city,
      affectedZones: affectedZones || [],
      declaredBy: req.userId,
      description, instructions,
      epicenter: epicenterLat && epicenterLng
        ? { latitude: epicenterLat, longitude: epicenterLng }
        : undefined,
    });

    const eventIdStr = event._id.toString();

    // 2. Seed Neo4j graph with hazard zone (non-blocking, don't fail if Neo4j is down)
    const hazardRadius = HAZARD_RADIUS[type] || 3000;
    // Use provided epicenter or default to city center (fallback coords)
    const centerLat = epicenterLat ?? 11.6643;
    const centerLng = epicenterLng ?? 78.146;

    try {
      await seedDisasterInNeo4j(
        eventIdStr, type, severity, city,
        centerLat, centerLng, hazardRadius
      );

      // 2b. Seed provided safe zones into Neo4j graph
      if (safeZones && safeZones.length > 0) {
        for (const sz of safeZones) {
          const zoneId = `${eventIdStr}-${sz.latitude}-${sz.longitude}`;
          await upsertSafeZoneNode(
            zoneId, sz.name, sz.latitude, sz.longitude,
            sz.capacity ?? 500, eventIdStr, city
          );
        }
      }
    } catch (neo4jErr) {
      console.warn('[declareDisaster] Neo4j seeding failed (non-fatal):', neo4jErr);
    }

    // 3. Get all push tokens for every user in the city
    const users = await User.find({ city, isActive: true }).select('expoPushToken language');
    const tokens = users.map((u) => u.expoPushToken).filter(Boolean) as string[];

    // 4. Socket broadcast to entire city — triggers location collection on mobile
    emitToCity(city, 'disaster:declared', {
      eventId: event._id,
      type: event.type,
      severity: event.severity,
      city,
      instructions: event.instructions,
      description: event.description,
      declaredAt: event.declaredAt,
      epicenterLat: centerLat,
      epicenterLng: centerLng,
      hazardRadius,
    });

    // 5. Tell all city users to immediately send their location
    emitToCity(city, 'location:requested', { eventId: event._id });

    // 6. Push notification to every city user
    await sendPushNotifications(
      tokens,
      `⚠️ ${type.toUpperCase()} ALERT — ${city}`,
      description || `A ${severity} ${type} has been declared in ${city}. Follow evacuation instructions.`,
      {
        eventId: eventIdStr,
        type: 'disaster_declared',
        city,
        severity,
      }
    );

    res.status(201).json({
      event,
      broadcastSent: true,
      usersNotified: tokens.length,
      neo4jHazardRadius: hazardRadius,
    });
  } catch (err) {
    console.error('[declareDisaster]', err);
    res.status(500).json({ error: 'Failed to declare disaster' });
  }
};

// PUT /admin/event/:id
export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message } = req.body as { message: string };
    const event = await DisasterEvent.findByIdAndUpdate(
      req.params.id,
      {
        $push: { updates: { message, sentAt: new Date(), sentBy: req.userId } },
        $set: req.body,
      },
      { new: true }
    );
    if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

    emitToCity(event.city, 'disaster:update', {
      eventId: event._id,
      message,
      sentAt: new Date(),
    });

    res.json({ event });
  } catch {
    res.status(500).json({ error: 'Failed to update event' });
  }
};

// PUT /admin/event/:id/resolve
export const resolveEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await DisasterEvent.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolvedAt: new Date() },
      { new: true }
    );
    if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

    // Mark resolved in Neo4j
    try {
      await resolveDisasterInNeo4j(event._id.toString());
    } catch (neo4jErr) {
      console.warn('[resolveEvent] Neo4j resolve failed (non-fatal):', neo4jErr);
    }

    emitToCity(event.city, 'disaster:resolved', { eventId: event._id, city: event.city });
    res.json({ event });
  } catch {
    res.status(500).json({ error: 'Failed to resolve event' });
  }
};

// GET /evacuation/route — User requests safest evacuation route via Neo4j
export const getEvacuationRoute = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude } = req.query as { latitude: string; longitude: string };
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLng)) {
      res.status(400).json({ error: 'Valid latitude and longitude are required' });
      return;
    }

    const city = req.userCity;
    if (!city) {
      res.status(400).json({ error: 'City not found for user' });
      return;
    }

    // Check if there's an active event
    const activeEvent = await DisasterEvent.findOne({ city, status: 'active' });
    if (!activeEvent) {
      res.status(404).json({ error: 'No active disaster in your city' });
      return;
    }

    // Compute safest route via Neo4j
    const route = await computeEvacuationRoute(req.userId!, userLat, userLng, city);

    if (!route) {
      // If no safe zones in Neo4j, return generic guidance
      res.json({
        route: null,
        message: 'No registered safe zones found. Please move to higher ground or follow admin instructions.',
        activeEvent: {
          type: activeEvent.type,
          severity: activeEvent.severity,
          instructions: activeEvent.instructions,
        },
      });
      return;
    }

    res.json({
      route,
      activeEvent: {
        type: activeEvent.type,
        severity: activeEvent.severity,
        instructions: activeEvent.instructions,
        city: activeEvent.city,
      },
    });
  } catch (err) {
    console.error('[getEvacuationRoute]', err);
    res.status(500).json({ error: 'Failed to compute evacuation route' });
  }
};

// GET /evacuation/hazards — Get active hazard zones for city map overlay
export const getHazardZones = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.userCity;
    if (!city) { res.status(400).json({ error: 'City not found' }); return; }
    const hazards = await getActiveHazardZones(city);
    res.json({ hazards });
  } catch (err) {
    console.error('[getHazardZones]', err);
    res.status(500).json({ error: 'Failed to get hazard zones' });
  }
};
