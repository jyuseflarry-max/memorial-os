/** GET/POST /api/inventory/kit-templates */
import { getDb }    from '@/lib/db';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db
      .from('inventory_kit_templates')
      .select('*')
      .order('name');
    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, team_id, items } = body;
    if (!name) return apiError('name is required', 400);

    const db = await getDb();
    const { data, error } = await db
      .insert('inventory_kit_templates', {
        name,
        team_id: team_id ?? null,
        items:   items   ?? [],
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
