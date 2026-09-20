// Dynamic deferred worker loader so Tesseract.js (~4MB+) is never downloaded until user uploads an image
async function getTesseractWorker() {
  const { createWorker } = await import('tesseract.js');
  return createWorker('eng');
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src === src) {
        return resolve();
      }
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

/**
 * Extracts raw text from an image or PDF file using client-side Tesseract.js / PDF.js
 * Adapted from PD_SPACE/src/utils/ocr.ts
 */
export async function extractTextFromDocument(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 1. PDF Handling
  if (file.type === 'application/pdf') {
    if (onProgress) onProgress(0.1);
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');

      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error('PDF.js failed to load.');
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      if (onProgress) onProgress(0.2);

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      if (onProgress) onProgress(0.3);

      let fullText = '';
      const numPages = pdf.numPages;
      let hasSelectableText = false;

      // Extract text content from each page
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        if (pageText.trim().length > 0) {
          hasSelectableText = true;
        }
        fullText += pageText + '\n';
      }

      // If text exists directly in PDF, return it immediately
      if (hasSelectableText && fullText.trim().length > 30) {
        if (onProgress) onProgress(1.0);
        return fullText.trim();
      }

      // Fallback for scanned PDF: render canvas & run Tesseract OCR
      if (onProgress) onProgress(0.4);
      const worker = await getTesseractWorker();
      let ocrText = '';

      for (let i = 1; i <= numPages; i++) {
        if (onProgress) {
          onProgress(0.4 + (i / numPages) * 0.5);
        }

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const {
          data: { text },
        } = await worker.recognize(dataUrl);
        ocrText += text + '\n';
      }

      await worker.terminate();
      if (onProgress) onProgress(1.0);

      return ocrText.trim() || 'No legible text could be extracted from this PDF.';
    } catch (error) {
      console.error('Failed to parse PDF document:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to extract text from PDF');
    }
  }

  // 2. Image Handling (JPEG, PNG, WebP) via Tesseract.js Worker
  if (onProgress) onProgress(0.2);
  const worker = await getTesseractWorker();

  try {
    if (onProgress) onProgress(0.4);
    const {
      data: { text },
    } = await worker.recognize(file);

    if (onProgress) onProgress(1.0);
    await worker.terminate();
    return text || 'No text recognized in this image.';
  } catch (error) {
    try {
      await worker.terminate();
    } catch (_) {}
    console.error('Tesseract OCR error:', error);
    throw error;
  }
}

/**
 * Format bytes to readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Renders the first page of a PDF as a lightweight compact JPEG data URL (< 200KB)
 * for AI vision analysis while avoiding 413 payload limits.
 */
export async function getPdfFirstPagePreview(file: File): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) return null;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const initialViewport = page.getViewport({ scale: 1.0 });

    const maxDim = 1200;
    const scale = Math.min(1.0, maxDim / Math.max(initialViewport.width, initialViewport.height));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) return null;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (err) {
    console.warn('Could not generate PDF first page preview:', err);
    return null;
  }
}

/**
 * Downscale and compress large user images (>2MB) to prevent 413 Payload Too Large errors
 * while retaining high clinical legibility.
 */
export async function compressImageForUpload(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return resolve('');

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

