/** GET /api/strength/dashboard — executive traffic-light roster */
import { getDb }          from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server';
import { decryptField }   from '@/lib/strength-crypto';
import { calcSWR, calcLiftTrafficLight, compositeTrafficLight } from '@/lib/strength-utils';
import { apiError }       from '@/lib/api-error';
import type { PlayerStrengthCard } from '@/types/strength';

export async function GET() {
  try {
    const db = await getDb();

    const [playersRes, liftsRes, readinessRes, biosRes] = await Promise.all([
      db.from('players').select('id, name, jersey_number'),
      db.from('strength_lifts').select('player_id, exercise_id, weight_lbs, estimated_1rm, recorded_at, strength_exercises(name, is_primary_lift)'),
      db.from('strength_readiness').select('player_id, score_date, status').gte('score_date', (() => { const d = new Date(); d.setDate(d.getDate()-28); return d.toISOString().split('T')[0]; })()).order('score_date', { ascending: false }),
      db.from('strength_biometrics').select('player_id, bw_enc'),
    ]);

    const players   = playersRes.data   ?? [];
    const allLifts  = liftsRes.data     ?? [];
    const readiness = readinessRes.data ?? [];
    const bios      = biosRes.data      ?? [];

    // Build lookup maps
    const bioMap = new Map(bios.map((b: Record<string,unknown>) => [b.player_id, b]));
    const readinessMap = new Map<string, string[]>();
    for (const r of readiness as { player_id: string; status: string }[]) {
      const arr = readinessMap.get(r.player_id) ?? [];
      arr.push(r.status);
      readinessMap.set(r.player_id, arr);
    }
    const today = new Date().toISOString().split('T')[0];

    const cards: PlayerStrengthCard[] = (players as { id: string; name: string; jersey_number: number | null }[]).map(p => {
      // Primary lifts only
      const primaryLifts = (allLifts as Record<string,unknown>[]).filter(
        l => l.player_id === p.id && (l.strength_exercises as { is_primary_lift?: boolean } | null)?.is_primary_lift
      );

      // Best primary lift (highest estimated_1rm)
      const bestLift = primaryLifts.reduce<Record<string,unknown> | null>(
        (best, l) => (!best || Number(l.estimated_1rm) > Number(best.estimated_1rm) ? l : best), null
      );

      // Traffic light from lift history
      const playerLifts = primaryLifts.map(l => ({ weight_lbs: Number(l.weight_lbs), recorded_at: l.recorded_at as string }));
      const liftStatus  = calcLiftTrafficLight(playerLifts);

      // Readiness history
      const recentReadiness = (readinessMap.get(p.id) ?? []) as Array<'green'|'yellow'|'red'>;
      const todayReadiness  = (readiness as { player_id: string; score_date: string; status: string }[])
        .find(r => r.player_id === p.id && r.score_date === today)?.status as 'green'|'yellow'|'red'|undefined ?? null;

      const trafficLight = compositeTrafficLight(liftStatus, recentReadiness);

      // SWR
      const bio = bioMap.get(p.id) as { bw_enc?: string } | undefined;
      const bwStr = decryptField(bio?.bw_enc ?? null);
      const bw = bwStr ? parseFloat(bwStr) : null;
      const bestSwr = bw && bestLift ? calcSWR(Number(bestLift.estimated_1rm), bw) : null;

      // Lift trend
      const sortedLifts = [...playerLifts].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      const trend: 'up'|'down'|'flat'|null =
        sortedLifts.length >= 2
          ? sortedLifts[0].weight_lbs > sortedLifts[1].weight_lbs ? 'up'
          : sortedLifts[0].weight_lbs < sortedLifts[1].weight_lbs ? 'down'
          : 'flat'
        : null;

      // Weeks since last update
      const lastLift = sortedLifts[0];
      const weeksSince = lastLift
        ? Math.floor((Date.now() - new Date(lastLift.recorded_at).getTime()) / (7 * 24 * 3600 * 1000))
        : null;

      return {
        player_id:        p.id,
        player_name:      p.name,
        jersey_number:    p.jersey_number,
        traffic_light:    trafficLight,
        today_readiness:  todayReadiness,
        best_swr:         bestSwr,
        best_lift_name:   (bestLift?.strength_exercises as { name?: string } | null)?.name ?? null,
        best_1rm:         bestLift ? Number(bestLift.estimated_1rm) : null,
        lift_trend:       trend,
        weeks_since_update: weeksSince,
      };
    });

    return Response.json(cards);
  } catch (err) {
    return apiError(err);
  }
}
