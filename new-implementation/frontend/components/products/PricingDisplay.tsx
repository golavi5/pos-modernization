interface PricingDisplayProps {
  price: number;
  cost?: number;
  showCost?: boolean;
}

export function PricingDisplay({ price, cost, showCost = false }: PricingDisplayProps) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-semibold">${price.toFixed(2)}</span>
      {showCost && cost && (
        <span className="text-sm text-tertiary">Cost: ${cost.toFixed(2)}</span>
      )}
    </div>
  );
}
