import { member, apiError } from "@/lib/auth";
import { db, checked } from "@/lib/db";
import { graph } from "@/lib/facebook";
import { decrypt } from "@/lib/crypto";
export async function GET(req: Request) {
  try {
    await member();
    const id = new URL(req.url).searchParams.get("page_id");
    const page = checked(
      await db().from("pages").select("*").eq("id", id).single(),
    );
    const templates = await graph(
      `${page.id}/message_templates?fields=id,name,status,category,language,components&limit=100`,
      decrypt(page.token_encrypted),
    );
    return Response.json(
      { templates: templates.data || [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
