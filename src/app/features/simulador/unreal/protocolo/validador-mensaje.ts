/**
 * Validador de mensajes del protocolo PRISALY Angular <-> Unreal, v1 CANDIDATO.
 * ESTADO: PROPUESTO. No es un contrato aprobado por Direccion Central.
 *
 * Orden de comprobacion (determina el codigo de error que se reporta):
 *   1. Tamano maximo y JSON valido ..................... TAMANO_EXCEDIDO / JSON_INVALIDO
 *   2. Version del protocolo ........................... VERSION_NO_SOPORTADA
 *   3. Tipo dentro del catalogo ........................ TIPO_DESCONOCIDO
 *   4. Sobre contra sobre.schema.json .................. SOBRE_INVALIDO
 *   5. datos contra el esquema del tipo ................ DATOS_INVALIDOS
 *   6. Reglas semanticas (no expresables en el esquema):
 *        - origen permitido para ese tipo .............. ORIGEN_NO_PERMITIDO
 *        - prefijo del id coherente con el origen ...... ORIGEN_NO_PERMITIDO
 *        - respuestas (ack/error) llevan correlacion ... CORRELACION_REQUERIDA
 *        - mensajes nuevos no llevan correlacion ....... CORRELACION_NO_PERMITIDA
 */
import { validar, verificarSubconjunto, type Esquema, type ErrorEsquema } from './validador-esquema';

export const VERSION_PROTOCOLO = 1;
export const TAMANO_MAXIMO_BYTES = 16 * 1024;

export type Origen = 'unreal' | 'angular';

export interface EntradaCatalogo {
  origen: Origen | 'ambos';
  requiereAck: boolean;
  esRespuesta: boolean;
  esquema: string;
  descripcion: string;
}

export interface Catalogo {
  version: number;
  tipos: Record<string, EntradaCatalogo>;
}

export interface Mensaje<D = Record<string, unknown>> {
  v: number;
  tipo: string;
  id: string;
  correlacion: string | null;
  sesion: string;
  ts: number;
  origen: Origen;
  datos: D;
}

export type CodigoError =
  | 'TAMANO_EXCEDIDO' | 'JSON_INVALIDO' | 'VERSION_NO_SOPORTADA' | 'TIPO_DESCONOCIDO'
  | 'SOBRE_INVALIDO' | 'DATOS_INVALIDOS' | 'ORIGEN_NO_PERMITIDO'
  | 'CORRELACION_REQUERIDA' | 'CORRELACION_NO_PERMITIDA';

export type Resultado =
  | { ok: true; mensaje: Mensaje }
  | { ok: false; codigo: CodigoError; detalle: string; errores: ErrorEsquema[] };

/** Conjunto de esquemas ya cargado. Se construye desde archivos (Node) o desde imports JSON (Angular). */
export interface Esquemas {
  catalogo: Catalogo;
  sobre: Esquema;
  porTipo: Record<string, Esquema>;
}

export function crearEsquemas(catalogo: Catalogo, sobre: Esquema, porArchivo: Record<string, Esquema>): Esquemas {
  verificarSubconjunto(sobre, 'sobre');
  const porTipo: Record<string, Esquema> = {};
  for (const [tipo, entrada] of Object.entries(catalogo.tipos)) {
    const esq = porArchivo[entrada.esquema];
    if (!esq) throw new Error(`Falta el esquema ${entrada.esquema} del tipo ${tipo}`);
    verificarSubconjunto(esq, entrada.esquema);
    porTipo[tipo] = esq;
  }
  const enumSobre = ((sobre['properties'] as Record<string, Esquema>)['tipo']['enum'] as string[]).slice().sort();
  const enumCatalogo = Object.keys(catalogo.tipos).sort();
  if (JSON.stringify(enumSobre) !== JSON.stringify(enumCatalogo)) {
    throw new Error('El enum de tipos del sobre no coincide con el catalogo');
  }
  return { catalogo, sobre, porTipo };
}

const fallo = (codigo: CodigoError, detalle: string, errores: ErrorEsquema[] = []): Resultado =>
  ({ ok: false, codigo, detalle, errores });

export function validarTexto(esquemas: Esquemas, texto: string): Resultado {
  const bytes = new TextEncoder().encode(texto).length;
  if (bytes > TAMANO_MAXIMO_BYTES) return fallo('TAMANO_EXCEDIDO', `${bytes} bytes > ${TAMANO_MAXIMO_BYTES}`);
  let valor: unknown;
  try { valor = JSON.parse(texto); } catch (e) { return fallo('JSON_INVALIDO', (e as Error).message); }
  return validarObjeto(esquemas, valor);
}

export function validarObjeto(esquemas: Esquemas, valor: unknown): Resultado {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return fallo('SOBRE_INVALIDO', 'el mensaje debe ser un objeto JSON');
  }
  const crudo = valor as Record<string, unknown>;

  if ('v' in crudo && crudo['v'] !== VERSION_PROTOCOLO) {
    return fallo('VERSION_NO_SOPORTADA', `v=${JSON.stringify(crudo['v'])}; se admite ${VERSION_PROTOCOLO}`);
  }
  if (typeof crudo['tipo'] === 'string' && !(crudo['tipo'] in esquemas.catalogo.tipos)) {
    return fallo('TIPO_DESCONOCIDO', `tipo "${crudo['tipo']}" no esta en el catalogo v${VERSION_PROTOCOLO}`);
  }
  const erroresSobre = validar(esquemas.sobre, crudo);
  if (erroresSobre.length) return fallo('SOBRE_INVALIDO', 'el sobre no cumple sobre.schema.json', erroresSobre);

  const m = crudo as unknown as Mensaje;
  const erroresDatos = validar(esquemas.porTipo[m.tipo], m.datos, '/datos');
  if (erroresDatos.length) return fallo('DATOS_INVALIDOS', `datos no cumplen el esquema de ${m.tipo}`, erroresDatos);

  const entrada = esquemas.catalogo.tipos[m.tipo];
  if (entrada.origen !== 'ambos' && entrada.origen !== m.origen) {
    return fallo('ORIGEN_NO_PERMITIDO', `${m.tipo} solo puede emitirlo ${entrada.origen}`);
  }
  const prefijoEsperado = m.origen === 'unreal' ? 'u-' : 'a-';
  if (!m.id.startsWith(prefijoEsperado)) {
    return fallo('ORIGEN_NO_PERMITIDO', `id ${m.id} no corresponde al origen ${m.origen}`);
  }
  if (entrada.esRespuesta && m.correlacion === null) {
    return fallo('CORRELACION_REQUERIDA', `${m.tipo} debe indicar a que orden responde`);
  }
  if (!entrada.esRespuesta && m.correlacion !== null) {
    return fallo('CORRELACION_NO_PERMITIDA', `${m.tipo} es un mensaje nuevo y no lleva correlacion`);
  }
  return { ok: true, mensaje: m };
}
