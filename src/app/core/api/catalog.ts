// Catalog of the HTTP routes that exist in PRISALY-Backend (verified against the controllers).
// It is the only place where paths are written; pages and the diagnostics panel read from here.

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH";

// personal: may carry the personnel Bearer token. none: never carries credentials
// (student routes must never receive a personnel token as student identity).
export type AuthMode = "personal" | "none";

// disponible: implemented and callable. restringido: callable but the server denies it
// in the current state (pending policy). pendiente: no route exists yet.
export type Availability = "disponible" | "restringido" | "pendiente";

export type ModuleId = "APP" | "M1" | "M3" | "M4" | "M5" | "M6";

export interface EndpointDef {
  readonly id: string;
  readonly module: ModuleId;
  readonly label: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly auth: AuthMode;
  readonly availability: Availability;
  readonly note: string;
}

export const endpoints = {
  health: {
    id: "health", module: "APP", label: "Estado de la API", method: "GET", path: "/health",
    auth: "none", availability: "disponible", note: "Comprobación de conexión.",
  },
  personalAutenticar: {
    id: "personalAutenticar", module: "M1", label: "Autenticar personal", method: "POST",
    path: "/v1/personal/autenticar", auth: "none", availability: "disponible",
    note: "Devuelve un token Bearer provisional (TD-M1-AUTH-PROVISIONAL).",
  },
  personalMe: {
    id: "personalMe", module: "M1", label: "Identidad actual", method: "GET", path: "/v1/personal/me",
    auth: "personal", availability: "disponible", note: "Requiere token del personal.",
  },
  personalCrearCaso: {
    id: "personalCrearCaso", module: "M1", label: "Comprobar permiso CREAR_CASO", method: "GET",
    path: "/v1/personal/autorizacion/crear-caso", auth: "personal", availability: "disponible",
    note: "403 si el usuario no tiene CREAR_CASO.",
  },
  personalCerrarSesion: {
    id: "personalCerrarSesion", module: "M1", label: "Cerrar sesión", method: "POST",
    path: "/v1/personal/cerrar-sesion", auth: "personal", availability: "disponible",
    note: "Revoca el token provisional.",
  },
  estudianteValidar: {
    id: "estudianteValidar", module: "M1", label: "Validar acceso estudiantil (DD-02)", method: "POST",
    path: "/v1/acceso-estudiante/validar", auth: "none", availability: "restringido",
    note: "Responde 501 mientras DD-02 no esté ratificada.",
  },
  estudianteAutenticar: {
    id: "estudianteAutenticar", module: "M1", label: "Autenticar estudiante (DD-02)", method: "POST",
    path: "/v1/acceso-estudiante/autenticar", auth: "none", availability: "restringido",
    note: "Responde 501 con el acceso estudiantil desactivado.",
  },
  casoCrear: {
    id: "casoCrear", module: "M3", label: "Crear caso (borrador)", method: "POST", path: "/v1/casos",
    auth: "personal", availability: "disponible", note: "Requiere CREAR_CASO. Crea el caso en Borrador.",
  },
  sesionListar: {
    id: "sesionListar", module: "M4", label: "Listar sesiones", method: "GET", path: "/m4/sesiones",
    auth: "personal", availability: "disponible", note: "Sesiones autorizadas para el usuario.",
  },
  sesionConsultar: {
    id: "sesionConsultar", module: "M4", label: "Consultar sesión", method: "GET",
    path: "/m4/sesiones/:sesionId", auth: "personal", availability: "disponible", note: "",
  },
  sesionCrear: {
    id: "sesionCrear", module: "M4", label: "Crear sesión", method: "POST", path: "/m4/sesiones",
    auth: "personal", availability: "disponible", note: "Requiere GESTIONAR_SESION.",
  },
  sesionActualizar: {
    id: "sesionActualizar", module: "M4", label: "Modificar programación", method: "PUT",
    path: "/m4/sesiones/:sesionId", auth: "personal", availability: "disponible",
    note: "Requiere GESTIONAR_SESION.",
  },
  sesionEstado: {
    id: "sesionEstado", module: "M4", label: "Cambiar estado", method: "PATCH",
    path: "/m4/sesiones/:sesionId/estado", auth: "personal", availability: "disponible",
    note: "SinIniciar → EnCurso → Finalizado.",
  },
  convocatoriaListar: {
    id: "convocatoriaListar", module: "M4", label: "Consultar convocatorias", method: "GET",
    path: "/m4/sesiones/:sesionId/convocatorias", auth: "personal", availability: "disponible", note: "",
  },
  convocatoriaCrear: {
    id: "convocatoriaCrear", module: "M4", label: "Convocar estudiante", method: "POST",
    path: "/m4/sesiones/:sesionId/convocatorias", auth: "personal", availability: "disponible",
    note: "Requiere GESTIONAR_SESION.",
  },
  intentoConsultar: {
    id: "intentoConsultar", module: "M5", label: "Consultar intento propio", method: "GET",
    path: "/v1/estudiantes/intentos/:idIntento", auth: "none", availability: "restringido",
    note: "Requiere identidad estudiantil (DD-02); hoy se deniega.",
  },
  intentoGuardarRespuesta: {
    id: "intentoGuardarRespuesta", module: "M5", label: "Guardar respuesta", method: "PUT",
    path: "/v1/estudiantes/intentos/:idIntento/respuestas/:idPregunta", auth: "none",
    availability: "restringido", note: "Requiere identidad estudiantil (DD-02); hoy se deniega.",
  },
} as const satisfies Record<string, EndpointDef>;

export type EndpointId = keyof typeof endpoints;

// Operations named in the design that have no HTTP route in the backend yet.
export interface PendingOperation {
  readonly module: ModuleId;
  readonly label: string;
  readonly reason: string;
}

export const pendingOperations: readonly PendingOperation[] = [
  { module: "M3", label: "Consultar caso", reason: "No existe GET /v1/casos/{id}." },
  { module: "M3", label: "Actualizar caso", reason: "No existe PATCH /v1/casos/{id}." },
  { module: "M3", label: "Validar o publicar caso", reason: "Sin ruta ni política de publicación autorizada." },
  { module: "M5", label: "Iniciar intento", reason: "POST /v1/estudiantes/sesiones/{id}/intentos no está registrado." },
  { module: "M5", label: "Finalizar intento", reason: "POST /v1/estudiantes/intentos/{id}/finalizar no está registrado." },
  { module: "M6", label: "Evaluación y calificación", reason: "M6 no expone rutas HTTP; la autorización de evaluación está DENEGADA sin política ratificada." },
];

export const allEndpoints: readonly EndpointDef[] = Object.values(endpoints);
