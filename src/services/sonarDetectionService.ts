import { SonarAnalysisResult, SonarImageMeta } from '../types';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

/**
 * Direct client-side Gemini fallback for static hostings (e.g., GitHub Pages, static Vercel)
 * when VITE_GEMINI_API_KEY is provided in client environment.
 */
async function analyzeWithClientGemini(
  imageMeta: SonarImageMeta,
  imageBase64: string,
  apiKey: string
): Promise<any> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  const prompt = `You are a certified marine geophysics acoustic sensor specialist for SONARX (SIH26057 - Ministry of Earth Sciences / NIOT).
Analyze this Side-Scan Sonar (SSS) acoustic waterfall imagery with high scientific precision.

ACOUSTIC TARGET INTERPRETATION PROTOCOL:
1. Acoustic Highlight (High Backscatter): A bright return where the acoustic pulse strikes the exposed surface of a protruding object or structure.
2. Acoustic Shadow (Zone of No Return): The dark void directly behind the object along the sonar beam propagation direction. The shadow shape reveals the object's profile and its length indicates physical relief off the seabed.
3. Natural vs. Man-made Classification:
   - Natural seabed (sand ripples, uniform silt/mud, bioturbation) presents continuous periodic undulating patterns without isolated, sharp acoustic shadows.
   - Man-made marine debris / anomalies display distinct geometric boundaries (cylinders/drums, rectangular containers/crates, straight pipelines, structural wreckage frames, or irregular ghost net tangles) casting sharp, isolated shadows.
4. Target categories:
   - "Possible Cylindrical / Drum Object"
   - "Possible Shipping Container / Cargo Box"
   - "Possible Ghost Net / Abandoned Fishing Gear"
   - "Possible Submerged Pipeline / Cable"
   - "Possible Shipwreck / Structural Debris"
   - "Possible Marine Debris"
   - "Natural Seabed Formation"
   - "No significant anomaly"

ACCURACY CRITERIA:
- If the image displays uniform seafloor without an isolated anomalous target, you MUST set detected=false, objectType="No significant anomaly", confidence=0, severity="LOW", boundingBox=null.
- If an anomaly is identified, calculate accurate normalized coordinates [0-1000] for boundingBox:
  - ymin: upper boundary
  - xmin: left boundary
  - ymax: lower boundary
  - xmax: right boundary
  The boundingBox MUST tightly frame BOTH the bright acoustic highlight AND its accompanying dark acoustic shadow.
- Confidence must be an estimated float between 0.00 and 1.00.
- Severity must be "LOW", "MEDIUM", or "HIGH".
- Anomaly reason must factually explain the observed acoustic highlight and shadow morphology.`;

  const requestSchema = {
    type: Type.OBJECT,
    properties: {
      detected: { type: Type.BOOLEAN, description: 'Whether a convincing marine debris or anomaly was detected.' },
      objectType: { type: Type.STRING, description: "Type of anomaly detected or 'No significant anomaly'" },
      confidence: { type: Type.NUMBER, description: 'Estimated AI confidence from 0.0 to 1.0' },
      severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Risk or priority severity level' },
      description: { type: Type.STRING, description: 'Brief factual summary of the identified feature.' },
      anomalyReason: { type: Type.STRING, description: 'Specific acoustic-shadow and reflectivity characteristics observed.' },
      boundingBox: {
        type: Type.OBJECT,
        description: 'Normalized coordinates from 0 to 1000',
        properties: {
          ymin: { type: Type.NUMBER },
          xmin: { type: Type.NUMBER },
          ymax: { type: Type.NUMBER },
          xmax: { type: Type.NUMBER },
        },
        required: ['ymin', 'xmin', 'ymax', 'xmax'],
      },
      recommendation: { type: Type.STRING, description: 'Actionable recommendation for survey vessel operations' },
      humanVerificationRequired: { type: Type.BOOLEAN, description: 'Always true if anomaly is detected.' },
    },
    required: [
      'detected',
      'objectType',
      'confidence',
      'severity',
      'description',
      'anomalyReason',
      'recommendation',
      'humanVerificationRequired',
    ],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: {
      parts: [
        { inlineData: { mimeType: imageMeta.mimeType, data: cleanBase64 } },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: requestSchema,
      maxOutputTokens: 600,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });

  let text = (response?.text || '').trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return JSON.parse(text);
}

/**
 * Primary service function for SONARX underwater anomaly detection pipeline.
 *
 * Tries server-side API (/api/analyze-sonar), handles Vercel Serverless deployments,
 * and provides clear diagnostic messages if configuration is missing.
 */
export async function analyzeSonarImage(
  imageMeta: SonarImageMeta,
  imageBase64: string
): Promise<SonarAnalysisResult> {
  let data: any = null;

  try {
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

    if (response.ok) {
      const result = await response.json();
      data = result.data;
    } else {
      let errorMessage = '';
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message || errorBody.error || '';
      } catch {
        // Not JSON, likely HTML 404/502 from static host or proxy
      }

      if (!errorMessage) {
        if (response.status === 404) {
          errorMessage =
            'API endpoint (/api/analyze-sonar) not found (404). If hosted on Vercel, please push the latest repository update containing the Vercel serverless function and ensure GEMINI_API_KEY is configured in Vercel Project Settings > Environment Variables.';
        } else if (response.status === 503) {
          errorMessage =
            'AI analysis unavailable: GEMINI_API_KEY is not configured or the AI service is experiencing high demand. Please check your hosting environment variables or use Demo Mode.';
        } else {
          errorMessage = `Server response ${response.status}: AI analysis unavailable.`;
        }
      }

      // Check if client has VITE_GEMINI_API_KEY as an emergency fallback
      const clientKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (clientKey) {
        try {
          data = await analyzeWithClientGemini(imageMeta, imageBase64, clientKey);
        } catch (clientErr: any) {
          throw new Error(errorMessage || clientErr?.message || 'AI analysis unavailable');
        }
      } else {
        throw new Error(errorMessage);
      }
    }
  } catch (networkErr: any) {
    // If fetch failed completely (e.g. network offline or unrouted)
    const clientKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (clientKey) {
      data = await analyzeWithClientGemini(imageMeta, imageBase64, clientKey);
    } else {
      throw networkErr;
    }
  }

  if (!data) {
    throw new Error('No analysis data received from AI engine.');
  }

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
    detected: Boolean(data.detected),
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
    objectType: 'Possible Cylindrical / Drum Object',
    confidence: 0.96,
    severity: 'HIGH',
    description:
      'Distinct rectilinear acoustic highlight with a sharp trailing acoustic shadow, consistent with a submerged man-made shipping container or steel drum.',
    anomalyReason:
      'High-amplitude backscatter return along the port-side track boundary with a 38-meter extended acoustic shadow, indicating an elevated rigid obstacle ~2.4m relief above sandy seabed.',
    boundingBox: {
      ymin: 450,
      xmin: 220,
      ymax: 580,
      xmax: 375,
    },
    recommendation:
      'Human verification recommended. Mark waypoint for secondary ROV optical survey or diver inspection.',
    humanVerificationRequired: true,
    isDemo: true,
  };
}
