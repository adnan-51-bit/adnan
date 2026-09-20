import crypto from "crypto";

export function verifyHmac(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}
