import { Package } from "lucide-react";
import { ConditionBadge } from "./ConditionBadge";
import { ReceiptButton }  from "./ReceiptButton";
import type { PlayerLockerItem } from "@/types/inventory";

interface Props {
  item:        PlayerLockerItem;
  showReceipt?: boolean;
  onReceiptConfirmed?: () => void;
}

export function PlayerInventoryCard({ item, showReceipt = true, onReceiptConfirmed }: Props) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-gray-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{item.item_name}</p>
            <p className="text-gray-500 text-[10px] font-mono">{item.category_name}</p>
          </div>
        </div>
        <ConditionBadge condition={item.condition} />
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
        {item.instance_number && (
          <>
            <span className="text-gray-500 uppercase">Tag #</span>
            <span className="text-gray-300">{item.instance_number}</span>
          </>
        )}
        {item.size && (
          <>
            <span className="text-gray-500 uppercase">Size</span>
            <span className="text-gray-300">{item.size}</span>
          </>
        )}
        {item.book_value !== null && (
          <>
            <span className="text-gray-500 uppercase">Value</span>
            <span className="text-gray-300">${item.book_value?.toFixed(2)}</span>
          </>
        )}
        {item.assigned_at && (
          <>
            <span className="text-gray-500 uppercase">Assigned</span>
            <span className="text-gray-300">
              {new Date(item.assigned_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </>
        )}
      </div>

      {/* Receipt */}
      {showReceipt && (
        <div className="pt-1 border-t border-gray-700/40">
          <ReceiptButton
            instanceId={item.instance_id}
            confirmedAt={item.receipt_confirmed_at}
            onConfirmed={onReceiptConfirmed}
          />
        </div>
      )}
    </div>
  );
}
