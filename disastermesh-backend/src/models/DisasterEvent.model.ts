import { Schema, model, Document, Types } from 'mongoose';

export interface IDisasterEvent extends Document {
  type: 'earthquake' | 'flood' | 'cyclone' | 'storm' | 'tsunami' | 'fire' | 'custom';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  city: string;
  affectedZones: string[];
  epicenter?: { latitude: number; longitude: number };
  waveSpeed?: number;
  declaredBy: Types.ObjectId;
  declaredAt: Date;
  status: 'active' | 'monitoring' | 'resolved';
  resolvedAt?: Date;
  description?: string;
  instructions?: string;
  updates: Array<{ message: string; sentAt: Date; sentBy: Types.ObjectId }>;
  createdAt: Date;
  updatedAt: Date;
}

const DisasterEventSchema = new Schema<IDisasterEvent>(
  {
    type: {
      type: String,
      enum: ['earthquake', 'flood', 'cyclone', 'storm', 'tsunami', 'fire', 'custom'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
      required: true,
    },
    city: { type: String, required: true, index: true },
    affectedZones: [{ type: String }],
    epicenter: {
      latitude: Number,
      longitude: Number,
    },
    waveSpeed: Number,
    declaredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    declaredAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['active', 'monitoring', 'resolved'],
      default: 'active',
      index: true,
    },
    resolvedAt: Date,
    description: String,
    instructions: String,
    updates: [
      {
        message: String,
        sentAt: { type: Date, default: Date.now },
        sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

export const DisasterEvent = model<IDisasterEvent>('DisasterEvent', DisasterEventSchema);
