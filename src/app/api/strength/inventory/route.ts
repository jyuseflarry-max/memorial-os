/** GET/PUT /api/strength/inventory */
import { NextRequest } from 'next/server';
import { getDb }          from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server';
import { EQUIPMENT_CATALOG } from '@/lib/strength-utils';
import { apiError }       from '@/lib/api-error';

export async function GET() {
  try {
    const db = await getDb();
    const { data } = await db.from('strength_inventory')
      .select('equipment_key, available, quantity, notes');

    const dbMap = new Map(
      (data ?? []).map((r: { equipment_key: string; available: boolean; quantity: number; notes: string | null }) =>
        [r.equipment_key, r]
      )
    );

    // Merge catalog definition with DB state
    const result = EQUIPMENT_CATALOG.map(item => ({
      equipment_key:   item.key,
      equipment_label: item.label,
      category:        item.category,
      available:       (dbMap.get(item.key) as { available?: boolean } | undefined)?.available  ?? false,
      quantity:        (dbMap.get(item.key) as { quantity?: number }   | undefined)?.quantity   ?? 1,
      notes:           (dbMap.get(item.key) as { notes?: string | null } | undefined)?.notes ?? null,
    }));

    return Response.json(result);
  } catch (err) {
    return apiError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db   = await getDb();
    const sb   = getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get tenant_id
    const { data: u } = await sb.from('users').select('tenant_id').eq('id', user.id).single();
    if (!u) return Response.json({ error: 'User not found' }, { status: 404 });

    const items = await request.json() as { equipment_key: string; available: boolean; quantity?: number; notes?: string }[];

    const rows = items.map(item => ({
      tenant_id:      u.tenant_id,
      equipment_key:  item.equipment_key,
      available:      item.available,
      quantity:       item.quantity ?? 1,
      notes:          item.notes ?? null,
    }));

    const { error } = await sb.from('strength_inventory')
      .upsert(rows, { onConflict: 'tenant_id,equipment_key' });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
