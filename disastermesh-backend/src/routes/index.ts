
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware, responderMiddleware } from '../middleware/admin.middleware';
import { authLimiter, sosLimiter, locationLimiter } from '../middleware/rateLimit.middleware';

import {
  register, login, refreshToken, logout,
} from '../controllers/auth.controller';

import {
  getActiveEvent, getEventById, reportDisaster,
  declareDisaster, updateEvent, resolveEvent,
  getEvacuationRoute, getHazardZones,
} from '../controllers/event.controller';

import {
  createSOS, getMySOS, cancelSOS, getCitySOSQueue, claimSOS, resolveSOS,
  updateLocation, getFamilyLocations,
  getAlerts, markAlertRead, confirmSafe, sendAlert,
  reportSeismic, getSeismicAnalysis,
} from '../controllers/feature.controller';

import {
  getProfile, updateProfile, getDisasterId, deleteAccount,
  getChatMessages, sendChatMessage, reportMessage,
  getResources, postResource, claimResource, renewResource, deleteResource,
  getMarkers, addMarker, updateMarker, deleteMarker,
  createFamilyGroup, inviteMember,
  reportMissing, getMissingPersons, markFound,
  registerVolunteer, updateVolunteerStatus,
  adminGetAllUsers, adminGetUserLocations, adminAssignRole,
  adminGetAnalytics, adminPinChatMessage, adminDeleteChatMessage,
  adminApproveMissing, adminConfirmEarthquake, adminGetAllSOS,
  adminAssignSOS, adminUpdateSettings, adminGetLiveSeismic,
} from '../controllers/combined.controller';

const router = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/register', authLimiter, register);
router.post('/auth/login', authLimiter, login);
router.post('/auth/refresh', refreshToken);
router.delete('/auth/logout', logout);

// ─── User ─────────────────────────────────────────────────────────────────────
router.get('/user/profile', authMiddleware, getProfile);
router.put('/user/profile', authMiddleware, updateProfile);
router.get('/user/disaster-id', authMiddleware, getDisasterId);
router.delete('/user/account', authMiddleware, deleteAccount);

// ─── Disaster Events ──────────────────────────────────────────────────────────
router.get('/events/active', authMiddleware, getActiveEvent);
router.get('/events/:id', authMiddleware, getEventById);
router.post('/events/report', authMiddleware, reportDisaster);

// ─── Evacuation Routes (Neo4j-powered graph shortest safe path) ───────────────
router.get('/evacuation/route', authMiddleware, getEvacuationRoute);
router.get('/evacuation/hazards', authMiddleware, getHazardZones);

// ─── Alerts ───────────────────────────────────────────────────────────────────
router.get('/alerts', authMiddleware, getAlerts);
router.put('/alerts/:id/read', authMiddleware, markAlertRead);
router.put('/alerts/:id/safe', authMiddleware, confirmSafe);

// ─── Location ─────────────────────────────────────────────────────────────────
router.post('/location/update', authMiddleware, locationLimiter, updateLocation);
router.get('/location/family', authMiddleware, getFamilyLocations);

// ─── SOS ──────────────────────────────────────────────────────────────────────
router.post('/sos', authMiddleware, sosLimiter, createSOS);
router.get('/sos/my', authMiddleware, getMySOS);
router.put('/sos/:id/cancel', authMiddleware, cancelSOS);
router.get('/sos/city', authMiddleware, responderMiddleware, getCitySOSQueue);
router.put('/sos/:id/claim', authMiddleware, responderMiddleware, claimSOS);
router.put('/sos/:id/resolve', authMiddleware, responderMiddleware, resolveSOS);

// ─── Chat ─────────────────────────────────────────────────────────────────────
router.get('/chat/:cityId', authMiddleware, getChatMessages);
router.post('/chat', authMiddleware, sendChatMessage);
router.post('/chat/:id/report', authMiddleware, reportMessage);

// ─── Resources ────────────────────────────────────────────────────────────────
router.get('/resources', authMiddleware, getResources);
router.post('/resources', authMiddleware, postResource);
router.put('/resources/:id/claim', authMiddleware, claimResource);
router.put('/resources/:id/renew', authMiddleware, renewResource);
router.delete('/resources/:id', authMiddleware, deleteResource);

// ─── Map Markers ──────────────────────────────────────────────────────────────
router.get('/markers/:cityId', authMiddleware, getMarkers);

// ─── Seismic ──────────────────────────────────────────────────────────────────
router.post('/seismic/report', authMiddleware, reportSeismic);
router.get('/seismic/analysis/:city', authMiddleware, getSeismicAnalysis);

// ─── Family Groups ────────────────────────────────────────────────────────────
router.post('/family', authMiddleware, createFamilyGroup);
router.post('/family/:id/invite', authMiddleware, inviteMember);

// ─── Missing Persons ──────────────────────────────────────────────────────────
router.post('/missing', authMiddleware, reportMissing);
router.get('/missing/:cityId', authMiddleware, getMissingPersons);
router.put('/missing/:id/found', authMiddleware, markFound);

// ─── Volunteers ───────────────────────────────────────────────────────────────
router.post('/volunteer/register', authMiddleware, registerVolunteer);
router.put('/volunteer/status', authMiddleware, updateVolunteerStatus);

// ─── Admin Routes (admin role required) ──────────────────────────────────────
router.post('/admin/event/declare', authMiddleware, adminMiddleware, declareDisaster);
router.put('/admin/event/:id', authMiddleware, adminMiddleware, updateEvent);
router.put('/admin/event/:id/resolve', authMiddleware, adminMiddleware, resolveEvent);
router.post('/admin/alert', authMiddleware, adminMiddleware, sendAlert);
router.get('/admin/users', authMiddleware, adminMiddleware, adminGetAllUsers);
router.get('/admin/users/locations', authMiddleware, adminMiddleware, adminGetUserLocations);
router.post('/admin/marker', authMiddleware, adminMiddleware, addMarker);
router.put('/admin/marker/:id', authMiddleware, adminMiddleware, updateMarker);
router.delete('/admin/marker/:id', authMiddleware, adminMiddleware, deleteMarker);
router.get('/admin/sos', authMiddleware, adminMiddleware, adminGetAllSOS);
router.put('/admin/sos/:id/assign', authMiddleware, adminMiddleware, adminAssignSOS);
router.get('/admin/analytics', authMiddleware, adminMiddleware, adminGetAnalytics);
router.post('/admin/chat/pin/:id', authMiddleware, adminMiddleware, adminPinChatMessage);
router.delete('/admin/chat/:id', authMiddleware, adminMiddleware, adminDeleteChatMessage);
router.put('/admin/user/role', authMiddleware, adminMiddleware, adminAssignRole);
router.put('/admin/settings', authMiddleware, adminMiddleware, adminUpdateSettings);
router.get('/admin/seismic/live', authMiddleware, adminMiddleware, adminGetLiveSeismic);
router.post('/admin/seismic/confirm', authMiddleware, adminMiddleware, adminConfirmEarthquake);
router.post('/admin/missing/approve/:id', authMiddleware, adminMiddleware, adminApproveMissing);

export default router;
