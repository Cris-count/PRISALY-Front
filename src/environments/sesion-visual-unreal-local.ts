/**
 * Referencia local conservada de la configuración paralela; no activa servicios ni M5.
 *
 * DC-SIM-F4-10: la señalización es el wrapper de PS2-LAB-03 (player 8898, streamer 8899), que solo
 * autoriza el ID `PRISALY-LAB-03`; ese ID es una etiqueta de la señalización, no el proyecto Unreal.
 * El streamer que se lanza para las pruebas de los tres edificios es MUNDO-24
 * (`C:\PRISALY\mundo-24\5-Iniciar-MUNDO-24-PS2.ps1`, `-PrisalySesion=ses-lab-ps2-0001`).
 * Identificadores fijos de laboratorio: no son asignación académica ni solución de producción.
 */
export const SESION_VISUAL_LOCAL = Object.freeze({
  urlSenalizacion: 'ws://127.0.0.1:8898/',
  streamerId: 'PRISALY-LAB-03',
  sesion: 'ses-lab-ps2-0001',
  casoId: 'caso-lab-demo',
});

export const ORIGEN_VISOR_LOCAL = 'http://127.0.0.1:4213';
