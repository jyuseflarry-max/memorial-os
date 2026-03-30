/** GET/POST /api/inventory/instances */
import { getDb }    from '@/lib/db';
import { apiError } from '@/lib/api-error';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamFilter   = searchParams.get('team_id');
    const playerFilter = searchParams.get('player_id');
    const unassigned   = searchParams.get('unassigned');

    const db = await getDb();
    let query = db
      .from('inventory_instances')
      .select(`
        *,
        inventory_items(
          name, description, purchase_price, useful_life_years, purchased_at,
          inventory_categories(name, depreciation_method)
        ),
        players(name)
      `)
      .order('created_at', { ascending: false });

    if (teamFilter)   query = query.eq('team_id', teamFilter);
    if (playerFilter) query = query.eq('assigned_player_id', playerFilter);
    if (unassigned === 'true') query = query.is('assigned_player_id', null);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []).map((inst: Record<string, unknown>) => {
      const item = inst.inventory_items as Record<string, unknown> | null;
      const cat  = item?.inventory_categories as { name: string; depreciation_method: string } | null;
      const player = inst.players as { name: string } | null;
      return {
        ...inst,
        item_name:             item?.name ?? null,
        category_name:         cat?.name  ?? null,
        depreciation_method:   cat?.depreciation_method ?? null,
        item_purchase_price:   item?.purchase_price ?? null,
        item_useful_life_years: item?.useful_life_years ?? null,
        item_purchased_at:     item?.purchased_at ?? null,
        assigned_player_name:  player?.name ?? null,
        inventory_items:       undefined,
        players:               undefined,
      };
    });

    return Response.json(rows);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { item_id, instance_number, size, condition, team_id, purchased_at, notes } = body;
    if (!item_id) return apiError('item_id is required', 400);

    const db = await getDb();
    const { data, error } = await db
      .insert('inventory_instances', {
        item_id,
        instance_number: instance_number ?? null,
        size:            size            ?? null,
        condition:       condition        ?? 'New',
        team_id:         team_id         ?? null,
        purchased_at:    purchased_at    ?? null,
        notes:           notes           ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
