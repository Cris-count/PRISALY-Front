import { environment as development } from './environment.development';

// Same-origin transport for the persistent local demo and its student cookie.
export const environment = {
  ...development,
  apiBaseUrl: '/api',
  accesoRapidoQa: false,
};