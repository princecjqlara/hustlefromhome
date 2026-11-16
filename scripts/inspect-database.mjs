import pg from "pg";
import { readFileSync } from "node:fs";
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync("artifacts/supabase-ca.crt", "utf8"),
  },
});
try {
  await c.connect();
  const result = await c.query(
    "select tablename from pg_tables where schemaname='public' order by tablename",
  );
  console.log(result.rows.map((r) => r.tablename).join(", "));
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
