import { FamilyMemberRelation } from '@/types/prescription';

export interface FamilyRelationOption {
  key: FamilyMemberRelation;
  label: string;
  icon: string;
  colorClass: string;
  badgeBg: string;
}

export const FAMILY_RELATIONS: FamilyRelationOption[] = [
  { key: 'self', label: 'Self', icon: '👤', colorClass: 'text-blue-700 bg-blue-50 border-blue-200', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'father', label: 'Father', icon: '👨', colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'mother', label: 'Mother', icon: '👩', colorClass: 'text-rose-700 bg-rose-50 border-rose-200', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'spouse', label: 'Spouse', icon: '👫', colorClass: 'text-purple-700 bg-purple-50 border-purple-200', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'son', label: 'Son', icon: '👦', colorClass: 'text-sky-700 bg-sky-50 border-sky-200', badgeBg: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'daughter', label: 'Daughter', icon: '👧', colorClass: 'text-pink-700 bg-pink-50 border-pink-200', badgeBg: 'bg-pink-50 text-pink-700 border-pink-200' },
  { key: 'brother', label: 'Brother', icon: '🧑', colorClass: 'text-teal-700 bg-teal-50 border-teal-200', badgeBg: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'sister', label: 'Sister', icon: '👱', colorClass: 'text-amber-700 bg-amber-50 border-amber-200', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'grandfather', label: 'Grandfather', icon: '👴', colorClass: 'text-slate-700 bg-slate-100 border-slate-300', badgeBg: 'bg-slate-100 text-slate-700 border-slate-300' },
  { key: 'grandmother', label: 'Grandmother', icon: '👵', colorClass: 'text-stone-700 bg-stone-100 border-stone-300', badgeBg: 'bg-stone-100 text-stone-700 border-stone-300' },
  { key: 'other', label: 'Other', icon: '👥', colorClass: 'text-slate-700 bg-slate-50 border-slate-200', badgeBg: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export function getFamilyRelationLabel(relation?: FamilyMemberRelation, customRelation?: string): string {
  if (customRelation) return customRelation;
  if (!relation) return 'Self';
  const found = FAMILY_RELATIONS.find((r) => r.key === relation);
  return found ? found.label : 'Self';
}

export function getFamilyRelationBadge(relation?: FamilyMemberRelation, customRelation?: string) {
  const effectiveKey = relation || 'self';
  const opt = FAMILY_RELATIONS.find((r) => r.key === effectiveKey) || FAMILY_RELATIONS[0];
  return {
    ...opt,
    displayLabel: customRelation || opt.label,
  };
}
