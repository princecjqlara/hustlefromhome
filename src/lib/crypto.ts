import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
export function encrypt(text: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "hex"),
    iv,
  );
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    data.toString("hex"),
  ].join(".");
}
export function decrypt(text: string) {
  const [iv, tag, data] = text.split(".");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "hex"),
    Buffer.from(iv, "hex"),
  );
  cipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    cipher.update(Buffer.from(data, "hex")),
    cipher.final(),
  ]).toString("utf8");
}
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function validSignature(
  body: string,
  signature: string,
  secret: string,
) {
  return safeEqual(
    signature,
    "sha256=" + createHmac("sha256", secret).update(body).digest("hex"),
  );
}
