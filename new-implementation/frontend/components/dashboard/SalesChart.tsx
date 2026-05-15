'use client';

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChartDay {
  day: string;
  sales: number;
}

interface SalesChartProps {
  data: ChartDay[];
}

export function SalesChart({ data }: SalesChartProps) {
  const lastIndex = data.length - 1;

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [
              new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
              }).format(Number(value ?? 0)),
              'Ventas',
            ]}
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
