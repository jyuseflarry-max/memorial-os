/**
 * GET /api/inventory/locker-tag/[playerId]
 * Returns all active instances assigned to a player, enriched with book values.
 * Used by the digital locker page and the printable locker-tag PDF.
 */
import { getDb }             from '@/lib/db';
import { apiError }          from '@/lib/api-error';
import { computeBookValue, effectivePurchasedAt } from '@/types/inventory';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const { playerId } = await params;

    const db = await getDb();
    const { data, error } = await db
      .from('inventory_instances')
      .select(`
        id, instance_number, size, condition,
        assigned_at, purchased_at, receipt_confirmed_at,
        inventory_items(
          name, purchase_price, useful_life_years, purchased_at,
          inventory_categories(name, depreciation_method)
        )
      `)
      .eq('assigned_player_id', playerId)
      .neq('condition', 'Retired')
      .order('assigned_at', { ascending: false });
    if (error) throw error;

    const rows = (data ?? []).map((inst: Record<string, unknown>) => {
      const item   = inst.inventory_items as Record<string, unknown> | null;
      const cat    = item?.inventory_categories as { name: string; depreciation_method: string } | null;

      const purchasePrice   = item?.purchase_price    as number | null;
      const usefulLife      = item?.useful_life_years as number ?? 3;
      const depMethod       = (cat?.depreciation_method ?? 'none') as 'straight_line' | 'declining_balance' | 'none';
      const itemPurchasedAt = item?.purchased_at       as string | null;
      const instPurchasedAt = inst.purchased_at        as string | null;
      const effectiveDate   = effectivePurchasedAt(instPurchasedAt, itemPurchasedAt);
      const bookValue       = computeBookValue(purchasePrice, usefulLife, depMethod, effectiveDate);

      return {
        instance_id:            inst.id,
        item_name:              item?.name ?? null,
        category_name:          cat?.name  ?? null,
        instance_number:        inst.instance_number,
        size:                   inst.size,
        condition:              inst.condition,
        assigned_at:            inst.assigned_at,
        receipt_confirmed_at:   inst.receipt_confirmed_at,
        purchase_price:         purchasePrice,
        book_value:             bookValue !== null ? Math.round(bookValue * 100) / 100 : null,
      };
    });

    return Response.json(rows);
  } catch (err) {
    return apiError(err);
  }
}
