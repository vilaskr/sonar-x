import "dotenv/config";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

// Candidate models for fast inference and resilience
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

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
    detected: {
      type: Type.BOOLEAN,
      description: "Whether a convincing target, marine debris, human form, or anomaly was detected.",
    },
    objectType: {
      type: Type.STRING,
      description: "Specific target classification from taxonomy",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Estimated AI confidence from 0.0 to 1.0",
    },
    severity: {
      type: Type.STRING,
      enum: ["LOW", "MEDIUM", "HIGH"],
      description: "Risk or priority severity level",
    },
    description: {
      type: Type.STRING,
      description: "Brief factual summary of the identified feature.",
    },
    anomalyReason: {
      type: Type.STRING,
      description: "Specific acoustic-shadow, reflectivity, scale, and morphology characteristics observed.",
    },
    boundingBox: {
      type: Type.OBJECT,
      description: "Normalized coordinates from 0 to 1000 for primary target",
      properties: {
        ymin: { type: Type.NUMBER },
        xmin: { type: Type.NUMBER },
        ymax: { type: Type.NUMBER },
        xmax: { type: Type.NUMBER },
      },
      required: ["ymin", "xmin", "ymax", "xmax"],
    },
    detectedObjects: {
      type: Type.ARRAY,
      description: "All distinct targets detected in the scan",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          severity: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
          boundingBox: {
            type: Type.OBJECT,
            properties: {
              ymin: { type: Type.NUMBER },
              xmin: { type: Type.NUMBER },
              ymax: { type: Type.NUMBER },
              xmax: { type: Type.NUMBER },
            },
            required: ["ymin", "xmin", "ymax", "xmax"],
          },
        },
        required: ["label", "confidence", "severity", "boundingBox"],
      },
    },
    recommendation: {
      type: Type.STRING,
      description: "Actionable recommendation for survey vessel operations or SAR response",
    },
    humanVerificationRequired: {
      type: Type.BOOLEAN,
      description: "Always true if anomaly is detected.",
    },
  },
  required: [
    "detected",
    "objectType",
    "confidence",
    "severity",
    "description",
    "anomalyReason",
    "recommendation",
    "humanVerificationRequired",
  ],
};

export default async function handler(req: any, res: any) {
  // CORS setup for Vercel deployment
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Please use POST." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { imageBase64, mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "AI analysis unavailable",
        message:
          "GEMINI_API_KEY is not configured in Vercel Environment Variables. Please open your Vercel Project Dashboard -> Settings -> Environment Variables, add GEMINI_API_KEY, and redeploy.",
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");

    let responseText: string | undefined;
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const isGemini3 = modelName.startsWith("gemini-3");
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: requestSchema,
            maxOutputTokens: 600,
            ...(isGemini3 ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
          },
        });

        if (response?.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    if (!responseText) {
      return res.status(503).json({
        error: "AI analysis unavailable",
        message:
          lastError?.message ||
          "The AI vision model is experiencing temporary high demand. Please try again or switch to Demo Mode.",
      });
    }

    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }

    const parsedData = JSON.parse(cleanedText);

    function normalizeBoundingBox(box: any): { ymin: number; xmin: number; ymax: number; xmax: number } | null {
      if (!box) return null;
      let { ymin, xmin, ymax, xmax } = box;
      if (typeof ymin !== "number" || typeof xmin !== "number" || typeof ymax !== "number" || typeof xmax !== "number") {
        return null;
      }
      // If coordinates were returned on 0.0 - 1.0 scale rather than 0 - 1000
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

    // Sanitize bounding box and multi-target detection if detected
    if (parsedData.detected) {
      if (parsedData.boundingBox) {
        parsedData.boundingBox = normalizeBoundingBox(parsedData.boundingBox);
      }

      if (Array.isArray(parsedData.detectedObjects) && parsedData.detectedObjects.length > 0) {
        parsedData.detectedObjects = parsedData.detectedObjects
          .map((obj: any, idx: number) => {
            const normBox = normalizeBoundingBox(obj.boundingBox);
            if (!normBox) return null;
            return {
              id: `target-${idx + 1}`,
              label: String(obj.label || parsedData.objectType || "Target"),
              confidence: typeof obj.confidence === "number" ? Math.max(0, Math.min(1, obj.confidence)) : (parsedData.confidence || 0.85),
              severity: ["LOW", "MEDIUM", "HIGH"].includes(obj.severity) ? obj.severity : parsedData.severity,
              boundingBox: normBox,
            };
          })
          .filter(Boolean);

        if (!parsedData.boundingBox && parsedData.detectedObjects.length > 0) {
          parsedData.boundingBox = parsedData.detectedObjects[0].boundingBox;
        }
      } else if (parsedData.boundingBox) {
        parsedData.detectedObjects = [
          {
            id: "target-1",
            label: parsedData.objectType,
            confidence: parsedData.confidence,
            severity: parsedData.severity,
            boundingBox: parsedData.boundingBox,
          },
        ];
      }
    }

    return res.status(200).json({
      success: true,
      data: parsedData,
    });
  } catch (err: any) {
    return res.status(503).json({
      error: "AI analysis unavailable",
      message: err?.message || "Failed to process sonar image with Gemini AI.",
    });
  }
}
