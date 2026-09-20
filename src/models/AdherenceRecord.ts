import mongoose, { Schema } from 'mongoose';

export interface IAdherenceRecord {
  userId: string;
  date: string; // YYYY-MM-DD
  totalScheduled: number;
  totalTaken: number;
  totalSkipped: number;
  adherenceRate: number; // 0 - 100
}

const AdherenceRecordSchema = new Schema<IAdherenceRecord>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    totalScheduled: { type: Number, required: true, default: 0 },
    totalTaken: { type: Number, required: true, default: 0 },
    totalSkipped: { type: Number, required: true, default: 0 },
    adherenceRate: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

AdherenceRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

export const AdherenceRecordModel =
  mongoose.models.AdherenceRecord ||
  mongoose.model<IAdherenceRecord>('AdherenceRecord', AdherenceRecordSchema);

export default AdherenceRecordModel;
