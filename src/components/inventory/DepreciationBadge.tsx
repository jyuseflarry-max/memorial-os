import { computeBookValue, effectivePurchasedAt } from '@/types/inventory';
import type { DepreciationMethod } from '@/types/inventory';

interface Props {
  purchasePrice:    number | null;
  usefulLifeYears:  number;
  method:           DepreciationMethod;
  instancePurchasedAt: string | null;
  itemPurchasedAt:     string | null;
}

export function DepreciationBadge({
  purchasePrice,
  usefulLifeYears,
  method,
  instancePurchasedAt,
  itemPurchasedAt,
}: Props) {
  const effectiveDate = effectivePurchasedAt(instancePurchasedAt, itemPurchasedAt);
  const book = computeBookValue(purchasePrice, usefulLifeYears, method, effectiveDate);

  if (book === null || purchasePrice === null) {
    return <span className="text-[10px] font-mono text-gray-600">—</span>;
  }

  const pct = Math.round((book / purchasePrice) * 100);
  const color =
    pct >= 70 ? 'text-green-400' :
    pct >= 40 ? 'text-yellow-400' :
                'text-red-400';

  return (
    <span className={`text-[10px] font-mono font-semibold ${color}`}>
      ${book.toFixed(2)}
      <span className="text-gray-500 font-normal ml-1">({pct}%)</span>
    </span>
  );
}
