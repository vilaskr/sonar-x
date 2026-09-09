import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Support large payload for base64 sonar images
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// Server-side Gemini initialization
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "SONARX Backend Service",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Candidate models for automatic failover during regional load spikes
// gemini-3.1-flash-lite is primary due to low latency and high availability
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

// Primary AI Analysis endpoint for Sonar Imagery
app.post("/api/analyze-sonar", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", fileName = "sonar_scan.jpg" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body." });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "AI analysis unavailable",
        message: "Gemini API key is not configured in server environment.",
      });
    }

    // Strip data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");

    const prompt = `You are a certified marine geophysics acoustic sensor specialist for SONARX (SIH26057 - Ministry of Earth Sciences / NIOT).
Your task is to analyze this Side-Scan Sonar (SSS) acoustic waterfall imagery to detect potential underwater marine debris or anomalies.

Sonar image interpretation criteria:
1. Examine acoustic highlights (high backscatter brightness) and corresponding trailing acoustic shadows (dark absorption areas).
2. Distinguish artificial/man-made geometric profiles (rectilinear boxes, cylinders, pipelines, angular frames, entangled nets) from natural seafloor features (sand ripples, rocky ledges, biologics, water column reflections).
3. Types to identify if present:
   - "Possible Marine Debris"
   - "Possible Shipwreck / Structure"
   - "Possible Submerged Pipeline / Cable"
   - "Possible Cylindrical / Drum Object"
   - "Possible Ghost Net / Abandoned Fishing Gear"
   - "Natural Seabed Formation"
   - "No significant anomaly"

CRITICAL INSTRUCTIONS:
- Do NOT force a detection if the image displays uniform or natural seabed backscatter without distinct anomalies.
- If no clear anomaly exists, set "detected": false, "objectType": "No significant anomaly", "confidence": 0, "severity": "LOW", "boundingBox": null.
- If an anomaly is identified, provide boundingBox with normalized coordinates [0 to 1000]: ymin (top), xmin (left), ymax (bottom), xmax (right).
- Confidence must be an estimated float between 0.00 and 1.00.
- Severity must be one of: "LOW", "MEDIUM", "HIGH".

Return JSON conforming strictly to the requested schema.`;

    const requestConfig = {
      responseMimeType: "application/json",
      responseSchema: {
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
      },
    };

    let responseText: string | undefined;
    let lastError: any = null;

    // Iterate through candidate models with automated failover and retry on 503 high demand
    for (const modelName of CANDIDATE_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
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
            config: requestConfig,
          });

          if (response?.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          const isTransient =
            errMsg.includes("503") ||
            errMsg.includes("high demand") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("429") ||
            errMsg.includes("resource exhausted");

          if (isTransient && attempt < 2) {
            await new Promise((res) => setTimeout(res, 600));
          } else {
            break;
          }
        }
      }

      if (responseText) {
        break;
      }
    }

    if (!responseText) {
      return res.status(503).json({
        error: "AI analysis unavailable",
        message: "The AI vision model is experiencing temporary high demand. Please try again or switch to Demo Mode.",
      });
    }

    // Safely parse JSON even if surrounded by markdown fences
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }

    const parsedData = JSON.parse(cleanedText);

    // Sanitize bounding box if detected
    if (parsedData.detected && parsedData.boundingBox) {
      const box = parsedData.boundingBox;
      const ymin = typeof box.ymin === "number" ? Math.max(0, Math.min(950, box.ymin)) : 350;
      const xmin = typeof box.xmin === "number" ? Math.max(0, Math.min(950, box.xmin)) : 350;
      const ymax = typeof box.ymax === "number" ? Math.max(ymin + 40, Math.min(1000, box.ymax)) : Math.min(1000, ymin + 180);
      const xmax = typeof box.xmax === "number" ? Math.max(xmin + 40, Math.min(1000, box.xmax)) : Math.min(1000, xmin + 180);
      parsedData.boundingBox = { ymin, xmin, ymax, xmax };
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (err: any) {
    return res.status(503).json({
      error: "AI analysis unavailable",
      message: "Failed to process sonar image with Gemini AI. Please try again or switch to Demo Mode.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SONARX server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
