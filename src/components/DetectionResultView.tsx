import React, { useState } from 'react';
import { SonarAnalysisResult, SeverityLevel, DetectedObject } from '../types';
import {
  AlertTriangle,
  ShieldCheck,
  AlertCircle,
  Eye,
  CheckCircle,
  Crosshair,
  LifeBuoy,
  Target,
  Layers,
} from 'lucide-react';

interface DetectionResultViewProps {
  result: SonarAnalysisResult;
  imageSrc: string;
}

export const DetectionResultView: React.FC<DetectionResultViewProps> = ({ result, imageSrc }) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

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

  const isHumanOrDiver =
    result.objectType.toLowerCase().includes('human') ||
    result.objectType.toLowerCase().includes('diver') ||
    result.objectType.toLowerCase().includes('person') ||
    result.objectType.toLowerCase().includes('victim') ||
    (result.detectedObjects || []).some((o) =>
      o.label.toLowerCase().includes('human') ||
      o.label.toLowerCase().includes('diver') ||
      o.label.toLowerCase().includes('person')
    );

  const confidencePercent = Math.round(result.confidence * 100);

  // Targets list: use detectedObjects if available, or fall back to single boundingBox
  const targets: DetectedObject[] =
    result.detectedObjects && result.detectedObjects.length > 0
      ? result.detectedObjects
      : result.detected && result.boundingBox
      ? [
          {
            id: 'target-primary',
            label: result.objectType,
            confidence: result.confidence,
            severity: result.severity,
            boundingBox: result.boundingBox,
          },
        ]
      : [];

  const getTargetColorTheme = (label: string, severity: SeverityLevel) => {
    const l = label.toLowerCase();
    if (l.includes('human') || l.includes('diver') || l.includes('person') || l.includes('victim')) {
      return {
        border: 'border-rose-500',
        bg: 'bg-rose-500/20',
        tagBg: 'bg-rose-600',
        corner: 'border-rose-200',
        text: 'text-rose-600',
        glow: 'ring-2 ring-rose-400/80',
      };
    }
    if (l.includes('ship') || l.includes('wreck') || l.includes('vessel') || l.includes('boat')) {
      return {
        border: 'border-sky-500',
        bg: 'bg-sky-500/20',
        tagBg: 'bg-sky-700',
        corner: 'border-sky-200',
        text: 'text-sky-600',
        glow: 'ring-2 ring-sky-400/80',
      };
    }
    if (l.includes('drum') || l.includes('cylinder') || l.includes('barrel')) {
      return {
        border: 'border-amber-500',
        bg: 'bg-amber-500/20',
        tagBg: 'bg-amber-600',
        corner: 'border-amber-200',
        text: 'text-amber-600',
        glow: 'ring-2 ring-amber-400/80',
      };
    }
    if (severity === 'HIGH') {
      return {
        border: 'border-red-500',
        bg: 'bg-red-500/20',
        tagBg: 'bg-red-600',
        corner: 'border-white',
        text: 'text-red-600',
        glow: 'ring-2 ring-red-400/80',
      };
    }
    return {
      border: 'border-emerald-500',
      bg: 'bg-emerald-500/15',
      tagBg: 'bg-emerald-700',
      corner: 'border-white',
      text: 'text-emerald-600',
      glow: 'ring-2 ring-emerald-400/80',
    };
  };

  return (
    <div id="detection-result-section" className="border border-slate-200 bg-white rounded-lg p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">3. AI DETECTION RESULT</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Acoustic anomaly classification, scale morphology, and target localization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {result.isDemo && (
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded">
              DEMO MODE
            </span>
          )}
          {isHumanOrDiver && (
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded flex items-center gap-1.5 animate-pulse">
              <LifeBuoy className="w-3.5 h-3.5 text-rose-600" />
              SAR HUMAN TARGET
            </span>
          )}
          {getSeverityBadge(result.severity)}
        </div>
      </div>

      {/* High-priority Search and Rescue Alert Banner */}
      {isHumanOrDiver && (
        <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-3">
          <LifeBuoy className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                CRITICAL SEARCH & RESCUE (SAR) TARGET LOCALIZED
              </h3>
              <span className="text-[10px] font-mono bg-rose-200/80 text-rose-900 font-bold px-2 py-0.5 rounded">
                LIFE-SAFETY PRIORITY
              </span>
            </div>
            <p className="text-xs text-rose-800 mt-1 leading-relaxed">
              Acoustic return indicates a human physiological scale (~1.5–2.0m) or diver configuration (scuba tank highlight, limb shadows). Tagged coordinates should be transmitted immediately to marine rescue or dive recovery teams.
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sonar Image with Bounding Box Overlay */}
        <div className="lg:col-span-7 flex flex-col gap-2">
          <div className="relative border border-slate-800 rounded-md overflow-hidden bg-black flex items-center justify-center select-none shadow-inner">
            <img
              src={imageSrc}
              alt="Sonar Scan Analysis"
              className="w-full h-auto max-h-[460px] object-contain block"
            />

            {/* Render All Detected Target Bounding Boxes */}
            {result.detected &&
              targets.map((target, idx) => {
                const box = target.boundingBox;
                const isSelected = selectedTargetId === target.id;
                const theme = getTargetColorTheme(target.label, target.severity);
                const confPercent = Math.round(target.confidence * 100);

                const style: React.CSSProperties = {
                  top: `${(box.ymin / 1000) * 100}%`,
                  left: `${(box.xmin / 1000) * 100}%`,
                  width: `${((box.xmax - box.xmin) / 1000) * 100}%`,
                  height: `${((box.ymax - box.ymin) / 1000) * 100}%`,
                };

                return (
                  <div
                    key={target.id || `box-${idx}`}
                    style={style}
                    onClick={() => setSelectedTargetId(target.id || null)}
                    className={`absolute border-2 ${theme.border} ${theme.bg} ${
                      isSelected ? theme.glow : ''
                    } transition-all duration-150 cursor-pointer pointer-events-auto`}
                  >
                    {/* Corner Crosshair brackets */}
                    <div className={`absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 ${theme.corner}`}></div>
                    <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 ${theme.corner}`}></div>
                    <div className={`absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 ${theme.corner}`}></div>
                    <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 ${theme.corner}`}></div>

                    {/* Tag pill with label and confidence */}
                    <div
                      className={`absolute -top-6 left-0 ${theme.tagBg} text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap z-10`}
                    >
                      {target.label.toUpperCase()} ({confPercent}%)
                    </div>
                  </div>
                );
              })}

            {/* Watermark / scan overlay bar */}
            <div className="absolute bottom-2 left-2 bg-black/80 text-white/90 font-mono text-[10px] px-2 py-1 rounded border border-white/10 flex items-center gap-2 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>SSS ACOUSTIC SCAN: {result.analysisId}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>
              {result.detected
                ? `Targets localizing highlight & acoustic shadow: ${targets.length} marked`
                : 'Continuous seabed return inspected. No anomaly boundary detected.'}
            </span>
            {targets.length > 1 && (
              <span className="font-mono text-slate-400 text-[10px]">
                Click any box to inspect coordinates
              </span>
            )}
          </div>

          {/* If multiple targets exist, show target selection list */}
          {targets.length > 1 && (
            <div className="mt-2 p-2.5 bg-slate-50 rounded border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Marked Targets ({targets.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {targets.map((t, idx) => {
                  const isSelected = selectedTargetId === t.id;
                  const theme = getTargetColorTheme(t.label, t.severity);
                  return (
                    <button
                      key={t.id || idx}
                      type="button"
                      onClick={() => setSelectedTargetId(isSelected ? null : t.id || null)}
                      className={`p-2 rounded text-left border text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50 text-sky-950 font-semibold'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Target className={`w-3.5 h-3.5 shrink-0 ${theme.text}`} />
                        <span className="truncate">{t.label}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-1">
                        {Math.round(t.confidence * 100)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Structured Detection Findings Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4 bg-slate-50 p-5 rounded-md border border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              PRIMARY CLASSIFICATION
            </span>
            <div className="text-base font-bold text-slate-900 flex items-center gap-2">
              {result.detected ? (
                isHumanOrDiver ? (
                  <LifeBuoy className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                )
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              <span className={isHumanOrDiver ? 'text-rose-950' : 'text-slate-900'}>
                {result.objectType}
              </span>
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
                Acoustic Clarity Model
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                SEVERITY
              </span>
              <div className="pt-0.5">{getSeverityBadge(result.severity)}</div>
            </div>
          </div>

          {result.boundingBox && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                NORMALIZED BOUNDING COORDINATES
              </span>
              <div className="grid grid-cols-4 gap-1 font-mono text-center text-xs bg-white p-2 rounded border border-slate-200 text-slate-700">
                <div>
                  <span className="text-[9px] text-slate-400 block">YMIN</span>
                  <span>{result.boundingBox.ymin}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">XMIN</span>
                  <span>{result.boundingBox.xmin}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">YMAX</span>
                  <span>{result.boundingBox.ymax}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">XMAX</span>
                  <span>{result.boundingBox.xmax}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              MORPHOLOGICAL DESCRIPTION
            </span>
            <p className="text-xs text-slate-800 leading-relaxed font-normal">
              {result.description}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              ACOUSTIC SHADOW & WHY FLAGGED
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

      {/* Scientific Disclaimer */}
      <div className="mt-5 p-3 bg-amber-50/80 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-normal">
          <span className="font-bold">Scientific & Operational Notice:</span> SONARX is a prototype for AI-assisted
          sonar screening and Search and Recovery support. All acoustic classifications and bounding markers require field human verification before maritime or emergency operations.
        </p>
      </div>
    </div>
  );
};

