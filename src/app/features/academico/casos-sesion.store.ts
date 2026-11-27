import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { CasoDocente } from './casos-m3.api';

interface CasoRecordado extends CasoDocente {
  readonly propietario: string;
}

/**
 * M3 no publica un listado de casos (solo `GET /v1/casos/{id}`). Este almacén recuerda, solo en
 * memoria y por identidad, los casos creados o consultados en la sesión para reutilizarlos en
 * rúbricas y sesiones. No es una fuente académica: cada dato se volvió a leer del Backend.
 */
@Injectable({ providedIn: 'root' })
export class CasosSesionStore {
  private readonly sesion = inject(SesionPersonalM1);
  private readonly interno = signal<readonly CasoRecordado[]>([]);

  private readonly usuario = computed(() => {
    const estado = this.sesion.estado();
    return estado.tipo === 'valida' ? estado.identidad.userId : null;
  });

  readonly casos = computed<readonly CasoDocente[]>(() => {
    const usuario = this.usuario();
    return usuario ? this.interno().filter((c) => c.propietario === usuario) : [];
  });

  constructor() {
    effect(() => {
      const estado = this.sesion.estado().tipo;
      if (
        estado === 'cerrando' ||
        estado === 'cierre-confirmado' ||
        estado === 'no-autenticada' ||
        estado === 'expirada'
      ) {
        this.interno.set([]);
      }
    });
  }

  recordar(caso: CasoDocente): void {
    const propietario = this.usuario();
    if (!propietario) return;
    this.interno.update((lista) => [
      { ...caso, propietario },
      ...lista.filter((c) => !(c.idCaso === caso.idCaso && c.propietario === propietario)),
    ]);
  }
}
