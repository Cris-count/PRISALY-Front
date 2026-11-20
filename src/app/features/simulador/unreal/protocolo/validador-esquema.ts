/**
 * Validador de un SUBCONJUNTO de JSON Schema (draft 2020-12), sin dependencias.
 *
 * Por que un subconjunto propio: el adaptador debe poder vivir dentro de Angular sin
 * agregar dependencias al repositorio productivo, y el mismo conjunto reducido de reglas
 * debe poder reimplementarse en C++ (PrisalyBridge). Para que el subconjunto no acepte
 * en silencio algo que JSON Schema rechazaria:
 *   1. PALABRAS_SOPORTADAS lista exactamente lo que se implementa; un esquema con otra
 *      palabra clave lanza error al cargarse (no se ignora).
 *   2. Las pruebas comparan cada ejemplo contra un validador de referencia independiente
 *      (python-jsonschema, Draft202012Validator). Ver tests/paridad_jsonschema.py.
 */

export type Esquema = { [clave: string]: unknown };

export interface ErrorEsquema {
  ruta: string; // ruta JSON del dato, p. ej. "/datos/zoneId"
  regla: string; // palabra clave que fallo, p. ej. "pattern"
  mensaje: string;
}

export const PALABRAS_SOPORTADAS = new Set([
  '$schema', '$id', '$comment', 'title', 'description',
  'type', 'properties', 'required', 'additionalProperties',
  'enum', 'const', 'pattern', 'minLength', 'maxLength',
  'minimum', 'maximum', 'items', 'minItems', 'maxItems', 'uniqueItems',
]);

const TIPOS_JSON = new Set(['object', 'array', 'string', 'integer', 'number', 'boolean', 'null']);

/** Lanza si el esquema usa algo fuera del subconjunto. Recorre subesquemas. */
export function verificarSubconjunto(esquema: Esquema, ruta = '#'): void {
  for (const clave of Object.keys(esquema)) {
    if (!PALABRAS_SOPORTADAS.has(clave)) {
      throw new Error(`Palabra clave no soportada "${clave}" en ${ruta}`);
    }
  }
  const tipo = esquema['type'];
  const tipos = Array.isArray(tipo) ? tipo : tipo === undefined ? [] : [tipo];
  for (const t of tipos) {
    if (typeof t !== 'string' || !TIPOS_JSON.has(t)) throw new Error(`type invalido en ${ruta}`);
  }
  const ap = esquema['additionalProperties'];
  if (ap !== undefined && typeof ap !== 'boolean') {
    throw new Error(`additionalProperties solo admite booleano en ${ruta}`);
  }
  const props = esquema['properties'];
  if (props !== undefined) {
    for (const [nombre, sub] of Object.entries(props as Record<string, Esquema>)) {
      verificarSubconjunto(sub, `${ruta}/properties/${nombre}`);
    }
  }
  const items = esquema['items'];
  if (items !== undefined) verificarSubconjunto(items as Esquema, `${ruta}/items`);
  if (typeof esquema['pattern'] === 'string') new RegExp(esquema['pattern'] as string, 'u');
}

function tipoDe(valor: unknown): string {
  if (valor === null) return 'null';
  if (Array.isArray(valor)) return 'array';
  if (typeof valor === 'number') return Number.isInteger(valor) ? 'integer' : 'number';
  return typeof valor; // object, string, boolean
}

function cumpleTipo(valor: unknown, tipo: string): boolean {
  const real = tipoDe(valor);
  if (tipo === 'number') return real === 'number' || real === 'integer';
  return real === tipo;
}

/** Igualdad estructural JSON (para const, enum y uniqueItems). */
function igualJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((x, i) => igualJson(x, b[i]));
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    return ka.length === kb.length &&
      ka.every((k) => igualJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

/** Longitud en puntos de codigo (como exige JSON Schema), no en unidades UTF-16. */
function longitud(s: string): number {
  return [...s].length;
}

const cacheRegex = new Map<string, RegExp>();
function regex(p: string): RegExp {
  let r = cacheRegex.get(p);
  if (!r) { r = new RegExp(p, 'u'); cacheRegex.set(p, r); }
  return r;
}

export function validar(esquema: Esquema, valor: unknown, ruta = ''): ErrorEsquema[] {
  const errores: ErrorEsquema[] = [];
  const err = (regla: string, mensaje: string) => errores.push({ ruta: ruta || '/', regla, mensaje });

  if ('type' in esquema) {
    const tipos = Array.isArray(esquema['type']) ? esquema['type'] as string[] : [esquema['type'] as string];
    if (!tipos.some((t) => cumpleTipo(valor, t))) {
      err('type', `se esperaba ${tipos.join('|')}, llego ${tipoDe(valor)}`);
      return errores; // las demas reglas no aplican a un tipo equivocado
    }
  }
  if ('const' in esquema && !igualJson(valor, esquema['const'])) {
    err('const', `se esperaba ${JSON.stringify(esquema['const'])}`);
  }
  if ('enum' in esquema && !(esquema['enum'] as unknown[]).some((e) => igualJson(valor, e))) {
    err('enum', 'valor fuera de la lista permitida');
  }

  if (typeof valor === 'string') {
    if (typeof esquema['minLength'] === 'number' && longitud(valor) < (esquema['minLength'] as number)) err('minLength', 'texto demasiado corto');
    if (typeof esquema['maxLength'] === 'number' && longitud(valor) > (esquema['maxLength'] as number)) err('maxLength', 'texto demasiado largo');
    if (typeof esquema['pattern'] === 'string' && !regex(esquema['pattern'] as string).test(valor)) err('pattern', `no cumple ${esquema['pattern']}`);
  }

  if (typeof valor === 'number') {
    if (typeof esquema['minimum'] === 'number' && valor < (esquema['minimum'] as number)) err('minimum', `menor que ${esquema['minimum']}`);
    if (typeof esquema['maximum'] === 'number' && valor > (esquema['maximum'] as number)) err('maximum', `mayor que ${esquema['maximum']}`);
  }

  if (Array.isArray(valor)) {
    if (typeof esquema['minItems'] === 'number' && valor.length < (esquema['minItems'] as number)) err('minItems', 'muy pocos elementos');
    if (typeof esquema['maxItems'] === 'number' && valor.length > (esquema['maxItems'] as number)) err('maxItems', 'demasiados elementos');
    if (esquema['uniqueItems'] === true) {
      for (let i = 0; i < valor.length; i++) {
        for (let j = i + 1; j < valor.length; j++) {
          if (igualJson(valor[i], valor[j])) { err('uniqueItems', `elementos ${i} y ${j} repetidos`); i = valor.length; break; }
        }
      }
    }
    if (esquema['items']) {
      valor.forEach((v, i) => errores.push(...validar(esquema['items'] as Esquema, v, `${ruta}/${i}`)));
    }
  }

  if (tipoDe(valor) === 'object') {
    const obj = valor as Record<string, unknown>;
    const props = (esquema['properties'] ?? {}) as Record<string, Esquema>;
    for (const req of (esquema['required'] ?? []) as string[]) {
      if (!Object.prototype.hasOwnProperty.call(obj, req)) err('required', `falta "${req}"`);
    }
    for (const [clave, v] of Object.entries(obj)) {
      if (Object.prototype.hasOwnProperty.call(props, clave)) {
        errores.push(...validar(props[clave], v, `${ruta}/${clave}`));
      } else if (esquema['additionalProperties'] === false) {
        errores.push({ ruta: `${ruta}/${clave}`, regla: 'additionalProperties', mensaje: `campo no permitido "${clave}"` });
      }
    }
  }
  return errores;
}
