/** Hosts de bucle local autorizados para señalización WS; no asigna un servidor. */
export const HOSTS_LOCALES_SENALIZACION: readonly string[] = [
  'localhost',
  '127.0.0.1',
  '[::1]',
];

/** Señalización del laboratorio local PS2-LAB-03 (player 8898). */
export const URL_SENALIZACION_LOCAL = 'ws://127.0.0.1:8898/';

/** Único Origin que admite la señalización local para el navegador. */
export const ORIGEN_VISOR_LOCAL = 'http://127.0.0.1:4213';
