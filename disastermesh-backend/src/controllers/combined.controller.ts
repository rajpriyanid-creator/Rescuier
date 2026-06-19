import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { ChatMessage } from '../models/ChatMessage.model';
import {
  Resource, FamilyGroup, MissingPerson, Volunteer, MapMarker, DamageReport,
  UserLocation
} from '../models/index';
import { DisasterEvent } from '../models/DisasterEvent.model';
import { SOSRequest } from '../models/SOSRequest.model';
import { emitToCity, emitToChat, emitToFamily, emitToAdmin } from '../services/socket.service';
import { sendPushNotifications } from '../services/notification.service';
import { createFamilyRelationship } from '../services/neo4j.service';

// ─── User ─────────────────────────────────────────────────────────────────────

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user });
  } catch { res.status(500).json({ error: 'Failed to get profile' }); }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowed = ['name', 'age', 'photo', 'district', 'ward', 'pincode', 'medicalProfile', 'emergencyContacts', 'language', 'expoPushToken'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
    res.json({ user });
  } catch { res.status(500).json({ error: 'Failed to update profile' }); }
};

export const getDisasterId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('disasterId name medicalProfile');
    res.json({ disasterId: user?.disasterId, name: user?.name, medicalProfile: user?.medicalProfile });
  } catch { res.status(500).json({ error: 'Failed to get disaster ID' }); }
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.findByIdAndDelete(req.userId);
    res.json({ message: 'Account deleted successfully' });
  } catch { res.status(500).json({ error: 'Failed to delete account' }); }
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const getChatMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cityId } = req.params;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = 50;
    const messages = await ChatMessage.find({ cityId, isHidden: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ messages: messages.reverse() });
  } catch { res.status(500).json({ error: 'Failed to get messages' }); }
};

export const sendChatMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('name disasterId role city');
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const { eventId, type, text, latitude, longitude, resourceDetails } = req.body;
    const msg = await ChatMessage.create({
      eventId, cityId: user.city, senderId: req.userId,
      senderName: user.name, senderDisasterId: user.disasterId, senderRole: user.role,
      type: type || 'text', text, latitude, longitude, resourceDetails,
      isAdminMessage: ['admin', 'superadmin'].includes(user.role),
    });

    emitToChat(user.city, 'chat:message', { message: msg });
    res.status(201).json({ message: msg });
  } catch (err) {
    console.error('[sendChatMessage]', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const reportMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ChatMessage.updateOne({ _id: req.params.id }, { $addToSet: { reportedBy: req.userId } });
    res.json({ message: 'Message reported' });
  } catch { res.status(500).json({ error: 'Failed to report message' }); }
};

// ─── Resources ────────────────────────────────────────────────────────────────

export const getResources = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId, type } = req.query as { eventId?: string; type?: string };
    const query: Record<string, unknown> = { available: true, expiresAt: { $gt: new Date() } };
    if (eventId) query.eventId = eventId;
    if (type) query.type = type;
    const resources = await Resource.find(query).sort({ createdAt: -1 });
    res.json({ resources });
  } catch { res.status(500).json({ error: 'Failed to get resources' }); }
};

export const postResource = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resource = await Resource.create({ ...req.body, postedBy: req.userId });
    emitToCity(req.userCity!, 'resource:new', { resource });
    res.status(201).json({ resource });
  } catch { res.status(500).json({ error: 'Failed to post resource' }); }
};

export const claimResource = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { claimedCount: 1 } },
      { new: true }
    );
    res.json({ resource });
  } catch { res.status(500).json({ error: 'Failed to claim resource' }); }
};

export const renewResource = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await Resource.updateOne({ _id: req.params.id, postedBy: req.userId }, { expiresAt });
    res.json({ message: 'Resource renewed for 24 hours' });
  } catch { res.status(500).json({ error: 'Failed to renew resource' }); }
};

export const deleteResource = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Resource.findOneAndDelete({ _id: req.params.id, postedBy: req.userId });
    res.json({ message: 'Resource removed' });
  } catch { res.status(500).json({ error: 'Failed to delete resource' }); }
};

// ─── Map Markers ──────────────────────────────────────────────────────────────

export const getMarkers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cityId } = req.params;
    const markers = await MapMarker.find({ cityId, isActive: true });
    res.json({ markers });
  } catch { res.status(500).json({ error: 'Failed to get markers' }); }
};

export const addMarker = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const marker = await MapMarker.create({ ...req.body, addedBy: req.userId });
    emitToCity(req.body.cityId, 'marker:added', { marker });
    res.status(201).json({ marker });
  } catch { res.status(500).json({ error: 'Failed to add marker' }); }
};

export const updateMarker = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const marker = await MapMarker.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ marker });
  } catch { res.status(500).json({ error: 'Failed to update marker' }); }
};

export const deleteMarker = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await MapMarker.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Marker removed' });
  } catch { res.status(500).json({ error: 'Failed to remove marker' }); }
};

// ─── Family Groups ────────────────────────────────────────────────────────────

export const createFamilyGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('name phone');
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const group = await FamilyGroup.create({
      name: req.body.name,
      createdBy: req.userId,
      members: [{ userId: req.userId, name: user.name, phone: user.phone, role: 'admin' }],
    });
    try { await createFamilyRelationship(req.userId!, group._id.toString()); } catch { /* non-blocking */ }
    res.status(201).json({ group });
  } catch { res.status(500).json({ error: 'Failed to create family group' }); }
};

export const inviteMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { phone } = req.body as { phone: string };
    const invitee = await User.findOne({ phone }).select('name phone');
    if (!invitee) { res.status(404).json({ error: 'User not found' }); return; }
    const group = await FamilyGroup.findByIdAndUpdate(
      req.params.id,
      { $push: { members: { userId: invitee._id, name: invitee.name, phone, role: 'member' } } },
      { new: true }
    );
    const groupId = req.params.id as string;
    try { await createFamilyRelationship(invitee._id.toString(), groupId); } catch { /* non-blocking */ }
    emitToFamily(groupId, 'family:member_added', { member: { name: invitee.name, phone } });
    res.json({ group });
  } catch { res.status(500).json({ error: 'Failed to invite member' }); }
};

// ─── Missing Persons ──────────────────────────────────────────────────────────

export const reportMissing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const missing = await MissingPerson.create({ ...req.body, reportedBy: req.userId });
    res.status(201).json({ missing });
  } catch { res.status(500).json({ error: 'Failed to report missing person' }); }
};

export const getMissingPersons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cityId } = req.params;
    const event = await DisasterEvent.findOne({ city: cityId, status: 'active' });
    if (!event) { res.json({ missing: [] }); return; }
    const missing = await MissingPerson.find({ eventId: event._id, adminApproved: true, status: 'missing' });
    res.json({ missing });
  } catch { res.status(500).json({ error: 'Failed to get missing persons' }); }
};

export const markFound = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const missing = await MissingPerson.findByIdAndUpdate(
      req.params.id,
      { status: 'found', foundBy: req.userId, foundAt: new Date() },
      { new: true }
    );
    res.json({ missing });
  } catch { res.status(500).json({ error: 'Failed to mark as found' }); }
};

// ─── Volunteers ───────────────────────────────────────────────────────────────

export const registerVolunteer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.userCity;
    const event = await DisasterEvent.findOne({ city, status: 'active' });
    if (!event) { res.status(400).json({ error: 'No active disaster to volunteer for' }); return; }
    const volunteer = await Volunteer.findOneAndUpdate(
      { userId: req.userId, eventId: event._id },
      { ...req.body, userId: req.userId, eventId: event._id },
      { upsert: true, new: true }
    );
    res.json({ volunteer });
  } catch { res.status(500).json({ error: 'Failed to register volunteer' }); }
};

export const updateVolunteerStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body as { status: string };
    const city = req.userCity;
    const event = await DisasterEvent.findOne({ city, status: 'active' });
    if (!event) { res.status(400).json({ error: 'No active event' }); return; }
    await Volunteer.updateOne({ userId: req.userId, eventId: event._id }, { status });
    res.json({ message: 'Status updated' });
  } catch { res.status(500).json({ error: 'Failed to update status' }); }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminGetAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.userCity;
    const users = await User.find({ city }).select('-refreshToken').lean();
    
    // Get active event to retrieve locations for
    const event = await DisasterEvent.findOne({ city, status: 'active' });
    
    let locations: any[] = [];
    if (event) {
      locations = await UserLocation.find({
        eventId: event._id,
        isLastKnown: true
      }).select('userId status timestamp latitude longitude').lean();
    }
    
    const locationMap = new Map(locations.map((loc) => [loc.userId.toString(), loc]));
    
    const usersWithStatus = users.map((u) => {
      const loc = locationMap.get(u._id.toString());
      return {
        ...u,
        status: loc?.status || 'offline',
        lastLocation: loc ? {
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: loc.timestamp
        } : null
      };
    });

    res.json({ users: usersWithStatus });
  } catch (err) {
    console.error('[adminGetAllUsers]', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

export const adminGetUserLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.userCity;
    const event = await DisasterEvent.findOne({ city, status: 'active' });
    if (!event) { res.json({ locations: [] }); return; }
    const locations = await UserLocation.find({
      eventId: event._id,
      isLastKnown: true
    }).populate('userId', 'name disasterId role medicalProfile');
    res.json({ locations });
  } catch (err) {
    console.error('[adminGetUserLocations]', err);
    res.status(500).json({ error: 'Failed to get user locations' });
  }
};

export const adminAssignRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.body as { userId: string; role: string };
    await User.findByIdAndUpdate(userId, { role });
    res.json({ message: 'Role updated' });
  } catch { res.status(500).json({ error: 'Failed to assign role' }); }
};

export const adminGetAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.userCity;
    const event = await DisasterEvent.findOne({ city, status: 'active' });

    const [totalUsers, activeUsers, totalSOS, resolvedSOS, volunteers, missing] =
      await Promise.all([
        User.countDocuments({ city }),
        UserLocation.distinct('userId', {
          eventId: event?._id,
          timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
        }).then((ids) => ids.length),
        event ? SOSRequest.countDocuments({ eventId: event._id }) : 0,
        event ? SOSRequest.countDocuments({ eventId: event._id, status: 'resolved' }) : 0,
        event ? Volunteer.countDocuments({ eventId: event._id }) : 0,
        event ? MissingPerson.countDocuments({ eventId: event._id, status: 'missing' }) : 0,
      ]);

    res.json({ totalUsers, activeUsers, totalSOS, resolvedSOS, volunteers, missing });
  } catch { res.status(500).json({ error: 'Failed to get analytics' }); }
};

export const adminPinChatMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ChatMessage.findByIdAndUpdate(req.params.id, { isPinned: true });
    emitToChat(req.userCity!, 'chat:pinned', { messageId: req.params.id });
    res.json({ message: 'Message pinned' });
  } catch { res.status(500).json({ error: 'Failed to pin message' }); }
};

export const adminDeleteChatMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ChatMessage.findByIdAndUpdate(req.params.id, { isHidden: true });
    res.json({ message: 'Message hidden' });
  } catch { res.status(500).json({ error: 'Failed to hide message' }); }
};

export const adminApproveMissing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const missing = await MissingPerson.findByIdAndUpdate(
      req.params.id, { adminApproved: true }, { new: true }
    );
    emitToCity(req.userCity!, 'missing:approved', { missing });
    res.json({ missing });
  } catch { res.status(500).json({ error: 'Failed to approve missing report' }); }
};

export const adminConfirmEarthquake = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { detectionIds, eventId } = req.body as { detectionIds: string[]; eventId: string };
    const { SeismicDetection } = await import('../models/index');
    await SeismicDetection.updateMany({ _id: { $in: detectionIds } }, { confirmedEarthquake: true, eventId });
    emitToCity(req.userCity!, 'seismic:confirmed', { eventId, city: req.userCity });
    res.json({ message: 'Earthquake confirmed' });
  } catch { res.status(500).json({ error: 'Failed to confirm earthquake' }); }
};

export const adminGetAllSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = req.userCity;
    const event = await DisasterEvent.findOne({ city, status: 'active' });
    if (!event) { res.json({ sos: [] }); return; }
    const sos = await SOSRequest.find({ eventId: event._id })
      .sort({ priority: 1, createdAt: 1 })
      .populate('userId', 'name disasterId medicalProfile')
      .populate('assignedTo', 'name phone');
    res.json({ sos });
  } catch { res.status(500).json({ error: 'Failed to get all SOS' }); }
};

export const adminAssignSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { responderId } = req.body as { responderId: string };
    const sos = await SOSRequest.findByIdAndUpdate(
      req.params.id,
      { assignedTo: responderId, status: 'assigned', assignedAt: new Date() },
      { new: true }
    );
    if (!sos) { res.status(404).json({ error: 'SOS not found' }); return; }
    const responder = await User.findById(responderId).select('expoPushToken name');
    if (responder?.expoPushToken) {
      await sendPushNotifications(
        [responder.expoPushToken],
        '🆘 SOS Assigned to You',
        `Priority: ${sos.priority}. ${sos.description || ''}`,
        { sosId: sos.sosId }
      );
    }
    res.json({ sos });
  } catch { res.status(500).json({ error: 'Failed to assign SOS' }); }
};

export const adminUpdateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  // City admin settings stored in admin collection or as extended User fields
  res.json({ message: 'Settings updated', settings: req.body });
};

export const adminGetLiveSeismic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { SeismicDetection } = await import('../models/index');
    const windowStart = new Date(Date.now() - 60_000);
    const detections = await SeismicDetection.find({
      createdAt: { $gte: windowStart },
      confirmedEarthquake: false,
    }).sort({ detectedAt: -1 });
    res.json({ detections });
  } catch { res.status(500).json({ error: 'Failed to get seismic data' }); }
};
