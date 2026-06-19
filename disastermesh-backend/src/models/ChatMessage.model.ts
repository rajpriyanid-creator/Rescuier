import { Schema, model, Document, Types } from 'mongoose';

export interface IChatMessage extends Document {
  eventId: Types.ObjectId;
  cityId: string;
  senderId: Types.ObjectId;
  senderName: string;
  senderDisasterId: string;
  senderRole: string;
  type: 'text' | 'location' | 'medical_need' | 'resource' | 'shelter' | 'missing' | 'sos';
  text?: string;
  latitude?: number;
  longitude?: number;
  resourceDetails?: {
    resourceType: string;
    quantity: string;
    address: string;
    expiresAt: Date;
  };
  isAdminMessage: boolean;
  isPinned: boolean;
  isHidden: boolean;
  reportedBy: Types.ObjectId[];
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'DisasterEvent', required: true, index: true },
    cityId: { type: String, required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderDisasterId: { type: String, required: true },
    senderRole: { type: String, default: 'user' },
    type: {
      type: String,
      enum: ['text', 'location', 'medical_need', 'resource', 'shelter', 'missing', 'sos'],
      default: 'text',
    },
    text: String,
    latitude: Number,
    longitude: Number,
    resourceDetails: {
      resourceType: String,
      quantity: String,
      address: String,
      expiresAt: Date,
    },
    isAdminMessage: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    reportedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export const ChatMessage = model<IChatMessage>('ChatMessage', ChatMessageSchema);
