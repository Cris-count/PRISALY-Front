import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DEMOSTRACIONES_HABILITADAS,
  salidaSinDemostracion,
} from '../../autenticacion/entorno-demostracion';
import { PortalEstudianteApi } from '../../estudiante/portal-estudiante.api';

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
}
/** El estado de navegación es solo una solicitud: M5 autentica y comprueba titularidad de nuevo. */
export const requiereAccesoSimulador: CanActivateFn = () => {
  const router = inject(Router),
    contexto = inject(ContextoAcademicoUnreal);
  contexto.actual.set(null);
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
