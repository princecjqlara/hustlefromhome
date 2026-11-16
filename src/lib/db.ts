import "server-only";
import { createClient } from "@supabase/supabase-js";
export function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function checked<T = any>(result: {
  data: T;
  error: { message: string } | null;
}): NonNullable<T> {
  if (result.error) throw new Error(result.error.message);
  return result.data as NonNullable<T>;
}
export async function audit(
  action: string,
  details: unknown,
  actor = "system",
) {
  checked(await db().from("audit_log").insert({ action, details, actor }));
}
/** Keep bulk actions complete beyond PostgREST's default 1,000-row limit. */
export async function allRows(query: any): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const batch = checked(
      await query.order("id").range(offset, offset + 999),
    ) as any[];
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
}
