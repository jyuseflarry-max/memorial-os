/** GET/POST /api/inventory/categories */
import { getDb }            from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server';
import { apiError }         from '@/lib/api-error';

export async function GET() {
  try {
    const db = await getDb();
    // Include global seeds (tenant_id IS NULL) + tenant-specific
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from('inventory_categories')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${db.tenantId}`)
      .order('name');
    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, useful_life_years, depreciation_method } = body;
    if (!name) return apiError('name is required', 400);

    const db = await getDb();
    const { data, error } = await db
      .insert('inventory_categories', {
        name,
        useful_life_years:   useful_life_years   ?? 3,
        depreciation_method: depreciation_method ?? 'straight_line',
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
