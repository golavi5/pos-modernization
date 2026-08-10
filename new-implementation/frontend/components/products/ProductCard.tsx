import { useTranslations } from 'next-intl';
import type { Product } from '@/types/product';
import { Card, CardContent } from '@/components/ui/card';
import { StockBadge } from './StockBadge';
import { PricingDisplay } from './PricingDisplay';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  return (
    <Card>
      <CardContent className="p-4">
        {product.image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded remote URL sized w-full h-48; next/image would need fill + a relative parent, and routing arbitrary hosts through the optimizer is a runtime change, not a lint fix
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-48 object-cover rounded-md mb-4"
          />
        )}
        <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
        <p className="text-sm text-secondary mb-2 line-clamp-2">{product.description}</p>
        <div className="flex justify-between items-center mb-4">
          <PricingDisplay price={product.price} />
          <StockBadge stock={product.stock_quantity} reorderLevel={product.reorder_level ?? 0} />
        </div>
        <div className="flex gap-2">
          <Link href={`/products/${product.id}`} className="flex-1">
            <Button variant="outline" className="w-full">{t('view')}</Button>
          </Link>
          <Link href={`/products/${product.id}/edit`} className="flex-1">
            <Button className="w-full">{tCommon('edit')}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
