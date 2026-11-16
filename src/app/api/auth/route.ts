import { NextResponse } from "next/server";
import { authClient, sameOrigin, apiError } from "@/lib/auth";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { email, password, logout } = await request.json();
    const client = await authClient();
    if (logout) {
      await client.auth.signOut();
      return NextResponse.json({ ok: true });
    }
    if (typeof email !== "string" || typeof password !== "string")
      throw new Error("Email and password required");
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Invalid email or password");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
