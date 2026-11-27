import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DEMOSTRACIONES_HABILITADAS,
  salidaSinDemostracion,
} from '../../autenticacion/entorno-demostracion';
import { PortalEstudianteApi } from '../../estudiante/portal-estudiante.api';
import { SesionPersonalM1 } from '../../autenticacion/m1-personal-sesion';

export const VISOR_QA_HABILITADO = new InjectionToken<boolean>('VISOR_QA_HABILITADO', {
  providedIn: 'root',
  factory: () => !environment.production && environment.simuladorUnrealLocal === true,
});
export interface ContextoAcademicoVisor {
  idIntento: string;
  idSesion: string;
  idCaso: string;
  tituloCaso: string;
}
@Injectable({ providedIn: 'root' })
export class ContextoAcademicoUnreal {
  readonly actual = signal<ContextoAcademicoVisor | null>(null);
  /** CB-07: contexto visual aplicado para este intento; al reconectar con la misma huella se reutiliza (A.8). */
  aplicado: { idIntento: string; huella: string; contexto: string } | null = null;
}
/**
 * CB-05A: vista previa docente de un caso. No es un intento académico: no consulta ni crea nada en M5. La narrativa la
 * vuelve a pedir la página a M3 con la sesión de personal, que es quien decide si el docente puede leer el caso.
 */
@Injectable({ providedIn: 'root' })
export class VistaPreviaDocenteUnreal {
  readonly actual = signal<{ idCaso: string } | null>(null);
  /**
   * Contexto visual de la última configuración aplicada. Al reconectar con la misma huella se reutiliza para que
   * Unreal restaure sin reiniciar (A.8); si el docente cambió el caso, la huella difiere y se abre un contexto nuevo.
   */
  aplicado: { idCaso: string; huella: string; contexto: string } | null = null;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** El estado de navegación es solo una solicitud: M5 autentica y comprueba titularidad de nuevo. */
export const requiereAccesoSimulador: CanActivateFn = () => {
  const router = inject(Router),
    contexto = inject(ContextoAcademicoUnreal),
    vistaPrevia = inject(VistaPreviaDocenteUnreal);
  contexto.actual.set(null);
  vistaPrevia.actual.set(null);
  const previa = (router.getCurrentNavigation()?.extras.state as { vistaPreviaDocente?: { idCaso?: unknown } } | undefined)
    ?.vistaPreviaDocente;
  if (previa) {
    const permitido = inject(DEMOSTRACIONES_HABILITADAS) || inject(VISOR_QA_HABILITADO);
    if (!permitido || inject(SesionPersonalM1).estado().tipo !== 'valida' || typeof previa.idCaso !== 'string' || !UUID.test(previa.idCaso))
      return router.createUrlTree(['/dashboard']);
    vistaPrevia.actual.set({ idCaso: previa.idCaso });
    return true;
  }
  if (inject(DEMOSTRACIONES_HABILITADAS)) return true; // laboratorio autónomo ya autorizado
  const salida = () => router.createUrlTree(['/estudiante/portal']);
  if (!inject(VISOR_QA_HABILITADO)) return salidaSinDemostracion();
  const s = router.getCurrentNavigation()?.extras.state as
    Partial<ContextoAcademicoVisor> | undefined;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    !s ||
    !uuid.test(s.idIntento ?? '') ||
    !uuid.test(s.idSesion ?? '') ||
    !uuid.test(s.idCaso ?? '')
  )
    return salida();
  return inject(PortalEstudianteApi)
    .contenido(s.idIntento!)
    .pipe(
      map((c) => {
        if (c.idIntento !== s.idIntento || c.idSesion !== s.idSesion || c.caso.idCaso !== s.idCaso)
          return salida();
        contexto.actual.set({
          idIntento: c.idIntento,
          idSesion: c.idSesion,
          idCaso: c.caso.idCaso,
          tituloCaso: c.caso.titulo,
        });
        return true;
      }),
      catchError(() => of(salida())),
    );
};
