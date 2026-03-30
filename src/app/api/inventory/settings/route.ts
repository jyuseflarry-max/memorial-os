/** GET/PUT /api/inventory/settings */
import { getDb }    from '@/lib/db';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db
      .from('inventory_settings')
      .select('*')
      .maybeSingle();
    if (error) throw error;

    // Return defaults if no row yet
    return Response.json(data ?? {
      recovery_valuation:     'depreciated',
      recovery_pct:           100,
      alumni_buyback_enabled: false,
      alumni_buyback_pct:     50,
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { recovery_valuation, recovery_pct, alumni_buyback_enabled, alumni_buyback_pct } = body;

    const db = await getDb();
    const { data, error } = await db
      .upsert('inventory_settings', {
        recovery_valuation:     recovery_valuation     ?? 'depreciated',
        recovery_pct:           recovery_pct           ?? 100,
        alumni_buyback_enabled: alumni_buyback_enabled ?? false,
        alumni_buyback_pct:     alumni_buyback_pct     ?? 50,
        updated_at:             new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return apiError(err);
  }
}
