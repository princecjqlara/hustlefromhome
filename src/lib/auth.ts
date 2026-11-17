import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db, checked } from "./db";
import { allowedOrigin } from "./login";
export async function authClient() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}
export async function member() {
  const client = await authClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const membership = checked(
    await db().from("members").select("*").eq("user_id", user.id).maybeSingle(),
  );
  if (!membership) throw new Error("Forbidden");
  return { ...membership, email: user.email };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    !allowedOrigin(
      origin,
      request.url,
      request.headers.get("host"),
      process.env.APP_URL,
    )
  )
    throw new Error("Forbidden origin");
}
export function apiError(error: unknown) {
  const msg = error instanceof Error ? error.message : "Request failed";
  const status =
    msg === "Unauthorized" ? 401 : msg.startsWith("Forbidden") ? 403 : 400;
  return Response.json({ error: msg }, { status });
}
