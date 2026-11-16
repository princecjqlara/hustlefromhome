import https from "node:https";
import { resolveNgrok } from "./ngrok-dns.mjs";
/** Keep TLS hostname verification intact; use process-local DNS only when local DNS fails. */
export async function publicGet(url) {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(20000) });
  } catch (error) {
    if (
      !["ENOTFOUND", "ECONNRESET", "EAI_AGAIN", "ETIMEDOUT"].includes(
        error.cause?.code,
      ) ||
      !new URL(url).hostname.endsWith(".ngrok-free.dev")
    )
      throw error;
    const addresses = await resolveNgrok(new URL(url).hostname);
    console.log(
      "Public verification is using OpenDNS over HTTPS; system DNS is unchanged.",
    );
    let lastError;
    for (const address of addresses) {
      try {
        return await new Promise((resolve, reject) => {
          const request = https.get(
            url,
            {
              headers: { "User-Agent": "HustleWebhookSetup/1.0" },
              lookup(hostname, options, callback) {
                if (options.all) callback(null, [{ address, family: 4 }]);
                else callback(null, address, 4);
              },
            },
            (response) => {
              const chunks = [];
              response.on("data", (chunk) => chunks.push(chunk));
              response.on("end", () =>
                resolve(
                  new Response(Buffer.concat(chunks), {
                    status: response.statusCode,
                    headers: response.headers,
                  }),
                ),
              );
              response.on("error", reject);
            },
          );
          request.setTimeout(20000, () =>
            request.destroy(new Error("Public tunnel verification timed out")),
          );
          request.on("error", reject);
        });
      } catch (connectionError) {
        lastError = connectionError;
      }
    }
    throw lastError;
  }
}
