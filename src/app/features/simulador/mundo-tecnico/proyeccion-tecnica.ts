import { Punto } from './mundo-tecnico.models';

/** Proyección de calibración; las rutas y colisiones permanecen en coordenadas lógicas. */
export interface ProyeccionSuelo { readonly escalaX: number; readonly escalaY: number; readonly origen: Punto }
/** Proyección ortográfica con elevación provisional de 40 grados. */
export const PROYECCION_PROPUESTA: ProyeccionSuelo = { escalaX: 1, escalaY: Math.sin(40 * Math.PI / 180), origen: { x: 0, y: 90 } };
export const PROYECCION_ACTUAL = PROYECCION_PROPUESTA;
export function aPantalla(p: Punto, proyeccion: ProyeccionSuelo = PROYECCION_ACTUAL): Punto {
  return { x: proyeccion.origen.x + p.x * proyeccion.escalaX, y: proyeccion.origen.y + p.y * proyeccion.escalaY };
}
export function aMundo(p: Punto, proyeccion: ProyeccionSuelo = PROYECCION_ACTUAL): Punto {
  if (proyeccion.escalaX <= 0 || proyeccion.escalaY <= 0) throw new Error('Proyección inválida');
  return { x: (p.x - proyeccion.origen.x) / proyeccion.escalaX, y: (p.y - proyeccion.origen.y) / proyeccion.escalaY };
}
/** Profundidad basada en el apoyo, no en el orden de creación del objeto. */
export function profundidadApoyo(p: Punto): number { return p.y; }

/** Altura real sobre el suelo; una cámara elevada proyecta Z con cos(elevación). */
export function aPantallaVolumen(p: Punto, altura: number): Punto {
  const suelo = aPantalla(p);
  return { x: suelo.x, y: suelo.y - altura * Math.sqrt(1 - PROYECCION_ACTUAL.escalaY ** 2) };
}

/** Proyecta también el ancho del camino, no solo su línea central. */
export function contornoCamino(a: Punto, b: Punto, ancho: number): Punto[] {
  const longitud = Math.hypot(b.x - a.x, b.y - a.y);
  if (!longitud) return [];
  const dx = -(b.y - a.y) / longitud * ancho / 2;
  const dy = (b.x - a.x) / longitud * ancho / 2;
  return [aPantalla({ x: a.x + dx, y: a.y + dy }), aPantalla({ x: b.x + dx, y: b.y + dy }),
    aPantalla({ x: b.x - dx, y: b.y - dy }), aPantalla({ x: a.x - dx, y: a.y - dy })];
}
