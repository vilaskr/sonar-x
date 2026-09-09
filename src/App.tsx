import React, { useState, useEffect } from 'react';
import { SonarImageMeta, SonarAnalysisResult, SurveyLocation } from './types';
import { analyzeSonarImage, getDemoDetectionResult } from './services/sonarDetectionService';
import { SonarImageUpload } from './components/SonarImageUpload';
import { DetectionResultView } from './components/DetectionResultView';
import { DebrisLocationMap } from './components/DebrisLocationMap';
import { ReportSection } from './components/ReportSection';
import {
  Waves,
  ArrowRight,
  AlertOctagon,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Anchor,
  Compass,
} from 'lucide-react';

const DEMO_IMAGE_PATH = '/demo-sonar.jpg';
const DEFAULT_DEMO_LOCATION: SurveyLocation = {
  latitude: 13.0878,
  longitude: 80.2985,
  source: 'Demo Survey Coordinates',
  label: 'Bay of Bengal Coastal Sector 4 (NIOT Survey Zone)',
};

export default function App() {
  const [imageMeta, setImageMeta] = useState<SonarImageMeta | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SonarAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [surveyLocation, setSurveyLocation] = useState<SurveyLocation | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Load demo sample image
  const loadDemoImage = async () => {
    try {
      const response = await fetch(DEMO_IMAGE_PATH);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const meta: SonarImageMeta = {
            fileName: 'prototype_sample_sidescan_042.jpg',
            fileSizeFormatted: '412 KB',
            width: img.naturalWidth || 1280,
            height: img.naturalHeight || 720,
            previewUrl: base64data,
            mimeType: 'image/jpeg',
          };
          setImageMeta(meta);
          setImageBase64(base64data);
          setAnalysisError(null);
        };
        img.src = base64data;
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error('Failed to load demo image:', e);
    }
  };

  // Full demo mode triggering (pre-loads demo image, preset detection, and demo coordinates)
  const activateDemoMode = async () => {
    setIsDemoMode(true);
    setAnalysisError(null);
    setIsAnalyzing(false);

    await loadDemoImage();
    const demoDetection = getDemoDetectionResult();
    setAnalysisResult(demoDetection);
    setSurveyLocation(DEFAULT_DEMO_LOCATION);
  };

  const handleImageSelected = (meta: SonarImageMeta, base64: string) => {
    setImageMeta(meta);
    setImageBase64(base64);
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsDemoMode(false);
  };

  const handleAnalyzeWithGemini = async () => {
    if (!imageMeta || !imageBase64) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await analyzeSonarImage(imageMeta, imageBase64);
      setAnalysisResult(result);
      // Auto assign demo coordinates if none selected yet for convenience
      if (!surveyLocation) {
        setSurveyLocation(DEFAULT_DEMO_LOCATION);
      }
    } catch (err: any) {
      console.warn('AI analysis status notice:', err?.message || err);
      setAnalysisError('AI analysis unavailable.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased selection:bg-sky-500 selection:text-white">
      {/* Top Header - Dark Navy Bar */}
      <header className="bg-slate-950 border-b border-slate-800 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-sky-900 border border-sky-600 flex items-center justify-center text-sky-300">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-wider text-white">SONARX</span>
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  PROTOTYPE
                </span>
                {isDemoMode && (
                  <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    DEMO MODE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Marine Anomaly Detection System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Hackathon problem statement tag */}
            <div className="hidden md:flex flex-col text-right text-[11px] text-slate-400">
              <span className="text-slate-200 font-medium">Smart India Hackathon • SIH26057</span>
              <span className="text-slate-400">Ministry of Earth Sciences / NIOT</span>
            </div>

            {/* Quick Demo Mode toggle button in header */}
            <button
              id="header-demo-mode-btn"
              type="button"
              onClick={activateDemoMode}
              className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDemoMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Demo Mode</span>
            </button>
          </div>
        </div>
      </header>

      {/* Subheader Project Statement */}
      <div className="bg-white border-b border-slate-200 py-3 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            AI-assisted analysis of Side-Scan Sonar imagery to identify potential underwater debris and anomalies.
          </p>
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
            <span className="text-sky-800 font-semibold italic">"From Sonar Pixels to Actionable Intelligence"</span>
          </div>
        </div>
      </div>

      {/* Main Single Page Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* SECTION 1: UPLOAD SONAR IMAGE */}
        <SonarImageUpload
          imageMeta={imageMeta}
          imageBase64={imageBase64}
          onImageSelected={handleImageSelected}
          onAnalyzeClick={handleAnalyzeWithGemini}
          isAnalyzing={isAnalyzing}
          onUseDemoClick={loadDemoImage}
          isDemoActive={isDemoMode || imageMeta?.fileName.includes('sample') || false}
        />

        {/* ERROR STATE BANNER WITH TRY AGAIN & SWITCH TO DEMO MODE */}
        {analysisError && (
          <div className="border border-red-200 bg-red-50/90 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-900">{analysisError}</h4>
                <p className="text-xs text-red-700 mt-0.5">
                  The live AI vision service could not complete the acoustic scan analysis. You can retry or switch to Demo Mode for presentation.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="try-again-btn"
                type="button"
                onClick={handleAnalyzeWithGemini}
                disabled={isAnalyzing}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>Try Again</span>
              </button>

              <button
                id="switch-demo-mode-btn"
                type="button"
                onClick={activateDemoMode}
                className="px-3.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Switch to Demo Mode</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2 & 3: DETECTION RESULT */}
        {analysisResult && imageMeta && (
          <DetectionResultView
            result={analysisResult}
            imageSrc={imageMeta.previewUrl}
          />
        )}

        {/* SECTION 4: LOCATION ON MAP */}
        <DebrisLocationMap
          analysisResult={analysisResult}
          location={surveyLocation}
          onLocationChange={(newLoc) => setSurveyLocation(newLoc)}
        />

        {/* SECTION 5: GENERATE REPORT */}
        {analysisResult && imageMeta && (
          <ReportSection
            analysisResult={analysisResult}
            location={surveyLocation}
            imageSrc={imageMeta.previewUrl}
          />
        )}

        {/* ABOUT / HOW SONARX WORKS - Simple horizontal sequence */}
        <section className="border border-slate-200 bg-white rounded-lg p-6 shadow-xs mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            HOW SONARX WORKS
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
            {/* Step 1 */}
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                    01
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase">UPLOAD</span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Side-Scan Sonar imagery is uploaded to the screening pipeline.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                    02
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase">ANALYZE</span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  AI examines acoustic backscatter highlights and acoustic shadows.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                    03
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase">DETECT</span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Potential debris, containers, or hazards are classified with bounding boxes.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                    04
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase">LOCATE</span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Identified anomalies are mapped to geographic survey coordinates.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-slate-50 p-3.5 rounded border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                    05
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase">REPORT</span>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Findings are formatted into a technical PDF inspection report.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="font-mono">
              SONAR IMAGE → AI ANALYSIS → DETECTION → LOCATION → REPORT
            </span>
            <span className="italic">
              Future modular integration: OpenCV CLAHE → PyTorch/YOLO underwater weights → SONARX Engine
            </span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 mt-12 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <div className="font-bold text-slate-200">SONARX Prototype System</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              SIH26057 • Ministry of Earth Sciences / National Institute of Ocean Technology (NIOT)
            </div>
          </div>

          <div className="text-[11px] text-slate-400 max-w-md">
            AI-assisted sonar screening tool. Human verification required before operational decisions.
          </div>
        </div>
      </footer>
    </div>
  );
}
