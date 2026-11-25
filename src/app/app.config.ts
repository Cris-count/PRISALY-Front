import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import {
  personalM1Interceptor,
  provideM1PersonalLocal,
} from './features/autenticacion/m1-personal-http';

import { routes } from './app.routes';
import { personalAcademicoInterceptor } from './features/academico/academico-http';
import { leerCapacidadesDc99 } from './features/academico/capacidades-dc99';
import { registrarParticipacionHttpSiHabilitada } from './features/simulador/services/participacion-http.gateway';

const participacionHttpHabilitada = leerCapacidadesDc99(
  (environment as { capacidadesBackend?: unknown }).capacidadesBackend,
).participacionHttp;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors(
        environment.personalQaHabilitado
          ? [personalM1Interceptor, personalAcademicoInterceptor]
          : [],
      ),
    ),
    ...(environment.personalQaHabilitado ? [provideM1PersonalLocal()] : []),
    ...registrarParticipacionHttpSiHabilitada(participacionHttpHabilitada),
  ],
};
