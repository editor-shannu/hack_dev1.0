import { ExtractedData } from './prescription';

export type UploadStep = 'idle' | 'uploading' | 'ocr_scanning' | 'gemini_extracting' | 'review' | 'success' | 'error';

export interface UploadProgress {
  step: UploadStep;
  progressPercent: number; // 0 to 100
  statusMessage: string;
}

export interface DocumentUploadResult {
  file: File;
  previewUrl: string;
  rawText: string;
  extractedData: ExtractedData;
}
