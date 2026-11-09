'use client';

import { useTranslations } from 'next-intl';
import { ArrowUpCircle, ArrowDownCircle, Edit3, AlertCircle, RotateCcw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { MovementType } from '@/types/inventory';

interface MovementTypePickerProps {
  value: MovementType;
  onChange: (type: MovementType) => void;
}

const TYPES = [
  { id: 'IN', icon: ArrowUpCircle },
  { id: 'OUT', icon: ArrowDownCircle },
  { id: 'ADJUST', icon: Edit3 },
  { id: 'DAMAGE', icon: AlertCircle },
  { id: 'RETURN', icon: RotateCcw },
] as const;

export function MovementTypePicker({ value, onChange }: MovementTypePickerProps) {
  const t = useTranslations('inventory');

  return (
    <div>
      <Label className="mb-3">{t('adjust.movementType')}</Label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {TYPES.map(({ id, icon: Icon }) => {
          const isSelected = value === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-blue-600' : 'text-quaternary'}`} />
              <p className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-secondary'}`}>
                {t(`movementTypes.${id}`)}
              </p>
              <p className="text-xs text-tertiary mt-1">{t(`movementDesc.${id}`)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
