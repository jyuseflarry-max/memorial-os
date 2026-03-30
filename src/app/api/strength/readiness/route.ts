/** GET /api/strength/readiness — roster readiness from vibe_checks with 14-day averages */
import { getDb } from '@/lib/db';
import { apiError } from '@/lib/api-error';
import { vibeToReadinessStatus, readinessLoadFactor } from '@/lib/strength-utils';

function avg(arr: number[]): number | null {
  if (!arr.length) return null;
  return Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10;
}

export async function GET() {
  try {
    const db = await getDb();

    const since14 = new Date();
    since14.setDate(since14.getDate() - 14);

    const [playersRes, allVibeRes, windowVibeRes] = await Promise.all([
      db.from('players').select('id, name, jersey_number, team_id, class_year, status'),
      db.from('vibe_checks')
        .select('player_id, sleep_hours, soreness, stress, mood_energy, vibe_score, submitted_at')
        .order('submitted_at', { ascending: false }),
      db.from('vibe_checks')
        .select('player_id, sleep_hours, soreness, stress, mood_energy')
        .gte('submitted_at', since14.toISOString()),
    ]);

    const players    = playersRes.data    ?? [];
    const allVibes   = allVibeRes.data    ?? [];
    const windowVibes = windowVibeRes.data ?? [];

    type VibeRow = {
      player_id: string;
      sleep_hours: number;
      soreness: number;
      stress: number;
      mood_energy: number;
      vibe_score?: number;
      submitted_at?: string;
    };

    // Latest vibe check per player
    const latestVibe = new Map<string, VibeRow>();
    for (const v of allVibes as VibeRow[]) {
      if (!latestVibe.has(v.player_id)) latestVibe.set(v.player_id, v);
    }

    // 14-day history grouped by player
    const windowMap = new Map<string, VibeRow[]>();
    for (const v of windowVibes as VibeRow[]) {
      const arr = windowMap.get(v.player_id) ?? [];
      arr.push(v);
      windowMap.set(v.player_id, arr);
    }

    const rows = (players as { id: string; name: string; jersey_number: number | null; team_id: string | null; class_year: string | null; status: string }[]).map(p => {
      const vibe   = latestVibe.get(p.id) ?? null;
      const window = windowMap.get(p.id)  ?? [];

      const status = vibe
        ? vibeToReadinessStatus(vibe.sleep_hours, vibe.soreness, vibe.mood_energy, vibe.stress)
        : null;

      // Average load over the 14-day window
      const avgLoadPct = window.length
        ? Math.round(
            window.reduce((sum, v) => {
              const s = vibeToReadinessStatus(v.sleep_hours, v.soreness, v.mood_energy, v.stress);
              return sum + readinessLoadFactor(s) * 100;
            }, 0) / window.length
          )
        : null;

      return {
        player_id:      p.id,
        player_name:    p.name,
        jersey_number:  p.jersey_number,
        team_id:        p.team_id,
        class_year:     p.class_year,
        player_status:  p.status,
        status,
        load_pct:       status ? Math.round(readinessLoadFactor(status) * 100) : null,
        avg_load_pct:   avgLoadPct,
        // Latest values
        sleep_hours:    vibe?.sleep_hours  ?? null,
        soreness:       vibe?.soreness     ?? null,
        stress:         vibe?.stress       ?? null,
        mood_energy:    vibe?.mood_energy  ?? null,
        submitted_at:   vibe?.submitted_at ?? null,
        // 14-day averages
        avg_sleep:       avg(window.map(v => v.sleep_hours)),
        avg_soreness:    avg(window.map(v => v.soreness)),
        avg_stress:      avg(window.map(v => v.stress)),
        avg_mood_energy: avg(window.map(v => v.mood_energy)),
        check_in_count:  window.length,
      };
    });

    return Response.json(rows);
  } catch (err) {
    return apiError(err);
  }
}
