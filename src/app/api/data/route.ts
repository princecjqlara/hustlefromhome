import { cookies } from "next/headers";
import { member, apiError } from "@/lib/auth";
import { db, checked } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET() {
  try {
    const user = await member();
    const s = db();
    const out: Record<string, any> = { user };
    const tables = [
      "contacts",
      "messages",
      "settings",
      "meetings",
      "invitations",
      "jobs",
      "campaigns",
      "ad_daily",
      "audit_log",
    ];
    await Promise.all(
      tables.map(async (table) => {
        const order =
          table === "messages"
            ? "sent_at"
            : ["settings", "invitations"].includes(table)
              ? "id"
              : table === "ad_daily"
                ? "date"
                : "created_at";
        const rows: any[] = [];
        for (let offset = 0; ; offset += 1000) {
          const batch = checked(
            await s
              .from(table)
              .select("*")
              .order(order, { ascending: false })
              .range(offset, offset + 999),
          );
          rows.push(...batch);
          if (batch.length < 1000) break;
        }
        out[table] = rows;
      }),
    );
    out.pages = checked(
      await s.from("pages").select("id,name,connected,capabilities,updated_at"),
    );
    out.ad_accounts = checked(
      await s.from("ad_accounts").select("id,name,updated_at"),
    );
    out.integration = {
      webhook_url: process.env.APP_URL + "/api/webhooks/facebook",
      callback_url: process.env.APP_URL + "/api/facebook/callback",
      cron_url: process.env.APP_URL + "/api/jobs/tick",
      app_id: process.env.FACEBOOK_APP_ID,
      graph_version: process.env.FACEBOOK_GRAPH_VERSION,
      jev_model: process.env.JEV_MODEL,
    };
    const pending = (await cookies()).get("meta_pending_pages")?.value;
    if (pending) {
      const session = checked(
        await s
          .from("oauth_sessions")
          .select("pages_encrypted")
          .eq("id", pending)
          .eq("user_id", user.user_id)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle(),
      );
      if (session)
        out.pending_pages = JSON.parse(decrypt(session.pages_encrypted)).map(
          (p: any) => ({ id: p.id, name: p.name }),
        );
    }
    return Response.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
