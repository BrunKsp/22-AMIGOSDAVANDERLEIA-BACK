import { randomUUID } from "crypto";

/**
 * Replicates C#:
 * Convert.ToBase64String(Guid.NewGuid().ToByteArray())
 *   .Replace("/", "-")
 *   .Replace("+", "_")
 */
export function generateSlug(): string {
  const uuid = randomUUID().replace(/-/g, "");
  const buffer = Buffer.from(uuid, "hex");
  return buffer.toString("base64").replace(/\//g, "-").replace(/\+/g, "_");
}
