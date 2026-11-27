import type { GuionM3 } from '../narrativa/adaptador-guion-m3';
import {
  CatalogoCargado, cargarCatalogoVisual, construirGuion, derivarCasoConfigurar, guionMotorParaPuesto,
  nuevoContextoVisual, seleccionDesdeGuion, validarSeleccion,
} from './caso-visual';
import { cargarEsquemasBrowser } from './protocolo/cargar-esquemas-browser';
import { validarObjeto } from './protocolo/validador-mensaje';

// Guion del Caso A de M3 (PRISALY-Backen m3/src/test/resources/case-builder/guion-caso-a.json, CB-02).
const CASO_A: GuionM3 = {
  formato: 'prisaly-guion-1', inicio: 'hospital',
  espacios: [
    { idEspacio: 'hospital', titulo: 'Hospital', recursoVisual: 'edificio:hospital',
      informaciones: [{ idInformacion: 'motivo-ingreso', texto: 'Ingreso por crisis de ansiedad tras un conflicto familiar.' }] },
    { idEspacio: 'comisaria', titulo: 'Comisaría', recursoVisual: 'edificio:comisaria' }],
  personajes: [
    { idPersonaje: 'dr-martinez', nombre: 'Dr. Martínez', rol: 'Médico tratante', recursoVisual: 'npc:hosp-npc-doctor' },
    { idPersonaje: 'oficial-rios', nombre: 'Oficial Ríos', rol: 'Oficial de guardia', recursoVisual: 'npc:pol-npc-oficial' }],
  intervenciones: [
    { idIntervencion: 'medico-conversacion', idEspacio: 'hospital', idPersonaje: 'dr-martinez',
      dialogos: [{ idPersonaje: 'dr-martinez', texto: 'Buenos días.' }] },
    { idIntervencion: 'oficial-conversacion', idEspacio: 'comisaria', idPersonaje: 'oficial-rios',
      dialogos: [{ idPersonaje: 'oficial-rios', texto: 'Recibimos una llamada.' }] }],
};
const DIALOGO_CB05A = 'Durante la valoración inicial observamos que la persona presenta dificultades para comunicarse con su entorno. '
  + 'Es importante conocer su contexto antes de formular una conclusión.';

describe('Caso visual (CB-05A): catálogo, constructor y caso.configurar', () => {
  let cargado: CatalogoCargado;
  beforeAll(async () => { cargado = await cargarCatalogoVisual(); });

  it('lee el catálogo canónico servido con su hash publicado', () => {
    expect(cargado.hash).toBe('bfa39caac8aaf2afb9c1177ac8024de14cac6a47a320f49e8b4813579ec7ccfe');
    expect(cargado.catalogo.version).toBe('catalogo-visual-1');
  });

  it('deriva del Caso A la misma huella que el ejemplo caso-a del protocolo (calculada en Unreal)', async () => {
    const datos = await derivarCasoConfigurar(CASO_A, cargado, 'cv-3f9c2e7d1b4a6c80a1b2c3d4e5f60718');
    expect(datos).toEqual({
      idContextoVisual: 'cv-3f9c2e7d1b4a6c80a1b2c3d4e5f60718',
      versionCatalogo: 'catalogo-visual-1',
      hashCatalogo: 'bfa39caac8aaf2afb9c1177ac8024de14cac6a47a320f49e8b4813579ec7ccfe',
      huella: 'dfcd097048fa6419b906964eba95cb2ad494801ff3059fba1f4984861eed63aa',
      edificiosHabilitados: ['hospital_entrada', 'policia_entrada'],
      npcsActivos: ['hosp-npc-doctor', 'pol-npc-oficial'],
    });
  });

  it('el mensaje derivado pasa el esquema real de caso.configurar y no lleva texto narrativo', async () => {
    const esquemas = await cargarEsquemasBrowser();
    const datos = await derivarCasoConfigurar(CASO_A, cargado, nuevoContextoVisual());
    const r = validarObjeto(esquemas, { v: 1, tipo: 'caso.configurar', id: 'a-0123456789abcdef000001', correlacion: null,
      sesion: 'ses-lab-ps2-0001', ts: 1, origen: 'angular', contexto: datos.idContextoVisual, datos });
    expect(r.ok).withContext(JSON.stringify(r)).toBeTrue();
    expect(JSON.stringify(datos)).not.toContain('Martínez');
  });

  it('el contexto visual es aleatorio y con el formato cv-<32 hex>', () => {
    const a = nuevoContextoVisual(), b = nuevoContextoVisual();
    expect(a).toMatch(/^cv-[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });

  it('rechaza recursos fuera del catálogo y personajes de un edificio no seleccionado', async () => {
    const ajeno = { ...CASO_A, personajes: [{ idPersonaje: 'x', nombre: 'X', recursoVisual: 'npc:pol-npc-sargento' }] };
    await expectAsync(derivarCasoConfigurar(ajeno, cargado, nuevoContextoVisual())).toBeRejectedWithError(/no catalogado/);
    const sinEdificio = { ...CASO_A, personajes: [{ idPersonaje: 'f', nombre: 'F', recursoVisual: 'npc:fis-npc-fiscal' }] };
    await expectAsync(derivarCasoConfigurar(sinEdificio, cargado, nuevoContextoVisual())).toBeRejectedWithError(/no seleccionado/);
  });

  it('construye el caso CB-05A (Hospital + médico) y lo deriva a un solo edificio y un solo NPC', async () => {
    const seleccion = { edificios: ['edificio:hospital'], personajes: [{ puesto: 'npc:hosp-npc-doctor', nombre: 'Dra. Salcedo', rol: 'Médica de guardia', dialogo: DIALOGO_CB05A }] };
    expect(validarSeleccion(cargado.catalogo, seleccion)).toEqual([]);
    const guion = construirGuion(cargado.catalogo, seleccion);
    expect(guion.inicio).toBe('hospital');
    expect(guion.intervenciones![0].dialogos[0].texto).toBe(DIALOGO_CB05A);
    const datos = await derivarCasoConfigurar(guion, cargado, nuevoContextoVisual());
    expect(datos.edificiosHabilitados).toEqual(['hospital_entrada']);
    expect(datos.npcsActivos).toEqual(['hosp-npc-doctor']);
    expect(seleccionDesdeGuion(guion)).toEqual(seleccion);
  });

  it('valida la capacidad, el puesto repetido y el edificio no seleccionado antes de guardar', () => {
    const c = cargado.catalogo;
    const p = (puesto: string) => ({ puesto, nombre: 'N', rol: '', dialogo: 'Hola' });
    expect(validarSeleccion(c, { edificios: ['edificio:comisaria'], personajes: [p('npc:pol-npc-oficial'), p('npc:pol-npc-oficial')] })
      .map((e) => e.codigo)).toEqual(jasmine.arrayContaining(['PUESTO_DUPLICADO', 'CAPACIDAD_EXCEDIDA']));
    expect(validarSeleccion(c, { edificios: ['edificio:hospital'], personajes: [p('npc:fis-npc-fiscal')] }).map((e) => e.codigo))
      .toContain('EDIFICIO_NO_SELECCIONADO');
    expect(validarSeleccion(c, { edificios: [], personajes: [] }).map((e) => e.codigo)).toContain('EDIFICIO_REQUERIDO');
  });

  it('convierte el diálogo guardado del puesto en un guion del motor sin decisiones', () => {
    const g = guionMotorParaPuesto(CASO_A, 'npc:hosp-npc-doctor', 'edificio:hospital')!;
    expect(g.personajes[0].nombre).toBe('Dr. Martínez');
    expect(g.escenas[0].dialogos.map((d) => d.texto)).toEqual(['Buenos días.']);
    expect(g.escenas[0].decisiones).toEqual([]);
    expect(guionMotorParaPuesto(CASO_A, 'npc:fis-npc-fiscal', 'edificio:fiscalia')).toBeNull();
  });
});
