import { inject, Injectable } from '@angular/core';
import { LibretaStore } from '../investigacion/libreta.store';
import { EventoPistaObtenida, PistaInvestigacion } from '../investigacion/investigacion.models';
import { EstadoNarrativo } from '../narrativa/narrativa.models';

/**
 * Definición declarativa de una pista asignable mediante una marca narrativa autorizada.
 * Permite desacoplar SIM-01 de LibretaStore sin alterar ConsecuenciaNarrativa.
 */
export interface DefinicionPistaNarrativa {
  readonly marca: string;
  readonly pista: Omit<PistaInvestigacion, 'obtenidaEn'>;
}

/** Pistas autorizadas para el recorrido demostrativo PRISALY. */
export const PISTAS_DEMOSTRATIVAS_CATALOGO: readonly DefinicionPistaNarrativa[] = [
  {
    marca: 'pista_historial_clinico',
    pista: {
      id: 'pista-historial-clinico',
      titulo: 'Historia Clínica de Emergencia',
      descripcion: 'El Dr. Mendoza confirmó la atención de lesiones contusas leves registradas en la guardia.',
      origen: {
        espacioId: 'hospital-prueba',
        interaccionId: 'triaje-historial',
        personajeId: 'doctor',
        lugar: 'Hospital Central',
      },
    },
  },
  {
    marca: 'pista_informe_policial',
    pista: {
      id: 'pista-informe-policial',
      titulo: 'Minuta de Intervención Policial',
      descripcion: 'La patrulla arribó a las 22:15 al lugar de los hechos tras la llamada de alerta.',
      origen: {
        espacioId: 'policia-prueba',
        interaccionId: 'guardia-atestado',
        personajeId: 'oficial',
        lugar: 'Comisaría Sectorial',
      },
    },
  },
  {
    marca: 'pista_acusacion_fiscal',
    pista: {
      id: 'pista-acusacion-fiscal',
      titulo: 'Informe Preliminar de Fiscalía',
      descripcion: 'La formalización procesal está sujeta a la concordancia entre los reportes médico y policial.',
      origen: {
        espacioId: 'fiscalia-prueba',
        interaccionId: 'despacho-acusacion',
        personajeId: 'fiscal',
        lugar: 'Fiscalía de Turno',
      },
    },
  },
];

/**
 * Adaptador tipado que transforma marcas narrativas en eventos de pista para la libreta.
 * - Idempotente: no despacha pistas repetidas.
 * - Respeta los contratos existentes sin inventar endpoints ni alterar ConsecuenciaNarrativa.
 * - Las pistas registradas no modifican respuestas de evaluación académica.
 */
@Injectable()
export class AdaptadorPistasNarrativas {
  private readonly libreta = inject(LibretaStore);
  private readonly pistasRegistradas = new Set<string>();

  /**
   * Examina el estado narrativo activo y registra cualquier pista autorizada cuyas marcas estén activas.
   * Retorna las pistas recién incorporadas a la libreta durante esta evaluación.
   */
  sincronizarConEstado(estado: EstadoNarrativo, catalogo = PISTAS_DEMOSTRATIVAS_CATALOGO): readonly string[] {
    const contextoActual = this.libreta.estado().contexto;
    const sesionId = contextoActual.modo === 'demostracion'
      ? contextoActual.sesionId
      : 'sesion-local';

    const incorporadas: string[] = [];

    for (const item of catalogo) {
      if (estado.marcas[item.marca] === true && !this.pistasRegistradas.has(item.pista.id)) {
        const evento: EventoPistaObtenida = {
          tipo: 'pista-obtenida',
          contexto: {
            modo: 'demostracion',
            sesionId,
          },
          pista: { ...item.pista },
        };

        const exito = this.libreta.registrarPista(evento);
        if (exito) {
          this.pistasRegistradas.add(item.pista.id);
          incorporadas.push(item.pista.id);
        }
      }
    }

    return incorporadas;
  }

  /** Consulta si una pista específica ya ha sido incorporada a la libreta. */
  tienePista(pistaId: string): boolean {
    return this.pistasRegistradas.has(pistaId);
  }

  /** Limpia el registro local para una nueva sesión demostrativa. */
  reiniciar(): void {
    this.pistasRegistradas.clear();
  }
}
