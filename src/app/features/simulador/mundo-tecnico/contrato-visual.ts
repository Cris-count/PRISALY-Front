import { MundoTecnico, Punto, Rectangulo } from './mundo-tecnico.models';

/** Acuerdo local del renderer. No modifica PlantillasEspacio ni contratos del servidor. */
export type OrientacionVisual = 'sur' | 'norte' | 'este' | 'oeste';
export interface CapaVisual {
  readonly id: string;
  readonly ruta: string;
  /** Píxeles del lienzo o de UN fotograma, incluidos sus márgenes transparentes. */
  readonly dimensiones: { readonly ancho: number; readonly alto: number };
  readonly apoyoPx: Punto;
  readonly plano: 'suelo' | 'volumen';
  /** Desplazamiento del apoyo lógico para capas de fachada/copa; no es altura Z. */
  readonly desplazamientoApoyoY: number;
  readonly hoja?: { readonly columnas: number; readonly filas: number };
}
export interface AnimacionVisual {
  readonly estado: 'reposo' | 'caminar';
  readonly orientacion: OrientacionVisual;
  readonly fotogramas: readonly number[];
  readonly fps: number;
}
export interface RecursoVisual {
  readonly id: string;
  readonly version: number;
  readonly tipo: 'hospital' | 'personaje' | 'arbol';
  /** Unidades de pantalla por píxel exportado: escala uniforme en ambos ejes. */
  readonly escala: number;
  readonly alturaLogica: number;
  readonly orientaciones: readonly OrientacionVisual[];
  readonly colision: { readonly tipo: 'decorativo' } | { readonly tipo: 'rectangulo'; readonly huella: Rectangulo } | { readonly tipo: 'circulo'; readonly radio: number };
  /** Coordenadas relativas al apoyo, en el plano lógico; nunca coordenadas de imagen. */
  readonly entrada?: Punto;
  readonly capas: readonly CapaVisual[];
  readonly animaciones: readonly AnimacionVisual[];
}
export interface PaqueteVisual {
  readonly id: string;
  readonly version: number;
  readonly perspectiva: { readonly elevacion: 40; readonly giro: 0; readonly escalaSueloY: number };
  readonly hospital: { readonly edificioId: string; readonly recurso: RecursoVisual };
  readonly personaje: RecursoVisual;
  readonly arbol: { readonly apoyo: Punto; readonly recurso: RecursoVisual };
}

/** Rechaza paquetes incompatibles ANTES de crear Phaser; la imagen nunca define colisiones. */
export function validarPaqueteVisual(paquete: PaqueteVisual, mundo: MundoTecnico): void {
  const exigir = (condicion: boolean, mensaje: string) => { if (!condicion) throw new Error(`Paquete visual: ${mensaje}`); };
  const positivo = (n: number) => Number.isFinite(n) && n > 0;
  const punto = (p: Punto) => Number.isFinite(p.x) && Number.isFinite(p.y);
  exigir(!!paquete.id && Number.isInteger(paquete.version) && paquete.version > 0, 'identificador/versión inválidos');
  exigir(paquete.perspectiva.elevacion === 40 && paquete.perspectiva.giro === 0 && Math.abs(paquete.perspectiva.escalaSueloY - Math.sin(40 * Math.PI / 180)) < .0001, 'perspectiva incompatible');
  const recursos = [paquete.hospital.recurso, paquete.personaje, paquete.arbol.recurso];
  exigir(recursos[0].tipo === 'hospital' && recursos[1].tipo === 'personaje' && recursos[2].tipo === 'arbol', 'tipos incompatibles');
  exigir(new Set(recursos.map(r => r.id)).size === 3, 'identificadores repetidos');
  for (const r of recursos) {
    exigir(!!r.id && Number.isInteger(r.version) && r.version > 0 && positivo(r.escala) && positivo(r.alturaLogica), 'metadatos inválidos');
    exigir(r.capas.length > 0 && new Set(r.capas.map(c => c.id)).size === r.capas.length, 'capas vacías o repetidas');
    for (const c of r.capas) {
      exigir(!!c.id && /^\/images\/[a-zA-Z0-9_./-]+\.(png|webp)$/.test(c.ruta) && !c.ruta.includes('..'), 'ruta local inválida');
      exigir([c.dimensiones.ancho, c.dimensiones.alto].every(n => Number.isInteger(n) && n > 0) && punto(c.apoyoPx) && c.apoyoPx.x >= 0 && c.apoyoPx.y >= 0 && c.apoyoPx.x <= c.dimensiones.ancho && c.apoyoPx.y <= c.dimensiones.alto && Number.isFinite(c.desplazamientoApoyoY), 'dimensiones/anclaje inválidos');
      exigir(c.plano === 'suelo' || c.plano === 'volumen', 'plano inválido');
      if (c.hoja) exigir([c.hoja.columnas, c.hoja.filas].every(n => Number.isInteger(n) && n > 0), 'hoja inválida');
    }
    for (const a of r.animaciones) {
      exigir(r.orientaciones.includes(a.orientacion) && positivo(a.fps) && a.fotogramas.length > 0, 'animación inválida');
      exigir(r.capas.every(c => !!c.hoja && a.fotogramas.every(f => Number.isInteger(f) && f >= 0 && f < c.hoja!.columnas * c.hoja!.filas)), 'fotograma fuera de hoja');
    }
    if (r.colision.tipo === 'rectangulo') exigir(punto(r.colision.huella) && positivo(r.colision.huella.ancho) && positivo(r.colision.huella.alto), 'huella inválida');
    if (r.colision.tipo === 'circulo') exigir(positivo(r.colision.radio), 'radio inválido');
  }
  const personaje = paquete.personaje;
  exigir(personaje.colision.tipo === 'circulo' && personaje.colision.radio === mundo.radioPersonaje, 'radio distinto al mundo lógico');
  for (const orientacion of ['sur', 'norte', 'este', 'oeste'] as const) for (const estado of ['reposo', 'caminar'] as const) {
    exigir(personaje.animaciones.filter(a => a.orientacion === orientacion && a.estado === estado).length === 1, `falta animación única ${estado}/${orientacion}`);
  }
  const edificio = mundo.edificios.find(e => e.id === paquete.hospital.edificioId);
  exigir(!!edificio && edificio.plantillaVisual === 'hospital', 'hospital no configurado');
  const h = paquete.hospital.recurso;
  const apoyo = { x: edificio!.area.x + edificio!.area.ancho / 2, y: edificio!.area.y + edificio!.area.alto };
  exigir(h.colision.tipo === 'rectangulo' && h.colision.huella.x + apoyo.x === edificio!.area.x && h.colision.huella.y + apoyo.y === edificio!.area.y && h.colision.huella.ancho === edificio!.area.ancho && h.colision.huella.alto === edificio!.area.alto, 'huella del hospital distinta al mundo lógico');
  const entrada = mundo.nodos.find(n => n.id === edificio!.entrada)!.posicion;
  exigir(!!h.entrada && Math.abs(h.entrada.x + apoyo.x - entrada.x) < .001 && Math.abs(h.entrada.y + apoyo.y - entrada.y) < .001, 'entrada distinta al nodo lógico');
  exigir(punto(paquete.arbol.apoyo), 'apoyo del árbol inválido');
  const arbol = paquete.arbol.recurso;
  if (arbol.colision.tipo !== 'decorativo') {
    exigir(arbol.colision.tipo === 'rectangulo' && mundo.obstaculos.some(o => arbol.colision.tipo === 'rectangulo' && o.x === paquete.arbol.apoyo.x + arbol.colision.huella.x && o.y === paquete.arbol.apoyo.y + arbol.colision.huella.y && o.ancho === arbol.colision.huella.ancho && o.alto === arbol.colision.huella.alto), 'tronco bloqueante sin obstáculo lógico equivalente');
  }
}
