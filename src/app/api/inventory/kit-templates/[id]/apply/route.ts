/**
 * POST /api/inventory/kit-templates/[id]/apply
 * Assign all unassigned instances matching each item in the template to a player.
 * Items with no unassigned stock are skipped and returned in the "skipped" list.
 */
import { getDb }    from '@/lib/db';
import { apiError } from '@/lib/api-error';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { player_id, team_id } = body as { player_id: string; team_id?: string };
    if (!player_id) return apiError('player_id is required', 400);

    const db = await getDb();

    // Fetch the template
    const { data: tpl, error: tplErr } = await db
      .from('inventory_kit_templates')
      .select('*')
      .eq('id', id)
      .single();
    if (tplErr) throw tplErr;

    type KitItem = { item_id: string; size?: string };
    const items: KitItem[] = (tpl as { items: KitItem[] }).items ?? [];

    const assigned: string[] = [];
    const skipped:  string[] = [];
    const now = new Date().toISOString();

    for (const kitItem of items) {
      // Find first unassigned instance of this item (matching size if specified)
      let q = db
        .from('inventory_instances')
        .select('id')
        .eq('item_id', kitItem.item_id)
        .is('assigned_player_id', null)
        .neq('condition', 'Retired')
        .limit(1);
      if (kitItem.size) q = q.eq('size', kitItem.size);

      const { data: candidates } = await q;
      const inst = (candidates ?? [])[0] as { id: string } | undefined;

      if (!inst) {
        skipped.push(kitItem.item_id);
        continue;
      }

      await db
        .update('inventory_instances', {
          assigned_player_id: player_id,
          assigned_at: now,
          receipt_confirmed_at: null,
          receipt_confirmed_by: null,
          ...(team_id ? { team_id } : {}),
        })
        .eq('id', inst.id);

      assigned.push(inst.id);
    }

    return Response.json({ assigned, skipped });
  } catch (err) {
    return apiError(err);
  }
}
