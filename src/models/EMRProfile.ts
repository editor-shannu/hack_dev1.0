import mongoose, { Schema } from 'mongoose';
import { EMRProfile as IEMRProfile } from '@/types/emr';

const EMRProfileSchema = new Schema(
  {
    userId: { type: String, default: 'default-user', index: true },
    fullName: { type: String, required: true },
    dateOfBirth: { type: String, default: 'Not specified' },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    allergies: { type: String, default: 'None reported' },
    emergencyContactName: { type: String, required: true },
    emergencyContactPhone: { type: String, required: true },
    activeConditions: { type: String, default: 'None' },
  },
  {
    timestamps: true,
  }
);

export const EMRProfileModel =
  mongoose.models.EMRProfile || mongoose.model<IEMRProfile>('EMRProfile', EMRProfileSchema);
