import React from 'react';
import { SonarAnalysisResult, SeverityLevel } from '../types';
import { AlertTriangle, ShieldCheck, AlertCircle, Eye, CheckCircle, Crosshair } from 'lucide-react';

interface DetectionResultViewProps {
  result: SonarAnalysisResult;
  imageSrc: string;
}

export const DetectionResultView: React.FC<DetectionResultViewProps> = ({ result, imageSrc }) => {
  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            HIGH SEVERITY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            MEDIUM SEVERITY
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            LOW SEVERITY
          </span>
        );
    }
  };

  const confidencePercent = Math.round(result.confidence * 100);

  // Bounding box calculation in percentage
  const boxStyle: React.CSSProperties = result.boundingBox
    ? {
        top: `${(result.boundingBox.ymin / 1000) * 100}%`,
        left: `${(result.boundingBox.xmin / 1000) * 100}%`,
        width: `${((result.boundingBox.xmax - result.boundingBox.xmin) / 1000) * 100}%`,
        height: `${((result.boundingBox.ymax - result.boundingBox.ymin) / 1000) * 100}%`,
      }
    : {};

  return (
    <div id="detection-result-section" className="border border-slate-200 bg-white rounded-lg p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">3. AI DETECTION RESULT</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Acoustic anomaly classification and bounding localization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {result.isDemo && (
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded">
              DEMO MODE
            </span>
          )}
          {getSeverityBadge(result.severity)}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sonar Image with Bounding Box Overlay */}
        <div className="lg:col-span-7 flex flex-col gap-2">
          <div className="relative border border-slate-800 rounded-md overflow-hidden bg-black flex items-center justify-center select-none shadow-inner">
            <img
              src={imageSrc}
              alt="Sonar Scan Analysis"
              className="w-full h-auto max-h-[460px] object-contain block"
            />

            {/* Bounding Box Overlay */}
            {result.detected && result.boundingBox && (
              <div
                style={boxStyle}
                className="absolute border-2 border-red-500 bg-red-500/15 pointer-events-none transition-all"
              >
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white"></div>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white"></div>
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white"></div>
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white"></div>

                {/* Tag pill */}
                <div className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                  {result.objectType.toUpperCase()} ({confidencePercent}%)
                </div>
              </div>
            )}

            {/* Watermark / scan overlay bar */}
            <div className="absolute bottom-2 left-2 bg-black/80 text-white/90 font-mono text-[10px] px-2 py-1 rounded border border-white/10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>SSS ACOUSTIC SCAN: {result.analysisId}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic text-center">
            {result.detected
              ? 'Target coordinates highlighted by AI vision bounding box over acoustic return.'
              : 'Continuous seabed return inspected. No anomaly boundary detected.'}
          </p>
        </div>

        {/* Structured Detection Findings Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4 bg-slate-50 p-5 rounded-md border border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              OBJECT
            </span>
            <div className="text-base font-bold text-slate-900 flex items-center gap-2">
              {result.detected ? (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              <span>{result.objectType}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                AI CONFIDENCE
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-bold text-slate-900">
                  {confidencePercent}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                AI Estimated Confidence
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                SEVERITY
              </span>
              <div className="pt-0.5">
                {getSeverityBadge(result.severity)}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              DESCRIPTION
            </span>
            <p className="text-xs text-slate-800 leading-relaxed font-normal">
              {result.description}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              WHY FLAGGED
            </span>
            <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded border border-slate-200">
              {result.anomalyReason}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              RECOMMENDATION
            </span>
            <p className="text-xs font-semibold text-slate-900 flex items-start gap-1.5">
              <span className="text-sky-700 font-bold">•</span>
              <span>{result.recommendation}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Scientific Disclaimer as explicitly requested */}
      <div className="mt-5 p-3 bg-amber-50/80 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-normal">
          <span className="font-bold">Scientific & Operational Notice:</span> SONARX is a prototype for AI-assisted
          sonar screening. Results are not scientifically calibrated and require human verification before operational decisions.
        </p>
      </div>
    </div>
  );
};
