export async function handleCron(req: Request, run: () => Promise<unknown>) {
  const headers = { "Cache-Control": "no-store" };

  // Next.js otherwise implements HEAD by invoking GET, which would run jobs.
  if (req.method === "HEAD")
    return new Response(null, { status: 204, headers });

  try {
    return Response.json({ results: await run() }, { headers });
  } catch {
    return Response.json(
      { error: "Job runner failed" },
      { status: 500, headers },
    );
  }
}
