/** GET/POST /api/strength/programs */
import { NextRequest } from 'next/server';
import { getDb }          from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server';
import { apiError }       from '@/lib/api-error';

export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db.from('strength_programs')
      .select('id, name, description, weeks, phase, blocks, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data ?? []);
  } catch (err) { return apiError(err); }
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

    const body = await request.json() as { name: string; description?: string; weeks?: number; phase?: string; blocks?: unknown[] };
    if (!body.name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });

    const { data, error } = await sb.from('strength_programs').insert({
      tenant_id:   u.tenant_id,
      name:        body.name.trim(),
      description: body.description ?? null,
      weeks:       body.weeks ?? 4,
      phase:       body.phase ?? null,
      blocks:      body.blocks ?? [],
      created_by:  user.id,
    }).select().single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data, { status: 201 });
  } catch (err) { return apiError(err); }
}
