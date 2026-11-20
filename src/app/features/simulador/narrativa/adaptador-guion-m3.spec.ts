import { adaptarIntervencionesM3, GuionM3 } from './adaptador-guion-m3';

describe('adaptador de intervenciones M3', () => {
  const guion: GuionM3 = {
    formato: 'prisaly-guion-1', inicio: 'sala', espacios: [{ idEspacio: 'sala', titulo: 'Sala' }],
    personajes: [{ idPersonaje: 'persona', nombre: 'Persona de prueba' }],
    intervenciones: [{ idIntervencion: 'saludo', idEspacio: 'sala', idPersonaje: 'persona',
      condicion: { marca: 'vista', valor: false }, dialogos: [{ idPersonaje: 'persona', texto: 'Hola' }],
      consecuencias: [{ tipo: 'marca', marca: 'hablo', valor: true },
        { tipo: 'personaje', idPersonaje: 'persona', estado: 'atendiendo', expresion: 'atenta' }] }],
  };

  it('conserva condición, orden, diálogos y consecuencias sin ejecutarlas', () => {
    expect(adaptarIntervencionesM3(guion)).toEqual([{ id: 'saludo', espacioId: 'sala', personajeId: 'persona',
      condicion: { marca: 'vista', valor: false }, dialogos: [{ personajeId: 'persona', texto: 'Hola' }],
      consecuencias: [{ tipo: 'marca', marca: 'hablo', valor: true },
        { tipo: 'personaje', personajeId: 'persona', estado: 'atendiendo', expresion: 'atenta' }] }]);
  });

  it('acepta una lista opcional ausente y rechaza formatos distintos', () => {
    expect(adaptarIntervencionesM3({ ...guion, intervenciones: null })).toEqual([]);
    expect(() => adaptarIntervencionesM3({ ...guion, formato: 'otro' as 'prisaly-guion-1' })).toThrow();
  });

  it('conserva orden de intervenciones y diálogos y no añade condición ni consecuencias ausentes', () => {
    const resultado = adaptarIntervencionesM3({ ...guion, intervenciones: [
      { idIntervencion: 'segunda', idEspacio: 'sala', idPersonaje: 'persona',
        dialogos: [{ idPersonaje: 'persona', texto: 'Primero' }, { idPersonaje: 'persona', texto: 'Después' }] },
      ...guion.intervenciones!,
    ] });
    expect(resultado.map(i => i.id)).toEqual(['segunda', 'saludo']);
    expect(resultado[0].dialogos.map(d => d.texto)).toEqual(['Primero', 'Después']);
    expect(resultado[0].condicion).toBeUndefined();
    expect(resultado[0].consecuencias).toEqual([]);
    expect(guion.personajes![0].estadoInicial).toBeUndefined();
    expect(guion.personajes![0].expresionInicial).toBeUndefined();
  });

  it('rechaza un tipo de consecuencia desconocido en vez de interpretarlo como personaje', () => {
    const invalida = { tipo: 'desconocido' } as unknown as NonNullable<NonNullable<GuionM3['intervenciones']>[number]['consecuencias']>[number];
    expect(() => adaptarIntervencionesM3({ ...guion, intervenciones: [{ ...guion.intervenciones![0], consecuencias: [invalida] }] })).toThrowError('Consecuencia narrativa no compatible');
  });
});
