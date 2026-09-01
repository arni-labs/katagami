// Strict `@odata.count` reader (ARN-436 review). `body["@odata.count"] ?? 0`
// turned a 200 response WITHOUT the field into a real zero — the "Total
// registered users" tile would read 0 during a Temper regression, identical
// to an empty commons. Absence and malformation are errors, never zero; the
// caller decides whether an error means throw (countMembers) or a rendered
// fallback (the gallery hero counts).

export function readODataCount(body) {
  const raw = body?.["@odata.count"];
  // OData IEEE754-compat responses serialize the count as a string ("8").
  const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0) {
    throw new Error(`@odata.count missing or malformed: ${JSON.stringify(raw)}`);
  }
  return n;
}
