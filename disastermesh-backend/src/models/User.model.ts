import { Schema, model, Document } from 'mongoose';

export interface IEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IMedicalProfile {
  bloodGroup?: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  disability?: string;
}

export interface IUser extends Document {
  phone: string;
  name: string;
  password?: string;
  age?: number;
  photo?: string;
  city: string;
  district?: string;
  ward?: string;
  pincode?: string;
  role: 'user' | 'responder' | 'volunteer' | 'admin' | 'superadmin';
  disasterId: string;
  language: string;
  medicalProfile: IMedicalProfile;
  emergencyContacts: IEmergencyContact[];
  vaultTrustees: string[];
  isActive: boolean;
  lastSeen: Date;
  refreshToken?: string;
  expoPushToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    password: { type: String, select: false },
    age: { type: Number, min: 0, max: 150 },
    photo: { type: String },
    city: { type: String, required: true, index: true },
    district: { type: String },
    ward: { type: String },
    pincode: { type: String },
    role: {
      type: String,
      enum: ['user', 'responder', 'volunteer', 'admin', 'superadmin'],
      default: 'user',
    },
    disasterId: { type: String, unique: true, index: true },
    language: { type: String, default: 'en' },
    medicalProfile: {
      bloodGroup: { type: String },
      allergies: [{ type: String }],
      conditions: [{ type: String }],
      medications: [{ type: String }],
      disability: { type: String },
    },
    emergencyContacts: [
      {
        name: String,
        phone: String,
        relation: String,
      },
    ],
    vaultTrustees: [{ type: String }],
    isActive: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now },
    refreshToken: { type: String, select: false },
    expoPushToken: { type: String },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
