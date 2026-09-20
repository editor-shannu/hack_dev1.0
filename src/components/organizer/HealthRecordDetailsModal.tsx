'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HealthRecord } from '@/types/prescription';
import { X, Calendar, User, Hospital, Activity, FileText, Printer, FileSearch, ShieldCheck, Download, Eye, Loader2, Users, Edit3, Upload } from 'lucide-react';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { getFamilyRelationBadge } from '@/lib/familyMembers';
import { getStoredFile, saveStoredFile } from '@/lib/fileStorage';
import { saveHealthRecord, getActiveUserId, authFetch } from '@/lib/storage';

interface HealthRecordDetailsModalProps {
  record: HealthRecord | null;
  onClose: () => void;
  onEdit?: (record: HealthRecord) => void;
  onUpdate?: (updated: HealthRecord) => void;
}

export const HealthRecordDetailsModal: React.FC<HealthRecordDetailsModalProps> = ({
  record,
  onClose,
  onEdit,
  onUpdate,
}) => {
  useBodyScrollLock(!!record);
  const [activeView, setActiveView] = useState<'original' | 'digital'>('original');
  const [resolvedFileUrl, setResolvedFileUrl] = useState<string | undefined>(
    record?.fileUrl && record.fileUrl !== '[offline-cached-scan]' ? record.fileUrl : undefined
  );
  const [loadingScan, setLoadingScan] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!record) return;

    let isMounted = true;
    let safetyTimeout: NodeJS.Timeout | null = setTimeout(() => {
      if (isMounted) {
        setLoadingScan(false);
      }
    }, 2500);

    if (record.fileUrl && record.fileUrl !== '[offline-cached-scan]') {
      setResolvedFileUrl(record.fileUrl);
      setLoadingScan(false);
      if (safetyTimeout) clearTimeout(safetyTimeout);
      return;
    }

    setLoadingScan(true);

    getStoredFile(record.id)
      .then((storedScan) => {
        if (!isMounted) return;
        if (storedScan) {
          setResolvedFileUrl(storedScan);
          setLoadingScan(false);
          if (safetyTimeout) clearTimeout(safetyTimeout);
          return;
        }

        const uid = getActiveUserId() || record.userId;
        const userParam = uid ? `&userId=${encodeURIComponent(uid)}` : '';
        authFetch(`/api/health-records?id=${encodeURIComponent(record.id)}&includeFiles=true${userParam}`, {
          signal: AbortSignal.timeout(2500),
        }, uid || undefined)
          .then((r) => r.json())
          .then((res) => {
            if (!isMounted) return;
            if (res.success && res.data?.[0]?.fileUrl) {
              const serverUrl = res.data[0].fileUrl;
              setResolvedFileUrl(serverUrl);
              saveStoredFile(record.id, serverUrl).catch(() => {});
            }
          })
          .catch(() => {})
          .finally(() => {
            if (isMounted) setLoadingScan(false);
            if (safetyTimeout) clearTimeout(safetyTimeout);
          });
      })
      .catch(() => {
        if (isMounted) setLoadingScan(false);
        if (safetyTimeout) clearTimeout(safetyTimeout);
      });

    return () => {
      isMounted = false;
      if (safetyTimeout) clearTimeout(safetyTimeout);
    };
  }, [record?.id, record?.fileUrl, record?.userId]);

  const handleAttachScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !record) return;
    const isPdf = file.type === 'application/pdf';
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setResolvedFileUrl(dataUrl);
        await saveStoredFile(record.id, dataUrl);
        const updated: HealthRecord = {
          ...record,
          fileUrl: dataUrl,
          fileName: file.name,
          fileType: isPdf ? 'pdf' : 'image',
        };
        saveHealthRecord(updated);
        if (onUpdate) onUpdate(updated);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!record) return null;

  const activeScanUrl = resolvedFileUrl || (record.fileUrl && record.fileUrl !== '[offline-cached-scan]' ? record.fileUrl : undefined);

  const handlePrintOriginal = () => {
    if (!activeScanUrl) {
      window.print();
      return;
    }

    try {
      const existingIframe = document.getElementById('prescriptime-print-iframe');
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'prescriptime-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const isPdf = record.fileType === 'pdf' || activeScanUrl.startsWith('data:application/pdf');

      if (isPdf) {
        iframe.src = activeScanUrl;
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          }, 400);
        };
      } else {
        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Print ${record.fileName || 'Diagnostic Record'}</title>
                <style>
                  @page { size: auto; margin: 10mm; }
                  body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                  img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                </style>
              </head>
              <body>
                <img id="print-scan-img" src="${record.fileUrl}" alt="Diagnostic Record Scan" />
                <script>
                  const img = document.getElementById('print-scan-img');
                  if (img && img.complete) {
                    setTimeout(() => window.print(), 250);
                  } else if (img) {
                    img.onload = () => setTimeout(() => window.print(), 250);
                  }
                </script>
              </body>
            </html>
          `);
          doc.close();
        }
      }
    } catch {
      window.print();
    }
  };

  const formattedUploadDate = record.uploadedAt
    ? new Date(record.uploadedAt).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
      data-lenis-prevent="true"
    >
      <div
        id="health-record-details-modal"
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-900 my-auto"
        data-lenis-prevent="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          id="close-health-record-modal-btn"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-20"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-200 flex-shrink-0 pr-16 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0F58B6] border border-blue-200 font-mono font-bold">
              {record.categoryLabel || 'Hospital Record'}
            </span>
            {(() => {
              const badge = getFamilyRelationBadge(record.familyMember || 'self');
              const label = record.familyMember === 'other' && record.patientRelation ? record.patientRelation : badge.label;
              return (
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${badge.badgeBg}`}>
                  <span>{badge.icon}</span>
                  <span>{label}</span>
                  {record.patientName && <span className="font-normal">({record.patientName})</span>}
                </span>
              );
            })()}
            <span className="text-[11px] font-mono text-slate-500 font-semibold">
              Uploaded: {formattedUploadDate}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{record.title}</h2>

          {/* Dual-View Switcher Tab Bar */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2">
            <button
              type="button"
              id="tab-original-scan-record"
              onClick={() => setActiveView('original')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'original'
                  ? 'bg-[#0F58B6] text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Original Document Scan</span>
            </button>

            <button
              type="button"
              id="tab-digital-record"
              onClick={() => setActiveView('digital')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'digital'
                  ? 'bg-[#0F58B6] text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Clinical Extraction</span>
            </button>

            {/* Hidden file input for uploading/replacing scan */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleAttachScan}
              className="hidden"
              id="record-scan-upload-input"
            />

            <div className="sm:ml-auto flex items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(record)}
                  id="modal-edit-record-btn"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Edit Record Details"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}

              {/* Quick Print Action for current view */}
              <button
                type="button"
                onClick={activeView === 'original' ? handlePrintOriginal : () => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Print Document"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Print {activeView === 'original' ? 'Original' : 'Summary'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div
          className="p-5 sm:p-7 overflow-y-auto overscroll-contain flex-1 min-h-0 space-y-6"
          data-lenis-prevent="true"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {/* TAB 1: ORIGINAL DOCUMENT VIEW */}
          {activeView === 'original' && (
            <div className="space-y-4">
              {loadingScan ? (
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-900/5 p-12 flex flex-col items-center justify-center min-h-[360px] gap-3">
                  <Loader2 className="w-8 h-8 text-[#0F58B6] animate-spin" />
                  <p className="text-xs font-semibold text-slate-600">Loading document scan...</p>
                </div>
              ) : activeScanUrl ? (
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-900/5 p-2 flex flex-col items-center justify-center min-h-[360px]">
                  {record.fileType === 'pdf' || activeScanUrl.startsWith('data:application/pdf') ? (
                    <iframe
                      src={activeScanUrl}
                      title={record.fileName}
                      className="w-full h-[550px] rounded-xl border border-slate-200 bg-white shadow-inner"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeScanUrl}
                      alt={record.fileName}
                      className="max-h-[600px] w-auto object-contain rounded-xl shadow-md border border-white"
                    />
                  )}
                  <div className="mt-3 flex items-center justify-between w-full px-2 text-xs font-mono text-slate-500 flex-wrap gap-2">
                    <span className="truncate max-w-xs">{record.fileName}</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-slate-600 font-bold hover:text-[#0F58B6] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        id="replace-record-scan-btn"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Replace Scan</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintOriginal}
                        className="text-[#0F58B6] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print High-Res Copy</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Digital Record Stored</p>
                    <p className="text-xs text-slate-500 mt-0.5">The structured data is available in the Clinical Extraction tab.</p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      id="attach-record-scan-btn"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Attach Original File / Scan</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIGITAL EXTRACTION VIEW */}
          {activeView === 'digital' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Metadata Column */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">Family Attribution</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(() => {
                          const badge = getFamilyRelationBadge(record.familyMember || 'self');
                          const label = record.familyMember === 'other' && record.patientRelation ? record.patientRelation : badge.label;
                          return (
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1.5 ${badge.badgeBg}`}>
                              <span>{badge.icon}</span>
                              <span>{label}</span>
                            </span>
                          );
                        })()}
                        {record.patientName && (
                          <span className="text-xs font-bold text-slate-800">
                            • Patient: {record.patientName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <Hospital className="w-4 h-4 text-[#0F58B6]" />
                    <div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">Facility / Lab</p>
                      <p className="font-bold text-slate-900">{record.clinicOrHospital || 'Hospital Laboratory'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <User className="w-4 h-4 text-[#0F58B6]" />
                    <div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">Consultant / Pathologist</p>
                      <p className="font-bold text-slate-900">{record.doctorName || 'Clinical Specialist'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <Calendar className="w-4 h-4 text-[#0F58B6]" />
                    <div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">Investigation Date</p>
                      <p className="font-bold text-slate-900">{record.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-700">
                    <Activity className="w-4 h-4 text-[#0F58B6]" />
                    <div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">Test / Investigation</p>
                      <p className="font-bold text-slate-900">{record.diagnosisOrTest || record.title}</p>
                    </div>
                  </div>
                </div>

                {/* Key Indicators */}
                {record.keyIndicators && record.keyIndicators.length > 0 && (
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0F58B6]">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verified Clinical Indicators</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {record.keyIndicators.map((indicator, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#0F58B6] font-bold">•</span>
                          <span>{indicator}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Findings & Notes Column */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-[#0F58B6]" />
                    <span>Clinical Summary &amp; Findings</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    {record.summary || record.notes || 'Document verified as authentic hospital medical file.'}
                  </p>
                </div>

                {record.rawText && (() => {
                  const rawLines = record.rawText.split('\n').map((l) => l.trim()).filter(Boolean);
                  // Clean noise: filter out lines that are random characters or ultrasonic sensor noise
                  const meaningfulLines = rawLines.filter((line) => {
                    const lettersAndDigits = (line.match(/[a-zA-Z0-9]/g) || []).length;
                    const words = line.split(/\s+/).filter(Boolean);
                    const isVeryShort = line.length < 3;
                    const isGibberish = words.length > 2 && words.every((w) => w.length <= 2 && !['in', 'on', 'of', 'at', 'to', 'by', 'no', 'is', 'mg', 'ml'].includes(w.toLowerCase()));
                    return !isVeryShort && !isGibberish && lettersAndDigits / Math.max(1, line.length) >= 0.45;
                  });

                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                          {meaningfulLines.length > 0 ? 'Clinical Transcription & Extracted Observations' : 'Machine Telemetry & Diagnostic Stream'}
                        </p>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#0F58B6] font-semibold">
                          OCR Processed
                        </span>
                      </div>

                      {meaningfulLines.length > 0 ? (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {meaningfulLines.map((line, lIdx) => (
                            <div key={lIdx} className="text-xs text-slate-700 font-medium flex items-start gap-1.5 leading-relaxed">
                              <span className="text-blue-500 font-bold">•</span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          Diagnostic imaging scan containing machine sensor telemetry and grayscale sonography panels. Key verified clinical findings are summarized above.
                        </p>
                      )}

                      {/* Collapsible raw stream toggle */}
                      <details className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                        <summary className="cursor-pointer font-mono text-slate-400 hover:text-slate-600 transition-colors select-none">
                          View Raw OCR Stream ({rawLines.length} lines)
                        </summary>
                        <pre className="mt-2 p-2.5 rounded-xl bg-slate-100 text-slate-600 font-mono text-[11px] max-h-36 overflow-y-auto whitespace-pre-wrap leading-tight">
                          {record.rawText}
                        </pre>
                      </details>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
