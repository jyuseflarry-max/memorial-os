/** GET /api/strength/lifts?player_id=&exercise_id=&limit=
 *  POST /api/strength/lifts */
import { NextRequest } from 'next/server';
import { getDb }    from '@/lib/db';
import { apiError } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const db  = await getDb();
    const url = new URL(request.url);
    const playerId   = url.searchParams.get('player_id');
    const exerciseId = url.searchParams.get('exercise_id');
    const limit      = parseInt(url.searchParams.get('limit') ?? '50');

    let q = db.from('strength_lifts')
      .select(`id, player_id, exercise_id, weight_lbs, reps, estimated_1rm, tempo, is_verified, recorded_at, session_notes,
               strength_exercises(name)`)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (playerId)   q = q.eq('player_id', playerId);
    if (exerciseId) q = q.eq('exercise_id', exerciseId);

    const { data, error } = await q;
    if (error) throw error;

    const result = (data ?? []).map((l: Record<string, unknown>) => ({
      ...l,
      exercise_name: (l.strength_exercises as { name?: string } | null)?.name ?? null,
    }));

    return Response.json(result);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    const body = await request.json() as {
      player_id: string; exercise_id: string;
      weight_lbs: number; reps?: number;
      tempo?: string; session_notes?: string;
    };

    if (!body.player_id || !body.exercise_id || !body.weight_lbs) {
      return apiError('player_id, exercise_id, and weight_lbs are required', 400);
    }

    const { data, error } = await db
      .insert('strength_lifts', {
        player_id:     body.player_id,
        exercise_id:   body.exercise_id,
        weight_lbs:    body.weight_lbs,
        reps:          body.reps ?? 1,
        tempo:         body.tempo ?? null,
        session_notes: body.session_notes ?? null,
        recorded_by:   db.userId,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
