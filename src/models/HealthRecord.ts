import mongoose, { Schema } from 'mongoose';
import { HealthRecord as IHealthRecord } from '@/types/prescription';

const TestResultSchema = new Schema(
  {
    parameter: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String },
    referenceRange: { type: String },
    flag: { type: String, enum: ['normal', 'high', 'low', 'abnormal'] },
  },
  { _id: false }
);

const HealthRecordSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    title: { type: String, required: true },
    documentType: {
      type: String,
      default: 'other_medical',
      index: true,
    },
    categoryLabel: { type: String, default: 'Hospital Record' },
    doctorName: { type: String },
    clinicOrHospital: { type: String },
    patientName: { type: String },
    familyMember: { type: String, default: 'self', index: true },
    patientRelation: { type: String },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    uploadedAt: { type: String, default: () => new Date().toISOString() },
    diagnosisOrTest: { type: String },
    summary: { type: String },
    keyIndicators: { type: [String], default: [] },
    testResults: { type: [TestResultSchema], default: [] },
    notes: { type: String },
    rawText: { type: String },
    fileUrl: { type: String },
    fileName: { type: String, default: 'medical_record' },
    fileType: { type: String, default: 'image' },
    fileSize: { type: Number },
    createdAt: { type: String, default: () => new Date().toISOString() },
    status: { type: String, default: 'active' },
    doctorVisits: { type: [Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast multi-tenant queries and categorized filtering
HealthRecordSchema.index({ userId: 1, createdAt: -1 });
HealthRecordSchema.index({ userId: 1, documentType: 1, createdAt: -1 });
HealthRecordSchema.index({ userId: 1, familyMember: 1, createdAt: -1 });

export const HealthRecordModel =
  mongoose.models.HealthRecord || mongoose.model<IHealthRecord>('HealthRecord', HealthRecordSchema);

export default HealthRecordModel;
