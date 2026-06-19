import { Schema, model, Document, Types } from 'mongoose';

export interface IAlert extends Document {
  eventId?: Types.ObjectId;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  city: string;
  targetZones: string[];
  title: string;
  message: string;
  instructions?: string;
  sentBy: Types.ObjectId;
  sentAt: Date;
  readBy: Types.ObjectId[];
  safeConfirmed: Types.ObjectId[];
  createdAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'DisasterEvent' },
    type: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
    city: { type: String, required: true, index: true },
    targetZones: [{ type: String }],
    title: { type: String, required: true },
    message: { type: String, required: true },
    instructions: String,
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sentAt: { type: Date, default: Date.now },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    safeConfirmed: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export const Alert = model<IAlert>('Alert', AlertSchema);
