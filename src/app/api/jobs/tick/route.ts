import { safeEqual } from "@/lib/crypto";
import { runJobs } from "@/lib/jobs";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(req: Request) {
  if (
    !process.env.CRON_SECRET ||
    !safeEqual(
      req.headers.get("authorization") || "",
      `Bearer ${process.env.CRON_SECRET}`,
    )
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json({ results: await runJobs() });
  } catch {
    return Response.json({ error: "Job runner failed" }, { status: 500 });
  }
}
