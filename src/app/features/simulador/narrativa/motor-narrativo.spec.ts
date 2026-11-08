import { GUION_DEMOSTRACION } from '../demo/guion-demostracion';
import { MotorNarrativo } from './motor-narrativo';
import { ConsecuenciaNarrativa } from './narrativa.models';

describe('MotorNarrativo', () => {
  let motor: MotorNarrativo;
  const agotarDialogos = () => { while (motor.dialogoActual) motor.avanzarDialogo(); };
  const viajar = (id: string) => { agotarDialogos(); motor.elegir(id); motor.completarTransicion(); };
  beforeEach(() => { motor = new MotorNarrativo(GUION_DEMOSTRACION); });

  it('inicia en la escena declarada con progreso exclusivamente narrativo', () => {
    expect(motor.estado.escenaId).toBe('bienvenida');
    expect(motor.estado.visitadas).toEqual(['bienvenida']);
    expect(motor.decisionesDisponibles).toEqual([]);
    expect(motor.terminado).toBeFalse();
    expect(motor.puedeVolver).toBeFalse();
  });

  it('ignora decisiones anticipadas, ajenas y transiciones inexistentes', () => {
    const inicial = motor.estado;
    motor.elegir('conversar'); motor.completarTransicion(); motor.volver();
    expect(motor.estado).toBe(inicial);
    agotarDialogos();
    const listo = motor.estado;
    motor.elegir('no-existe');
    expect(motor.estado).toBe(listo);
  });

  for (const ruta of ['conversar', 'observar']) {
    it(`recorre completamente ${ruta}, con diálogos, consecuencias y cierre propio`, () => {
      viajar(ruta);
      expect(motor.estado.personajes.find(p => p.id === (ruta === 'conversar' ? 'b' : 'a'))?.expresion)
        .toBe(ruta === 'conversar' ? 'alegre' : 'atenta');
      viajar('reunirse');
      expect(motor.dialogoActual?.texto).toContain(ruta === 'conversar' ? 'conversación inicial' : 'observación inicial');
      expect(motor.estado.personajes.find(p => p.id === 'a')?.estado).toBe('reunida');
      viajar('despedirse');
      expect(motor.estado.escenaId).toBe(ruta === 'conversar' ? 'cierre-conversacion' : 'cierre-observacion');
      expect(motor.terminado).toBeFalse();
      agotarDialogos();
      expect(motor.terminado).toBeTrue();
      expect(motor.estado.visitadas.length).toBe(4);
      expect(motor.totalEscenas).toBe(6);
      const final = motor.estado;
      motor.elegir('conversar'); motor.avanzarDialogo(); motor.completarTransicion();
      expect(motor.estado).toBe(final);
    });
  }

  it('expone una transición explícita y bloquea decisiones repetidas hasta entrar', () => {
    agotarDialogos(); motor.elegir('conversar');
    expect(motor.estado.escenaId).toBe('bienvenida');
    expect(motor.estado.transicion?.destino).toBe('conversacion');
    const pendiente = motor.estado;
    motor.elegir('observar'); motor.avanzarDialogo();
    expect(motor.estado).toBe(pendiente);
    motor.completarTransicion();
    expect(motor.estado.escenaId).toBe('conversacion');
  });

  it('restaura consecuencias y progreso al retroceder y permite cambiar la ruta', () => {
    agotarDialogos();
    const antes = motor.estado;
    motor.elegir('conversar'); motor.completarTransicion();
    motor.volver(); motor.volver();
    expect(motor.estado).toBe(antes);
    expect(motor.estado.marcas['conversacion']).toBeUndefined();
    expect(motor.estado.personajes[1].expresion).toBe('serena');
    motor.elegir('observar'); motor.completarTransicion();
    expect(motor.estado.visitadas).toEqual(['bienvenida', 'observacion']);
  });

  it('reinicia todo el recorrido sin conservar marcas ni historial', () => {
    viajar('conversar'); viajar('reunirse'); motor.reiniciar();
    expect(motor.estado.marcas).toEqual({});
    expect(motor.estado.visitadas).toEqual(['bienvenida']);
    expect(motor.estado.personajes).toEqual(GUION_DEMOSTRACION.personajes);
    expect(motor.puedeVolver).toBeFalse();
  });

  it('protege el estado y aísla las instancias y el guion de origen', () => {
    const guion = structuredClone(GUION_DEMOSTRACION);
    const otro = new MotorNarrativo(guion);
    (guion.escenas as unknown as { id: string }[])[0].id = 'alterado';
    viajar('conversar');
    expect(otro.estado.escenaId).toBe('bienvenida');
    expect(Object.isFrozen(motor.estado)).toBeTrue();
    expect(Object.isFrozen(motor.estado.personajes[0])).toBeTrue();
    expect(Object.isFrozen(motor.escena)).toBeTrue();
    expect(GUION_DEMOSTRACION.personajes[1].expresion).toBe('serena');
  });

  it('rechaza referencias rotas, IDs duplicados y rutas sin alternativa', () => {
    const escenas = GUION_DEMOSTRACION.escenas;
    expect(() => new MotorNarrativo({ ...GUION_DEMOSTRACION, inicio: 'ausente' })).toThrowError();
    expect(() => new MotorNarrativo({ ...GUION_DEMOSTRACION, escenas: [...escenas, escenas[0]] })).toThrowError();
    const decision = escenas[0].decisiones[0];
    expect(() => new MotorNarrativo({ ...GUION_DEMOSTRACION, escenas: [
      { ...escenas[0], decisiones: [{ ...decision, rutas: [{ destino: 'ausente', texto: '' }] }] }, ...escenas.slice(1),
    ] })).toThrowError();
    expect(() => new MotorNarrativo({ ...GUION_DEMOSTRACION, escenas: [
      { ...escenas[0], decisiones: [{ ...decision, rutas: [] }] }, ...escenas.slice(1),
    ] })).toThrowError();
  });

  it('rechaza personajes desconocidos y tipos de efecto ajenos a la narrativa', () => {
    const primera = GUION_DEMOSTRACION.escenas[0];
    for (const efecto of [
      { tipo: 'personaje', personajeId: 'ausente', estado: '', expresion: 'serena' },
      { tipo: 'puntaje', valor: 100 },
    ]) {
      expect(() => new MotorNarrativo({ ...GUION_DEMOSTRACION, escenas: [
        { ...primera, alEntrar: [efecto as ConsecuenciaNarrativa] }, ...GUION_DEMOSTRACION.escenas.slice(1),
      ] })).toThrowError();
    }
  });

  it('rechaza un guion sin ningún cierre alcanzable', () => {
    const escena = GUION_DEMOSTRACION.escenas[0];
    expect(() => new MotorNarrativo({ ...GUION_DEMOSTRACION, escenas: [{ ...escena,
      decisiones: [{ id: 'bucle', texto: '', consecuencias: [], rutas: [{ destino: escena.id, texto: '' }] }],
    }] })).toThrowError();
  });
});
