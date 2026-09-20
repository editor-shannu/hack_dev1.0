'use client';

import React from 'react';
import { Sparkles, FileText, CheckCircle2, Pill, Activity, AlertCircle } from 'lucide-react';

interface ClinicalMarkdownRendererProps {
  content: string;
}

/**
 * Parses inline bold text (**bold**) into React nodes
 */
function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-bold text-slate-900 dark:text-white">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

export const ClinicalMarkdownRenderer: React.FC<ClinicalMarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  const rawLines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];

  let currentListItems: React.ReactNode[] = [];

  const flushList = (key: string) => {
    if (currentListItems.length > 0) {
      renderedElements.push(
        <ul key={key} className="space-y-1.5 my-2.5 pl-1">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  rawLines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(`flush-${idx}`);
      return;
    }

    // 1. Horizontal rules (--- or ***)
    if (trimmed === '---' || trimmed === '***') {
      flushList(`hr-flush-${idx}`);
      renderedElements.push(
        <hr key={`hr-${idx}`} className="border-t border-slate-200 dark:border-slate-800 my-4" />
      );
      return;
    }

    // 2. Top-level Document Banner (### Heading)
    if (trimmed.startsWith('### ')) {
      flushList(`h3-flush-${idx}`);
      const headingText = trimmed.replace(/^###\s+/, '').replace(/^[^\w\s]+\s*/, ''); // strip hashes and leading icons
      renderedElements.push(
        <div
          key={`h3-${idx}`}
          className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white dark:from-slate-800/80 dark:via-slate-800 dark:to-slate-850 border border-blue-200/80 dark:border-blue-900/50 my-3 flex items-center gap-3 shadow-sm"
        >
          <div className="w-8 h-8 rounded-xl bg-[#0F58B6] text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/20">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              {headingText}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Verified clinical synthesis computed strictly from patient records
            </p>
          </div>
        </div>
      );
      return;
    }

    // 3. Section Headings (#### Heading)
    if (trimmed.startsWith('#### ')) {
      flushList(`h4-flush-${idx}`);
      const sectionTitle = trimmed.replace(/^####\s+/, '');
      renderedElements.push(
        <div key={`h4-${idx}`} className="pt-3 pb-1">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 tracking-wide uppercase font-mono">
            <span className="w-1.5 h-3.5 bg-[#0F58B6] dark:bg-blue-400 rounded-full flex-shrink-0" />
            <span>{sectionTitle}</span>
          </h4>
        </div>
      );
      return;
    }

    // 4. Bullet list items (- or * or numbered 1.)
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const itemContent = trimmed.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
      currentListItems.push(
        <li
          key={`li-${idx}`}
          className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed p-1.5 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#0F58B6] dark:bg-blue-400 mt-2 flex-shrink-0 shadow-sm shadow-blue-400/30" />
          <div className="flex-1">{renderInlineFormatting(itemContent)}</div>
        </li>
      );
      return;
    }

    // 5. Patient Profile metadata banner (e.g. **Patient:** ... | **Blood Group:** ...)
    if (trimmed.includes('**Patient:**') || trimmed.includes('**Known Allergies:**') || trimmed.includes('**Active Diagnoses')) {
      flushList(`meta-flush-${idx}`);
      renderedElements.push(
        <div
          key={`meta-${idx}`}
          className="p-2.5 sm:p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 my-1.5 font-medium leading-relaxed"
        >
          {renderInlineFormatting(trimmed)}
        </div>
      );
      return;
    }

    // 6. Regular paragraphs
    flushList(`p-flush-${idx}`);
    renderedElements.push(
      <p
        key={`p-${idx}`}
        className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-1.5"
      >
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList('final-flush');

  return (
    <div id="clinical-markdown-container" className="space-y-1 font-sans">
      {renderedElements}
    </div>
  );
};
