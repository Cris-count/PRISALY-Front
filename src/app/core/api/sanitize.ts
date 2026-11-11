// Removes secrets before anything is shown or kept in the diagnostics log.
// Keys ending in "token" (accessToken, sesionToken…) but not descriptors such as tokenType.
const SECRET_KEY = /token$|password|contrasena|hash|hmac|secret|authorization|cookie|^codigo$/i;

export const REDACTED = "«oculto»";

export function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
        key,
        SECRET_KEY.test(key) && inner !== null ? REDACTED : sanitize(inner),
      ]),
    );
  }
  return value;
}
