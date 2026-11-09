import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable } from 'rxjs';

import {
  ContratoPendienteError,
  OperacionParticipacion,
  ParticipacionGateway,
  ParticipacionPendienteGateway,
} from './participacion.gateway';

describe('ParticipacionGateway', () => {
  it('se inyecta por defecto con la implementación pendiente de contrato', () => {
    expect(TestBed.inject(ParticipacionGateway)).toBeInstanceOf(ParticipacionPendienteGateway);
  });

  describe('implementación pendiente', () => {
    // Se tipa con la clase abstracta: las pruebas ejercen las firmas del límite
    // de integración que consume SimuladorStore, no las de la implementación.
    const gateway: ParticipacionGateway = new ParticipacionPendienteGateway();
    const operaciones: [OperacionParticipacion, () => Observable<unknown>][] = [
      ['consultarSesionesAutorizadas', () => gateway.consultarSesionesAutorizadas()],
      ['iniciarIntento', () => gateway.iniciarIntento('s')],
      ['consultarIntento', () => gateway.consultarIntento('i')],
      ['registrarRespuesta', () => gateway.registrarRespuesta('i', 'p', 'o')],
      ['consultarProgreso', () => gateway.consultarProgreso('i')],
      ['reanudarIntento', () => gateway.reanudarIntento('i')],
      ['finalizarIntento', () => gateway.finalizarIntento('i')],
    ];

    for (const [operacion, invocar] of operaciones) {
      it(`${operacion} falla con ContratoPendienteError y no simula éxito`, async () => {
        const error = await firstValueFrom(invocar()).then(
          () => fail('no debía emitir un resultado'),
          (e: unknown) => e,
        );

        expect(error).toBeInstanceOf(ContratoPendienteError);
        expect((error as ContratoPendienteError).operacion).toBe(operacion);
      });
    }
  });
});
