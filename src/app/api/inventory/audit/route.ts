/**
 * GET /api/inventory/audit
 * Full inventory audit: every instance joined to item + category + player.
 * Computes book value server-side so the client gets a single flat array.
 * Query params:
 *   ?team_id=<uuid>     filter by team
 *   ?unconfirmed=true   only show assigned-but-unconfirmed receipts
 */
import { getDb }             from '@/lib/db';
import { apiError }          from '@/lib/api-error';
import { computeBookValue, effectivePurchasedAt } from '@/types/inventory';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamFilter   = searchParams.get('team_id');
    const unconfirmed  = searchParams.get('unconfirmed') === 'true';

    const db = await getDb();
    let query = db
      .from('inventory_instances')
      .select(`
        id, instance_number, size, condition,
        assigned_at, purchased_at, receipt_confirmed_at,
        team_id,
        assigned_player_id,
        inventory_items(
          name, purchase_price, useful_life_years, purchased_at,
          inventory_categories(name, depreciation_method)
        ),
        players(name),
        teams(name)
      `)
      .order('created_at', { ascending: false });

    if (teamFilter)  query = query.eq('team_id', teamFilter);
    if (unconfirmed) query = query.is('receipt_confirmed_at', null).not('assigned_player_id', 'is', null);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []).map((inst: Record<string, unknown>) => {
      const item   = inst.inventory_items as Record<string, unknown> | null;
      const cat    = item?.inventory_categories as { name: string; depreciation_method: string } | null;
      const player = inst.players as { name: string } | null;
      const team   = inst.teams   as { name: string } | null;

      const purchasePrice    = item?.purchase_price    as number | null;
      const usefulLife       = item?.useful_life_years as number ?? 3;
      const depMethod        = (cat?.depreciation_method ?? 'none') as 'straight_line' | 'declining_balance' | 'none';
      const itemPurchasedAt  = item?.purchased_at       as string | null;
      const instPurchasedAt  = inst.purchased_at        as string | null;
      const effectiveDate    = effectivePurchasedAt(instPurchasedAt, itemPurchasedAt);
      const bookValue        = computeBookValue(purchasePrice, usefulLife, depMethod, effectiveDate);

      return {
        instance_id:            inst.id,
        item_name:              item?.name ?? null,
        category_name:          cat?.name  ?? null,
        instance_number:        inst.instance_number,
        size:                   inst.size,
        condition:              inst.condition,
        assigned_player_name:   player?.name ?? null,
        team_name:              team?.name   ?? null,
        assigned_at:            inst.assigned_at,
        receipt_confirmed_at:   inst.receipt_confirmed_at,
        effective_purchased_at: effectiveDate,
        purchase_price:         purchasePrice,
        useful_life_years:      usefulLife,
        depreciation_method:    depMethod,
        book_value:             bookValue !== null ? Math.round(bookValue * 100) / 100 : null,
      };
    });

    return Response.json(rows);
  } catch (err) {
    return apiError(err);
  }
}
