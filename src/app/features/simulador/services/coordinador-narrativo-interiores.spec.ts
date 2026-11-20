import { TestBed } from '@angular/core/testing';
import { CoordinadorNarrativoInteriores, ErrorIncompatibilidadSnapshot } from './coordinador-narrativo-interiores';
import { AdaptadorPistasNarrativas } from './adaptador-pistas-narrativas';
import { LibretaStore } from '../investigacion/libreta.store';
import { GUION_HOSPITAL_DEMO, GUION_POLICIA_DEMO } from '../demo/guiones-edificios-demo';

describe('CoordinadorNarrativoInteriores', () => {
  let coordinador: CoordinadorNarrativoInteriores;
  let libreta: LibretaStore;
  let adaptadorPistas: AdaptadorPistasNarrativas;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LibretaStore,
        AdaptadorPistasNarrativas,
        CoordinadorNarrativoInteriores,
      ],
    });
    coordinador = TestBed.inject(CoordinadorNarrativoInteriores);
    libreta = TestBed.inject(LibretaStore);
    adaptadorPistas = TestBed.inject(AdaptadorPistasNarrativas);
  });

  it('inicia una conversación inicial en el Hospital con su guion correspondiente', () => {
    const motor = coordinador.iniciarOReanudar('hospital-prueba');

    expect(motor).toBeTruthy();
    expect(motor.estado.escenaId).toBe(GUION_HOSPITAL_DEMO.inicio);
    expect(motor.dialogoActual?.personajeId).toBe('doctor');
    expect(motor.dialogoActual?.texto).toContain('Bienvenido al Hospital Central');
    expect(motor.terminado).toBeFalse();
  });

  it('avanza diálogos y toma decisiones narrativas registrando la opción elegida', () => {
    coordinador.iniciarOReanudar('hospital-prueba');
    coordinador.avanzarDialogo('hospital-prueba'); // Doctor habla
    coordinador.avanzarDialogo('hospital-prueba'); // Enfermera habla

    const motor = coordinador.obtenerMotor('hospital-prueba')!;
    expect(motor.decisionesDisponibles.length).toBe(2);

    coordinador.elegirOpcion('hospital-prueba', 'consultar-expediente');
    expect(motor.estado.transicion?.destino).toBe('sala-consulta');
    expect(motor.estado.marcas['pista_historial_clinico']).toBeTrue();

    // Comprobamos que el adaptador transfirió la pista automáticamente a LibretaStore
    expect(libreta.estado().pistas.length).toBe(1);
    expect(libreta.estado().pistas[0].id).toBe('pista-historial-clinico');
  });

  it('permite salir del edificio, visitar un segundo edificio y conservar estados aislados', () => {
    // 1. Entrada al Hospital y avance
    coordinador.iniciarOReanudar('hospital-prueba');
    coordinador.avanzarDialogo('hospital-prueba');
    coordinador.avanzarDialogo('hospital-prueba');
    coordinador.elegirOpcion('hospital-prueba', 'consultar-expediente');
    coordinador.completarTransicion('hospital-prueba');

    const motorHospital = coordinador.obtenerMotor('hospital-prueba')!;
    expect(motorHospital.estado.escenaId).toBe('sala-consulta');

    // 2. Salida del Hospital
    const snapshotHospital = coordinador.pausarYGuardar('hospital-prueba');
    expect(snapshotHospital).toBeTruthy();
    expect(snapshotHospital?.escenaId).toBe('sala-consulta');
    expect(snapshotHospital?.opcionesElegidas).toEqual(['consultar-expediente']);

    // 3. Entrada a la Policía
    const motorPolicia = coordinador.iniciarOReanudar('policia-prueba');
    expect(motorPolicia.estado.escenaId).toBe(GUION_POLICIA_DEMO.inicio);
    expect(motorPolicia.dialogoActual?.personajeId).toBe('oficial');
    expect(motorPolicia.dialogoActual?.texto).toContain('Comisaría Sectorial');

    // 4. Salida de la Policía
    coordinador.pausarYGuardar('policia-prueba');
    expect(coordinador.totalEdificiosVisitados()).toBe(2);

    // 5. Reingreso al Hospital
    const motorHospitalReingreso = coordinador.iniciarOReanudar('hospital-prueba');
    expect(motorHospitalReingreso.estado.escenaId).toBe('sala-consulta');
    expect(motorHospitalReingreso.estado.marcas['pista_historial_clinico']).toBeTrue();
    expect(motorHospitalReingreso.estado.personajes.find((p) => p.id === 'doctor')?.estado).toBe('concluyendo informe');
  });

  it('evita duplicar consecuencias y pistas al reingresar a un edificio ya visitado', () => {
    coordinador.iniciarOReanudar('hospital-prueba');
    coordinador.avanzarDialogo('hospital-prueba');
    coordinador.avanzarDialogo('hospital-prueba');
    coordinador.elegirOpcion('hospital-prueba', 'consultar-expediente');

    expect(libreta.estado().pistas.length).toBe(1);

    // Salir y volver a entrar
    coordinador.pausarYGuardar('hospital-prueba');
    coordinador.iniciarOReanudar('hospital-prueba');

    // Las pistas no deben haberse duplicado
    expect(libreta.estado().pistas.length).toBe(1);
    expect(libreta.estado().pistas[0].id).toBe('pista-historial-clinico');
  });

  it('reconoce una conversación terminada y mantiene su estado de cierre sin errores', () => {
    coordinador.iniciarOReanudar('policia-prueba');
    coordinador.avanzarDialogo('policia-prueba');
    coordinador.elegirOpcion('policia-prueba', 'solicitar-atestado');
    coordinador.completarTransicion('policia-prueba');
    coordinador.avanzarDialogo('policia-prueba'); // Agota diálogo final

    expect(coordinador.estaCompletado('policia-prueba')).toBeTrue();

    // Salir y volver
    coordinador.pausarYGuardar('policia-prueba');
    const motorReingreso = coordinador.iniciarOReanudar('policia-prueba');

    expect(motorReingreso.terminado).toBeTrue();
    expect(coordinador.estaCompletado('policia-prueba')).toBeTrue();
  });

  it('limpia íntegramente las sesiones al reiniciar', () => {
    coordinador.iniciarOReanudar('hospital-prueba');
    coordinador.pausarYGuardar('hospital-prueba');
    expect(coordinador.totalEdificiosVisitados()).toBe(1);

    coordinador.reiniciarSesion();
    expect(coordinador.totalEdificiosVisitados()).toBe(0);
    expect(coordinador.obtenerMotor('hospital-prueba')).toBeNull();
  });

  it('rechaza restaurar si el snapshot proviene de otro guion o edificio incompatible conservando el snapshot', () => {
    coordinador.iniciarOReanudar('hospital-prueba');
    const snapshotOriginal = coordinador.pausarYGuardar('hospital-prueba')!;

    // Inyectamos un snapshot con guion incompatible
    const snapshotGuionInvalido = {
      ...snapshotOriginal,
      guionId: 'otro-guion-distinto',
    };
    (coordinador as any).snapshots.set('hospital-prueba', snapshotGuionInvalido);
    (coordinador as any).motores.clear();

    let errorCapturado: any;
    try {
      coordinador.iniciarOReanudar('hospital-prueba');
    } catch (e) {
      errorCapturado = e;
    }

    expect(errorCapturado instanceof ErrorIncompatibilidadSnapshot).toBeTrue();
    expect(errorCapturado.codigo).toBe('GUION_DISCREPANTE');
    expect(errorCapturado.esperado.guionId).toBe(GUION_HOSPITAL_DEMO.id);
    expect(errorCapturado.recibido.guionId).toBe('otro-guion-distinto');
    // Verifica que el snapshot se conservó intacto en memoria sin purgarse
    expect((coordinador as any).snapshots.get('hospital-prueba')).toBe(snapshotGuionInvalido);

    // Inyectamos un snapshot con edificio discordante
    const snapshotEdificioInvalido = {
      ...snapshotOriginal,
      edificioId: 'otro-edificio',
    };
    (coordinador as any).snapshots.set('hospital-prueba', snapshotEdificioInvalido);

    expect(() => coordinador.iniciarOReanudar('hospital-prueba')).toThrowError(/edificio esperado/);
    expect((coordinador as any).snapshots.get('hospital-prueba')).toBe(snapshotEdificioInvalido);
  });

  it('rechaza restaurar si el snapshot contiene decisiones inexistentes en el guion', () => {
    coordinador.iniciarOReanudar('hospital-prueba');
    const snapshotOriginal = coordinador.pausarYGuardar('hospital-prueba')!;

    const snapshotOpcionFalsa = {
      ...snapshotOriginal,
      opcionesElegidas: ['decision-inexistente-hack'],
    };
    (coordinador as any).snapshots.set('hospital-prueba', snapshotOpcionFalsa);
    (coordinador as any).motores.clear();

    expect(() => coordinador.iniciarOReanudar('hospital-prueba')).toThrowError(/decisión previa desconocida/);
  });

  it('mantiene aislamiento estricto y marcas coherentes entre Hospital, Policía y Fiscalía', () => {
    // 1. Hospital
    coordinador.iniciarOReanudar('hospital-prueba');
    coordinador.avanzarDialogo('hospital-prueba');
    coordinador.avanzarDialogo('hospital-prueba');
    coordinador.elegirOpcion('hospital-prueba', 'consultar-expediente');
    coordinador.pausarYGuardar('hospital-prueba');

    // 2. Policía
    coordinador.iniciarOReanudar('policia-prueba');
    coordinador.avanzarDialogo('policia-prueba');
    coordinador.elegirOpcion('policia-prueba', 'solicitar-atestado');
    coordinador.pausarYGuardar('policia-prueba');

    // 3. Fiscalía
    coordinador.iniciarOReanudar('fiscalia-prueba');
    coordinador.avanzarDialogo('fiscalia-prueba');
    coordinador.elegirOpcion('fiscalia-prueba', 'consultar-calificacion');
    coordinador.pausarYGuardar('fiscalia-prueba');

    expect(coordinador.totalEdificiosVisitados()).toBe(3);

    // Verificamos que las pistas se hayan acumulado en LibretaStore sin solaparse
    expect(libreta.estado().pistas.length).toBe(3);
    const titulos = libreta.estado().pistas.map((p) => p.titulo);
    expect(titulos).toContain('Historia Clínica de Emergencia');
    expect(titulos).toContain('Minuta de Intervención Policial');
    expect(titulos).toContain('Informe Preliminar de Fiscalía');
  });
});
