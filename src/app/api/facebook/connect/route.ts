import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { member, apiError } from "@/lib/auth";
export async function GET() {
  try {
    await member();
    const state = randomBytes(32).toString("hex");
    (await cookies()).set("meta_oauth_state", state, {
      httpOnly: true,
      secure: process.env.APP_URL?.startsWith("https"),
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    const u = new URL(
      `https://www.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || "v27.0"}/dialog/oauth`,
    );
    u.search = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      redirect_uri: `${process.env.APP_URL}/api/facebook/callback`,
      state,
      scope:
        "pages_show_list,pages_manage_metadata,pages_messaging,pages_read_engagement,ads_read",
      response_type: "code",
    }).toString();
    return Response.redirect(u);
  } catch (e) {
    return apiError(e);
  }
}
