import { handleCron } from "@/lib/cron";
import { runJobs } from "@/lib/jobs";
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function tick(req: Request) {
  return handleCron(req, runJobs);
}

export { tick as GET, tick as POST, tick as HEAD };
