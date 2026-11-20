import { MundoTecnico, Punto } from './mundo-tecnico.models';

/** Avanza sobre las aristas válidas del grafo, sin saltos entre caminos. */
export function avanzarPorCaminos(mundo: MundoTecnico, origen: Punto, direccion: Punto, distancia: number): Punto {
  const magnitud = Math.hypot(direccion.x, direccion.y);
  if (!Number.isFinite(magnitud) || !magnitud || !Number.isFinite(distancia) || distancia <= 0) return { ...origen };
  const deseada = { x: direccion.x / magnitud, y: direccion.y / magnitud };
  let posicion = { ...origen }, restante = distancia;
  // El límite evita ciclos incluso si se recibe una configuración con aristas muy cortas.
  for (let iteracion = 0; iteracion < mundo.caminos.length + 1 && restante > 0.0001; iteracion++) {
    const candidatos: { destino: Punto; longitud: number; alineacion: number }[] = [];
    for (const camino of mundo.caminos) {
      const a = mundo.nodos.find(n => n.id === camino.desde)!.posicion;
      const b = mundo.nodos.find(n => n.id === camino.hasta)!.posicion;
      const dx = b.x - a.x, dy = b.y - a.y, largo2 = dx * dx + dy * dy;
      if (!largo2) continue;
      const t = ((posicion.x - a.x) * dx + (posicion.y - a.y) * dy) / largo2;
      const proyectada = { x: a.x + dx * t, y: a.y + dy * t };
      if (t < -0.000001 || t > 1.000001 || Math.hypot(proyectada.x - posicion.x, proyectada.y - posicion.y) > 0.001) continue;
      for (const destino of [a, b]) {
        const vx = destino.x - posicion.x, vy = destino.y - posicion.y, longitud = Math.hypot(vx, vy);
        if (longitud < 0.0001) continue;
        const alineacion = (vx * deseada.x + vy * deseada.y) / longitud;
        if (alineacion > 0.35) candidatos.push({ destino, longitud, alineacion });
      }
    }
    candidatos.sort((a, b) => b.alineacion - a.alineacion);
    const elegido = candidatos[0];
    if (!elegido) break;
    const avance = Math.min(restante, elegido.longitud);
    posicion = { x: posicion.x + (elegido.destino.x - posicion.x) * avance / elegido.longitud,
      y: posicion.y + (elegido.destino.y - posicion.y) * avance / elegido.longitud };
    restante -= avance;
  }
  return posicion;
}
