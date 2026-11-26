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
    let idOrden: string | null = null;
    canal.unreal.alRecibir((texto) => {
      const orden = JSON.parse(texto) as Mensaje;
      idOrden = orden.id;
      canal.unreal.enviar(JSON.stringify(hecho('orden.ack', {}, { correlacion: orden.id })));
    });
    const ack = await puente.enviar('avatar.irA', { zoneId: 'hospital_entrada' });
    expect(ack?.correlacion).toBe(idOrden);
    expect(puente.ordenesPendientes).toBe(0);
  });

  it('otro puente para la misma sesión no reutiliza ids ni acepta el ACK de la conexión anterior', async () => {
    let primeraId = '';
    canal.unreal.alRecibir(texto => {
      primeraId = (JSON.parse(texto) as Mensaje).id;
      canal.unreal.enviar(JSON.stringify(hecho('orden.ack', {}, { correlacion: primeraId })));
    });
    await puente.enviar('avatar.irA', { zoneId: 'hospital_entrada' });
    puente.destruir();
    const siguienteCanal = new CanalMemoria();
    const siguiente = new PuenteUnreal(siguienteCanal.angular, esquemas, { sesion, timeoutAckMs: 1000 });
    let segundaId = '';
    siguienteCanal.unreal.alRecibir(texto => {
      segundaId = (JSON.parse(texto) as Mensaje).id;
      siguienteCanal.unreal.enviar(JSON.stringify(hecho('orden.ack', {}, { correlacion: primeraId })));
    });
    try {
      const pendiente = siguiente.enviar('avatar.irA', { zoneId: 'fiscalia_entrada' });
      await turno();
      expect(segundaId).not.toBe(primeraId);
      expect(siguiente.ordenesPendientes).toBe(1);
      siguienteCanal.unreal.enviar(JSON.stringify(hecho('orden.ack', {}, { id: 'u-000002', correlacion: segundaId })));
      expect((await pendiente)?.correlacion).toBe(segundaId);
    } finally { siguiente.destruir(); }
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

describe('PuenteUnreal con el protocolo v1.1 (caso.configurar y contexto, CB-04)', () => {
  let esquemas: Esquemas;
  let canal: CanalMemoria;
  let puente: PuenteUnreal;
  const sesion = 'sesion-prueba-0001';
  const contexto = 'cv-3f9c2e7d1b4a6c80a1b2c3d4e5f60718';
  // datos de ejemplos/validos/caso.configurar.caso-a.json del protocolo (MUNDO-24 78297ef).
  const metaHospitalMedico = {
    idContextoVisual: contexto,
    versionCatalogo: 'catalogo-visual-1',
    hashCatalogo: 'bfa39caac8aaf2afb9c1177ac8024de14cac6a47a320f49e8b4813579ec7ccfe',
    huella: 'dfcd097048fa6419b906964eba95cb2ad494801ff3059fba1f4984861eed63aa',
    edificiosHabilitados: ['hospital_entrada', 'policia_entrada'],
    npcsActivos: ['hosp-npc-doctor', 'pol-npc-oficial'],
  };
  const deUnreal = (tipo: string, datos: Record<string, unknown>, extras: Partial<Mensaje> = {}): Mensaje =>
    ({ v: 1, id: `u-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`, tipo, datos, correlacion: null, sesion, ts: 1, origen: 'unreal', ...extras });
  const turno = () => new Promise<void>((resolver) => setTimeout(resolver, 0));

  beforeAll(async () => { esquemas = await cargarEsquemasBrowser(); });
  beforeEach(() => {
    canal = new CanalMemoria();
    puente = new PuenteUnreal(canal.angular, esquemas, { sesion, timeoutAckMs: 20 });
  });
  afterEach(() => puente?.destruir());

  it('carga caso.configurar desde el catálogo real y conserva v=1', () => {
    expect(esquemas.catalogo.tipos['caso.configurar']?.requiereAck).toBeTrue();
    expect(esquemas.catalogo.tipos['caso.configurar']?.origen).toBe('angular');
  });

  it('sin contexto, las órdenes v1 salen igual que antes (sin campo contexto)', async () => {
    let enviado: Mensaje | null = null;
    canal.unreal.alRecibir((texto) => {
      enviado = JSON.parse(texto) as Mensaje;
      canal.unreal.enviar(JSON.stringify(deUnreal('orden.ack', {}, { correlacion: enviado.id })));
    });
    await puente.enviar('avatar.irA', { zoneId: 'hospital_entrada' });
    expect(enviado!.v).toBe(1);
    expect('contexto' in enviado!).toBeFalse();
  });

  it('envía caso.configurar con sobre.contexto y acepta el ACK con contexto', async () => {
    let enviado: Mensaje | null = null;
    canal.unreal.alRecibir((texto) => {
      enviado = JSON.parse(texto) as Mensaje;
      canal.unreal.enviar(JSON.stringify(deUnreal('orden.ack', {}, { correlacion: enviado.id, contexto })));
    });
    puente.fijarContexto(contexto);
    const ack = await puente.enviar('caso.configurar', metaHospitalMedico);
    expect(enviado!.v).toBe(1);
    expect(enviado!.tipo).toBe('caso.configurar');
    expect(enviado!.contexto).toBe(contexto);
    expect(ack?.correlacion).toBe(enviado!.id);
  });

  it('rechaza localmente un caso.configurar inválido y no lo envía', async () => {
    let enviados = 0;
    canal.unreal.alRecibir(() => enviados++);
    puente.fijarContexto(contexto);
    const { hashCatalogo, ...sinHash } = metaHospitalMedico;
    void hashCatalogo;
    await expectAsync(puente.enviar('caso.configurar', sinHash)).toBeRejectedWith(jasmine.objectContaining({ codigo: 'DATOS_INVALIDOS' }));
    await expectAsync(puente.enviar('caso.configurar', { ...metaHospitalMedico, nombres: { 'hosp-npc-doctor': 'Dr. Martinez' } }))
      .toBeRejectedWith(jasmine.objectContaining({ codigo: 'DATOS_INVALIDOS' }));
    expect(enviados).toBe(0);
  });

  it('no acepta un identificador académico como contexto visual', () => {
    expect(() => puente.fijarContexto('6f1f7c5e-9a2b-4c3d-8e4f-0a1b2c3d4e5f')).toThrow();
    expect(() => puente.fijarContexto('intento-7f1c0b2a')).toThrow();
    expect(puente.contexto).toBeNull();
  });

  it('ignora los hechos de otro contexto y entrega los del contexto vigente', async () => {
    const recibidos: string[] = [];
    puente.suscribir((m) => recibidos.push(`${m.tipo}:${m.contexto ?? '-'}`));
    puente.fijarContexto(contexto);
    canal.unreal.enviar(JSON.stringify(deUnreal('zona.entro', { zoneId: 'hospital_entrada' }, { contexto: 'cv-ffffffffffffffffffffffffffffffff' })));
    canal.unreal.enviar(JSON.stringify(deUnreal('zona.entro', { zoneId: 'hospital_entrada' }, { contexto })));
    await turno();
    expect(recibidos).toEqual([`zona.entro:${contexto}`]);
  });
});
