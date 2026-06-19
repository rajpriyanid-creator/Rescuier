import { getNeo4jSession, getDriver } from '../config/neo4j';

// ─── Rescue Routing ───────────────────────────────────────────────────────────

export const findNearestRescueTeam = async (
  sosId: string,
  sosLat: number,
  sosLng: number
) => {
  const session = getNeo4jSession();
  try {
    const result = await session.run(
      `MATCH (sos:SOSRequest {sosId: $sosId})
       MATCH (team:RescueTeam {available: true})
       WHERE NOT EXISTS {
         MATCH (hz:HazardZone)
         WHERE point.distance(
           point({latitude: hz.centerLat, longitude: hz.centerLng}),
           point({latitude: team.latitude, longitude: team.longitude})
         ) < hz.radius
       }
       WITH team,
         point.distance(
           point({latitude: team.latitude, longitude: team.longitude}),
           point({latitude: $lat, longitude: $lng})
         ) AS distance
       RETURN team, distance ORDER BY distance ASC LIMIT 3`,
      { sosId, lat: sosLat, lng: sosLng }
    );
    return result.records.map((r) => ({
      team: r.get('team').properties,
      distance: r.get('distance'),
    }));
  } finally {
    await session.close();
  }
};

// ─── Resource Matching ─────────────────────────────────────────────────────────

export const findNearestResource = async (
  userId: string,
  userLat: number,
  userLng: number,
  resourceType: string
) => {
  const session = getNeo4jSession();
  try {
    const result = await session.run(
      `MATCH (r:Resource {type: $type, available: true})
       WITH r, point.distance(
         point({latitude: $lat, longitude: $lng}),
         point({latitude: r.latitude, longitude: r.longitude})
       ) AS distance
       WHERE distance < 5000
       RETURN r, distance ORDER BY distance ASC LIMIT 5`,
      { userId, lat: userLat, lng: userLng, type: resourceType }
    );
    return result.records.map((r) => ({
      resource: r.get('r').properties,
      distance: r.get('distance'),
    }));
  } finally {
    await session.close();
  }
};

// ─── Family Group ──────────────────────────────────────────────────────────────

export const getFamilyMemberLocations = async (userId: string) => {
  const session = getNeo4jSession();
  try {
    const result = await session.run(
      `MATCH (p:Person {userId: $userId})-[:PART_OF]->(g:FamilyGroup)
       MATCH (member:Person)-[:PART_OF]->(g)
       WHERE member.userId <> $userId
       RETURN member.name AS name, member.latitude AS lat, member.longitude AS lng,
              member.status AS status, member.lastSeen AS lastSeen`,
      { userId }
    );
    return result.records.map((r) => ({
      name: r.get('name'),
      latitude: r.get('lat'),
      longitude: r.get('lng'),
      status: r.get('status'),
      lastSeen: r.get('lastSeen'),
    }));
  } finally {
    await session.close();
  }
};

// ─── Epicenter Triangulation (TDOA) ───────────────────────────────────────────

export const triangulateEpicenter = async (eventId: string) => {
  const session = getNeo4jSession();
  try {
    const result = await session.run(
      `MATCH (d:SeismicDetection)-[:PART_OF_EVENT]->(e:DisasterEvent {eventId: $eventId})
       WHERE d.ratio > 3.5
       WITH d ORDER BY d.detectedAt ASC LIMIT 3
       RETURN avg(d.latitude) AS epicenterLat, avg(d.longitude) AS epicenterLng,
              count(d) AS deviceCount`,
      { eventId }
    );
    const record = result.records[0];
    if (!record) return null;
    return {
      latitude: record.get('epicenterLat'),
      longitude: record.get('epicenterLng'),
      deviceCount: record.get('deviceCount').toNumber(),
    };
  } finally {
    await session.close();
  }
};

// ─── Find People in Hazard Zone ────────────────────────────────────────────────

export const findPeopleInHazardZone = async () => {
  const session = getNeo4jSession();
  try {
    const result = await session.run(
      `MATCH (p:Person)
       MATCH (hz:HazardZone)
       WHERE point.distance(
         point({latitude: p.latitude, longitude: p.longitude}),
         point({latitude: hz.centerLat, longitude: hz.centerLng})
       ) < hz.radius
       AND p.lastSeen < datetime() - duration({minutes: 30})
       RETURN p.name AS name, p.disasterId AS disasterId,
              p.latitude AS lat, p.longitude AS lng`
    );
    return result.records.map((r) => ({
      name: r.get('name'),
      disasterId: r.get('disasterId'),
      latitude: r.get('lat'),
      longitude: r.get('lng'),
    }));
  } finally {
    await session.close();
  }
};

// ─── Nearest Safe Zone ─────────────────────────────────────────────────────────

export const findNearestSafeZone = async (userLat: number, userLng: number) => {
  const session = getNeo4jSession();
  try {
    const result = await session.run(
      `MATCH (sz:SafeZone)
       WHERE sz.occupancy < sz.capacity
       WITH sz, point.distance(
         point({latitude: $lat, longitude: $lng}),
         point({latitude: sz.latitude, longitude: sz.longitude})
       ) AS distance
       RETURN sz, distance ORDER BY distance ASC LIMIT 5`,
      { lat: userLat, lng: userLng }
    );
    return result.records.map((r) => ({
      zone: r.get('sz').properties,
      distance: r.get('distance'),
    }));
  } finally {
    await session.close();
  }
};

// ─── Sync Person Node ──────────────────────────────────────────────────────────

export const upsertPersonNode = async (
  userId: string,
  name: string,
  disasterId: string,
  lat: number,
  lng: number,
  status: string,
  bloodGroup?: string
) => {
  const session = getNeo4jSession();
  try {
    await session.run(
      `MERGE (p:Person {userId: $userId})
       SET p.name = $name,
           p.disasterId = $disasterId,
           p.latitude = $lat,
           p.longitude = $lng,
           p.status = $status,
           p.bloodGroup = $bloodGroup,
           p.lastSeen = datetime()`,
      { userId, name, disasterId, lat, lng, status, bloodGroup: bloodGroup || '' }
    );
  } finally {
    await session.close();
  }
};

// ─── Upsert Resource Node ──────────────────────────────────────────────────────

export const upsertResourceNode = async (
  resourceId: string,
  type: string,
  quantity: string,
  lat: number,
  lng: number,
  available: boolean
) => {
  const session = getNeo4jSession();
  try {
    await session.run(
      `MERGE (r:Resource {resourceId: $resourceId})
       SET r.type = $type, r.quantity = $quantity,
           r.latitude = $lat, r.longitude = $lng, r.available = $available`,
      { resourceId, type, quantity, lat, lng, available }
    );
  } finally {
    await session.close();
  }
};

// ─── Create SOS Node ───────────────────────────────────────────────────────────

export const createSOSNode = async (
  sosId: string,
  type: string,
  priority: string,
  lat: number,
  lng: number,
  userId: string
) => {
  const session = getNeo4jSession();
  try {
    await session.run(
      `MERGE (sos:SOSRequest {sosId: $sosId})
       SET sos.type = $type, sos.priority = $priority,
           sos.latitude = $lat, sos.longitude = $lng, sos.status = 'sent',
           sos.createdAt = datetime()
       WITH sos
       MATCH (p:Person {userId: $userId})
       MERGE (p)-[:SENT_SOS]->(sos)`,
      { sosId, type, priority, lat, lng, userId }
    );
  } finally {
    await session.close();
  }
};

// ─── Create SeismicDetection Node ─────────────────────────────────────────────

export const createSeismicNode = async (
  detectionId: string,
  deviceId: string,
  detectedAt: number,
  lat: number,
  lng: number,
  ratio: number,
  eventId: string
) => {
  const session = getNeo4jSession();
  try {
    await session.run(
      `MERGE (d:SeismicDetection {detectionId: $detectionId})
       SET d.deviceId = $deviceId, d.detectedAt = toString($detectedAt),
           d.latitude = $lat, d.longitude = $lng, d.ratio = $ratio
       WITH d
       MATCH (e:DisasterEvent {eventId: $eventId})
       MERGE (d)-[:PART_OF_EVENT]->(e)`,
      { detectionId, deviceId, detectedAt, lat, lng, ratio, eventId }
    );
  } finally {
    await session.close();
  }
};

// ─── Create Family Group Relationships ────────────────────────────────────────

export const createFamilyRelationship = async (userId: string, groupId: string) => {
  const session = getNeo4jSession();
  try {
    await session.run(
      `MERGE (p:Person {userId: $userId})
       MERGE (g:FamilyGroup {groupId: $groupId})
       MERGE (p)-[:PART_OF]->(g)`,
      { userId, groupId }
    );
  } finally {
    await session.close();
  }
};

// ─── Disaster Hazard Zone Seeding ─────────────────────────────────────────────
// Called when admin declares a disaster — creates a HazardZone node and a DisasterEvent
// node in Neo4j so that evacuation queries can avoid dangerous areas.

export const seedDisasterInNeo4j = async (
  eventId: string,
  eventType: string,
  severity: string,
  city: string,
  epicenterLat: number,
  epicenterLng: number,
  hazardRadiusMeters: number
) => {
  const session = getNeo4jSession();
  try {
    await session.run(
      `MERGE (de:DisasterEvent {eventId: $eventId})
       SET de.type = $eventType,
           de.severity = $severity,
           de.city = $city,
           de.centerLat = $epicenterLat,
           de.centerLng = $epicenterLng,
           de.status = 'active',
           de.declaredAt = datetime()
       MERGE (hz:HazardZone {eventId: $eventId})
       SET hz.centerLat = $epicenterLat,
           hz.centerLng = $epicenterLng,
           hz.radius = $radius,
           hz.type = $eventType,
           hz.severity = $severity,
           hz.city = $city
       MERGE (de)-[:HAS_HAZARD_ZONE]->(hz)`,
      {
        eventId,
        eventType,
        severity,
        city,
        epicenterLat,
        epicenterLng,
        radius: hazardRadiusMeters,
      }
    );
  } finally {
    await session.close();
  }
};

// ─── Upsert SafeZone Node ─────────────────────────────────────────────────────
// Called when admin adds a safe-zone map marker — syncs to Neo4j graph.

export const upsertSafeZoneNode = async (
  zoneId: string,
  name: string,
  lat: number,
  lng: number,
  capacity: number,
  eventId: string,
  city: string
) => {
  const session = getNeo4jSession();
  try {
    await session.run(
      `MERGE (sz:SafeZone {zoneId: $zoneId})
       SET sz.name = $name,
           sz.latitude = $lat,
           sz.longitude = $lng,
           sz.capacity = $capacity,
           sz.occupancy = 0,
           sz.city = $city
       WITH sz
       MATCH (de:DisasterEvent {eventId: $eventId})
       MERGE (de)-[:HAS_SAFE_ZONE]->(sz)`,
      { zoneId, name, lat, lng, capacity, eventId, city }
    );
  } finally {
    await session.close();
  }
};

// ─── Compute Evacuation Route (Shortest + Safest) ─────────────────────────────
// Uses Neo4j to find the nearest SafeZone to the user's current location,
// avoiding HazardZones. Returns waypoints for the mobile app to render.
// The "safe path" avoids hazard zone centers using spatial distance checks.

export interface EvacuationRoute {
  safeZone: {
    zoneId: string;
    name: string;
    latitude: number;
    longitude: number;
    capacity: number;
    occupancy: number;
    city: string;
  };
  distanceMeters: number;
  waypoints: Array<{ latitude: number; longitude: number; label?: string }>;
  safetyScore: number; // 0-100, higher is safer
  estimatedMinutes: number;
}

export const computeEvacuationRoute = async (
  userId: string,
  userLat: number,
  userLng: number,
  city: string
): Promise<EvacuationRoute | null> => {
  const session = getNeo4jSession();
  try {
    // Step 1: Find nearest safe zones not in a hazard zone, ordered by distance
    const safeZoneResult = await session.run(
      `MATCH (sz:SafeZone {city: $city})
       WHERE sz.occupancy < sz.capacity
       AND NOT EXISTS {
         MATCH (hz:HazardZone {city: $city})
         WHERE point.distance(
           point({latitude: hz.centerLat, longitude: hz.centerLng}),
           point({latitude: sz.latitude, longitude: sz.longitude})
         ) < hz.radius * 1.2
       }
       WITH sz,
            point.distance(
              point({latitude: $userLat, longitude: $userLng}),
              point({latitude: sz.latitude, longitude: sz.longitude})
            ) AS distanceToSz
       RETURN sz, distanceToSz
       ORDER BY distanceToSz ASC
       LIMIT 1`,
      { city, userLat, userLng }
    );

    if (safeZoneResult.records.length === 0) {
      // Fallback: return nearest safe zone even if slightly inside hazard
      const fallbackResult = await session.run(
        `MATCH (sz:SafeZone {city: $city})
         WHERE sz.occupancy < sz.capacity
         WITH sz,
              point.distance(
                point({latitude: $userLat, longitude: $userLng}),
                point({latitude: sz.latitude, longitude: sz.longitude})
              ) AS distanceToSz
         RETURN sz, distanceToSz
         ORDER BY distanceToSz ASC
         LIMIT 1`,
        { city, userLat, userLng }
      );
      if (fallbackResult.records.length === 0) return null;
      const r = fallbackResult.records[0];
      const sz = r.get('sz').properties;
      const dist = r.get('distanceToSz') as number;
      return buildEvacuationRoute(sz, dist, userLat, userLng, 50);
    }

    const record = safeZoneResult.records[0];
    const sz = record.get('sz').properties;
    const dist = record.get('distanceToSz') as number;

    // Step 2: Compute safety score — find closest hazard zone to user
    const hazardResult = await session.run(
      `MATCH (hz:HazardZone {city: $city})
       WITH hz,
            point.distance(
              point({latitude: $userLat, longitude: $userLng}),
              point({latitude: hz.centerLat, longitude: hz.centerLng})
            ) AS userToHazard
       ORDER BY userToHazard ASC
       LIMIT 1
       RETURN userToHazard AS minHazardDist, hz.radius AS hazardRadius`,
      { city, userLat, userLng }
    );

    let safetyScore = 90;
    if (hazardResult.records.length > 0) {
      const minDist = hazardResult.records[0].get('minHazardDist') as number;
      const radius = hazardResult.records[0].get('hazardRadius') as number;
      const ratio = minDist / (radius || 1000);
      safetyScore = Math.min(100, Math.round(ratio * 80));
    }

    return buildEvacuationRoute(sz, dist, userLat, userLng, safetyScore);
  } finally {
    await session.close();
  }
};

function buildEvacuationRoute(
  sz: any,
  distanceMeters: number,
  userLat: number,
  userLng: number,
  safetyScore: number
): EvacuationRoute {
  const walkSpeedMps = 1.2; // ~4.3 km/h walking speed
  const estimatedSeconds = distanceMeters / walkSpeedMps;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  // Generate intermediate waypoints along a straight-line path
  // (The mobile app uses OSRM for actual road routing; Neo4j provides destination)
  const steps = 3;
  const waypoints: Array<{ latitude: number; longitude: number; label?: string }> = [
    { latitude: userLat, longitude: userLng, label: 'Your Location' },
  ];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    waypoints.push({
      latitude: userLat + (sz.latitude - userLat) * t,
      longitude: userLng + (sz.longitude - userLng) * t,
    });
  }
  waypoints.push({
    latitude: Number(sz.latitude),
    longitude: Number(sz.longitude),
    label: sz.name || 'Safe Zone',
  });

  return {
    safeZone: {
      zoneId: sz.zoneId || '',
      name: sz.name || 'Safe Zone',
      latitude: Number(sz.latitude),
      longitude: Number(sz.longitude),
      capacity: Number(sz.capacity) || 500,
      occupancy: Number(sz.occupancy) || 0,
      city: sz.city || '',
    },
    distanceMeters: Math.round(distanceMeters),
    waypoints,
    safetyScore,
    estimatedMinutes,
  };
}

// ─── Mark Disaster Resolved in Neo4j ─────────────────────────────────────────

export const resolveDisasterInNeo4j = async (eventId: string) => {
  const session = getNeo4jSession();
  try {
    await session.run(
      `MATCH (de:DisasterEvent {eventId: $eventId})
       SET de.status = 'resolved', de.resolvedAt = datetime()
       WITH de
       MATCH (de)-[:HAS_HAZARD_ZONE]->(hz:HazardZone)
       SET hz.active = false`,
      { eventId }
    );
  } finally {
    await session.close();
  }
};

// ─── Get All Active Hazard Zones for a City ───────────────────────────────────

export const getActiveHazardZones = async (city: string) => {
  const session = getNeo4jSession();
  try {
    const result = await session.run(
      `MATCH (de:DisasterEvent {city: $city, status: 'active'})-[:HAS_HAZARD_ZONE]->(hz:HazardZone)
       RETURN hz`,
      { city }
    );
    return result.records.map((r) => r.get('hz').properties);
  } finally {
    await session.close();
  }
};
