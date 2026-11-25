import { HttpErrorResponse } from '@angular/common/http';

import { clasificarErrorApi, TipoFalloApi } from './clasificar-error-api';

describe('clasificarErrorApi', () => {
  const casos: [number, TipoFalloApi, boolean][] = [
    [0, 'sin-conexion', true],
    [401, 'sesion-no-valida', false],
    [403, 'acceso-denegado', false],
    [404, 'no-encontrado', false],
    [409, 'conflicto', false],
    [500, 'servidor', true],
    [503, 'servidor', true],
    [418, 'desconocido', false],
  ];

  for (const [estado, tipo, reintentable] of casos) {
    it(`clasifica el estado ${estado} como ${tipo}`, () => {
      const fallo = clasificarErrorApi(new HttpErrorResponse({ status: estado }));

      expect(fallo.tipo).toBe(tipo);
      expect(fallo.reintentable).toBe(reintentable);
      expect(fallo.mensaje).toBeTruthy();
    });
  }

  it('no muestra el mensaje del servidor', () => {
    const fallo = clasificarErrorApi(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICTO_DATOS', message: 'duplicate key uq_respuesta_idx1' },
      }),
    );

    expect(fallo.mensaje).not.toContain('uq_respuesta_idx1');
  });

  it('trata como desconocido lo que no es un error HTTP', () => {
    expect(clasificarErrorApi(new Error('x')).tipo).toBe('desconocido');
    expect(clasificarErrorApi(undefined).tipo).toBe('desconocido');
  });
});
