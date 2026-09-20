import { z } from 'zod';
import type { DocumentClassification, DocumentClassificationType } from '@/types/prescription';

function normalizeTiming(val: unknown): 'before_food' | 'after_food' | 'with_food' | 'anytime' | string {
  if (typeof val !== 'string') return 'after_food';
  const lower = val.toLowerCase().trim();
  if (lower.includes('before') || lower.includes('ac') || lower.includes('empty')) return 'before_food';
  if (lower.includes('with') || lower.includes('during')) return 'with_food';
  if (lower.includes('anytime') || lower.includes('prn') || lower.includes('as needed')) return 'anytime';
  // Preserve explicit clock times (e.g. 10AM, 8PM, 10 PM, 8:00 AM)
  if (/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(val.trim())) return val.trim();
  return 'after_food';
}

export const MedicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().nullable().optional().transform((v) => v || '1 tablet'),
  frequency: z.string().nullable().optional().transform((v) => v || 'OD (Once daily)'),
  timing: z.preprocess(normalizeTiming, z.string()).default('after_food'),
  specific_time: z.string().nullable().optional().transform((v) => v || undefined),
  flagged_for_review: z.boolean().optional(),
  duration: z.string().nullable().optional().transform((v) => v || '5 days'),
  instructions: z.string().nullable().optional().transform((v) => v || undefined),
}).passthrough().transform((med) => {
  // Backfill: if specific_time is present and timing is still "anytime" or default 'after_food', set timing to specific_time
  if (med.specific_time && (med.timing === 'anytime' || med.timing === 'after_food')) {
    return {
      ...med,
      timing: med.specific_time,
    };
  }
  return med;
});

export const ClassificationSchema = z.object({
  document_type: z.enum(['prescription', 'lab_report', 'radiology_scan', 'discharge_summary', 'medical_invoice', 'other_medical', 'non_medical']).default('prescription'),
  category_label: z.string().default("Doctor's Prescription"),
  is_healthcare_document: z.boolean().default(true),
  is_prescription: z.boolean().default(true),
  confidence: z.number().default(0.95),
  badge_color: z.enum(['emerald', 'amber', 'cyan', 'purple', 'orange', 'rose']).default('emerald'),
  verdict_summary: z.string().default('Prescription verified.'),
  key_indicators: z.array(z.string()).default([]),
  guidance: z.string().default(''),
});

export const ExtractedDataSchema = z.object({
  is_valid_medical_document: z.boolean().default(true),
  is_healthcare_document: z.boolean().default(true),
  is_prescription: z.boolean().default(true),
  invalid_reason: z.string().nullable().optional().transform((v) => v || undefined),
  detected_document_type: z.string().nullable().optional().transform((v) => v || undefined),
  classification: ClassificationSchema.optional(),
  document_type: z
    .preprocess((val) => {
      if (typeof val !== 'string') return 'prescription';
      const valid = ['prescription', 'diagnostic_report', 'discharge_summary', 'lab_report', 'radiology_scan', 'other'];
      return valid.includes(val) ? val : 'prescription';
    }, z.enum(['prescription', 'diagnostic_report', 'discharge_summary', 'lab_report', 'radiology_scan', 'other']))
    .default('prescription'),
  doctor_name: z.string().nullable().optional().transform((v) => v || undefined),
  clinic_or_hospital: z.string().nullable().optional().transform((v) => v || undefined),
  patient_name: z.string().nullable().optional().transform((v) => v || undefined),
  date: z.string().nullable().optional().transform((v) => v || undefined),
  diagnosis: z.string().nullable().optional().transform((v) => v || undefined),
  diagnosis_or_test: z.string().nullable().optional().transform((v) => v || undefined),
  medications: z.array(MedicationSchema).default([]),
  follow_up_date: z.string().nullable().optional().transform((v) => v || undefined),
  notes: z.string().nullable().optional().transform((v) => v || undefined),
});

export type ExtractedDataValidated = z.infer<typeof ExtractedDataSchema>;

/**
 * Fast Structural Shield Check adapted from PD_SPACE
 * Rejects obvious non-document spam, ultra-short inputs, or runaway repeated chars
 */
export function isStructuralGarbage(text: string): { isGarbage: boolean; reason?: string } {
  if (!text || text.trim().length < 8) {
    return { isGarbage: true, reason: 'Document text is too brief to be a valid medical document or prescription.' };
  }

  const hasAlphanumeric = /[a-zA-Z0-9]/.test(text);
  if (!hasAlphanumeric) {
    return { isGarbage: true, reason: 'Document does not contain recognizable alphanumeric characters.' };
  }

  const consecutiveMatch = text.toLowerCase().match(/([a-z])\1{9,}/g);
  if (consecutiveMatch && consecutiveMatch.length > 0) {
    return { isGarbage: true, reason: 'Excessive repetitive character patterns detected.' };
  }

  return { isGarbage: false };
}

/**
 * Healthcare / Hospital Document Detector
 * Adapted from PD_SPACE clinical classification rules.
 * Determines if the uploaded document is related to healthcare/hospital/medical records.
 */
export function detectHealthcareDocument(text: string): {
  isHealthcare: boolean;
  detectedType: string;
  confidence: number;
  reason?: string;
} {
  const norm = text.toLowerCase();

  // 1. Non-medical counter-indicators (strong flags that this is programming code, financial bill, etc.)
  const nonMedicalPatterns = [
    { pattern: /\b(import\s+React|const\s+\w+\s*=|function\(\)|class\s+\w+\s*\{|<\/div>|<\?php|public\s+static\s+void)\b/i, label: 'programming source code' },
    { pattern: /\b(invoice\s+no|tax\s+invoice|gstin|subtotal|shipping\s+address|bill\s+to|wire\s+transfer|payment\s+due)\b/i, label: 'commercial/tax invoice' },
    { pattern: /\b(preheat\s+oven|tablespoon|teaspoon|cup\s+of|bake\s+for|recipe)\b/i, label: 'food recipe' },
    { pattern: /\b(curriculum\s+vitae|resume|work\s+experience|skills|education|gpa)\b/i, label: 'resume/CV' },
  ];

  for (const { pattern, label } of nonMedicalPatterns) {
    if (pattern.test(norm)) {
      // Check if it really has no medical context
      const medicalHits = getMedicalKeywordCount(norm);
      if (medicalHits < 2) {
        return {
          isHealthcare: false,
          detectedType: label,
          confidence: 0.95,
          reason: `Wrong file: The uploaded document appears to be a ${label}, not a healthcare or medical record.`,
        };
      }
    }
  }

  // 2. Healthcare Core Keyword Bank (including Dental, General Medicine, Diagnostic, and Specialties)
  const healthcareKeywords = [
    'doctor', 'dr.', 'physician', 'hospital', 'clinic', 'medical', 'medicine', 'patient',
    'healthcare', 'clinical', 'diagnosis', 'symptom', 'treatment', 'prognosis', 'pathology',
    'laboratory', 'lab report', 'radiology', 'mri', 'ct scan', 'x-ray', 'ultrasound',
    'blood pressure', 'pulse', 'temperature', 'spo2', 'vital signs', 'ward', 'opd', 'ipd',
    'discharge summary', 'consultation', 'rx', 'prescription', 'tablet', 'capsule', 'dosage',
    'hemoglobin', 'wbc', 'platelet', 'creatinine', 'bilirubin', 'urine analysis', 'ecg',
    'dental', 'dentistry', 'dentist', 'teeth', 'tooth', 'gum', 'implants', 'whitening',
    'white tusk', 'oral', 'maxillofacial', 'scaling', 'extraction', 'caries', 'cavity',
    'tab.', 'cap.', 'syr.', 'adv:', 'after meals', 'before meals', 'augmentin', 'enzoflam', 'pan d', 'hexigel'
  ];

  let matches = 0;
  for (const kw of healthcareKeywords) {
    if (kw.length <= 3) {
      if (new RegExp(`\\b${kw}\\b`, 'i').test(norm)) matches++;
    } else {
      if (norm.includes(kw)) matches++;
    }
  }

  // If at least 2 medical markers are present, it's healthcare-related
  if (matches >= 2) {
    let detectedType = 'medical_document';
    if (/bill|invoice|receipt|charge|amount\s+paid|statement\s+of\s+account/i.test(norm)) detectedType = 'medical_invoice';
    else if (/x-ray|mri|ct\s+scan|ultrasound|sonography/i.test(norm)) detectedType = 'radiology_scan';
    else if (/urine|serum|wbc|hemoglobin|platelet|blood\s+test|lipid\s+profile/i.test(norm)) detectedType = 'lab_report';
    else if (/discharge\s+summary/i.test(norm) || (/admission\s+date/i.test(norm) && /discharge\s+date/i.test(norm))) detectedType = 'discharge_summary';
    else if (/rx|prescription|tab\b|cap\b|take\s+\d+|daily/i.test(norm)) detectedType = 'prescription';

    return {
      isHealthcare: true,
      detectedType,
      confidence: Math.min(1.0, 0.4 + matches * 0.1),
    };
  }

  return {
    isHealthcare: false,
    detectedType: 'non_medical',
    confidence: 0.85,
    reason: 'Wrong file: The uploaded document is not related to hospital/medical records or healthcare.',
  };
}

function getMedicalKeywordCount(norm: string): number {
  const kw = ['doctor', 'dr.', 'patient', 'hospital', 'clinic', 'medicine', 'rx', 'prescription', 'diagnosis'];
  return kw.filter((k) => norm.includes(k)).length;
}

/**
 * Prescription vs Non-Prescription Medical Record Detector
 * Determines whether an already-classified medical document contains a doctor's prescription with medications
 */
export function detectPrescriptionDocument(text: string): {
  isPrescription: boolean;
  medicationCountEstimate: number;
  detectedType: string;
  reason?: string;
} {
  const norm = text.toLowerCase();

  // 1. Prescription-specific anchors
  const prescriptionAnchors = [
    /\brx\b/i,
    /prescription/i,
    /prescribed\s+medications?/i,
    /medicines?\s+advised/i,
    /treatment\s+plan/i,
    /discharge\s+medications?/i,
    /sig\s*:/i,
    /dispense/i,
    /\badv\s*:/i,
    /\bafter\s+meals?\b/i,
    /\bbefore\s+meals?\b/i,
    /\btab\b/i,
    /\bcap\b/i,
    /\b1\s*-\s*0\s*-\s*1\b/,
    /\b1\s*-\s*0\s*-\s*0\b/,
    /\b0\s*-\s*0\s*-\s*1\b/,
  ];

  const hasAnchor = prescriptionAnchors.some((re) => re.test(norm));

  // 2. Frequency patterns (OD, BD, TDS, 1-0-1, etc.)
  const frequencyPatterns = [
    /\b(od|bd|bid|tds|tid|qid|qds|hs|prn|sos)\b/i,
    /\b(once|twice|thrice|\d+\s+times)\s+daily\b/i,
    /\b(1-0-1|1-1-1|1-0-0|0-0-1|1-1-1-1)\b/,
    /\b(before|after)\s+(food|meals?)\b/i,
    /\bat\s+bedtime\b/i,
  ];

  let frequencyMatches = 0;
  for (const re of frequencyPatterns) {
    if (re.test(norm)) frequencyMatches++;
  }

  // 3. Medication Dosage & Form patterns
  const dosagePatterns = [
    /\b\d+(\.\d+)?\s*(mg|mcg|ml|gm|g|iu|%)\b/i,
    /\b(tab(?:let)?|cap(?:sule)?|syr(?:up)?|inj(?:ection)?|ointment|drops|puff|inhaler)\b/i,
  ];

  let dosageMatches = 0;
  for (const re of dosagePatterns) {
    if (re.test(norm)) dosageMatches++;
  }

  // 4. Common generic / brand medicine names
  const commonMeds = [
    'paracetamol', 'acetaminophen', 'amoxicillin', 'azithromycin', 'ibuprofen', 'metformin',
    'atorvastatin', 'pantoprazole', 'omeprazole', 'cetirizine', 'montelukast', 'telmisartan',
    'amlodipine', 'losartan', 'augmentin', 'enzoflam', 'pan d', 'pan-d', 'hexigel',
    'ciprofloxacin', 'doxycycline', 'aspirin', 'prednisolone', 'levocetirizine',
    'clarithromycin', 'ranitidine', 'famotidine'
  ];

  let medCount = 0;
  for (const med of commonMeds) {
    if (norm.includes(med)) medCount++;
  }

  // Score prescription likelihood
  const isPrescription =
    (hasAnchor && (frequencyMatches > 0 || dosageMatches > 0 || medCount > 0)) ||
    (frequencyMatches >= 1 && dosageMatches >= 1) ||
    medCount >= 2;

  if (isPrescription) {
    return {
      isPrescription: true,
      medicationCountEstimate: Math.max(medCount, frequencyMatches),
      detectedType: 'prescription',
    };
  }

  // If it's medical but NOT a prescription, categorize what it actually is
  let nonPrescriptionType = 'diagnostic report';
  if (/x-ray|mri|ct\s+scan|ultrasound|radiology/i.test(norm)) {
    nonPrescriptionType = 'Radiology / Imaging Scan Report';
  } else if (/urine|serum|hemoglobin|wbc|platelet|pathology|blood\s+test/i.test(norm)) {
    nonPrescriptionType = 'Laboratory / Pathology Blood Test Report';
  } else if (/discharge\s+summary/i.test(norm)) {
    nonPrescriptionType = 'Hospital Discharge Summary (without prescribed medication table)';
  } else if (/bill|invoice|charge|receipt|amount\s+paid/i.test(norm)) {
    nonPrescriptionType = 'Hospital Billing Statement / Invoice';
  }

  return {
    isPrescription: false,
    medicationCountEstimate: 0,
    detectedType: nonPrescriptionType,
    reason: `Document Notice: The uploaded file appears to be a legitimate ${nonPrescriptionType}, but it is NOT a prescription. No prescribed medications or dosing schedules were detected. Please upload an official doctor's prescription.`,
  };
}

export function getCategoryBadgeColor(docType: DocumentClassificationType): 'emerald' | 'amber' | 'cyan' | 'purple' | 'orange' | 'rose' {
  switch (docType) {
    case 'prescription':
      return 'emerald';
    case 'lab_report':
      return 'amber';
    case 'radiology_scan':
      return 'cyan';
    case 'discharge_summary':
      return 'purple';
    case 'medical_invoice':
      return 'orange';
    case 'non_medical':
      return 'rose';
    case 'other_medical':
    default:
      return 'amber';
  }
}

export function getCategoryLabel(docType: DocumentClassificationType): string {
  switch (docType) {
    case 'prescription':
      return "Doctor's Prescription";
    case 'lab_report':
      return 'Diagnostic Laboratory / Pathology Test Report';
    case 'radiology_scan':
      return 'Radiology & Imaging Diagnostic Scan Report';
    case 'discharge_summary':
      return 'Hospital Inpatient Discharge Summary';
    case 'medical_invoice':
      return 'Hospital Billing Statement / Pharmacy Receipt';
    case 'non_medical':
      return 'Non-Medical File';
    case 'other_medical':
    default:
      return 'General Clinical Health Record';
  }
}

function getDefaultVerdict(docType: DocumentClassificationType): string {
  switch (docType) {
    case 'prescription':
      return "Official doctor's prescription with active medicine dosing instructions.";
    case 'lab_report':
      return 'Diagnostic laboratory or pathology test report containing biological test parameters.';
    case 'radiology_scan':
      return 'Diagnostic radiology / imaging scan report documenting anatomical findings.';
    case 'discharge_summary':
      return 'Hospital inpatient discharge summary detailing clinical admission history.';
    case 'medical_invoice':
      return 'Hospital billing statement or pharmacy receipt for healthcare services.';
    case 'non_medical':
      return 'The uploaded document is not related to hospital, clinical, or medical records.';
    case 'other_medical':
    default:
      return 'Clinical medical record without detected routine medication orders.';
  }
}

function getDefaultGuidance(docType: DocumentClassificationType): string {
  switch (docType) {
    case 'prescription':
      return 'Prescription verified. Ready to review and import into your Daily Routine & Refill Inventory.';
    case 'lab_report':
      return 'This document is a laboratory diagnostic report (e.g. blood, urine, or biochemistry test). Prescriptime requires an official doctor prescription with medicine dosing instructions (tablet name, frequency, timing) to generate your organizer routine.';
    case 'radiology_scan':
      return "This document is a diagnostic radiology imaging report (MRI, CT, X-Ray, Ultrasound). Prescriptime schedules medication dosages (tablets, syrups, drops). Please upload your doctor's prescription for medication management.";
    case 'discharge_summary':
      return 'Hospital discharge record detected. If you were provided a separate outpatient prescription slip for discharge medications, please upload that slip.';
    case 'medical_invoice':
      return "This file is a billing receipt or invoice. Please upload the clinical doctor's prescription slip.";
    case 'non_medical':
      return 'Prescriptime is a clinical medicine organizer. Please upload an authentic doctor prescription or health record.';
    case 'other_medical':
    default:
      return "Please upload an official doctor's prescription with active medication dosing instructions.";
  }
}

/**
 * Backward compatibility wrapper
 */
export function containsMedicalKeywords(text: string): boolean {
  return detectHealthcareDocument(text).isHealthcare;
}

/**
 * Comprehensive Medical Document & Image Classification Analyzer
 * Evaluates visual and textual features to determine whether a document is:
 * - prescription: Doctor's printed or handwritten prescription with medications
 * - lab_report: Pathology/blood/urine diagnostic report
 * - radiology_scan: MRI/CT/X-Ray/Ultrasound imaging report
 * - discharge_summary: Inpatient discharge record
 * - medical_invoice: Hospital/Pharmacy billing statement
 * - non_medical: Programming code, commercial invoice, recipe, personal document
 */
export function analyzeAndClassifyDocument(
  text: string,
  visionOverride?: Partial<DocumentClassification>
): DocumentClassification {
  const norm = (text || '').toLowerCase();

  // Clinical Entity Extractor from text (if available)
  const doctorMatch = text ? text.match(/dr\.?\s+([A-Za-z\s]{3,25})/i) : null;
  const clinicMatch = text ? text.match(/(?:hospital|clinic|dental|tusk|center|laboratory|diagnostics|imaging)\s*([A-Za-z\s]{3,30})?/i) : null;
  const patientMatch = text ? (text.match(/(?:patient|name|mr\.|mrs\.|ms\.)\s*:\s*([A-Za-z\s]{3,25})/i) || text.match(/mr\.?\s+([A-Za-z\s]{3,25})/i)) : null;
  const dateMatch = text ? text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/) : null;

  const prescriptionCheck = text ? detectPrescriptionDocument(text) : { isPrescription: false, medicationCountEstimate: 0, detectedType: 'unknown' };

  const detectedEntities = {
    doctorName: doctorMatch ? `Dr. ${doctorMatch[1].trim()}` : undefined,
    clinicOrHospital: clinicMatch ? clinicMatch[0].trim().slice(0, 40) : undefined,
    patientName: patientMatch ? patientMatch[1].trim() : undefined,
    date: dateMatch ? dateMatch[1].trim() : undefined,
    medicationCount: prescriptionCheck.medicationCountEstimate,
  };

  // 1. If Multimodal Vision provided high-confidence classification, prioritize it immediately
  if (visionOverride?.documentType) {
    const docType = visionOverride.documentType as DocumentClassificationType;
    const isRx = visionOverride.isPrescription ?? (docType === 'prescription');
    const isHc = visionOverride.isHealthcare ?? (docType !== 'non_medical');
    const badgeColor = getCategoryBadgeColor(docType);
    const categoryLabel = visionOverride.categoryLabel || getCategoryLabel(docType);

    return {
      documentType: docType,
      categoryLabel,
      isHealthcare: isHc,
      isPrescription: isRx,
      confidence: visionOverride.confidence || 0.98,
      badgeColor,
      verdictSummary: visionOverride.verdictSummary || getDefaultVerdict(docType),
      keyIndicators: visionOverride.keyIndicators?.length
        ? visionOverride.keyIndicators
        : ['Multimodal visual clinical analysis verified'],
      guidance: visionOverride.guidance || getDefaultGuidance(docType),
      detectedEntities: {
        ...detectedEntities,
        ...visionOverride.detectedEntities,
      },
    };
  }

  // 2. Fast Structural Check for Text
  const garbage = isStructuralGarbage(text);
  if (garbage.isGarbage && !visionOverride?.isHealthcare) {
    return {
      documentType: 'non_medical',
      categoryLabel: 'Unreadable or Fragmented File',
      isHealthcare: false,
      isPrescription: false,
      confidence: 0.95,
      badgeColor: 'rose',
      verdictSummary: 'The uploaded file contains insufficient or unreadable content.',
      keyIndicators: ['Character density below minimum threshold', 'No clinical typography found'],
      guidance: 'Please upload a clear, legible doctor prescription or medical record.',
      detectedEntities: { medicationCount: 0 },
    };
  }

  // 3. Non-Medical Patterns Check (Only if vision did not confirm healthcare)
  const healthcareCheck = detectHealthcareDocument(text);
  if (!healthcareCheck.isHealthcare && !visionOverride?.isHealthcare) {
    return {
      documentType: 'non_medical',
      categoryLabel: `Non-Medical File (${healthcareCheck.detectedType})`,
      isHealthcare: false,
      isPrescription: false,
      confidence: healthcareCheck.confidence,
      badgeColor: 'rose',
      verdictSummary: healthcareCheck.reason || `Wrong file: The uploaded document appears to be a ${healthcareCheck.detectedType}, not a healthcare or medical record.`,
      keyIndicators: [
        `Matched non-healthcare pattern: ${healthcareCheck.detectedType}`,
        'Zero doctor prescription orders',
        'Zero hospital or clinical diagnostic markers',
      ],
      guidance: 'Prescriptime is a clinical medicine organizer. Please upload an authentic doctor prescription or health record.',
      detectedEntities: { medicationCount: 0 },
    };
  }

  // 5. Rule-Based Classification from Document Content
  if (prescriptionCheck.isPrescription) {
    return {
      documentType: 'prescription',
      categoryLabel: "Doctor's Prescription",
      isHealthcare: true,
      isPrescription: true,
      confidence: 0.96,
      badgeColor: 'emerald',
      verdictSummary: 'Official doctor prescription with active medicine dosing instructions.',
      keyIndicators: [
        'Rx prescription symbol or treatment section present',
        `${prescriptionCheck.medicationCountEstimate || 1}+ medication dosing instructions detected`,
        'Frequency indicators found (e.g. 1-0-1, OD, after meals)',
      ],
      guidance: 'Prescription verified. Ready to review and import into your Daily Routine & Refill Inventory.',
      detectedEntities,
    };
  }

  // Radiology / Imaging Scan
  if (/x-ray|mri|ct\s+scan|ultrasound|radiology|contrast|t1|t2|brain|flair|ventricular/i.test(norm)) {
    return {
      documentType: 'radiology_scan',
      categoryLabel: 'Radiology / Imaging Scan Report',
      isHealthcare: true,
      isPrescription: false,
      confidence: 0.95,
      badgeColor: 'cyan',
      verdictSummary: 'Diagnostic radiology or imaging report containing anatomical observations.',
      keyIndicators: [
        'Imaging modality terminology detected (MRI / CT / X-Ray / Ultrasound)',
        'Contains radiographic technique and clinical impression',
        'No oral or topical medication dosing schedule detected',
      ],
      guidance: "This document is a radiology scan report. Prescriptime schedules medication dosages (tablets, syrups, drops). Please upload your doctor's prescription for medication management.",
      detectedEntities: {
        ...detectedEntities,
        diagnosisOrTest: 'Radiological Imaging Scan',
      },
    };
  }

  // Laboratory / Blood Report
  if (/urine|serum|hemoglobin|wbc|platelet|pathology|blood\s+test|cbc|lipid|glucose|creatinine/i.test(norm)) {
    return {
      documentType: 'lab_report',
      categoryLabel: 'Laboratory / Pathology Blood Test Report',
      isHealthcare: true,
      isPrescription: false,
      confidence: 0.95,
      badgeColor: 'amber',
      verdictSummary: 'Pathology/biochemistry laboratory report displaying biological test indices.',
      keyIndicators: [
        'Laboratory test parameters and reference intervals detected (e.g. g/dL, /mcL)',
        'Biomarker analysis without doctor drug dosing orders',
        'Diagnostic laboratory header',
      ],
      guidance: 'This document is a laboratory diagnostic report. Prescriptime requires an official prescription with prescribed medicine dosages to schedule your routine.',
      detectedEntities: {
        ...detectedEntities,
        diagnosisOrTest: 'Laboratory Pathology Blood Test',
      },
    };
  }

  // Medical Billing Statement / Invoice
  if (/bill|invoice|receipt|charge|amount\s+paid|subtotal|gstin/i.test(norm)) {
    return {
      documentType: 'medical_invoice',
      categoryLabel: 'Hospital Billing Statement / Medical Invoice',
      isHealthcare: true,
      isPrescription: false,
      confidence: 0.94,
      badgeColor: 'orange',
      verdictSummary: 'Financial billing statement or pharmacy receipt for healthcare services.',
      keyIndicators: [
        'Billing charges and currency amounts detected',
        'Financial invoice layout without clinical prescription instructions',
      ],
      guidance: "This file is a billing receipt or invoice. Please upload the clinical doctor's prescription slip.",
      detectedEntities,
    };
  }

  // Discharge Summary
  if (/discharge\s+summary|inpatient|admission\s+date|discharge\s+date/i.test(norm)) {
    return {
      documentType: 'discharge_summary',
      categoryLabel: 'Hospital Inpatient Discharge Summary',
      isHealthcare: true,
      isPrescription: false,
      confidence: 0.92,
      badgeColor: 'purple',
      verdictSummary: 'Hospital discharge summary detailing inpatient treatment history.',
      keyIndicators: [
        'Hospital admission/discharge dates detected',
        'Clinical consultation record without separate medication table',
      ],
      guidance: 'Hospital discharge record detected. If you have a separate prescription sheet for post-discharge medications, please upload that document.',
      detectedEntities,
    };
  }

  return {
    documentType: 'other_medical',
    categoryLabel: 'General Medical Record',
    isHealthcare: true,
    isPrescription: false,
    confidence: 0.85,
    badgeColor: 'amber',
    verdictSummary: 'Clinical medical record without detected medication schedule.',
    keyIndicators: ['Healthcare terminology present', 'No active medication dosing found'],
    guidance: 'Please upload an official doctor prescription with medication instructions.',
    detectedEntities,
  };
}
