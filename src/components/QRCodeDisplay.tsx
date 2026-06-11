'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
  style?: React.CSSProperties;
}

/**
 * Dynamic QR code component that generates QR images client-side.
 * No Base64 stored in the database - rendered on demand.
 */
export function QRCodeDisplay({ value, size = 200, label, style }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Safety: if old Base64 data URL is passed, ignore it and show nothing
  const isBase64 = value?.startsWith('data:');
  const safeValue = isBase64 ? '' : value;

  useEffect(() => {
    if (!safeValue || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, safeValue, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
  }, [safeValue, size]);

  if (!safeValue) {
    return <div style={{ padding: 40, color: '#999', textAlign: 'center' }}>{isBase64 ? 'Legacy QR — run migration' : 'No QR code'}</div>;
  }

  return (
    <div style={{ textAlign: 'center', ...style }}>
      <canvas ref={canvasRef} style={{ borderRadius: 8, border: '1px solid #f0f0f0', padding: 8 }} />
      {label && <div style={{ marginTop: 8, fontWeight: 600, fontFamily: 'monospace' }}>{label}</div>}
    </div>
  );
}

/**
 * Generate a QR code data URL for download/print purposes.
 */
export async function generateQRDataURL(value: string, size = 400): Promise<string> {
  return QRCode.toDataURL(value, {
    width: size,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Download a QR code as a PNG image.
 */
export async function downloadQRCode(code: string, filename?: string): Promise<void> {
  const dataUrl = await generateQRDataURL(code, 400);

  // Create canvas with code label below
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve) => { img.onload = resolve; });

  const padding = 20;
  const textHeight = 40;
  const canvasWidth = img.width + padding * 2;
  const canvasHeight = img.height + padding * 2 + textHeight;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw QR image
  ctx.drawImage(img, padding, padding);

  // Draw code text below
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(code, canvasWidth / 2, img.height + padding + textHeight - 10);

  // Trigger download
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename || `${code}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download multiple QR codes as individual PNG files.
 */
export async function downloadMultipleQRCodes(codes: string[]): Promise<void> {
  for (const code of codes) {
    await downloadQRCode(code);
    // Small delay between downloads to avoid browser blocking
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Open a print window with QR code(s).
 */
export async function printQRCodes(items: { code: string; label?: string }[]): Promise<void> {
  const images = await Promise.all(
    items.map(async (item) => {
      const dataUrl = await generateQRDataURL(item.code, 300);
      return { ...item, dataUrl };
    })
  );

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>QR Codes</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          .qr-item { display: inline-block; margin: 20px; text-align: center; page-break-inside: avoid; }
          .qr-item img { width: 200px; height: 200px; }
          .qr-item .code { font-size: 16px; font-weight: bold; font-family: monospace; margin-top: 8px; }
          .qr-item .label { font-size: 14px; color: #666; margin-top: 4px; }
          @media print { body { padding: 0; } .qr-item { margin: 10px; } }
        </style>
      </head>
      <body>
        ${images.map((item) => `
          <div class="qr-item">
            <img src="${item.dataUrl}" />
            <div class="code">${item.code}</div>
            ${item.label ? `<div class="label">${item.label}</div>` : ''}
          </div>
        `).join('')}
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}
