/**
 * CB-05A: del caso narrativo (prisaly-guion-1, persistido en M3) a la configuración visual de MUNDO-24 (`caso.configurar`).
 *
 * - El catálogo visual canónico (CB-01) se lee de sus bytes exactos; su SHA-256 viaja como `hashCatalogo`.
 * - Los edificios y NPC salen de los `recursoVisual` del guion guardado, nunca de constantes del caso de demostración.
 * - El contexto visual es opaco (`cv-` + 32 hex aleatorios): no deriva de ningún identificador académico.
 * - La narrativa (nombres, diálogos) no viaja a Unreal: `caso.configurar` solo lleva identificadores visuales.
 */
import type { GuionM3 } from '../narrativa/adaptador-guion-m3';
import type { GuionNarrativo } from '../narrativa/narrativa.models';

export const RUTA_CATALOGO_VISUAL = 'simulador-unreal/protocolo/catalogo/catalogo-visual-1.json';

export interface EdificioCatalogo { readonly clave: string; readonly nombre: string; readonly zoneId: string; readonly puertaId: string }
export interface PuestoCatalogo { readonly clave: string; readonly edificio: string; readonly npcId: string; readonly modelo: string }
export interface CatalogoVisual {
  readonly version: string;
  readonly capacidadMaximaPorEdificio: number;
  readonly comun: { readonly zoneId: string };
  readonly edificios: readonly EdificioCatalogo[];
  readonly puestos: readonly PuestoCatalogo[];
}
export interface CatalogoCargado { readonly catalogo: CatalogoVisual; readonly hash: string }

export interface DatosCasoConfigurar {
  idContextoVisual: string;
  versionCatalogo: string;
  hashCatalogo: string;
  huella: string;
  edificiosHabilitados: string[];
  npcsActivos: string[];
}

const hex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256Hex(datos: Uint8Array | string): Promise<string> {
  const bytes = typeof datos === 'string' ? new TextEncoder().encode(datos) : datos;
  return hex(await crypto.subtle.digest('SHA-256', bytes as BufferSource));
}

/** El hash se calcula sobre los bytes servidos, no sobre un JSON reserializado. */
export async function leerCatalogoVisual(bytes: Uint8Array): Promise<CatalogoCargado> {
  const catalogo = JSON.parse(new TextDecoder().decode(bytes)) as CatalogoVisual;
  if (!catalogo?.version || !Array.isArray(catalogo.edificios) || !Array.isArray(catalogo.puestos)) {
    throw new Error('Catálogo visual no reconocido');
  }
  return { catalogo, hash: await sha256Hex(bytes) };
}

export async function cargarCatalogoVisual(base = document.baseURI): Promise<CatalogoCargado> {
  const respuesta = await fetch(new URL(RUTA_CATALOGO_VISUAL, base), { cache: 'no-store' });
  if (!respuesta.ok) throw new Error(`Catálogo visual no disponible (${respuesta.status})`);
  return leerCatalogoVisual(new Uint8Array(await respuesta.arrayBuffer()));
}

/** Plazas reales de un edificio: el mínimo entre el límite global y sus puestos físicos. */
export function capacidadEfectiva(catalogo: CatalogoVisual, edificio: string): number {
  return Math.min(catalogo.capacidadMaximaPorEdificio, catalogo.puestos.filter((p) => p.edificio === edificio).length);
}

export function nuevoContextoVisual(): string {
  return 'cv-' + hex(crypto.getRandomValues(new Uint8Array(16)));
}

/** Misma forma que calcula Unreal (PrisalyConfiguracionCaso): versión y listas ordenadas, sin espacios. */
export function huellaConfiguracion(versionCatalogo: string, edificios: readonly string[], npcs: readonly string[]): Promise<string> {
  return sha256Hex(JSON.stringify({
    versionCatalogo, edificiosHabilitados: [...edificios].sort(), npcsActivos: [...npcs].sort(),
  }));
}

/** Deriva `caso.configurar` del guion recuperado del Backend. Falla si el guion usa recursos fuera del catálogo. */
export async function derivarCasoConfigurar(guion: GuionM3, cargado: CatalogoCargado, idContextoVisual: string): Promise<DatosCasoConfigurar> {
  if (!/^cv-[0-9a-f]{32}$/.test(idContextoVisual)) throw new Error('Contexto visual inválido');
  const { catalogo } = cargado;
  const edificios = new Set<string>(), npcs = new Set<string>();
  for (const espacio of guion.espacios) {
    if (!espacio.recursoVisual) continue;
    const edificio = catalogo.edificios.find((e) => e.clave === espacio.recursoVisual);
    if (!edificio) throw new Error(`Recurso visual no catalogado: ${espacio.recursoVisual}`);
    edificios.add(edificio.zoneId);
  }
  for (const personaje of guion.personajes ?? []) {
    if (!personaje.recursoVisual) continue;
    const puesto = catalogo.puestos.find((p) => p.clave === personaje.recursoVisual);
    if (!puesto) throw new Error(`Recurso visual no catalogado: ${personaje.recursoVisual}`);
    const zona = catalogo.edificios.find((e) => e.clave === puesto.edificio)?.zoneId;
    if (!zona || !edificios.has(zona)) throw new Error(`El personaje ${personaje.idPersonaje} usa un edificio no seleccionado`);
    npcs.add(puesto.npcId);
  }
  if (edificios.size === 0) throw new Error('El caso no tiene ningún edificio visual');
  const edificiosHabilitados = [...edificios].sort(), npcsActivos = [...npcs].sort();
  return {
    idContextoVisual,
    versionCatalogo: catalogo.version,
    hashCatalogo: cargado.hash,
    huella: await huellaConfiguracion(catalogo.version, edificiosHabilitados, npcsActivos),
    edificiosHabilitados,
    npcsActivos,
  };
}

/** Selección del constructor docente: edificios del catálogo y, por puesto, el personaje con su diálogo. */
export interface SeleccionCaso {
  readonly edificios: readonly string[]; // claves edificio:*
  readonly personajes: readonly { readonly puesto: string; readonly nombre: string; readonly rol: string; readonly dialogo: string }[];
}

export interface ErrorSeleccion { readonly campo: string; readonly codigo: string }

/** Las mismas reglas que el validador de M3, para avisar antes de guardar (el Backend vuelve a validar). */
export function validarSeleccion(catalogo: CatalogoVisual, s: SeleccionCaso): ErrorSeleccion[] {
  const errores: ErrorSeleccion[] = [];
  if (s.edificios.length === 0) errores.push({ campo: 'edificios', codigo: 'EDIFICIO_REQUERIDO' });
  for (const e of s.edificios) if (!catalogo.edificios.some((x) => x.clave === e)) errores.push({ campo: e, codigo: 'RECURSO_VISUAL_NO_CATALOGADO' });
  const usados = new Set<string>();
  for (const p of s.personajes) {
    const puesto = catalogo.puestos.find((x) => x.clave === p.puesto);
    if (!puesto) { errores.push({ campo: p.puesto, codigo: 'RECURSO_VISUAL_NO_CATALOGADO' }); continue; }
    if (usados.has(p.puesto)) errores.push({ campo: p.puesto, codigo: 'PUESTO_DUPLICADO' });
    usados.add(p.puesto);
    if (!s.edificios.includes(puesto.edificio)) errores.push({ campo: p.puesto, codigo: 'EDIFICIO_NO_SELECCIONADO' });
    if (!p.nombre.trim()) errores.push({ campo: p.puesto, codigo: 'NOMBRE_REQUERIDO' });
    if (!p.dialogo.trim()) errores.push({ campo: p.puesto, codigo: 'DIALOGO_REQUERIDO' });
    if (p.dialogo.split(/\n\s*\n/).some((t) => [...t.trim()].length > 1000)) errores.push({ campo: p.puesto, codigo: 'TEXTO_DEMASIADO_LARGO' });
    if (/<[A-Za-z/!?]/.test(p.dialogo + p.nombre + p.rol)) errores.push({ campo: p.puesto, codigo: 'MARCADO_NO_PERMITIDO' });
  }
  for (const e of s.edificios) {
    const ocupados = s.personajes.filter((p) => catalogo.puestos.find((x) => x.clave === p.puesto)?.edificio === e).length;
    if (ocupados > capacidadEfectiva(catalogo, e)) errores.push({ campo: e, codigo: 'CAPACIDAD_EXCEDIDA' });
  }
  return errores;
}

const slug = (texto: string, respaldo: string) => {
  const s = texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return /^[a-z0-9]/.test(s) ? s : respaldo;
};

/** Documento prisaly-guion-1 a partir de la selección. Cada párrafo del diálogo (línea en blanco) es un diálogo. */
export function construirGuion(catalogo: CatalogoVisual, s: SeleccionCaso): GuionM3 {
  const espacios = s.edificios.map((clave) => {
    const e = catalogo.edificios.find((x) => x.clave === clave)!;
    return { idEspacio: clave.replace('edificio:', ''), titulo: e.nombre, recursoVisual: clave };
  });
  const ids = new Set<string>();
  const personajes = s.personajes.map((p, i) => {
    let id = slug(p.nombre, `personaje-${i + 1}`);
    while (ids.has(id)) id = `${id}-${i + 1}`;
    ids.add(id);
    return { idPersonaje: id, nombre: p.nombre.trim(), ...(p.rol.trim() ? { rol: p.rol.trim() } : {}), recursoVisual: p.puesto };
  });
  const intervenciones = s.personajes.map((p, i) => {
    const puesto = catalogo.puestos.find((x) => x.clave === p.puesto)!;
    const idPersonaje = personajes[i].idPersonaje;
    return {
      idIntervencion: `${idPersonaje}-conversacion`,
      idEspacio: puesto.edificio.replace('edificio:', ''),
      idPersonaje,
      dialogos: p.dialogo.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean).map((texto) => ({ idPersonaje, texto })),
    };
  });
  return { formato: 'prisaly-guion-1', inicio: espacios[0]?.idEspacio ?? '', espacios, personajes, intervenciones };
}

/** Selección equivalente a un guion guardado, para reabrirlo en el constructor. */
export function seleccionDesdeGuion(guion: GuionM3): SeleccionCaso {
  const edificios = guion.espacios.map((e) => e.recursoVisual).filter((r): r is string => !!r?.startsWith('edificio:'));
  const personajes = (guion.personajes ?? []).filter((p) => p.recursoVisual?.startsWith('npc:')).map((p) => ({
    puesto: p.recursoVisual!,
    nombre: p.nombre,
    rol: p.rol ?? '',
    dialogo: (guion.intervenciones ?? []).filter((i) => i.idPersonaje === p.idPersonaje)
      .flatMap((i) => i.dialogos.filter((d) => d.idPersonaje === p.idPersonaje).map((d) => d.texto)).join('\n\n'),
  }));
  return { edificios, personajes };
}

/**
 * Guion del motor narrativo para el NPC de un puesto: una escena con sus diálogos guardados y sin decisiones
 * (cierre narrativo). Devuelve null si el guion no asigna personaje a ese puesto.
 */
export function guionMotorParaPuesto(guion: GuionM3, puesto: string, idEdificio: string): GuionNarrativo | null {
  const personaje = (guion.personajes ?? []).find((p) => p.recursoVisual === puesto);
  if (!personaje) return null;
  const espacio = guion.espacios.find((e) => e.recursoVisual === idEdificio);
  const dialogos = (guion.intervenciones ?? [])
    .filter((i) => i.idPersonaje === personaje.idPersonaje && (!espacio || i.idEspacio === espacio.idEspacio))
    .flatMap((i) => i.dialogos.map((d) => ({ personajeId: d.idPersonaje, texto: d.texto })));
  if (dialogos.length === 0) return null;
  return {
    id: `m3-${personaje.idPersonaje}`,
    inicio: 'conversacion',
    personajes: [{ id: personaje.idPersonaje, nombre: personaje.nombre, estado: personaje.rol ?? '', expresion: 'atenta' }],
    escenas: [{
      id: 'conversacion',
      escenario: { titulo: espacio?.titulo ?? personaje.nombre, contexto: personaje.rol ?? '', elementos: [] },
      dialogos,
      alEntrar: [],
      decisiones: [],
    }],
  };
}
