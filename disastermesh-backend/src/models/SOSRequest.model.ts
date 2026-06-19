import { Schema, model, Document, Types } from 'mongoose';

export interface ISOSRequest extends Document {
  sosId: string;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  type: 'trapped' | 'injured' | 'water' | 'medicine' | 'rescue' | 'fire';
  description?: string;
  peopleCount?: number;
  photo?: string;
  latitude: number;
  longitude: number;
  priority: 'critical' | 'urgent' | 'standard';
  status: 'sent' | 'seen' | 'assigned' | 'on_scene' | 'resolved' | 'escalated' | 'cancelled';
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SOSRequestSchema = new Schema<ISOSRequest>(
  {
    sosId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'DisasterEvent', required: true },
    type: {
      type: String,
      enum: ['trapped', 'injured', 'water', 'medicine', 'rescue', 'fire'],
      required: true,
    },
    description: String,
    peopleCount: { type: Number, default: 1 },
    photo: String,
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    priority: { type: String, enum: ['critical', 'urgent', 'standard'], default: 'urgent' },
    status: {
      type: String,
      enum: ['sent', 'seen', 'assigned', 'on_scene', 'resolved', 'escalated', 'cancelled'],
      default: 'sent',
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: Date,
    resolvedAt: Date,
  },
  { timestamps: true }
);

export const SOSRequest = model<ISOSRequest>('SOSRequest', SOSRequestSchema);
