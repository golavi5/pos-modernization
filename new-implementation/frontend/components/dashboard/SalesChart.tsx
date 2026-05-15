'use client';

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCOP } from '@/lib/utils';

interface ChartDay {
  day: string;
  sales: number;
}

interface SalesChartProps {
  data: ChartDay[];
}

export function SalesChart({ data }: SalesChartProps) {
  const lastIndex = data.length > 0 ? data.length - 1 : null;

  return (
    <div className="bg-card rounded-xl p-4">
      <p className="text-sm font-semibold text-foreground mb-3">
        Ventas — últimos 7 días
      </p>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} barSize={28}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => {
              const num =
                typeof value === 'string'
                  ? parseFloat(value)
                  : typeof value === 'number'
                  ? value
                  : 0;
              return [formatCOP(num), 'Ventas'];
            }}
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '11px',
            }}
          />
          <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={
                  i === lastIndex
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted))'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
