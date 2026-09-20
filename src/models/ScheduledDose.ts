import mongoose, { Schema } from 'mongoose';
import { ScheduledDose as IScheduledDose } from '@/types/prescription';

const ScheduledDoseSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    prescriptionId: { type: String, required: true, index: true },
    medicationId: { type: String, required: true },
    medicationName: { type: String, required: true },
    dosage: { type: String, required: true },
    slot: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'bedtime', 'as_needed'],
      required: true,
    },
    scheduledTime: { type: String, required: true },
    timingNotes: { type: String },
    instructions: { type: String },
    status: {
      type: String,
      enum: ['pending', 'taken', 'skipped', 'snoozed'],
      default: 'pending',
    },
    takenAt: { type: String },
    date: { type: String, required: true, index: true },
    reminderEnabled: { type: Boolean, default: true },
    repeatDays: { type: [String], default: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
    familyMember: {
      type: String,
      enum: [
        'self',
        'father',
        'mother',
        'spouse',
        'son',
        'daughter',
        'brother',
        'sister',
        'grandfather',
        'grandmother',
        'other',
      ],
      default: 'self',
      index: true,
    },
    patientName: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast multi-tenant queries and atomic daily syncs
ScheduledDoseSchema.index({ userId: 1, date: 1 });
ScheduledDoseSchema.index({ userId: 1, familyMember: 1, date: 1 });
ScheduledDoseSchema.index({ userId: 1, prescriptionId: 1 });

export const ScheduledDoseModel =
  mongoose.models.ScheduledDose || mongoose.model<IScheduledDose>('ScheduledDose', ScheduledDoseSchema);

export default ScheduledDoseModel;
