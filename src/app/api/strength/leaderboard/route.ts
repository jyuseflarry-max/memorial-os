/** GET /api/strength/leaderboard?exercise_id=
 *  Returns ranked SWR leaderboard. Body weight is NEVER included in the response. */
import { NextRequest } from 'next/server';
import { getDb }          from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server';
import { decryptField }   from '@/lib/strength-crypto';
import { calcSWR }        from '@/lib/strength-utils';
import { apiError }       from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const db  = await getDb();
    const url = new URL(request.url);
    const exerciseId = url.searchParams.get('exercise_id');

    // Fetch primary lifts (or specific exercise)
    let liftsQ = db.from('strength_lifts')
      .select('player_id, exercise_id, estimated_1rm, is_verified, recorded_at');
    if (exerciseId) liftsQ = liftsQ.eq('exercise_id', exerciseId);

    const [liftsRes, biosRes, playersRes, exercisesRes] = await Promise.all([
      liftsQ.order('estimated_1rm', { ascending: false }),
      db.from('strength_biometrics').select('player_id, bw_enc'),
      db.from('players').select('id, name'),
      db.from('strength_exercises').select('id, name').eq('is_primary_lift', true),
    ]);

    const lifts     = liftsRes.data     ?? [];
    const bios      = biosRes.data      ?? [];
    const players   = playersRes.data   ?? [];
    const exercises = exercisesRes.data ?? [];

    const bioMap     = new Map(bios.map((b: Record<string,unknown>) => [b.player_id as string, decryptField(b.bw_enc as string | null)]));
    const playerMap  = new Map((players as { id: string; name: string }[]).map(p => [p.id, p.name]));
    const exerciseMap = new Map((exercises as { id: string; name: string }[]).map(e => [e.id, e.name]));

    // Best lift per player per exercise
    const bestMap = new Map<string, Record<string,unknown>>();
    for (const lift of lifts as Record<string,unknown>[]) {
      const key = `${lift.player_id}::${lift.exercise_id}`;
      const existing = bestMap.get(key);
      if (!existing || Number(lift.estimated_1rm) > Number(existing.estimated_1rm)) {
        bestMap.set(key, lift);
      }
    }

    const entries = [...bestMap.values()]
      .map(lift => {
        const bwStr = bioMap.get(lift.player_id as string);
        const bw = bwStr ? parseFloat(bwStr) : null;
        return {
          player_id:     lift.player_id as string,
          player_name:   playerMap.get(lift.player_id as string) ?? 'Unknown',
          exercise_id:   lift.exercise_id as string,
          exercise_name: exerciseMap.get(lift.exercise_id as string) ?? 'Unknown',
          best_1rm:      Number(lift.estimated_1rm),
          swr:           bw ? calcSWR(Number(lift.estimated_1rm), bw) : null,
          is_verified:   Boolean(lift.is_verified),
          // body_weight intentionally omitted — only SWR is exposed
        };
      })
      .sort((a, b) => (b.swr ?? b.best_1rm) - (a.swr ?? a.best_1rm))
      .map((entry, i) => ({ rank: i + 1, ...entry }));

    return Response.json({ entries, exercises: [...exerciseMap.entries()].map(([id, name]) => ({ id, name })) });
  } catch (err) {
    return apiError(err);
  }
}
