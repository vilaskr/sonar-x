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
  const prompt = `You are a certified marine acoustic geophysicist and forensic Search & Recovery (SAR) sonar analyst for SONARX (SIH26057 - Ministry of Earth Sciences / NIOT).
Analyze this underwater sonar (Side-Scan Sonar waterfall scan) or marine survey imagery with extreme diagnostic precision.

CRITICAL TARGET DISCRIMINATION & MORPHOLOGY TAXONOMY:

1. "Human Body / Diver / Person (Search and Rescue Target)" [CRITICAL SAR PRIORITY]
   - Morphological Identifiers: Human anatomical geometry—head, torso, arms, legs/fins, or a diver in scuba gear (distinctive air cylinder acoustic highlight, regulator, mask, harness, swim fins). Target may be supine, prone, or curled on the seabed or riverbed.
   - Scale & Shadow: Human scale (~1.5m to 2.0m). The acoustic shadow reveals human-proportioned silhouettes (torso with tapering limb relief).
   - STRICT RULE: NEVER classify a human body, diver, swimmer, or drowning victim silhouette as a shipwreck, vessel, cargo container, or rock. If human anatomical features or diver equipment are detected, you MUST classify as "Human Body / Diver / Person (Search and Rescue Target)" and set severity to "HIGH".

2. "Shipwreck / Vessel Hull / Boat Wreckage"
   - Morphological Identifiers: Very large maritime vessel structure (>5 to 100+ meters in length), prominent hull contours, gunwales, bow, stern, keel, ribs, deck machinery, mast, or scattered hull debris.
   - Scale: Expansive (>5-10m). Visually massive compared to human or small debris targets.

3. "Submerged Vehicle / Automobile"
   - Morphological Identifiers: Boxy automobile/truck body (~3-6m length), wheel wells, chassis, roof frame, or aircraft wreckage.

4. "Possible Cylindrical / Drum Object"
   - Morphological Identifiers: Symmetrical cylindrical 55-gallon drum, chemical container, or storage barrel. Bright curved specular highlight paired with an adjoining rectangular or elliptical acoustic shadow.

5. "Possible Shipping Container / Cargo Box"
   - Morphological Identifiers: Large rectangular intermodal container (e.g. 20ft/40ft TEU) with sharp 90-degree corners, corrugated side profile, and flat shadow.

6. "Possible Ghost Net / Abandoned Fishing Gear"
   - Morphological Identifiers: Diffuse, irregular web-like acoustic cloud or filament tangle snagged on the substrate or reef.

7. "Possible Submerged Pipeline / Cable"
   - Morphological Identifiers: Continuous, narrow linear feature or pipeline tracing across the acoustic swath.

8. "General Marine Debris / Discarded Tire"
   - Morphological Identifiers: Small artificial objects, tires (toroidal circular highlight and shadow), scrap metal, or discarded fishing traps.

9. "Natural Seabed Formation"
   - Morphological Identifiers: Periodic sand ripples, sedimentary waves, rock outcrop, biogenic reef, mud flat with NO artificial or human anomaly.

10. "No significant anomaly"
   - Morphological Identifiers: Uniform backscatter without distinct anomalies.

ACCURACY RULES FOR LOCALIZATION & MARKING (BOUNDING BOX):
- boundingBox: Normalized coordinates [0 to 1000]:
  ymin: upper boundary (0 - 1000)
  xmin: left boundary (0 - 1000)
  ymax: lower boundary (0 - 1000)
  xmax: right boundary (0 - 1000)
- Accurately and tightly frame the target object:
  - For sonar acoustic targets, tightly enclose BOTH the bright acoustic highlight (specular reflection) AND its accompanying acoustic shadow (acoustic void).
  - For a human body or diver, frame the entire person from head to feet/fins including their direct cast shadow.
  - Do NOT draw an oversized box around empty water or irrelevant seabed.
- If multiple distinct targets or anomalies are identified, include each in "detectedObjects".
- Confidence must be a realistic float between 0.00 and 1.00 based on acoustic resolution.
- Severity must be "LOW", "MEDIUM", or "HIGH" ("HIGH" for human bodies, toxic chemical drums, or major navigation hazards).`;

  const requestSchema = {
    type: Type.OBJECT,
    properties: {
      detected: { type: Type.BOOLEAN, description: 'Whether a convincing target, marine debris, human form, or anomaly was detected.' },
      objectType: { type: Type.STRING, description: 'Specific target classification from taxonomy' },
      confidence: { type: Type.NUMBER, description: 'Estimated AI confidence from 0.0 to 1.0' },
      severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Risk or priority severity level' },
      description: { type: Type.STRING, description: 'Brief factual summary of the identified feature.' },
      anomalyReason: { type: Type.STRING, description: 'Specific acoustic-shadow, reflectivity, scale, and morphology characteristics observed.' },
      boundingBox: {
        type: Type.OBJECT,
        description: 'Normalized coordinates from 0 to 1000 for primary target',
        properties: {
          ymin: { type: Type.NUMBER },
          xmin: { type: Type.NUMBER },
          ymax: { type: Type.NUMBER },
          xmax: { type: Type.NUMBER },
        },
        required: ['ymin', 'xmin', 'ymax', 'xmax'],
      },
      detectedObjects: {
        type: Type.ARRAY,
        description: 'All distinct targets detected in the scan',
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
            boundingBox: {
              type: Type.OBJECT,
              properties: {
                ymin: { type: Type.NUMBER },
                xmin: { type: Type.NUMBER },
                ymax: { type: Type.NUMBER },
                xmax: { type: Type.NUMBER },
              },
              required: ['ymin', 'xmin', 'ymax', 'xmax'],
            },
          },
          required: ['label', 'confidence', 'severity', 'boundingBox'],
        },
      },
      recommendation: { type: Type.STRING, description: 'Actionable recommendation for survey vessel operations or SAR response' },
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

  function normalizeBoundingBox(box: any): { ymin: number; xmin: number; ymax: number; xmax: number } | null {
    if (!box) return null;
    let { ymin, xmin, ymax, xmax } = box;
    if (typeof ymin !== 'number' || typeof xmin !== 'number' || typeof ymax !== 'number' || typeof xmax !== 'number') {
      return null;
    }
    if (ymax <= 1 && xmax <= 1 && (ymin > 0 || xmin > 0 || ymax > 0 || xmax > 0)) {
      ymin *= 1000;
      xmin *= 1000;
      ymax *= 1000;
      xmax *= 1000;
    }
    ymin = Math.max(0, Math.min(990, Math.round(ymin)));
    xmin = Math.max(0, Math.min(990, Math.round(xmin)));
    ymax = Math.max(ymin + 15, Math.min(1000, Math.round(ymax)));
    xmax = Math.max(xmin + 15, Math.min(1000, Math.round(xmax)));
    return { ymin, xmin, ymax, xmax };
  }

  let boundingBox = data.boundingBox ? normalizeBoundingBox(data.boundingBox) : null;
  let detectedObjects: any[] | undefined = undefined;

  if (Array.isArray(data.detectedObjects) && data.detectedObjects.length > 0) {
    detectedObjects = data.detectedObjects
      .map((obj: any, idx: number) => {
        const norm = normalizeBoundingBox(obj.boundingBox);
        if (!norm) return null;
        return {
          id: `target-${idx + 1}`,
          label: String(obj.label || data.objectType || 'Target'),
          confidence: typeof obj.confidence === 'number' ? obj.confidence : (data.confidence || 0.85),
          severity: ['LOW', 'MEDIUM', 'HIGH'].includes(obj.severity) ? obj.severity : data.severity,
          boundingBox: norm,
        };
      })
      .filter(Boolean);

    if (!boundingBox && detectedObjects && detectedObjects.length > 0) {
      boundingBox = detectedObjects[0].boundingBox;
    }
  } else if (boundingBox) {
    detectedObjects = [
      {
        id: 'target-1',
        label: data.objectType || 'Detected Target',
        confidence: data.confidence || 0.9,
        severity: data.severity || 'MEDIUM',
        boundingBox,
      },
    ];
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
    boundingBox,
    detectedObjects,
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

  const boundingBox = {
    ymin: 450,
    xmin: 220,
    ymax: 580,
    xmax: 375,
  };

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
    boundingBox,
    detectedObjects: [
      {
        id: 'target-demo-1',
        label: 'Possible Cylindrical / Drum Object',
        confidence: 0.96,
        severity: 'HIGH',
        boundingBox,
      },
    ],
    recommendation:
      'Human verification recommended. Mark waypoint for secondary ROV optical survey or diver inspection.',
    humanVerificationRequired: true,
    isDemo: true,
  };
}
