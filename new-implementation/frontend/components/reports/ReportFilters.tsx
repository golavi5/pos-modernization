'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, RefreshCw } from 'lucide-react';
import type { PeriodType, ExportFormat, ReportQuery } from '@/types/reports';

interface ReportFiltersProps {
  onFilterChange: (query: ReportQuery) => void;
  onExport?: (format: ExportFormat) => void;
  showExport?: boolean;
}

export function ReportFilters({ onFilterChange, onExport, showExport = true }: ReportFiltersProps) {
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState('10');

  const handleApply = () => {
    const query: ReportQuery = {
      period,
      ...(period === 'custom' && startDate && endDate ? { startDate, endDate } : {}),
      limit: parseInt(limit) || 10,
    };
    onFilterChange(query);
  };

  const handleReset = () => {
    setPeriod('monthly');
    setStartDate('');
    setEndDate('');
    setLimit('10');
    onFilterChange({ period: 'monthly', limit: 10 });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Period */}
          <div className="space-y-2">
            <Label htmlFor="period">Período</Label>
            <select
              id="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="daily">Hoy</option>
              <option value="weekly">Última Semana</option>
              <option value="monthly">Último Mes</option>
              <option value="yearly">Último Año</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Custom dates */}
          {period === 'custom' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha Inicio</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha Fin</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="limit">Límite resultados</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="100"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 md:col-span-2">
            <Button onClick={handleApply} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Aplicar
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Limpiar
            </Button>
          </div>
        </div>

        {/* Export buttons */}
        {showExport && onExport && (
          <div className="mt-4 flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => onExport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" size="sm" disabled title="Próximamente">
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button variant="outline" size="sm" disabled title="Próximamente">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
