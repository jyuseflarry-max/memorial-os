import { NextRequest } from "next/server";
import { getDb }       from "@/lib/db";
import { apiError }    from "@/lib/api-error";
import { ROLE_STAFF }  from "@/lib/roles";

export interface Facility {
  id:         string;
  tenant_id:  string;
  name:       string;
  sort_order: number;
  created_at: string;
}

const DEFAULTS = [
  "Gym 1",
  "Gym 2",
  "Gym 3",
  "Gym Weightroom",
  "FH Weightroom",
  "Classroom",
];

export async function GET() {
  try {
    const db = await getDb();

    let { data, error } = await db
      .from("facilities")
      .select("id, tenant_id, name, sort_order, created_at")
      .order("sort_order")
      .order("name");

    if (error) throw error;

    // Auto-seed defaults if tenant has no facilities yet
    if (!data || data.length === 0) {
      const seeds = DEFAULTS.map((name, i) => ({ name, sort_order: i }));
      const { data: seeded, error: seedErr } = await db
        .insert("facilities", seeds)
        .select("id, tenant_id, name, sort_order, created_at")
        .order("sort_order");
      if (seedErr) throw seedErr;
      data = seeded;
    }

    return Response.json(data ?? []);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, sort_order } = await request.json();
    if (!name?.trim()) return apiError("name is required", 400);

    const db = await getDb();
    if (!ROLE_STAFF.includes(db.role)) return apiError("Forbidden", 403);

    const { data, error } = await db
      .insert("facilities", { name: name.trim(), sort_order: sort_order ?? 0 })
      .select("id, tenant_id, name, sort_order, created_at")
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
