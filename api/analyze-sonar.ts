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
    detected: {
      type: Type.BOOLEAN,
      description: "Whether a convincing marine debris or anomaly was detected.",
    },
    objectType: {
      type: Type.STRING,
      description: "Type of anomaly detected or 'No significant anomaly'",
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
      description: "Specific acoustic-shadow and reflectivity characteristics observed.",
    },
    boundingBox: {
      type: Type.OBJECT,
      description: "Normalized coordinates from 0 to 1000",
      properties: {
        ymin: { type: Type.NUMBER },
        xmin: { type: Type.NUMBER },
        ymax: { type: Type.NUMBER },
        xmax: { type: Type.NUMBER },
      },
      required: ["ymin", "xmin", "ymax", "xmax"],
    },
    recommendation: {
      type: Type.STRING,
      description: "Actionable recommendation for survey vessel operations",
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

    // Sanitize bounding box
    if (parsedData.detected && parsedData.boundingBox) {
      const box = parsedData.boundingBox;
      const ymin = typeof box.ymin === "number" ? Math.max(0, Math.min(950, box.ymin)) : 350;
      const xmin = typeof box.xmin === "number" ? Math.max(0, Math.min(950, box.xmin)) : 350;
      const ymax =
        typeof box.ymax === "number" ? Math.max(ymin + 40, Math.min(1000, box.ymax)) : Math.min(1000, ymin + 180);
      const xmax =
        typeof box.xmax === "number" ? Math.max(xmin + 40, Math.min(1000, box.xmax)) : Math.min(1000, xmin + 180);
      parsedData.boundingBox = { ymin, xmin, ymax, xmax };
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
