import { SonarAnalysisResult, SonarImageMeta } from '../types';

/**
 * Service abstraction for SONARX underwater anomaly detection pipeline.
 *
 * Current Architecture:
 *   analyzeSonarImage() -> AI Multimodal Vision (Server-side Gemini 3.8 Flash)
 *
 * Future Architecture (Roadmap):
 *   analyzeSonarImage() -> Python/FastAPI backend -> OpenCV despeckle/CLAHE -> YOLOv8-Underwater / PyTorch -> SONARX Detection Engine
 */
export async function analyzeSonarImage(
  imageMeta: SonarImageMeta,
  imageBase64: string
): Promise<SonarAnalysisResult> {
  const response = await fetch('/api/analyze-sonar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      mimeType: imageMeta.mimeType,
      fileName: imageMeta.fileName,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || 'AI analysis unavailable');
  }

  const result = await response.json();
  const data = result.data;

  const now = new Date();
  const analysisId = `SX-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    analysisId,
    timestamp: now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    fileName: imageMeta.fileName,
    dimensions: {
      width: imageMeta.width,
      height: imageMeta.height,
    },
    fileSizeFormatted: imageMeta.fileSizeFormatted,
    detected: data.detected,
    objectType: data.objectType || 'No significant anomaly',
    confidence: typeof data.confidence === 'number' ? data.confidence : 0,
    severity: data.severity || 'LOW',
    description: data.description || 'Analysis completed.',
    anomalyReason: data.anomalyReason || 'Acoustic backscatter signature evaluated.',
    boundingBox: data.boundingBox || null,
    recommendation: data.recommendation || 'Standard survey protocol applies.',
    humanVerificationRequired: data.humanVerificationRequired ?? false,
    isDemo: false,
  };
}

/**
 * Returns a deterministic prototype sample detection result for demo purposes.
 * Enables zero-dependency live demonstration during hackathon presentation.
 */
export function getDemoDetectionResult(imageMeta?: Partial<SonarImageMeta>): SonarAnalysisResult {
  const now = new Date();
  const analysisId = `SX-DEMO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}-0892`;

  return {
    analysisId,
    timestamp: now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    fileName: imageMeta?.fileName || 'sample_side_scan_survey_042.jpg',
    dimensions: {
      width: imageMeta?.width || 1280,
      height: imageMeta?.height || 720,
    },
    fileSizeFormatted: imageMeta?.fileSizeFormatted || '428 KB',
    detected: true,
    objectType: 'Possible Marine Debris',
    confidence: 0.89,
    severity: 'HIGH',
    description:
      'Distinct rectilinear acoustic highlight with a sharp trailing acoustic shadow, consistent with a submerged man-made shipping container or steel crate.',
    anomalyReason:
      'High-amplitude backscatter return along the port-side track boundary with a 38-meter extended acoustic shadow, indicating an elevated rigid obstacle ~2.4m relief above sandy seabed.',
    boundingBox: {
      ymin: 310,
      xmin: 450,
      ymax: 690,
      xmax: 710,
    },
    recommendation:
      'Human verification recommended. Mark waypoint for secondary ROV optical survey or diver inspection.',
    humanVerificationRequired: true,
    isDemo: true,
  };
}
