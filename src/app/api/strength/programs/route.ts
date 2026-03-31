/** GET/POST /api/strength/programs */
import { NextRequest } from 'next/server';
import { getDb }    from '@/lib/db';
import { apiError } from '@/lib/api-error';
import { ROLE_COACH } from '@/lib/roles';

export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db
      .from('strength_programs')
      .select('id, name, description, weeks, phase, blocks, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!ROLE_COACH.includes(db.role)) return apiError('Forbidden', 403);

    const body = await request.json() as { name: string; description?: string; weeks?: number; phase?: string; blocks?: unknown[] };
    if (!body.name?.trim()) return apiError('Name required', 400);

    const { data, error } = await db
      .insert('strength_programs', {
        name:        body.name.trim(),
        description: body.description ?? null,
        weeks:       body.weeks ?? 4,
        phase:       body.phase ?? null,
        blocks:      body.blocks ?? [],
        created_by:  db.userId,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
