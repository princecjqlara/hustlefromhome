/** Resolve through authenticated HTTPS without modifying Windows or browser DNS. */
export async function resolveNgrok(hostname) {
  if (!hostname.endsWith(".ngrok-free.dev"))
    throw new Error("Unexpected tunnel hostname");
  const header = Buffer.alloc(12);
  header.writeUInt16BE(0x100, 2);
  header.writeUInt16BE(1, 4);
  const query = Buffer.concat([
    header,
    ...hostname
      .split(".")
      .map((label) =>
        Buffer.concat([Buffer.from([label.length]), Buffer.from(label)]),
      ),
    Buffer.from([0, 0, 1, 0, 1]),
  ]);
  const response = await fetch(
    "https://doh.opendns.com/dns-query?dns=" + query.toString("base64url"),
    {
      headers: { accept: "application/dns-message" },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) throw new Error("Public DNS request failed");
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length < 12 || (data[3] & 15) !== 0)
    throw new Error("Public DNS returned no usable answer");
  function skipName(at) {
    while (at < data.length) {
      const n = data[at];
      if ((n & 0xc0) === 0xc0) return at + 2;
      if (!n) return at + 1;
      at += n + 1;
    }
    throw new Error("Invalid DNS name");
  }
  let at = 12;
  for (let i = 0; i < data.readUInt16BE(4); i++) at = skipName(at) + 4;
  const addresses = [];
  for (let i = 0; i < data.readUInt16BE(6); i++) {
    at = skipName(at);
    if (at + 10 > data.length) throw new Error("Truncated DNS answer");
    const type = data.readUInt16BE(at),
      size = data.readUInt16BE(at + 8);
    at += 10;
    if (at + size > data.length) throw new Error("Truncated DNS data");
    if (type === 1 && size === 4)
      addresses.push(Array.from(data.subarray(at, at + 4)).join("."));
    at += size;
  }
  if (!addresses.length) throw new Error("No IPv4 address found for tunnel");
  return addresses;
}
