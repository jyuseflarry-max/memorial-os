/** GET /api/strength/readiness — roster readiness from vibe_checks */
import { getDb } from '@/lib/db';
import { apiError } from '@/lib/api-error';
import { vibeToReadinessStatus } from '@/lib/strength-utils';

export async function GET() {
  try {
    const db = await getDb();

    const [playersRes, vibeRes] = await Promise.all([
      db.from('players').select('id, name, jersey_number, team_id, class_year').eq('status', 'Active'),
      db.from('vibe_checks')
        .select('player_id, sleep_hours, soreness, stress, mood_energy, vibe_score, submitted_at')
        .order('submitted_at', { ascending: false }),
    ]);

    const players = playersRes.data ?? [];
    const vibes   = vibeRes.data   ?? [];

    // Latest vibe check per player
    const latestVibe = new Map<string, typeof vibes[number]>();
    for (const v of vibes) {
      if (!latestVibe.has(v.player_id)) latestVibe.set(v.player_id, v);
    }

    const rows = players.map((p: { id: string; name: string; jersey_number: number | null; team_id: string | null; class_year: string | null }) => {
      const vibe = latestVibe.get(p.id) ?? null;
      const status = vibe
        ? vibeToReadinessStatus(vibe.sleep_hours, vibe.soreness, vibe.mood_energy)
        : null;

      return {
        player_id:    p.id,
        player_name:  p.name,
        jersey_number: p.jersey_number,
        team_id:      p.team_id,
        class_year:   p.class_year,
        status,
        sleep_hours:  vibe?.sleep_hours  ?? null,
        soreness:     vibe?.soreness     ?? null,
        stress:       vibe?.stress       ?? null,
        mood_energy:  vibe?.mood_energy  ?? null,
        vibe_score:   vibe?.vibe_score   ?? null,
        submitted_at: vibe?.submitted_at ?? null,
      };
    });

    return Response.json(rows);
  } catch (err) {
    return apiError(err);
  }
}
