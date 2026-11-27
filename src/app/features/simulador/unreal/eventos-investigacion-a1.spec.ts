import type { GuionM3 } from '../narrativa/adaptador-guion-m3';
import { cargarCatalogoVisual, CatalogoVisual } from './caso-visual';
import { eventosDesdeHecho, hechoDesdeMensaje } from './eventos-investigacion-a1';
import type { Mensaje } from './protocolo/validador-mensaje';

/** CB-07 (DC-CB-AVANCE-08 §3): hechos del simulador → referencias del guion fijado, sin texto libre. */
describe('Eventos de investigación A1 (adaptador puro)', () => {
  const HASH = 'c'.repeat(64);
  const GUION: GuionM3 = {
    formato: 'prisaly-guion-1', inicio: 'hospital',
    espacios: [
      { idEspacio: 'hospital', titulo: 'Hospital', recursoVisual: 'edificio:hospital',
        informaciones: [{ idInformacion: 'motivo-ingreso', texto: 'Ingreso por crisis de ansiedad.' }] },
      { idEspacio: 'comisaria', titulo: 'Comisaría', recursoVisual: 'edificio:comisaria' }],
    personajes: [
      { idPersonaje: 'dr-martinez', nombre: 'Dr. Martínez', recursoVisual: 'npc:hosp-npc-doctor' },
      { idPersonaje: 'oficial-rios', nombre: 'Oficial Ríos', recursoVisual: 'npc:pol-npc-oficial' }],
    intervenciones: [
      { idIntervencion: 'medico-conversacion', idEspacio: 'hospital', idPersonaje: 'dr-martinez',
        dialogos: [{ idPersonaje: 'dr-martinez', texto: 'Buenos días.' }],
        consecuencias: [{ tipo: 'marca', marca: 'hablo-con-medico', valor: true }] },
      { idIntervencion: 'oficial-conversacion', idEspacio: 'comisaria', idPersonaje: 'oficial-rios',
        condicion: { marca: 'hablo-con-medico', valor: true },
        dialogos: [{ idPersonaje: 'oficial-rios', texto: 'Recibimos una llamada.' }] }],
  };
  let catalogo: CatalogoVisual;
  let n = 0;
  const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
  beforeAll(async () => { catalogo = (await cargarCatalogoVisual()).catalogo; });
  beforeEach(() => { n = 0; });

  it('la entrada a un interior es espacio.visitado con el idEspacio del guion, no con el zoneId ni el nombre', () => {
    expect(eventosDesdeHecho({ tipo: 'interior.entrado', zoneId: 'hospital_entrada' }, GUION, catalogo, HASH, id))
      .toEqual([{ idEvento: '00000000-0000-4000-8000-000000000001',tipo: 'espacio.visitado', referencia: 'hospital', hashDefinicion: HASH }]);
  });

  it('un edificio que no pertenece al caso o una zona desconocida no producen evento', () => {
    expect(eventosDesdeHecho({ tipo: 'interior.entrado', zoneId: 'fiscalia_entrada' }, GUION, catalogo, HASH, id)).toEqual([]);
    expect(eventosDesdeHecho({ tipo: 'interior.entrado', zoneId: 'plaza_central' }, GUION, catalogo, HASH, id)).toEqual([]);
  });

  it('el cierre de una conversación es intervencion.completada de ese personaje en su edificio', () => {
    expect(eventosDesdeHecho({ tipo: 'conversacion.terminada', npcId: 'pol-npc-oficial' }, GUION, catalogo, HASH, id)
      .map((e) => [e.tipo, e.referencia])).toEqual([['intervencion.completada', 'oficial-conversacion']]);
    expect(eventosDesdeHecho({ tipo: 'conversacion.terminada', npcId: 'fis-npc-fiscal' }, GUION, catalogo, HASH, id)).toEqual([]);
    expect(eventosDesdeHecho({ tipo: 'conversacion.terminada', npcId: 'hosp-npc-paciente-01' }, GUION, catalogo, HASH, id)).toEqual([]);
  });

  it('solo la información y las marcas que existen en el guion se proponen', () => {
    expect(eventosDesdeHecho({ tipo: 'informacion.mostrada', idInformacion: 'motivo-ingreso' }, GUION, catalogo, HASH, id)
      .map((e) => [e.tipo, e.referencia])).toEqual([['informacion.obtenida', 'motivo-ingreso']]);
    expect(eventosDesdeHecho({ tipo: 'informacion.mostrada', idInformacion: 'huella-dactilar' }, GUION, catalogo, HASH, id)).toEqual([]);
    expect(eventosDesdeHecho({ tipo: 'marca.aplicada', marca: 'hablo-con-medico', valor: true }, GUION, catalogo, HASH, id))
      .toEqual([jasmine.objectContaining({ tipo: 'marca.fijada', referencia: 'hablo-con-medico', valor: true })]);
    expect(eventosDesdeHecho({ tipo: 'marca.aplicada', marca: 'culpable', valor: true }, GUION, catalogo, HASH, id)).toEqual([]);
  });

  it('cada evento lleva su propia clave de idempotencia y la huella de la narrativa fijada', () => {
    const a = eventosDesdeHecho({ tipo: 'interior.entrado', zoneId: 'hospital_entrada' }, GUION, catalogo, HASH);
    const b = eventosDesdeHecho({ tipo: 'interior.entrado', zoneId: 'hospital_entrada' }, GUION, catalogo, HASH);
    expect(a[0].idEvento).toMatch(/^[0-9a-f-]{36}$/);
    expect(a[0].idEvento).not.toBe(b[0].idEvento);
    expect(a[0].hashDefinicion).toBe(HASH);
    expect(() => eventosDesdeHecho({ tipo: 'interior.entrado', zoneId: 'hospital_entrada' }, GUION, catalogo, 'sin-huella')).toThrow();
  });

  it('de los mensajes de Unreal solo edificio.entro es un hecho académico', () => {
    const m = (tipo: string, origen: 'unreal' | 'angular', datos: Record<string, unknown>) =>
      ({ v: 1, tipo, id: 'u-000001', correlacion: null, sesion: 's', ts: 1, origen, datos }) as Mensaje;
    expect(hechoDesdeMensaje(m('edificio.entro', 'unreal', { zoneId: 'hospital_entrada' }))).toEqual({ tipo: 'interior.entrado', zoneId: 'hospital_entrada' });
    expect(hechoDesdeMensaje(m('zona.entro', 'unreal', { zoneId: 'hospital_entrada' }))).toBeNull();
    expect(hechoDesdeMensaje(m('interactuable.estado', 'angular', { interactuableId: 'hosp-npc-doctor', estado: 'completado' }))).toBeNull();
    expect(hechoDesdeMensaje(m('edificio.entro', 'angular', { zoneId: 'hospital_entrada' }))).toBeNull();
  });

  it('no usa almacenamiento del navegador', () => {
    const espia = spyOn(Storage.prototype, 'setItem');
    eventosDesdeHecho({ tipo: 'interior.entrado', zoneId: 'hospital_entrada' }, GUION, catalogo, HASH, id);
    expect(espia).not.toHaveBeenCalled();
  });
});
