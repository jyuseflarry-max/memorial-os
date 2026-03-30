/** GET /api/strength/exercises   — global + tenant exercises
 *  POST /api/strength/exercises  — create tenant-specific exercise */
import { NextRequest } from 'next/server';
import { getDb }          from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server';
import { apiError }       from '@/lib/api-error';

export async function GET() {
  try {
    const db = await getDb();
    const sb = getSupabaseServer();

    // Get tenant_id from DB object
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: u } = await sb.from('users').select('tenant_id').eq('id', user.id).single();

    // Fetch global exercises (tenant_id IS NULL) + tenant custom
    const { data, error } = await sb.from('strength_exercises')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${u?.tenant_id}`)
      .order('category')
      .order('name');

    if (error) return Response.json({ error: error.message }, { status: 500 });

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
    const sb = getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: u } = await sb.from('users').select('tenant_id, role').eq('id', user.id).single();
    if (!u || (u.role !== 'Admin' && u.role !== 'Coach')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as {
      name: string; category: string;
      primary_muscles: string[]; secondary_muscles?: string[];
      equipment_keys?: string[]; demo_video_url?: string;
      coaching_cues?: string; is_primary_lift?: boolean;
    };

    if (!body.name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 });

    const { data, error } = await sb.from('strength_exercises')
      .insert({
        tenant_id:        u.tenant_id,
        name:             body.name.trim(),
        category:         body.category ?? 'compound',
        primary_muscles:  body.primary_muscles ?? [],
        secondary_muscles: body.secondary_muscles ?? [],
        equipment_keys:   body.equipment_keys ?? [],
        demo_video_url:   body.demo_video_url ?? null,
        coaching_cues:    body.coaching_cues ?? null,
        is_primary_lift:  body.is_primary_lift ?? false,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ...data, is_global: false }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
