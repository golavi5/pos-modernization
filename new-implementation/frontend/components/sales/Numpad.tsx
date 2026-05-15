'use client';

import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumpadProps {
  value: string;
  onChange: (value: string) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export function Numpad({ value, onChange }: NumpadProps) {
  const handleKey = (key: string) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === '.' && value.includes('.')) return;
    if (value === '0' && key !== '.') {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => handleKey(key)}
          className={cn(
            'h-12 rounded-lg font-semibold transition-colors flex items-center justify-center',
            key === '⌫'
              ? 'bg-muted text-muted-foreground hover:bg-muted/70 text-sm'
              : 'bg-card border border-border text-foreground hover:bg-accent text-lg'
          )}
        >
          {key === '⌫' ? <Delete size={16} /> : key}
        </button>
      ))}
    </div>
  );
}
