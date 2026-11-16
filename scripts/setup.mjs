import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ...(process.env.DATABASE_CA_FILE
      ? { ca: readFileSync(process.env.DATABASE_CA_FILE, "utf8") }
      : {}),
  },
  connectionTimeoutMillis: 15000,
});
try {
  await client.connect();
  for (const file of readdirSync(
    new URL("../supabase/migrations/", import.meta.url),
  )
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await client.query(
      readFileSync(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  console.log("Database migration applied.");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } },
  );
  let found = null;
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    found = data.users.find((u) => u.email === process.env.ADMIN_EMAIL);
    if (found || data.users.length < 100) break;
  }
  if (!found) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    found = data.user;
    console.log("Administrator Auth account created.");
  }
  const { error } = await supabase
    .from("members")
    .upsert({ user_id: found.id, role: "admin" });
  if (error) throw error;
  console.log(
    "Administrator membership ready. Automation is disabled until configured.",
  );
} catch (e) {
  console.error("Setup failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
