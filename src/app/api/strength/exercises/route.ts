/** GET /api/strength/exercises   — global + tenant exercises
 *  POST /api/strength/exercises  — create tenant-specific exercise */
import { NextRequest } from 'next/server';
import { getDb }           from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server';
import { apiError }        from '@/lib/api-error';

export async function GET() {
  try {
    const db = await getDb();
    // Exercises intentionally include global rows (tenant_id IS NULL) alongside
    // tenant-specific ones — this query cannot go through db.from() which scopes
    // to a single tenant, so we use the service client with db.tenantId.
    const sb = getSupabaseServer();
    const { data, error } = await sb.from('strength_exercises')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${db.tenantId}`)
      .order('category')
      .order('name');

    if (error) throw error;

    const result = (data ?? []).map((e: Record<string, unknown>) => ({
      ...e,
      is_global: e.tenant_id === null,
    }));

    return Response.json(result);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (db.role !== 'Admin' && db.role !== 'Coach') return apiError('Forbidden', 403);

    const body = await request.json() as {
      name: string; category: string;
      primary_muscles: string[]; secondary_muscles?: string[];
      equipment_keys?: string[]; demo_video_url?: string;
      coaching_cues?: string; is_primary_lift?: boolean;
    };

    if (!body.name?.trim()) return apiError('Name is required', 400);

    const { data, error } = await db
      .insert('strength_exercises', {
        name:              body.name.trim(),
        category:          body.category ?? 'compound',
        primary_muscles:   body.primary_muscles ?? [],
        secondary_muscles: body.secondary_muscles ?? [],
        equipment_keys:    body.equipment_keys ?? [],
        demo_video_url:    body.demo_video_url ?? null,
        coaching_cues:     body.coaching_cues ?? null,
        is_primary_lift:   body.is_primary_lift ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ ...data, is_global: false }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
