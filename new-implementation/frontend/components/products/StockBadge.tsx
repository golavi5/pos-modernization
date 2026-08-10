import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

interface StockBadgeProps {
  stock: number;
  reorderLevel: number;
}

export function StockBadge({ stock, reorderLevel }: StockBadgeProps) {
  const t = useTranslations('products');
  const tInventory = useTranslations('inventory');

  if (stock === 0) {
    return <Badge variant="destructive">{tInventory('table.noStock')}</Badge>;
  }

  if (stock <= reorderLevel) {
    return <Badge variant="warning">{t('lowStockCount', { stock })}</Badge>;
  }

  return <Badge variant="success">{t('inStockCount', { stock })}</Badge>;
}
