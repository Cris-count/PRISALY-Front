import { MundoTecnico, Nodo, Punto, Rectangulo } from './mundo-tecnico.models';

const distancia = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y);
const dentro = (p: Punto, r: Rectangulo, margen = 0) => p.x >= r.x + margen && p.x <= r.x + r.ancho - margen && p.y >= r.y + margen && p.y <= r.y + r.alto - margen;
const bloqueos = (m: MundoTecnico): readonly Rectangulo[] => [...m.obstaculos, ...m.edificios.map(e => e.area)];

/** Intersección cerrada segmento-rectángulo, ampliando el obstáculo por el radio. */
export function intersectaObstaculo(a: Punto, b: Punto, r: Rectangulo, margen: number): boolean {
  const minX = r.x - margen, maxX = r.x + r.ancho + margen, minY = r.y - margen, maxY = r.y + r.alto + margen;
  const dx = b.x - a.x, dy = b.y - a.y;
  let inicio = 0, fin = 1;
  for (const [p, q] of [[-dx, a.x - minX], [dx, maxX - a.x], [-dy, a.y - minY], [dy, maxY - a.y]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) inicio = Math.max(inicio, t); else fin = Math.min(fin, t);
    if (inicio > fin) return false;
  }
  return true;
}

export function validarMundo(m: MundoTecnico): void {
  const ids = new Set(m.nodos.map(n => n.id));
  const finito = (v: number) => Number.isFinite(v);
  if (!m.id || !Number.isInteger(m.version) || m.version < 1 || !finito(m.dimensiones.ancho) || !finito(m.dimensiones.alto) || m.dimensiones.ancho <= 0 || m.dimensiones.alto <= 0 || !finito(m.radioPersonaje) || m.radioPersonaje <= 0 || ids.size !== m.nodos.length || !ids.has(m.inicio) || !m.puntosSeguros.length || m.puntosSeguros.some(id => !ids.has(id))) throw new Error('Mundo técnico inválido');
  const rectValido = (r: Rectangulo) => [r.x, r.y, r.ancho, r.alto].every(finito) && r.ancho > 0 && r.alto > 0 && r.x >= 0 && r.y >= 0 && r.x + r.ancho <= m.dimensiones.ancho && r.y + r.alto <= m.dimensiones.alto;
  if (!m.zonasTransitables.length || [...m.zonasTransitables, ...m.obstaculos].some(r => !rectValido(r))) throw new Error('Geometría inválida');
  for (const n of m.nodos) if (!n.id || ![n.posicion.x, n.posicion.y].every(finito) || !m.zonasTransitables.some(z => dentro(n.posicion, z, m.radioPersonaje)) || bloqueos(m).some(o => intersectaObstaculo(n.posicion, n.posicion, o, m.radioPersonaje))) throw new Error('Nodo inválido');
  for (const camino of m.caminos) {
    const a = m.nodos.find(n => n.id === camino.desde), b = m.nodos.find(n => n.id === camino.hasta);
    if (!a || !b || a.id === b.id || !m.zonasTransitables.some(z => dentro(a.posicion, z, m.radioPersonaje) && dentro(b.posicion, z, m.radioPersonaje)) || bloqueos(m).some(o => intersectaObstaculo(a.posicion, b.posicion, o, m.radioPersonaje))) throw new Error('Camino inválido');
  }
  if (new Set(m.edificios.map(e => e.id)).size !== m.edificios.length || new Set(m.edificios.map(e => e.entrada)).size !== m.edificios.length) throw new Error('Edificio duplicado');
  for (const edificio of m.edificios) if (!edificio.id || !edificio.nombre || !edificio.plantillaVisual || !rectValido(edificio.area) || !ids.has(edificio.entrada) || !ids.has(edificio.salida)) throw new Error('Edificio inválido');
  if (m.puntosSeguros.some(id => !rutaEntre(m, m.inicio, id)) || m.edificios.some(e => !rutaEntre(m, m.inicio, e.entrada) || !rutaEntre(m, m.inicio, e.salida))) throw new Error('Acceso inalcanzable');
}

/** Dijkstra sobre conexiones transitables del mundo; devuelve IDs desde origen hasta destino. */
export function rutaEntre(m: MundoTecnico, inicio: string, destino: string): string[] | null {
  const pendientes = new Set(m.nodos.map(n => n.id)), costes = new Map<string, number>([[inicio, 0]]), anterior = new Map<string, string>();
  if (!pendientes.has(inicio) || !pendientes.has(destino)) return null;
  while (pendientes.size) {
    const actual = [...pendientes].sort((a, b) => (costes.get(a) ?? Infinity) - (costes.get(b) ?? Infinity))[0];
    const coste = costes.get(actual); if (coste === undefined) return null;
    if (actual === destino) { const ruta = [actual]; while (anterior.has(ruta[0])) ruta.unshift(anterior.get(ruta[0])!); return ruta; }
    pendientes.delete(actual);
    const origen = m.nodos.find(n => n.id === actual)!;
    for (const arista of m.caminos) {
      const vecinoId = arista.desde === actual ? arista.hasta : arista.hasta === actual ? arista.desde : null;
      if (!vecinoId || !pendientes.has(vecinoId)) continue;
      const vecino = m.nodos.find(n => n.id === vecinoId)!;
      const candidato = coste + distancia(origen.posicion, vecino.posicion);
      if (candidato < (costes.get(vecinoId) ?? Infinity)) { costes.set(vecinoId, candidato); anterior.set(vecinoId, actual); }
    }
  }
  return null;
}

export function nodoCercano(m: MundoTecnico, punto: Punto, maximo = 55): Nodo | null {
  if (![punto.x, punto.y].every(Number.isFinite) || bloqueos(m).some(o => intersectaObstaculo(punto, punto, o, m.radioPersonaje))) return null;
  const nodo = [...m.nodos].sort((a, b) => distancia(a.posicion, punto) - distancia(b.posicion, punto))[0];
  return nodo && distancia(nodo.posicion, punto) <= maximo ? nodo : null;
}

interface Proyeccion { readonly punto: Punto; readonly camino: { readonly desde: string; readonly hasta: string }; readonly distancia: number }
function proyectarEnCamino(m: MundoTecnico, punto: Punto): Proyeccion | null {
  if (![punto.x, punto.y].every(Number.isFinite) || bloqueos(m).some(o => intersectaObstaculo(punto, punto, o, m.radioPersonaje))) return null;
  const candidatos = m.caminos.map(camino => {
    const a = m.nodos.find(n => n.id === camino.desde)!.posicion, b = m.nodos.find(n => n.id === camino.hasta)!.posicion;
    const dx = b.x - a.x, dy = b.y - a.y, longitud = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((punto.x-a.x)*dx + (punto.y-a.y)*dy) / longitud));
    const proyectado = { x: a.x + dx * t, y: a.y + dy * t };
    return { punto: proyectado, camino, distancia: distancia(punto, proyectado) };
  });
  return candidatos.sort((a, b) => a.distancia - b.distancia)[0] ?? null;
}

/** Ruta desde cualquier punto del camino a otro: solo acepta clics cercanos al sendero. */
export function rutaAPunto(m: MundoTecnico, desde: Punto, hacia: Punto): Punto[] | null {
  const origen = proyectarEnCamino(m, desde), destino = proyectarEnCamino(m, hacia);
  if (!origen || !destino || origen.distancia > 0.1 || destino.distancia > 16) return null;
  const idInicio = '__origen_tecnico__', idFin = '__destino_tecnico__';
  if (m.nodos.some(n => n.id === idInicio || n.id === idFin)) return null;
  const nodos = [...m.nodos, { id: idInicio, posicion: origen.punto }, { id: idFin, posicion: destino.punto }];
  const caminos = [...m.caminos,
    { desde: idInicio, hasta: origen.camino.desde }, { desde: idInicio, hasta: origen.camino.hasta },
    { desde: idFin, hasta: destino.camino.desde }, { desde: idFin, hasta: destino.camino.hasta }];
  if (origen.camino === destino.camino) caminos.push({ desde: idInicio, hasta: idFin });
  const temporal = { ...m, nodos, caminos };
  const ruta = rutaEntre(temporal, idInicio, idFin);
  return ruta?.slice(1).map(id => ({ ...nodos.find(n => n.id === id)!.posicion })) ?? null;
}

export function vecinoEnDireccion(m: MundoTecnico, actual: string, direccion: Punto): Nodo | null {
  const origen = m.nodos.find(n => n.id === actual); if (!origen) return null;
  const candidatos = m.caminos.flatMap(c => c.desde === actual ? [c.hasta] : c.hasta === actual ? [c.desde] : [])
    .map(id => m.nodos.find(n => n.id === id)!).filter(n => !!n);
  return candidatos.map(n => ({ n, proyeccion: ((n.posicion.x-origen.posicion.x)*direccion.x + (n.posicion.y-origen.posicion.y)*direccion.y) / distancia(origen.posicion, n.posicion) }))
    .filter(c => c.proyeccion > 0.35).sort((a, b) => b.proyeccion - a.proyeccion)[0]?.n ?? null;
}
