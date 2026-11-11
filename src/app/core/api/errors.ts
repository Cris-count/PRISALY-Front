// Maps an HTTP failure to a stable kind plus the server's own code/message.

export type ApiErrorKind =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "method_not_allowed"
  | "conflict"
  | "server"
  | "not_implemented"
  | "network"
  | "unexpected";

export interface ApiError {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code: string | null;
  readonly message: string;
}

const KIND_BY_STATUS: Readonly<Record<number, ApiErrorKind>> = {
  400: "validation",
  401: "unauthenticated",
  403: "forbidden",
  404: "not_found",
  405: "method_not_allowed",
  409: "conflict",
  422: "validation",
  501: "not_implemented",
};

export const KIND_LABEL: Readonly<Record<ApiErrorKind, string>> = {
  validation: "Datos no válidos (400)",
  unauthenticated: "No autenticado (401)",
  forbidden: "Sin permiso (403)",
  not_found: "No encontrado (404)",
  method_not_allowed: "Método no registrado (405)",
  conflict: "Conflicto (409)",
  server: "Error del servidor (5xx)",
  not_implemented: "Pendiente de ratificación (501)",
  network: "Sin conexión con la API",
  unexpected: "Respuesta inesperada",
};

function kindFor(status: number): ApiErrorKind {
  const known = KIND_BY_STATUS[status];
  if (known !== undefined) {
    return known;
  }
  return status >= 500 ? "server" : "unexpected";
}

function readString(body: unknown, key: string): string | null {
  if (body !== null && typeof body === "object" && key in body) {
    const value = (body as Record<string, unknown>)[key];
    return typeof value === "string" ? value : null;
  }
  return null;
}

// Backend error bodies use {code, message}; Spring defaults use {error, detail/title}.
export function toApiError(status: number, body: unknown): ApiError {
  const code = readString(body, "code") ?? readString(body, "error");
  const message =
    readString(body, "message") ??
    readString(body, "detail") ??
    readString(body, "title") ??
    `El servidor respondió ${status}`;
  return { kind: kindFor(status), status, code, message };
}

export function networkError(cause: unknown): ApiError {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return {
    kind: "network",
    status: 0,
    code: null,
    message: `No se pudo contactar la API (${detail}). ¿Está arrancado el backend y permite CORS para este origen?`,
  };
}
