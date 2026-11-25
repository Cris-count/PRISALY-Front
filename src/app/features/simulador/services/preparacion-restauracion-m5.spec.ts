import { IntentoM5 } from '../models/participacion.models';
import {
  admiteEscritura,
  ESPERAN_CONTRATO,
  hayConflictoDeRevision,
  momentoRestauracion,
  separarEstados,
} from './preparacion-restauracion-m5';

/** DC-DEV-117. No llama HTTP ni usa contratos aún no publicados. */
const intento: IntentoM5 = {
  idIntento: '11111111-1111-4111-8111-111111111111',
  estado: 'EnCurso',
  inicio: '2026-11-25T10:00:00Z',
  limiteTemporal: '2026-11-25T11:00:00Z',
  ahoraServidor: '2026-11-25T10:10:00Z',
  motivoFinalizacion: null,
  respuestas: [
    {
      idPregunta: '22222222-2222-4222-8222-222222222222',
      idOpcionSeleccionada: '33333333-3333-4333-8333-333333333333',
      revision: 2,
    },
  ],
};

describe('DC-117 separación de estado M5', () => {
  it('el primer ingreso no trae respuestas y no admite escritura mientras carga', () => {
    const vacio = { ...intento, respuestas: [] };
    const separado = separarEstados(vacio, null, 'cargando');
    expect(momentoRestauracion('cargando', vacio)).toBe('primer-ingreso');
    expect(separado.persistido?.respuestas).toEqual([]);
    expect(admiteEscritura('cargando', 'EnCurso')).toBeFalse();
  });

  it('una recarga reconstruye solo las respuestas persistidas', () => {
    const separado = separarEstados(intento, null, 'disponible');
    expect(momentoRestauracion('disponible', intento)).toBe('recarga');
    expect(separado.persistido?.respuestas).toEqual(intento.respuestas);
    expect(admiteEscritura('disponible', 'EnCurso')).toBeTrue();
  });

  it('la reconexión y el conflicto no se tratan como datos ya guardados', () => {
    expect(momentoRestauracion('por-verificar', intento)).toBe('reconexion');
    expect(momentoRestauracion('conflicto', intento)).toBe('conflicto');
    expect(admiteEscritura('por-verificar', 'EnCurso')).toBeFalse();
    expect(admiteEscritura('conflicto', 'EnCurso')).toBeFalse();
    expect(
      hayConflictoDeRevision(intento.respuestas, {
        idPregunta: intento.respuestas[0].idPregunta,
        idOpcionSeleccionada: '44444444-4444-4444-8444-444444444444',
      }),
    ).toBeTrue();
  });

  it('un intento finalizado restaura respuestas y bloquea la escritura', () => {
    const cerrado = { ...intento, estado: 'Finalizado' as const };
    expect(momentoRestauracion('finalizado', cerrado)).toBe('finalizado');
    expect(separarEstados(cerrado, null, 'finalizado').persistido?.estado).toBe('Finalizado');
    expect(admiteEscritura('finalizado', 'Finalizado')).toBeFalse();
    expect(admiteEscritura('guardada', 'Finalizado')).toBeFalse();
  });

  it('notas, pistas, edificios, zonas y fase no salen del intento', () => {
    const separado = separarEstados(intento, null, 'disponible');
    expect(separado.visual).toEqual({
      origen: 'contrato-pendiente',
      notas: null,
      pistas: null,
      edificiosVisitados: null,
      zonasExploradas: null,
      faseActual: null,
    });
    expect(ESPERAN_CONTRATO).toEqual([
      'notas',
      'pistas',
      'edificiosVisitados',
      'zonasExploradas',
      'faseActual',
    ]);
    expect(JSON.stringify(separado.persistido)).not.toContain('pista');
  });
});
