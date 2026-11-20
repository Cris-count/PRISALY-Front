import { MUNDO_PRUEBA } from '../mundo-tecnico/mundo-tecnico.fixture';
import { SesionVisualUnreal, validarSesionVisual } from './configuracion-unreal';
import { CORRESPONDENCIA_MUNDO_UNREAL, edificioPorZonaUnreal, zonaUnrealPorNodo } from './correspondencia-mundo';
import { CanalPixelStreaming, TransportePixelStreaming } from './transporte-pixel-streaming';

describe('TransportePixelStreaming', () => {
  let canal: jasmine.SpyObj<CanalPixelStreaming>;
  let transporte: TransportePixelStreaming;
  let recibir: (texto: string) => void;
  beforeEach(() => {
    canal = jasmine.createSpyObj('PixelStreaming', ['emitUIInteraction', 'addResponseEventListener', 'removeResponseEventListener', 'disconnect']);
    canal.emitUIInteraction.and.returnValue(true);
    canal.addResponseEventListener.and.callFake((_nombre, oyente) => { recibir = oyente; });
    transporte = new TransportePixelStreaming(canal);
  });
  afterEach(() => transporte.cerrar());

  it('no envía ni entrega mensajes hasta abrir el canal', () => {
    const oyente = jasmine.createSpy('oyente');
    transporte.alRecibir(oyente);
    expect(() => transporte.enviar('{}')).toThrow();
    recibir('{}');
    expect(oyente).not.toHaveBeenCalled();
    transporte.abrir();
    transporte.enviar('{}');
    recibir('{"v":1}');
    expect(canal.emitUIInteraction).toHaveBeenCalledOnceWith('{}');
    expect(oyente).toHaveBeenCalledOnceWith('{"v":1}');
  });

  it('un envío rechazado por la biblioteca no se considera entregado', () => {
    transporte.abrir();
    canal.emitUIInteraction.and.returnValue(false);
    expect(() => transporte.enviar('{}')).toThrow();
  });

  it('cierra una sola vez, retira el receptor e ignora mensajes tardíos', () => {
    const oyente = jasmine.createSpy('oyente');
    const desconexion = jasmine.createSpy('desconexion');
    transporte.alRecibir(oyente);
    transporte.alDesconectar(desconexion);
    transporte.abrir();
    transporte.cerrar();
    transporte.cerrar();
    transporte.abrir();
    recibir('{}');
    expect(canal.disconnect).toHaveBeenCalledTimes(1);
    expect(canal.removeResponseEventListener).toHaveBeenCalledTimes(1);
    expect(desconexion).toHaveBeenCalledTimes(1);
    expect(oyente).not.toHaveBeenCalled();
  });
});

describe('Alineación de identificadores y asignación visual', () => {
  const sesion: SesionVisualUnreal = { urlSenalizacion: 'wss://stream.prisaly.example', streamerId: 'instancia-1', sesion: 'sesion-prueba-0001', casoId: 'caso-demo-01' };

  it('corresponde a los tres edificios y sus nodos reales sin cambiar sus identificadores', () => {
    for (const entrada of CORRESPONDENCIA_MUNDO_UNREAL) {
      expect(MUNDO_PRUEBA.edificios.find((edificio) => edificio.id === entrada.edificioId)?.entrada).toBe(entrada.nodoId);
      expect(zonaUnrealPorNodo(entrada.nodoId)).toBe(entrada.zonaId);
      expect(edificioPorZonaUnreal(entrada.zonaId)).toBe(entrada);
    }
    expect(zonaUnrealPorNodo('plaza-central')).toBe('plaza_central');
    expect(zonaUnrealPorNodo('inexistente')).toBeNull();
    expect(edificioPorZonaUnreal('hospital-prueba')).toBeNull();
  });

  it('acepta WSS y WS local, pero rechaza HTTP y WS remoto', () => {
    expect(() => validarSesionVisual(sesion)).not.toThrow();
    for (const urlSenalizacion of ['ws://127.0.0.1:8888', 'ws://localhost:8888', 'ws://[::1]:8888']) {
      expect(() => validarSesionVisual({ ...sesion, urlSenalizacion })).not.toThrow();
    }
    for (const urlSenalizacion of [
      'https://stream.prisaly.example', 'ws://stream.prisaly.example',
      'wss://usuario:clave@stream.prisaly.example', 'ws://localhost.example:8888',
      'ws://127.0.0.1.example:8888', 'ws://0.0.0.0:8888',
    ]) {
      expect(() => validarSesionVisual({ ...sesion, urlSenalizacion })).toThrow();
    }
  });

  it('rechaza asignaciones sin sesión, instancia o caso compatibles', () => {
    for (const cambios of [{ sesion: 'x' }, { streamerId: '' }, { casoId: 'caso con espacios' }]) {
      expect(() => validarSesionVisual({ ...sesion, ...cambios })).toThrow();
    }
  });
});
