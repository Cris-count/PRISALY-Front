import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import {
  personalM1Interceptor,
  provideM1PersonalLocal,
} from './features/autenticacion/m1-personal-http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors(environment.personalQaHabilitado ? [personalM1Interceptor] : []),
    ),
    ...(environment.personalQaHabilitado ? [provideM1PersonalLocal()] : []),
  ],
};
