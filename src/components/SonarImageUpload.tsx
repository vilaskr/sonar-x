import React, { useRef, useState, useEffect } from 'react';
import { SonarImageMeta } from '../types';
import { UploadCloud, Image as ImageIcon, Sparkles, FileText, CheckCircle2, Waves, Gauge } from 'lucide-react';

interface SonarImageUploadProps {
  imageMeta: SonarImageMeta | null;
  imageBase64: string | null;
  onImageSelected: (meta: SonarImageMeta, base64: string) => void;
  onAnalyzeClick: () => void;
  isAnalyzing: boolean;
  onUseDemoClick: () => void;
  isDemoActive: boolean;
}

// Client-side image optimizer to ensure fast network payload while maintaining acoustic edge precision
const optimizeSonarImage = (
  img: HTMLImageElement,
  maxDimension = 1280
): { optimizedBase64: string; width: number; height: number; approxBytes: number } => {
  let { naturalWidth: width, naturalHeight: height } = img;

  if (width > height) {
    if (width > maxDimension) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    }
  } else {
    if (height > maxDimension) {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.9);
    const approxBytes = Math.round((optimizedBase64.length * 3) / 4);
    return { optimizedBase64, width, height, approxBytes };
  }

  return {
    optimizedBase64: img.src,
    width: img.naturalWidth,
    height: img.naturalHeight,
    approxBytes: Math.round((img.src.length * 3) / 4),
  };
};

export const SonarImageUpload: React.FC<SonarImageUploadProps> = ({
  imageMeta,
  imageBase64,
  onImageSelected,
  onAnalyzeClick,
  isAnalyzing,
  onUseDemoClick,
  isDemoActive,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Active analysis timer and progress steps for immediate responsive user feedback
  useEffect(() => {
    let timerInterval: any;
    if (isAnalyzing) {
      setElapsedSeconds(0);
      setProgressStage(1);

      const startTime = Date.now();
      timerInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setElapsedSeconds(Math.round(elapsed * 10) / 10);
        if (elapsed > 2.4) {
          setProgressStage(3);
        } else if (elapsed > 1.1) {
          setProgressStage(2);
        } else {
          setProgressStage(1);
        }
      }, 100);
    } else {
      setElapsedSeconds(0);
      setProgressStage(1);
    }
    return () => clearInterval(timerInterval);
  }, [isAnalyzing]);

  const processFile = (file: File) => {
    setUploadError(null);

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError('Please upload a JPG, JPEG or PNG sonar image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawBase64 = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Automatically optimize image resolution to guarantee fast upload and high multimodal precision
        const { optimizedBase64, width, height, approxBytes } = optimizeSonarImage(img, 1280);
        const sizeInKb = Math.round(approxBytes / 1024);
        const formattedSize = sizeInKb >= 1024 ? `${(sizeInKb / 1024).toFixed(2)} MB` : `${sizeInKb} KB`;

        onImageSelected(
          {
            fileName: file.name,
            fileSizeFormatted: formattedSize,
            width,
            height,
            previewUrl: optimizedBase64,
            mimeType: 'image/jpeg',
          },
          optimizedBase64
        );
      };
      img.src = rawBase64;
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div id="upload-sonar-section" className="border border-slate-200 bg-white rounded-lg p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>1. UPLOAD SIDE-SCAN SONAR IMAGE</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload a sonar image for AI-assisted debris and anomaly detection.
          </p>
        </div>

        {/* Demo Image Quick Action Button */}
        <button
          id="use-demo-image-btn"
          type="button"
          onClick={onUseDemoClick}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded cursor-pointer transition-colors shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Use Demo Image</span>
        </button>
      </div>

      {uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs font-medium text-red-700">
          {uploadError}
        </div>
      )}

      {/* Upload Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-4 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-sky-500 bg-sky-50/60'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div className="mt-1">
            <p className="text-sm font-semibold text-slate-800">
              Drag & Drop your Side-Scan Sonar waterfall image here
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Supports JPG, JPEG, and PNG acoustic frames</p>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="px-4 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded shadow-2xs hover:bg-slate-50"
            >
              Choose Image
            </button>
            <span className="text-[11px] text-slate-400 font-mono">Optimized for fast AI inspection</span>
          </div>
        </div>
      </div>

      {/* Image Preview & Metadata Panel */}
      {imageMeta && (
        <div className="mt-6 border border-slate-200 rounded-lg p-4 bg-slate-50">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Active Sonar Frame Loaded
              </span>
              {isDemoActive && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded">
                  Prototype Sample Image
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 font-mono">{imageMeta.fileName}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Thumbnail with active scan effect */}
            <div className="md:col-span-1 border border-slate-300 rounded overflow-hidden bg-black aspect-video flex items-center justify-center relative group">
              <img
                src={imageMeta.previewUrl}
                alt="Uploaded Sonar Scan"
                className="w-full h-full object-contain"
              />

              {/* Scanning beam overlay during active analysis */}
              {isAnalyzing && (
                <div className="absolute inset-0 pointer-events-none bg-sky-500/10 overflow-hidden">
                  <div className="w-full h-1 bg-sky-400 shadow-[0_0_8px_#38bdf8] animate-pulse"></div>
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-sky-300 border border-sky-500/40">
                    <Waves className="w-3 h-3 animate-spin" />
                    <span>ACOUSTIC SCAN {elapsedSeconds.toFixed(1)}s</span>
                  </div>
                </div>
              )}

              <div className="absolute bottom-1 right-1 text-[10px] bg-black/75 text-white px-1.5 py-0.5 rounded font-mono">
                {imageMeta.width} × {imageMeta.height}
              </div>
            </div>

            {/* Metadata Badges */}
            <div className="md:col-span-2 flex flex-col justify-between h-full py-1">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">File Name</span>
                  <span className="text-xs font-mono font-medium text-slate-800 truncate block">
                    {imageMeta.fileName}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Dimensions</span>
                  <span className="text-xs font-mono font-medium text-slate-800 block">
                    {imageMeta.width} × {imageMeta.height} px
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Optimized Size</span>
                  <span className="text-xs font-mono font-medium text-slate-800 block">
                    {imageMeta.fileSizeFormatted}
                  </span>
                </div>
              </div>

              {/* Analysis Status & Trigger Button */}
              <div className="mt-4 flex flex-col gap-2">
                {isAnalyzing ? (
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-md">
                    <div className="flex items-center justify-between text-xs font-bold text-sky-900 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Waves className="w-4 h-4 text-sky-600 animate-pulse" />
                        {progressStage === 1 && 'Ingesting acoustic telemetry & normalizing backscatter...'}
                        {progressStage === 2 && 'Scanning backscatter highlights & shadow relief...'}
                        {progressStage === 3 && 'Classifying target morphology & bounding coordinates...'}
                      </span>
                      <span className="font-mono text-sky-700">{elapsedSeconds.toFixed(1)}s</span>
                    </div>

                    <div className="w-full bg-sky-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-600 h-full transition-all duration-300 ease-out"
                        style={{
                          width:
                            progressStage === 1 ? '35%' : progressStage === 2 ? '70%' : '92%',
                        }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <button
                    id="analyze-with-gemini-btn"
                    type="button"
                    onClick={onAnalyzeClick}
                    disabled={isAnalyzing}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer bg-sky-700 hover:bg-sky-800 shadow-xs active:scale-[0.99]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Analyze with Gemini AI</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
