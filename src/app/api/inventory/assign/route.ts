/** POST /api/inventory/assign — assign one or more instances to a player */
import { getDb }    from '@/lib/db';
import { apiError } from '@/lib/api-error';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { instance_ids, player_id, team_id } = body as {
      instance_ids: string[];
      player_id:    string;
      team_id?:     string;
    };

    if (!instance_ids?.length) return apiError('instance_ids is required', 400);
    if (!player_id)            return apiError('player_id is required', 400);

    const db = await getDb();

    const updates = {
      assigned_player_id: player_id,
      assigned_at:        new Date().toISOString(),
      receipt_confirmed_at: null,
      receipt_confirmed_by: null,
      ...(team_id ? { team_id } : {}),
    };

    const { data, error } = await db
      .update('inventory_instances', updates)
      .in('id', instance_ids)
      .select();
    if (error) throw error;

    return Response.json({ updated: (data ?? []).length });
  } catch (err) {
    return apiError(err);
  }
}
