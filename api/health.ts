export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json({
    status: "ok",
    service: "SONARX Serverless API",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
}
