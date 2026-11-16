import { db, checked } from "@/lib/db";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[\da-f-]{36}$/i.test(id))
    return new Response("Not found", { status: 404 });
  try {
    const target = checked(await db().rpc("track_click", { lid: id }));
    if (!target) return new Response("Not found", { status: 404 });
    const u = new URL(target);
    if (!["https:", "http:"].includes(u.protocol))
      return new Response("Invalid link", { status: 400 });
    return Response.redirect(u, 302);
  } catch {
    return new Response("Link unavailable", { status: 503 });
  }
}
