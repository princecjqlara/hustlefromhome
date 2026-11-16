import https from "node:https";
import { Resolver } from "node:dns/promises";
/** Keep TLS hostname verification intact; use process-local DNS only when local DNS fails. */
export async function publicGet(url) {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(20000) });
  } catch (error) {
    if (
      error.cause?.code !== "ENOTFOUND" ||
      !new URL(url).hostname.endsWith(".ngrok-free.dev")
    )
      throw error;
    const resolver = new Resolver();
    resolver.setServers(["208.67.222.222", "208.67.220.220", "1.1.1.1"]);
    const addresses = await resolver.resolve4(new URL(url).hostname);
    console.log(
      "Public verification is using process-local DNS; system DNS is unchanged.",
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
