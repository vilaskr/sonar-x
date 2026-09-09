import React, { useRef, useState } from 'react';
import { SonarImageMeta } from '../types';
import { UploadCloud, Image as ImageIcon, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

interface SonarImageUploadProps {
  imageMeta: SonarImageMeta | null;
  imageBase64: string | null;
  onImageSelected: (meta: SonarImageMeta, base64: string) => void;
  onAnalyzeClick: () => void;
  isAnalyzing: boolean;
  onUseDemoClick: () => void;
  isDemoActive: boolean;
}

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

  const processFile = (file: File) => {
    setUploadError(null);

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError('Please upload a JPG, JPEG or PNG sonar image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const sizeInKb = Math.round(file.size / 1024);
        const formattedSize = sizeInKb >= 1024 ? `${(sizeInKb / 1024).toFixed(2)} MB` : `${sizeInKb} KB`;

        onImageSelected(
          {
            fileName: file.name,
            fileSizeFormatted: formattedSize,
            width: img.naturalWidth,
            height: img.naturalHeight,
            previewUrl: base64,
            mimeType: file.type,
          },
          base64
        );
      };
      img.src = base64;
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
        className={`mt-5 border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          dragOver ? 'border-sky-500 bg-sky-50/50' : 'border-slate-300 bg-slate-50 hover:bg-slate-50/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>

          <p className="text-sm font-semibold text-slate-800">
            Drag and drop sonar imagery here, or click to browse
          </p>
          <p className="text-xs text-slate-500 mt-1">Supports standard side-scan sonar formats (JPG, JPEG, PNG)</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              id="choose-image-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              Choose Image
            </button>
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
            {/* Thumbnail */}
            <div className="md:col-span-1 border border-slate-300 rounded overflow-hidden bg-black aspect-video flex items-center justify-center relative group">
              <img
                src={imageMeta.previewUrl}
                alt="Uploaded Sonar Scan"
                className="w-full h-full object-contain"
              />
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
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">File Size</span>
                  <span className="text-xs font-mono font-medium text-slate-800 block">
                    {imageMeta.fileSizeFormatted}
                  </span>
                </div>
              </div>

              {/* Analyze Button */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  id="analyze-with-gemini-btn"
                  type="button"
                  onClick={onAnalyzeClick}
                  disabled={isAnalyzing}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer ${
                    isAnalyzing
                      ? 'bg-sky-400 cursor-not-allowed'
                      : 'bg-sky-700 hover:bg-sky-800 shadow-xs'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'Analyzing with Gemini AI...' : 'Analyze with Gemini AI'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
