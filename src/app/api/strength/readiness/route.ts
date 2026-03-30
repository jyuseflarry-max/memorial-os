/** GET /api/strength/readiness — roster readiness from vibe_checks with 7-day averages */
import { getDb } from '@/lib/db';
import { apiError } from '@/lib/api-error';
import { vibeToReadinessStatus } from '@/lib/strength-utils';

function avg(arr: number[]): number | null {
  if (!arr.length) return null;
  return Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10;
}

export async function GET() {
  try {
    const db = await getDb();

    const since7 = new Date();
    since7.setDate(since7.getDate() - 7);

    const [playersRes, allVibeRes, weekVibeRes] = await Promise.all([
      db.from('players').select('id, name, jersey_number, team_id, class_year').eq('status', 'Active'),
      // All-time latest per player
      db.from('vibe_checks')
        .select('player_id, sleep_hours, soreness, stress, mood_energy, vibe_score, submitted_at')
        .order('submitted_at', { ascending: false }),
      // Last 7 days for averages
      db.from('vibe_checks')
        .select('player_id, sleep_hours, soreness, stress, mood_energy')
        .gte('submitted_at', since7.toISOString()),
    ]);

    const players  = playersRes.data  ?? [];
    const allVibes = allVibeRes.data  ?? [];
    const weekVibes = weekVibeRes.data ?? [];

    type VibeRow = { player_id: string; sleep_hours: number; soreness: number; stress: number; mood_energy: number; vibe_score?: number; submitted_at?: string };

    // Latest vibe check per player
    const latestVibe = new Map<string, VibeRow>();
    for (const v of allVibes as VibeRow[]) {
      if (!latestVibe.has(v.player_id)) latestVibe.set(v.player_id, v);
    }

    // 7-day history grouped by player
    const weekMap = new Map<string, VibeRow[]>();
    for (const v of weekVibes as VibeRow[]) {
      const arr = weekMap.get(v.player_id) ?? [];
      arr.push(v);
      weekMap.set(v.player_id, arr);
    }

    const rows = (players as { id: string; name: string; jersey_number: number | null; team_id: string | null; class_year: string | null }[]).map(p => {
      const vibe  = latestVibe.get(p.id) ?? null;
      const week  = weekMap.get(p.id) ?? [];
      const status = vibe ? vibeToReadinessStatus(vibe.sleep_hours, vibe.soreness, vibe.mood_energy) : null;

      return {
        player_id:     p.id,
        player_name:   p.name,
        jersey_number: p.jersey_number,
        team_id:       p.team_id,
        class_year:    p.class_year,
        status,
        // Latest values
        sleep_hours:  vibe?.sleep_hours  ?? null,
        soreness:     vibe?.soreness     ?? null,
        stress:       vibe?.stress       ?? null,
        mood_energy:  vibe?.mood_energy  ?? null,
        vibe_score:   vibe?.vibe_score   ?? null,
        submitted_at: vibe?.submitted_at ?? null,
        // 7-day averages
        avg_sleep:      avg(week.map(v => v.sleep_hours)),
        avg_soreness:   avg(week.map(v => v.soreness)),
        avg_stress:     avg(week.map(v => v.stress)),
        avg_mood_energy: avg(week.map(v => v.mood_energy)),
        check_in_count: week.length,
      };
    });

    return Response.json(rows);
  } catch (err) {
    return apiError(err);
  }
}
