'use client';

import React from 'react';
import { FamilyMemberRelation } from '@/types/prescription';
import { FAMILY_RELATIONS } from '@/lib/familyMembers';
import { Users, User } from 'lucide-react';

interface FamilyMemberSelectorProps {
  selectedRelation: FamilyMemberRelation;
  onSelectRelation: (relation: FamilyMemberRelation) => void;
  patientName: string;
  onPatientNameChange: (name: string) => void;
  customRelation?: string;
  onCustomRelationChange?: (custom: string) => void;
  title?: string;
}

export const FamilyMemberSelector: React.FC<FamilyMemberSelectorProps> = ({
  selectedRelation,
  onSelectRelation,
  patientName,
  onPatientNameChange,
  customRelation = '',
  onCustomRelationChange,
  title = 'Whose medical record is this?',
}) => {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-4 sm:p-5 space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-100/80 border border-indigo-200/60 flex items-center justify-center text-indigo-700">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Tag this file to organize medical history per family member
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100/70 text-indigo-700 border border-indigo-200">
          Family Tag
        </span>
      </div>

      {/* Quick Relation Chips */}
      <div>
        <label className="block text-[11px] font-mono uppercase font-bold tracking-wider text-slate-600 mb-2">
          Select Member
        </label>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {FAMILY_RELATIONS.map((rel) => {
            const isSelected = selectedRelation === rel.key;
            return (
              <button
                key={rel.key}
                type="button"
                id={`family-chip-${rel.key}`}
                onClick={() => onSelectRelation(rel.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#0F58B6] text-white shadow-sm ring-2 ring-[#0F58B6]/30 scale-[1.02]'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40'
                }`}
              >
                <span>{rel.icon}</span>
                <span>{rel.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient Name & Custom Relation Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-indigo-100/70">
        <div>
          <label className="block text-[11px] font-mono uppercase font-bold tracking-wider text-slate-600 mb-1">
            Patient / Person Name
          </label>
          <div className="relative">
            <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="patient-name-input"
              value={patientName}
              onChange={(e) => onPatientNameChange(e.target.value)}
              placeholder="e.g., Ramesh Kumar"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F58B6]/20 focus:border-[#0F58B6]"
            />
          </div>
        </div>

        {selectedRelation === 'other' && onCustomRelationChange && (
          <div>
            <label className="block text-[11px] font-mono uppercase font-bold tracking-wider text-slate-600 mb-1">
              Custom Relation Label
            </label>
            <input
              type="text"
              id="custom-relation-input"
              value={customRelation}
              onChange={(e) => onCustomRelationChange(e.target.value)}
              placeholder="e.g., Uncle, Aunt, Guardian"
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F58B6]/20 focus:border-[#0F58B6]"
            />
          </div>
        )}
      </div>
    </div>
  );
};
