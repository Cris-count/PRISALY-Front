import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, EMPTY, filter, map, Observable } from 'rxjs';
import { esUuid } from './academico-http';

/** Parámetros de consulta que comparten las pantallas del recorrido docente (FE-55). */
export const PARAM_CASO = 'caso';
export const PARAM_SESION = 'sesion';
/** Marca interna: una selecci?n anterior ya no corresponde a la URL. */
export const SELECCION_INVALIDADA = '!';
export type NombreParametroRecorrido = typeof PARAM_CASO | typeof PARAM_SESION;

/** Solo se aceptan UUID; cualquier otro valor de la URL se ignora. Se normaliza a minúsculas. */
export function uuidDeParametro(valor: string | null | undefined): string | null {
  return valor && esUuid(valor) ? valor.toLowerCase() : null;
}

/**
 * FE-55. Continuidad entre paneles mediante un parámetro de consulta (`?caso=` / `?sesion=`).
 *
 * - El parámetro solo transporta un identificador: cada panel vuelve a consultarlo en el servidor,
 *   así que nunca se presenta como dato académico ni como prueba de persistencia.
 * - No concede acceso: la navegación entre rutas sigue pasando por los guards de cada ruta.
 * - Sin enrutador (por ejemplo, un panel montado aislado) no hace nada.
 *
 * Debe crearse en un contexto de inyección (inicializador de campo de un componente).
 */
export class ParametroRecorrido {
  private readonly ruta = inject(ActivatedRoute, { optional: true });
  private readonly router = this.ruta ? inject(Router) : null;

  constructor(private readonly nombre: NombreParametroRecorrido) {}

  /** Identificadores válidos presentes en la URL, sin repetir valores consecutivos. */
  cambios(): Observable<string> {
    if (!this.ruta) return EMPTY;
    return this.ruta.queryParamMap.pipe(
      map((q) => uuidDeParametro(q.get(this.nombre))),
      distinctUntilChanged(),
      filter((id): id is string => id !== null),
    );
  }

  /** Notifica por separado par?metro ausente o inv?lido, incluso durante una operaci?n. */
  invalidaciones(): Observable<'ausente' | 'invalido'> {
    if (!this.ruta) return EMPTY;
    return this.ruta.queryParamMap.pipe(
      map((q) =>
        !q.has(this.nombre)
          ? ('ausente' as const)
          : uuidDeParametro(q.get(this.nombre))
            ? ('valido' as const)
            : ('invalido' as const),
      ),
      distinctUntilChanged(),
      filter((estado): estado is 'ausente' | 'invalido' => estado !== 'valido'),
    );
  }

  /** Refleja en la URL el identificador que el panel acaba de leer del servidor. */
  fijar(id: string): void {
    const ruta = this.ruta;
    const valor = uuidDeParametro(id);
    if (!ruta || !this.router || !valor) return;
    const actuales = ruta.snapshot.queryParamMap;
    const parametros: Record<string, string> = {};
    for (const nombre of [PARAM_CASO, PARAM_SESION]) {
      const id = nombre === this.nombre ? valor : uuidDeParametro(actuales.get(nombre));
      if (id) parametros[nombre] = id;
    }
    const sinCambios =
      actuales.keys.length === Object.keys(parametros).length &&
      actuales.keys.every(
        (clave) => actuales.getAll(clave).length === 1 && actuales.get(clave) === parametros[clave],
      );
    if (sinCambios) return;
    void this.router.navigate([], {
      relativeTo: ruta,
      queryParams: parametros,
      replaceUrl: true,
    });
  }
}
