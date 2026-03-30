import type { InventoryCondition } from '@/types/inventory';

const STYLES: Record<InventoryCondition, string> = {
  New:      'bg-green-500/10  border-green-500/30  text-green-400',
  Good:     'bg-blue-500/10   border-blue-500/30   text-blue-400',
  Fair:     'bg-yellow-400/10 border-yellow-400/30 text-yellow-400',
  Poor:     'bg-orange-400/10 border-orange-400/30 text-orange-400',
  Retired:  'bg-gray-700/40   border-gray-600/30   text-gray-500',
};

export function ConditionBadge({ condition }: { condition: InventoryCondition }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold ${STYLES[condition]}`}>
      {condition}
    </span>
  );
}
