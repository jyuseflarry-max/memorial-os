/** GET/POST /api/inventory/items */
import { getDb }    from '@/lib/db';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db
      .from('inventory_items')
      .select('*, inventory_categories(name, useful_life_years, depreciation_method)')
      .order('name');
    if (error) throw error;

    const rows = (data ?? []).map((item: Record<string, unknown>) => {
      const cat = item.inventory_categories as { name: string; useful_life_years: number; depreciation_method: string } | null;
      return {
        ...item,
        category_name:       cat?.name ?? null,
        inventory_categories: undefined,
      };
    });

    return Response.json(rows);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, category_id, purchase_price, useful_life_years, purchased_at } = body;
    if (!name)        return apiError('name is required', 400);
    if (!category_id) return apiError('category_id is required', 400);

    const db = await getDb();
    const { data, error } = await db
      .insert('inventory_items', {
        name,
        description:       description       ?? null,
        category_id,
        purchase_price:    purchase_price    ?? null,
        useful_life_years: useful_life_years ?? 3,
        purchased_at:      purchased_at      ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
