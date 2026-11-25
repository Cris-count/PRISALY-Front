import { TestBed } from '@angular/core/testing';
import { environment as entornoProduccion } from '../../../environments/environment';
import { environment as entornoDemo } from '../../../environments/environment.demo';
import { environment as entornoDesarrollo } from '../../../environments/environment.development';
import { environment as entornoQa } from '../../../environments/environment.qa';
import { environment as entornoQaNavegacion } from '../../../environments/environment.qa-navegacion';
import {
  mapeoConHabilitacionQa,
  RUTAS_AUTORIZADAS_QA_NAVEGACION,
} from './habilitacion-qa-navegacion';
import { decidirRuta, MAPEO_RUTAS_PERSONAL, MAPEO_RUTAS_PERSONAL_OFICIAL } from './m1-mapeo-rutas';

/** DC-FULLSTACK-DEMO-URGENTE-03: habilitación de rutas docentes solo en `qa-navegacion`. */
const SEIS = [
  'usuarios-docentes',
  'configuracion',
  'casos-academicos',
  'rubricas',
  'sesiones',
  'convocatorias',
];
const habilitadas = (m: ReturnType<typeof mapeoConHabilitacionQa>) =>
  SEIS.filter((r) => m[r].habilitada).sort();

describe('qa-navegacion: habilitación local controlada', () => {
  it('el mapeo oficial sigue con las seis rutas deshabilitadas', () => {
    for (const r of SEIS)
      expect(MAPEO_RUTAS_PERSONAL_OFICIAL[r].habilitada).withContext(r).toBeFalse();
  });

  it('producción, QA ordinario y demo no habilitan ninguna ruta', () => {
    for (const [nombre, entorno] of [
      ['produccion', entornoProduccion],
      ['qa', entornoQa],
      ['demo', entornoDemo],
    ] as const)
      expect(habilitadas(mapeoConHabilitacionQa(MAPEO_RUTAS_PERSONAL_OFICIAL, entorno)))
        .withContext(nombre)
        .toEqual([]);
  });

  it('el ng serve local habilita las mismas rutas autorizadas, contra el backend de esta máquina', () => {
    expect(entornoDesarrollo.production).toBeFalse();
    expect(entornoDesarrollo.personalQaHabilitado).toBeTrue();
    expect(entornoDesarrollo.demostracionesHabilitadas).toBeFalse();
    expect(habilitadas(mapeoConHabilitacionQa(MAPEO_RUTAS_PERSONAL_OFICIAL, entornoDesarrollo)))
      .toEqual([...SEIS].sort());
  });

  it('qa-navegacion habilita exactamente las rutas autorizadas (docentes y administrativas)', () => {
    expect(entornoQaNavegacion.production).toBeFalse();
    expect(entornoQaNavegacion.personalQaHabilitado).toBeTrue();
    expect(entornoQaNavegacion.demostracionesHabilitadas).toBeFalse();
    expect(
      habilitadas(mapeoConHabilitacionQa(MAPEO_RUTAS_PERSONAL_OFICIAL, entornoQaNavegacion)),
    ).toEqual([
      'casos-academicos',
      'configuracion',
      'convocatorias',
      'rubricas',
      'sesiones',
      'usuarios-docentes',
    ]);
  });

  it('no cambia requisitos: solo `habilitada`', () => {
    const m = mapeoConHabilitacionQa(MAPEO_RUTAS_PERSONAL_OFICIAL, entornoQaNavegacion);
    for (const r of SEIS)
      expect(m[r].aprobado).withContext(r).toEqual(MAPEO_RUTAS_PERSONAL_OFICIAL[r].aprobado);
    // Con la ruta habilitada, el permiso sigue siendo obligatorio (el rol no lo sustituye).
    expect(
      decidirRuta(
        m['casos-academicos'],
        true,
        () => false,
        () => true,
      ),
    ).toBe('insuficiente');
    expect(decidirRuta(m['casos-academicos'], true, (p) => p.includes('CONSULTAR_CASO'))).toBe(
      'autorizada',
    );
    expect(decidirRuta(m['sesiones'], true, (p) => p.includes('CONSULTAR_CASO'))).toBe(
      'insuficiente',
    );
    // usuarios-docentes exige el rol exacto ADMINISTRADOR: los permisos no lo sustituyen.
    expect(decidirRuta(m['usuarios-docentes'], true, () => true)).toBe('rol-insuficiente');
    expect(
      decidirRuta(
        m['usuarios-docentes'],
        true,
        () => true,
        (r) => r === 'ADMINISTRADOR',
      ),
    ).toBe('autorizada');
  });

  it('rechaza listas que intenten habilitar rutas no autorizadas o entornos productivos', () => {
    const pide = (extra: Record<string, unknown>) =>
      habilitadas(
        mapeoConHabilitacionQa(MAPEO_RUTAS_PERSONAL_OFICIAL, {
          production: false,
          personalQaHabilitado: true,
          ...extra,
        }),
      );
    expect(pide({ rutasPersonalHabilitadasQa: ['inexistente', '__proto__'] })).toEqual([]);
    expect(pide({ rutasPersonalHabilitadasQa: ['casos-academicos', 'inexistente', 7] })).toEqual([
      'casos-academicos',
    ]);
    expect(pide({ rutasPersonalHabilitadasQa: 'casos-academicos' })).toEqual([]);
    expect(
      pide({ production: true, rutasPersonalHabilitadasQa: RUTAS_AUTORIZADAS_QA_NAVEGACION }),
    ).toEqual([]);
    expect(
      pide({
        personalQaHabilitado: false,
        rutasPersonalHabilitadasQa: RUTAS_AUTORIZADAS_QA_NAVEGACION,
      }),
    ).toEqual([]);
  });

  it('el token efectivo en esta compilación (producción) es el mapeo oficial', () => {
    expect(TestBed.inject(MAPEO_RUTAS_PERSONAL)).toBe(MAPEO_RUTAS_PERSONAL_OFICIAL);
  });
});
