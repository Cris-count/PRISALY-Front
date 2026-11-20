import { cargarEsquemasBrowser } from '../protocolo/cargar-esquemas-browser';
import { Esquemas, Mensaje } from '../protocolo/validador-mensaje';
import { PuenteUnreal } from './puente-unreal';
import { CanalMemoria } from './transporte';

describe('PuenteUnreal con el protocolo candidato real', () => {
  let esquemas: Esquemas;
  let canal: CanalMemoria;
  let puente: PuenteUnreal;
  const sesion = 'sesion-prueba-0001';
  const hecho = (tipo: string, datos: Record<string, unknown>, extras: Partial<Mensaje> = {}): Mensaje =>
    ({ v: 1, id: 'u-000001', tipo, datos, correlacion: null, sesion, ts: 1, origen: 'unreal', ...extras });
  const turno = () => new Promise<void>((resolver) => setTimeout(resolver, 0));

  beforeAll(async () => { esquemas = await cargarEsquemasBrowser(); });
  beforeEach(() => {
    canal = new CanalMemoria();
    puente = new PuenteUnreal(canal.angular, esquemas, { sesion, timeoutAckMs: 20 });
  });
  afterEach(() => puente?.destruir());

  it('solo confirma una orden con un ack correlacionado', async () => {
    canal.unreal.alRecibir((texto) => {
      const orden = JSON.parse(texto) as Mensaje;
      canal.unreal.enviar(JSON.stringify(hecho('orden.ack', {}, { correlacion: orden.id })));
    });
    const ack = await puente.enviar('avatar.irA', { zoneId: 'hospital_entrada' });
    expect(ack?.correlacion).toBe('a-000001');
    expect(puente.ordenesPendientes).toBe(0);
  });

  it('rechaza un destino con formato de Phaser sin enviarlo a Unreal', async () => {
    await expectAsync(puente.enviar('avatar.irA', { zoneId: 'hospital-prueba' })).toBeRejected();
    expect(canal.enviados).toBe(0);
  });

  it('ignora otra sesión, JSON inválido y un intento de crear pistas desde Unreal', async () => {
    const recibir = jasmine.createSpy('recibir');
    puente.suscribir(recibir);
    canal.unreal.enviar('{');
    canal.unreal.enviar(JSON.stringify(hecho('zona.entro', { zoneId: 'hospital_entrada' }, { sesion: 'otra-sesion-0001' })));
    canal.unreal.enviar(JSON.stringify(hecho('pista.obtenida', { pistaId: 'inventada' })));
    await turno();
    expect(recibir).not.toHaveBeenCalled();
  });

  it('descarta un sobre válido de Angular recibido como si fuera un hecho del mundo', async () => {
    const recibir = jasmine.createSpy('recibir');
    puente.suscribir(recibir);
    canal.unreal.enviar(JSON.stringify(hecho('avatar.irA', { zoneId: 'hospital_entrada' }, { origen: 'angular', id: 'a-000001' })));
    await turno();
    expect(recibir).not.toHaveBeenCalled();
  });

  it('entrega una sola vez el mismo evento, sin impedir otro evento con identificador nuevo', async () => {
    const recibir = jasmine.createSpy('recibir');
    puente.suscribir(recibir);
    const mensaje = hecho('interactuable.activado', { interactuableId: 'hosp-puerta', categoria: 'puerta' });
    canal.unreal.enviar(JSON.stringify(mensaje));
    canal.unreal.enviar(JSON.stringify(mensaje));
    canal.unreal.enviar(JSON.stringify({ ...mensaje, id: 'u-000002' }));
    await turno();
    expect(recibir).toHaveBeenCalledTimes(2);
  });

  it('el timeout de bloqueo nunca se convierte en confirmación al volver a solicitarlo', async () => {
    const primera = puente.bloquearExploracion();
    const segunda = puente.bloquearExploracion();
    expect(segunda).toBe(primera);
    expect(await primera).toEqual({ confirmado: false, codigo: 'TIMEOUT_ACK' });
    expect(await puente.bloquearExploracion()).toEqual({ confirmado: false, codigo: 'TIMEOUT_ACK' });
    await expectAsync(puente.enviar('avatar.irA', { zoneId: 'hospital_entrada' })).toBeRejected();
    const recibir = jasmine.createSpy('recibir');
    puente.suscribir(recibir);
    canal.unreal.enviar(JSON.stringify(hecho('zona.entro', { zoneId: 'hospital_entrada' })));
    await turno();
    expect(recibir).not.toHaveBeenCalled();
  });

  it('rechaza las órdenes pendientes al desconectar', async () => {
    const orden = puente.enviar('avatar.irA', { zoneId: 'hospital_entrada' });
    const rechazo = expectAsync(orden).toBeRejected();
    canal.desconectar();
    await rechazo;
    expect(puente.ordenesPendientes).toBe(0);
  });

  it('limpia el ack pendiente si falla el envío del canal', async () => {
    spyOn(canal.angular, 'enviar').and.throwError('canal cerrado');
    await expectAsync(puente.enviar('avatar.irA', { zoneId: 'hospital_entrada' })).toBeRejected();
    expect(puente.ordenesPendientes).toBe(0);
  });
});
