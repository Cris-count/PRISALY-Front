import { HttpErrorResponse } from '@angular/common/http';
import { MENSAJES_M4, mensajeM4 } from './panel-sesiones-m4';

/** FE-57. Códigos M4 observados en QA real (Backend 773818c); HTTP simulado. */
const error409 = (code: string) =>
  new HttpErrorResponse({ status: 409, statusText: 'Conflict', error: { code } });

describe('FE-57 mensajes M4 por código', () => {
  it('traduce M4-OPERACION-NO-PERMITIDA (transición rechazada) con su código', () => {
    expect(MENSAJES_M4['M4-OPERACION-NO-PERMITIDA']).toBeDefined();
    const texto = mensajeM4(error409('M4-OPERACION-NO-PERMITIDA'), 'genérico');
    expect(texto).toContain('no admite esa operación');
    expect(texto).toContain('HTTP 409 · M4-OPERACION-NO-PERMITIDA');
    expect(texto).not.toContain('genérico');
  });

  it('conserva el mensaje genérico para códigos 409 no publicados', () => {
    expect(mensajeM4(error409('M4-CODIGO-DESCONOCIDO'), 'genérico')).toContain('genérico');
  });
});
