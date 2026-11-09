'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';

/** Common zones for the product's markets; the backend accepts any valid IANA zone. */
const ZONES = [
  'America/Bogota',
  'America/Lima',
  'America/Guayaquil',
  'America/Caracas',
  'America/La_Paz',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Montevideo',
  'America/Panama',
  'America/Costa_Rica',
  'America/Mexico_City',
  'America/New_York',
  'Europe/Madrid',
  'UTC',
];

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
}

/** "Zona horaria": which calendar day a sale belongs to in reports and the dashboard. */
export function TimezoneSelect({ value, onChange }: TimezoneSelectProps) {
  const t = useTranslations('settings');
  // A zone saved through the API that is not in the short list still shows up.
  const zones = ZONES.includes(value) || !value ? ZONES : [value, ...ZONES];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
      <Label htmlFor="timezone" className="text-sm font-medium">{t('timezone')}</Label>
      <div className="sm:col-span-2">
        <select
          id="timezone"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border bg-surface-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>{zone}</option>
          ))}
        </select>
        <p className="text-xs text-tertiary mt-1">{t('timezoneHelp')}</p>
      </div>
    </div>
  );
}
