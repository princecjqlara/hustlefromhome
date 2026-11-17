import { NextResponse } from "next/server";
import { authClient, sameOrigin, apiError } from "@/lib/auth";
import { normalizeEmail, loginFailure } from "@/lib/login";
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
    const { error } = await client.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) {
      const failure = loginFailure(error);
      return NextResponse.json(
        { error: failure.message },
        { status: failure.status },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
