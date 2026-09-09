import { jsPDF } from 'jspdf';
import { SonarAnalysisResult, SurveyLocation } from '../types';

/**
 * Creates an annotated image data URL with the detection bounding box drawn on canvas
 */
async function createAnnotatedImageDataUrl(
  imageSrc: string,
  result: SonarAnalysisResult
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      // Draw original sonar image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // If detection with bounding box exists, draw overlay
      if (result.detected && result.boundingBox) {
        const { ymin, xmin, ymax, xmax } = result.boundingBox;
        const boxX = (xmin / 1000) * canvas.width;
        const boxY = (ymin / 1000) * canvas.height;
        const boxW = ((xmax - xmin) / 1000) * canvas.width;
        const boxH = ((ymax - ymin) / 1000) * canvas.height;

        // Bounding box border
        ctx.lineWidth = Math.max(3, Math.round(canvas.width / 350));
        ctx.strokeStyle = '#ef4444'; // bright red
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Highlight wash inside bounding box
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Crosshairs on corners
        const cornerLen = Math.min(boxW, boxH) * 0.2;
        ctx.lineWidth = Math.max(4, Math.round(canvas.width / 280));
        ctx.strokeStyle = '#ffffff';

        // Top-left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + cornerLen);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + cornerLen, boxY);
        ctx.stroke();

        // Label banner
        const labelText = `${result.objectType.toUpperCase()} [${Math.round(result.confidence * 100)}%]`;
        ctx.font = `bold ${Math.max(14, Math.round(canvas.width / 50))}px monospace`;
        const textMetrics = ctx.measureText(labelText);
        const padding = 6;
        const textH = Math.max(16, Math.round(canvas.width / 45));

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(boxX, Math.max(0, boxY - textH - padding * 2), textMetrics.width + padding * 2, textH + padding * 2);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, boxX + padding, Math.max(textH, boxY - padding));
      }

      try {
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

export async function generatePdfReport(
  result: SonarAnalysisResult,
  location: SurveyLocation | null,
  imageSrc: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900 / navy
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SONARX', margin + 6, y + 9);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('AI-POWERED UNDERWATER MARINE DEBRIS & ANOMALY DETECTION', margin + 6, y + 15);
  doc.text('Ministry of Earth Sciences / NIOT • PS ID: SIH26057', margin + 6, y + 19);

  // Status Badge on Top Right
  if (result.isDemo) {
    doc.setFillColor(245, 158, 11); // amber
    doc.rect(pageWidth - margin - 28, y + 5, 24, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DEMO MODE', pageWidth - margin - 26, y + 9.5);
  } else {
    doc.setFillColor(16, 185, 129); // emerald
    doc.rect(pageWidth - margin - 32, y + 5, 28, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('AI PROCESSED', pageWidth - margin - 30, y + 9.5);
  }

  y += 28;

  // Section 1: Analysis Information
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. SURVEY & ANALYSIS METADATA', margin, y);
  y += 3;

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const col1 = margin + 2;
  const col2 = margin + 55;
  const col3 = margin + 110;

  doc.text(`Analysis ID:`, col1, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(result.analysisId, col1 + 22, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Date / Time:`, col2, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(result.timestamp, col2 + 20, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`File Name:`, col1, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(result.fileName, col1 + 22, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Image Res:`, col2, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${result.dimensions.width} × ${result.dimensions.height} px (${result.fileSizeFormatted})`, col2 + 20, y);

  y += 9;

  // Section 2: Detection Result
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. ACOUSTIC ANOMALY DETECTION RESULT', margin, y);
  y += 3;
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  // Results box
  const resultBoxHeight = 36;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, resultBoxHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, resultBoxHeight, 2, 2, 'D');

  const boxY = y + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CLASSIFICATION:', margin + 4, boxY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(result.objectType, margin + 35, boxY);

  // Confidence & Severity pills
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AI ESTIMATED CONFIDENCE:', margin + 105, boxY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text(`${Math.round(result.confidence * 100)}%`, margin + 155, boxY);

  // Severity pill
  let sevBg = [239, 68, 68]; // red
  if (result.severity === 'MEDIUM') sevBg = [245, 158, 11];
  if (result.severity === 'LOW') sevBg = [16, 185, 129];
  doc.setFillColor(sevBg[0], sevBg[1], sevBg[2]);
  doc.roundedRect(margin + contentWidth - 28, boxY - 3.5, 22, 5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`SEV: ${result.severity}`, margin + contentWidth - 25, boxY);

  // Description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Description:', margin + 4, boxY + 7);
  doc.setTextColor(15, 23, 42);
  const descLines = doc.splitTextToSize(result.description, contentWidth - 32);
  doc.text(descLines, margin + 28, boxY + 7);

  // Anomaly Reason
  const reasonY = boxY + 14;
  doc.setTextColor(100, 116, 139);
  doc.text('Why Flagged:', margin + 4, reasonY);
  doc.setTextColor(15, 23, 42);
  const reasonLines = doc.splitTextToSize(result.anomalyReason, contentWidth - 32);
  doc.text(reasonLines, margin + 28, reasonY);

  // Recommendation
  const recY = boxY + 22;
  doc.setTextColor(100, 116, 139);
  doc.text('Operational Action:', margin + 4, recY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // red-700
  const recLines = doc.splitTextToSize(result.recommendation, contentWidth - 35);
  doc.text(recLines, margin + 35, recY);

  y += resultBoxHeight + 8;

  // Section 3: Geographic Location
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. GEOGRAPHIC SURVEY POSITION', margin, y);
  y += 3;
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  if (location) {
    doc.text('Latitude:', col1, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${location.latitude.toFixed(6)}° N`, col1 + 18, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Longitude:', col2, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${location.longitude.toFixed(6)}° E`, col2 + 20, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Coordinate Source:', col3, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(location.source === 'Demo Survey Coordinates' ? 180 : 15, 83, 9);
    doc.text(location.source, col3 + 30, y);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('No survey coordinates assigned for this sonar record.', col1, y);
  }

  y += 9;

  // Section 4: Sonar Image Display
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. SIDE-SCAN SONAR IMAGERY (WITH ANOMALY ANNOTATION)', margin, y);
  y += 3;
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  try {
    const annotatedDataUrl = await createAnnotatedImageDataUrl(imageSrc, result);
    const imgHeight = 85; // mm
    doc.addImage(annotatedDataUrl, 'JPEG', margin, y, contentWidth, imgHeight);
    y += imgHeight + 4;
  } catch (err) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('[Sonar visual preview could not be loaded into PDF rendering canvas]', margin, y + 10);
    y += 20;
  }

  // Footer Disclaimer (Scientific & Operational Disclaimer)
  y = 275;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 12, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('OPERATIONAL VERIFICATION & SCIENTIFIC NOTICE:', margin + 3, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'SONARX is a prototype for AI-assisted sonar screening. Results are not scientifically calibrated and require human verification before operational decisions.',
    margin + 3,
    y + 8.5
  );

  doc.save(`SONARX_Survey_Report_${result.analysisId}.pdf`);
}
