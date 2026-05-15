import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  accentClass?: string;
}

export function StatsCard({
  title,
  value,
  delta,
  deltaPositive = true,
  accentClass = 'border-primary',
}: StatsCardProps) {
  return (
    <div className={cn('bg-card rounded-xl p-4 border-l-4', accentClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        {title}
      </p>
      <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
      {delta && (
        <p
          className={cn(
            'text-[10px] flex items-center gap-1',
            deltaPositive ? 'text-emerald-500' : 'text-destructive'
          )}
        >
          {deltaPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {delta}
        </p>
      )}
    </div>
  );
}
