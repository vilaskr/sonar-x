import React, { useState } from 'react';
import { SonarAnalysisResult, SurveyLocation } from '../types';
import { generatePdfReport } from '../services/pdfReportGenerator';
import { FileDown, FileCheck2, Loader2, FileText, CheckCircle } from 'lucide-react';

interface ReportSectionProps {
  analysisResult: SonarAnalysisResult;
  location: SurveyLocation | null;
  imageSrc: string;
}

export const ReportSection: React.FC<ReportSectionProps> = ({
  analysisResult,
  location,
  imageSrc,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    setDownloadSuccess(false);
    try {
      await generatePdfReport(analysisResult, location, imageSrc);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Unable to generate PDF report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="generate-report-section" className="border border-slate-200 bg-white rounded-lg p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">5. GENERATE REPORT</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Export standardized acoustic survey report with bounding box and survey location.
          </p>
        </div>

        <button
          id="generate-pdf-report-btn"
          type="button"
          onClick={handleDownload}
          disabled={isGenerating}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer ${
            isGenerating
              ? 'bg-slate-500 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-slate-800 shadow-xs'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating PDF Report...</span>
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4 text-sky-400" />
              <span>Generate PDF Report</span>
            </>
          )}
        </button>
      </div>

      {downloadSuccess && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Technical Survey PDF generated and downloaded successfully.</span>
        </div>
      )}

      {/* Report Summary Preview Card */}
      <div className="mt-5 bg-slate-50 rounded-lg border border-slate-200 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 text-xs font-mono text-slate-600">
          <span>DOCUMENT: SONARX TECHNICAL SURVEY REPORT</span>
          <span>FORMAT: STANDARD ISO A4 (PDF)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-3 rounded border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ANALYSIS ID</span>
            <span className="font-mono font-bold text-slate-900">{analysisResult.analysisId}</span>
            <span className="text-[10px] text-slate-500 block mt-1">{analysisResult.timestamp}</span>
          </div>

          <div className="bg-white p-3 rounded border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">FINDING & CONFIDENCE</span>
            <span className="font-bold text-slate-900 truncate block">{analysisResult.objectType}</span>
            <span className="text-[10px] text-sky-800 font-semibold block mt-1">
              AI Estimated Confidence: {Math.round(analysisResult.confidence * 100)}%
            </span>
          </div>

          <div className="bg-white p-3 rounded border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">SURVEY POSITION</span>
            {location ? (
              <>
                <span className="font-mono font-semibold text-slate-900 block">
                  {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
                </span>
                <span className="text-[10px] text-slate-500 block mt-1 font-medium">{location.source}</span>
              </>
            ) : (
              <span className="text-slate-400 italic">No coordinates assigned</span>
            )}
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          The generated PDF report compiles acoustic telemetry, the bounding box localized visual frame,
          severity classification, and verification notices for survey vessel records.
        </p>
      </div>
    </div>
  );
};
