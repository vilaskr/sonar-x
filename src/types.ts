export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface BoundingBox {
  ymin: number; // 0 - 1000 normalized
  xmin: number; // 0 - 1000 normalized
  ymax: number; // 0 - 1000 normalized
  xmax: number; // 0 - 1000 normalized
}

export interface DetectedObject {
  id?: string;
  label: string;
  confidence: number; // 0.0 to 1.0
  severity: SeverityLevel;
  boundingBox: BoundingBox;
  description?: string;
}

export interface SonarImageMeta {
  fileName: string;
  fileSizeFormatted: string;
  width: number;
  height: number;
  previewUrl: string;
  mimeType: string;
}

export interface SonarAnalysisResult {
  analysisId: string;
  timestamp: string;
  fileName: string;
  dimensions: {
    width: number;
    height: number;
  };
  fileSizeFormatted: string;
  detected: boolean;
  objectType: string;
  confidence: number; // 0.0 to 1.0 (Estimated AI Confidence)
  severity: SeverityLevel;
  description: string;
  anomalyReason: string;
  boundingBox: BoundingBox | null;
  detectedObjects?: DetectedObject[];
  recommendation: string;
  humanVerificationRequired: boolean;
  isDemo?: boolean;
}

export interface SurveyLocation {
  latitude: number;
  longitude: number;
  label?: string;
  source: 'Manual Survey Input' | 'Demo Survey Coordinates';
}
