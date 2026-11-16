import { cookies } from "next/headers";
import { member, apiError } from "@/lib/auth";
import { safeEqual, encrypt } from "@/lib/crypto";
import { graph } from "@/lib/facebook";
import { db, checked, audit } from "@/lib/db";
export async function GET(req: Request) {
  try {
    const user = await member();
    const q = new URL(req.url).searchParams;
    const jar = await cookies();
    if (
      !q.get("state") ||
      !safeEqual(q.get("state")!, jar.get("meta_oauth_state")?.value || "")
    )
      throw new Error("Forbidden OAuth state");
    jar.delete("meta_oauth_state");
    if (q.get("error")) throw new Error("Facebook connection declined");
    const token = await graph(
      "oauth/access_token",
      `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`,
      {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: `${process.env.APP_URL}/api/facebook/callback`,
        code: q.get("code"),
      },
    );
    const longLived = await graph(
      "oauth/access_token",
      `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`,
      {
        grant_type: "fb_exchange_token",
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: token.access_token,
      },
    );
    token.access_token = longLived.access_token;
    const result = await graph(
      "me/accounts?fields=id,name,access_token&limit=100",
      token.access_token,
    );
    const pages = result.data || [];
    // Page tokens remain in the database; the browser gets only a short-lived random reference.
    checked(
      await db()
        .from("oauth_sessions")
        .delete()
        .lt("expires_at", new Date().toISOString()),
    );
    const pending = checked(
      await db()
        .from("oauth_sessions")
        .insert({
          user_id: user.user_id,
          pages_encrypted: encrypt(JSON.stringify(pages)),
        })
        .select("id")
        .single(),
    );
    jar.set("meta_pending_pages", pending.id, {
      httpOnly: true,
      secure: process.env.APP_URL?.startsWith("https"),
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    try {
      const accounts = await graph(
        "me/adaccounts?fields=id,name&limit=100",
        token.access_token,
      );
      for (const account of accounts.data || [])
        checked(
          await db()
            .from("ad_accounts")
            .upsert({
              id: account.id,
              name: account.name,
              token_encrypted: encrypt(token.access_token),
            }),
        );
    } catch {
      await audit("ads.permission_missing", {}, user.user_id);
    }
    return Response.redirect(`${process.env.APP_URL}/settings?selectPages=1`);
  } catch (e) {
    return apiError(e);
  }
}
