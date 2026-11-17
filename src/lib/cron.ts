import { safeEqual } from "./crypto";

export async function handleCron(
  req: Request,
  run: () => Promise<unknown>,
  secret: string | undefined,
) {
  const headers = { "Cache-Control": "no-store" };
  const authorized =
    !!secret &&
    safeEqual(req.headers.get("authorization") || "", `Bearer ${secret}`);

  // Next.js otherwise implements HEAD by invoking GET, which would run jobs.
  if (req.method === "HEAD")
    return new Response(null, { status: authorized ? 204 : 401, headers });

  if (!authorized)
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });

  try {
    return Response.json({ results: await run() }, { headers });
  } catch {
    return Response.json(
      { error: "Job runner failed" },
      { status: 500, headers },
    );
  }
}
