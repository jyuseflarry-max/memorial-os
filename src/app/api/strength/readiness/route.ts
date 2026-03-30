/** GET /api/strength/readiness?player_id=&days=7
 *  POST /api/strength/readiness */
import { NextRequest } from 'next/server';
import { getDb }          from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server';
import { autoReadinessStatus } from '@/lib/strength-utils';
import { apiError }       from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const db  = await getDb();
    const url = new URL(request.url);
    const playerId = url.searchParams.get('player_id');
    const days     = parseInt(url.searchParams.get('days') ?? '7');

    const since = new Date();
    since.setDate(since.getDate() - days);

    let q = db.from('strength_readiness')
      .select('id, player_id, score_date, status, sleep_hours, soreness, energy, notes')
      .gte('score_date', since.toISOString().split('T')[0])
      .order('score_date', { ascending: false });

    if (playerId) q = q.eq('player_id', playerId);

    const { data, error } = await q;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data ?? []);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sb = getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: u } = await sb.from('users').select('tenant_id').eq('id', user.id).single();
    if (!u) return Response.json({ error: 'User not found' }, { status: 404 });

    const body = await request.json() as {
      player_id: string;
      sleep_hours: number;
      soreness: number;
      energy: number;
      notes?: string;
      score_date?: string;
    };

    const status = autoReadinessStatus(body.sleep_hours, body.soreness, body.energy);
    const score_date = body.score_date ?? new Date().toISOString().split('T')[0];

    const { data, error } = await sb.from('strength_readiness')
      .upsert({
        tenant_id:   u.tenant_id,
        player_id:   body.player_id,
        score_date,
        status,
        sleep_hours: body.sleep_hours,
        soreness:    body.soreness,
        energy:      body.energy,
        notes:       body.notes ?? null,
      }, { onConflict: 'tenant_id,player_id,score_date' })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
