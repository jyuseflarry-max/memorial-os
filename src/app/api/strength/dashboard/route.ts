/** GET /api/strength/dashboard — executive traffic-light roster */
import { getDb }          from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server';
import { decryptField }   from '@/lib/strength-crypto';
import { calcSWR, calcLiftTrafficLight, compositeTrafficLight, vibeToReadinessStatus } from '@/lib/strength-utils';
import { apiError }       from '@/lib/api-error';
import type { PlayerStrengthCard } from '@/types/strength';

export async function GET() {
  try {
    const db = await getDb();

    const [playersRes, liftsRes, readinessRes, biosRes] = await Promise.all([
      db.from('players').select('id, name, jersey_number, team_id, class_year'),
      db.from('strength_lifts').select('player_id, exercise_id, weight_lbs, estimated_1rm, recorded_at, strength_exercises(name, is_primary_lift)'),
      db.from('vibe_checks').select('player_id, check_date, sleep_hours, soreness, stress, mood_energy').gte('check_date', (() => { const d = new Date(); d.setDate(d.getDate()-28); return d.toISOString().split('T')[0]; })()).order('check_date', { ascending: false }),
      db.from('strength_biometrics').select('player_id, bw_enc'),
    ]);

    const players   = playersRes.data   ?? [];
    const allLifts  = liftsRes.data     ?? [];
    const vibeRows  = readinessRes.data ?? [];
    const bios      = biosRes.data      ?? [];

    type VibeRow = { player_id: string; check_date: string; sleep_hours: number; soreness: number; stress: number; mood_energy: number };

    // Build lookup maps
    const bioMap = new Map(bios.map((b: Record<string,unknown>) => [b.player_id, b]));
    const vibeMap = new Map<string, Array<'green'|'yellow'|'red'>>();
    for (const r of vibeRows as VibeRow[]) {
      const status = vibeToReadinessStatus(r.sleep_hours, r.soreness, r.mood_energy, r.stress);
      const arr = vibeMap.get(r.player_id) ?? [];
      arr.push(status);
      vibeMap.set(r.player_id, arr);
    }
    const today = new Date().toISOString().split('T')[0];

    const cards: PlayerStrengthCard[] = (players as { id: string; name: string; jersey_number: number | null; team_id: string | null; class_year: string | null }[]).map(p => {
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

      // Readiness derived from vibe checks
      const recentReadiness = vibeMap.get(p.id) ?? [];
      const todayVibe = (vibeRows as VibeRow[]).find(r => r.player_id === p.id && r.check_date === today);
      const todayReadiness = todayVibe
        ? vibeToReadinessStatus(todayVibe.sleep_hours, todayVibe.soreness, todayVibe.mood_energy, todayVibe.stress)
        : null;

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
        team_id:          p.team_id,
        class_year:       p.class_year,
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
