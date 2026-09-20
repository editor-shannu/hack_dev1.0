import mongoose, { Schema } from 'mongoose';

export interface IPushDose {
  doseId: string;
  medicationName: string;
  dosage?: string;
  scheduledTime: string;
  timingNotes?: string;
  slot?: string;
  reminderEnabled?: boolean;
}

export interface IPushSubscriptionRecord {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  doses: IPushDose[];
  timezoneOffset?: number; // Minutes from UTC (e.g. -330 for IST)
  lastNotifiedTime?: string;
  notifiedKeys?: string[];
  updatedAt?: Date;
  createdAt?: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionRecord>(
  {
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    doses: [
      {
        doseId: { type: String, required: true },
        medicationName: { type: String, required: true },
        dosage: { type: String },
        scheduledTime: { type: String, required: true },
        timingNotes: { type: String },
        slot: { type: String },
        reminderEnabled: { type: Boolean, default: true },
      },
    ],
    timezoneOffset: { type: Number, default: 0 },
    lastNotifiedTime: { type: String },
    notifiedKeys: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

PushSubscriptionSchema.index({ userId: 1, updatedAt: -1 });

export const PushSubscriptionModel =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscriptionRecord>('PushSubscription', PushSubscriptionSchema);

export default PushSubscriptionModel;
