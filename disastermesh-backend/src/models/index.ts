import { Schema, model, Document, Types } from 'mongoose';

// ──────────────────────── UserLocation ────────────────────────
export interface IUserLocation extends Document {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  latitude: number;
  longitude: number;
  accuracy?: number;
  status: 'safe' | 'need_help' | 'evacuating' | 'shelter' | 'checkin';
  timestamp: Date;
  isLastKnown: boolean;
}

const UserLocationSchema = new Schema<IUserLocation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'DisasterEvent', required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: Number,
  status: { type: String, enum: ['safe', 'need_help', 'evacuating', 'shelter', 'checkin'], default: 'safe' },
  timestamp: { type: Date, default: Date.now, index: true },
  isLastKnown: { type: Boolean, default: false },
});
export const UserLocation = model<IUserLocation>('UserLocation', UserLocationSchema);

// ──────────────────────── Resource ────────────────────────
export interface IResource extends Document {
  eventId: Types.ObjectId;
  postedBy: Types.ObjectId;
  type: 'water' | 'food' | 'shelter' | 'medical' | 'vehicle' | 'skill';
  description?: string;
  quantity?: string;
  address?: string;
  latitude: number;
  longitude: number;
  available: boolean;
  claimedCount: number;
  expiresAt: Date;
  verifiedByAdmin: boolean;
  createdAt: Date;
}

const ResourceSchema = new Schema<IResource>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'DisasterEvent', required: true, index: true },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['water', 'food', 'shelter', 'medical', 'vehicle', 'skill'], required: true },
    description: String,
    quantity: String,
    address: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    available: { type: Boolean, default: true },
    claimedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
    verifiedByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const Resource = model<IResource>('Resource', ResourceSchema);

// ──────────────────────── SeismicDetection ────────────────────────
export interface ISeismicDetection extends Document {
  deviceId: string;
  userId: Types.ObjectId;
  detectedAt: number;
  latitude: number;
  longitude: number;
  staLtaRatio: number;
  phoneState: 'AT_REST' | 'SLIGHT_MOTION';
  confirmedEarthquake: boolean;
  eventId?: Types.ObjectId;
  createdAt: Date;
}

const SeismicDetectionSchema = new Schema<ISeismicDetection>(
  {
    deviceId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    detectedAt: { type: Number, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    staLtaRatio: { type: Number, required: true },
    phoneState: { type: String, enum: ['AT_REST', 'SLIGHT_MOTION'], required: true },
    confirmedEarthquake: { type: Boolean, default: false },
    eventId: { type: Schema.Types.ObjectId, ref: 'DisasterEvent' },
  },
  { timestamps: true }
);
export const SeismicDetection = model<ISeismicDetection>('SeismicDetection', SeismicDetectionSchema);

// ──────────────────────── FamilyGroup ────────────────────────
export interface IFamilyGroup extends Document {
  name: string;
  createdBy: Types.ObjectId;
  members: Array<{ userId: Types.ObjectId; name: string; phone: string; role: string; joinedAt: Date }>;
  vaultTrustees: Types.ObjectId[];
  createdAt: Date;
}

const FamilyGroupSchema = new Schema<IFamilyGroup>(
  {
    name: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        phone: String,
        role: { type: String, default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    vaultTrustees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);
export const FamilyGroup = model<IFamilyGroup>('FamilyGroup', FamilyGroupSchema);

// ──────────────────────── MissingPerson ────────────────────────
export interface IMissingPerson extends Document {
  eventId: Types.ObjectId;
  reportedBy: Types.ObjectId;
  name: string;
  age?: number;
  gender?: string;
  photo?: string;
  description?: string;
  lastSeenLatitude?: number;
  lastSeenLongitude?: number;
  lastSeenTime?: Date;
  contactPhone?: string;
  status: 'missing' | 'found' | 'closed';
  foundBy?: Types.ObjectId;
  foundAt?: Date;
  adminApproved: boolean;
  createdAt: Date;
}

const MissingPersonSchema = new Schema<IMissingPerson>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'DisasterEvent', required: true, index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    age: Number,
    gender: String,
    photo: String,
    description: String,
    lastSeenLatitude: Number,
    lastSeenLongitude: Number,
    lastSeenTime: Date,
    contactPhone: String,
    status: { type: String, enum: ['missing', 'found', 'closed'], default: 'missing' },
    foundBy: { type: Schema.Types.ObjectId, ref: 'User' },
    foundAt: Date,
    adminApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const MissingPerson = model<IMissingPerson>('MissingPerson', MissingPersonSchema);

// ──────────────────────── Volunteer ────────────────────────
export interface IVolunteer extends Document {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  skills: string[];
  availability: string;
  status: 'available' | 'assigned' | 'off_duty';
  currentTask?: { description: string; latitude: number; longitude: number; assignedAt: Date };
  totalHours: number;
  completedTasks: number;
  createdAt: Date;
}

const VolunteerSchema = new Schema<IVolunteer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'DisasterEvent', required: true, index: true },
    skills: [{ type: String }],
    availability: { type: String, default: 'full_time' },
    status: { type: String, enum: ['available', 'assigned', 'off_duty'], default: 'available' },
    currentTask: {
      description: String,
      latitude: Number,
      longitude: Number,
      assignedAt: Date,
    },
    totalHours: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const Volunteer = model<IVolunteer>('Volunteer', VolunteerSchema);

// ──────────────────────── DamageReport ────────────────────────
export interface IDamageReport extends Document {
  eventId: Types.ObjectId;
  reportedBy: Types.ObjectId;
  type: string;
  description?: string;
  photo?: string;
  latitude: number;
  longitude: number;
  severity: 'minor' | 'major' | 'critical';
  verified: boolean;
  verifiedBy?: Types.ObjectId;
  createdAt: Date;
}

const DamageReportSchema = new Schema<IDamageReport>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'DisasterEvent', required: true, index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    description: String,
    photo: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    severity: { type: String, enum: ['minor', 'major', 'critical'], default: 'minor' },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
export const DamageReport = model<IDamageReport>('DamageReport', DamageReportSchema);

// ──────────────────────── ShelterCheckin ────────────────────────
export interface IShelterCheckin extends Document {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  shelterId: Types.ObjectId;
  shelterName: string;
  checkedInAt: Date;
  checkedOutAt?: Date;
  isActive: boolean;
}

const ShelterCheckinSchema = new Schema<IShelterCheckin>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'DisasterEvent', required: true },
    shelterId: { type: Schema.Types.ObjectId, required: true },
    shelterName: { type: String, required: true },
    checkedInAt: { type: Date, default: Date.now },
    checkedOutAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const ShelterCheckin = model<IShelterCheckin>('ShelterCheckin', ShelterCheckinSchema);

// ──────────────────────── MapMarker ────────────────────────
export interface IMapMarker extends Document {
  cityId: string;
  type: 'safe_zone' | 'water' | 'hospital' | 'high_ground' | 'shelter' | 'food' | 'hazard' | 'fire_station' | 'police' | 'custom';
  name: string;
  latitude: number;
  longitude: number;
  info: Record<string, unknown>;
  addedBy: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MapMarkerSchema = new Schema<IMapMarker>(
  {
    cityId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['safe_zone', 'water', 'hospital', 'high_ground', 'shelter', 'food', 'hazard', 'fire_station', 'police', 'custom'],
      required: true,
    },
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    info: { type: Schema.Types.Mixed, default: {} },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const MapMarker = model<IMapMarker>('MapMarker', MapMarkerSchema);


