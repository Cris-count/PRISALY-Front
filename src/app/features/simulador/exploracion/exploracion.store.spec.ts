import { ExploracionStore } from './exploracion.store';
import { MAPA_DEMOSTRACION } from './mapa-demo';

describe('ExploracionStore: estado visual sin participación académica', () => {
  let store: ExploracionStore;
  beforeEach(() => {
    store = new ExploracionStore();
    store.configurar(MAPA_DEMOSTRACION);
  });
  it('inicia sin visitas y permite omitir todos los espacios', () => {
    expect(store.fase()).toBe('presentacion');
    store.comenzar();
    store.solicitarPreguntas();
    expect(store.fase()).toBe('confirmando');
    expect(store.visitas().size).toBe(0);
    store.confirmarPreguntas();
    expect(store.fase()).toBe('cuestionario');
  });
  it('permite cualquier orden y cuenta visitas repetidas sin perder la selección', () => {
    store.comenzar();
    for (const id of ['demo-oficinas', 'demo-hospital', 'demo-oficinas']) {
      store.seleccionar(id);
      store.entrar();
      expect(store.espacioAbierto()?.id).toBe(id);
      store.volverAlMapa();
    }
    expect(store.visitas().get('demo-oficinas')).toBe(2);
    expect(store.visitas().get('demo-hospital')).toBe(1);
    expect(store.seleccionado()).toBe('demo-oficinas');
  });
  it('cancelar conserva selección y visitas, confirmar bloquea las acciones de exploración', () => {
    store.comenzar();
    store.seleccionar('demo-hospital');
    store.entrar();
    store.volverAlMapa();
    const visitas = store.visitas();
    store.solicitarPreguntas();
    store.cancelarPreguntas();
    expect(store.visitas()).toBe(visitas);
    expect(store.seleccionado()).toBe('demo-hospital');
    store.solicitarPreguntas();
    store.confirmarPreguntas();
    store.seleccionar('demo-oficinas');
    store.entrar();
    store.volverAlMapa();
    store.cancelarPreguntas();
    expect(store.fase()).toBe('cuestionario');
    expect(store.espacioAbierto()).toBeNull();
    expect(store.seleccionado()).toBe('demo-hospital');
    expect(store.visitas()).toBe(visitas);
  });
  it('ignora IDs ajenos, espacios no disponibles y transiciones anticipadas', () => {
    store.configurar({
      ...MAPA_DEMOSTRACION,
      espacios: MAPA_DEMOSTRACION.espacios.map((e) => ({ ...e, disponible: false })),
    });
    store.confirmarPreguntas();
    store.completarDemostracion();
    expect(store.fase()).toBe('presentacion');
    store.comenzar();
    store.seleccionar('ajeno');
    store.seleccionar('demo-hospital');
    store.entrar();
    expect(store.seleccionado()).toBeNull();
    expect(store.visitas().size).toBe(0);
  });
  it('solo acepta eventos visuales del espacio abierto y permite terminar la interacción', () => {
    store.comenzar();
    store.seleccionar('demo-hospital');
    store.entrar();
    store.recibirEvento({ tipo: 'interaccion-iniciada', espacioId: 'demo-oficinas' });
    expect(store.interaccionActiva()).toBeFalse();
    store.recibirEvento({ tipo: 'interaccion-iniciada', espacioId: 'demo-hospital' });
    expect(store.interaccionActiva()).toBeTrue();
    store.recibirEvento({ tipo: 'interaccion-finalizada', espacioId: 'demo-hospital' });
    expect(store.interaccionActiva()).toBeFalse();
    store.recibirEvento({ tipo: 'salida-solicitada', espacioId: 'demo-hospital' });
    expect(store.espacioAbierto()).toBeNull();
    expect(store.visitas().get('demo-hospital')).toBe(1);
  });
  it('no cambia de edificio ni abre preguntas mientras está dentro de un espacio', () => {
    store.comenzar();
    store.seleccionar('demo-hospital');
    store.entrar();
    store.seleccionar('demo-oficinas');
    store.entrar();
    store.solicitarPreguntas();
    expect(store.espacioAbierto()?.id).toBe('demo-hospital');
    expect(store.fase()).toBe('explorando');
    expect(store.visitas().get('demo-hospital')).toBe(1);
  });
  it('valida IDs demo, unicidad y coordenadas, y aísla la configuración de origen', () => {
    expect(() => store.configurar({ ...MAPA_DEMOSTRACION, id: 'uuid-academico' })).toThrow();
    expect(() =>
      store.configurar({
        ...MAPA_DEMOSTRACION,
        espacios: [MAPA_DEMOSTRACION.espacios[0], MAPA_DEMOSTRACION.espacios[0]],
      }),
    ).toThrow();
    expect(() =>
      store.configurar({
        ...MAPA_DEMOSTRACION,
        espacios: [{ ...MAPA_DEMOSTRACION.espacios[0], posicion: { x: NaN, y: 300 } }],
      }),
    ).toThrow();
    const config = structuredClone(MAPA_DEMOSTRACION);
    const posicionOriginal = config.espacios[0].posicion.x;
    store.configurar(config);
    (config.espacios[0].posicion as { x: number }).x = 80;
    expect(store.configuracion().espacios[0].posicion.x).toBe(posicionOriginal);
  });
  it('mover una plantilla no altera la navegación por ID', () => {
    store.configurar({
      ...MAPA_DEMOSTRACION,
      espacios: MAPA_DEMOSTRACION.espacios.map((e) => ({ ...e, posicion: { x: 20, y: 60 } })),
    });
    store.comenzar();
    store.seleccionar('demo-comisaria');
    store.entrar();
    expect(store.espacioAbierto()?.plantillaVisual).toBe('comisaria');
  });
});
