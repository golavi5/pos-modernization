import { Badge } from '@/components/ui/badge';

interface StockBadgeProps {
  stock: number;
  reorderLevel: number;
}

export function StockBadge({ stock, reorderLevel }: StockBadgeProps) {
  if (stock === 0) {
    return <Badge variant="destructive">Out of Stock</Badge>;
  }

  if (stock <= reorderLevel) {
    return <Badge variant="warning">Low Stock ({stock})</Badge>;
  }

  return <Badge variant="success">In Stock ({stock})</Badge>;
}
