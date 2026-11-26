import { environment as entornoQaNavegacion } from '../../../environments/environment.qa-navegacion';
import { mapeoConHabilitacionQa } from '../autenticacion/habilitacion-qa-navegacion';
import { MAPEO_RUTAS_PERSONAL_OFICIAL } from '../autenticacion/m1-mapeo-rutas';
import type { EstadoSesionPersonal } from '../autenticacion/m1-personal.models';
import { hayRutasHabilitadas, seccionesPorRol } from './navegacion-rol';

/** DC-FE-UX-ROLES-24: navegación por rol efectivo de `/me`. */
const qaNav = mapeoConHabilitacionQa(MAPEO_RUTAS_PERSONAL_OFICIAL, entornoQaNavegacion);
const valida = (rol: unknown, permisos: string[]): EstadoSesionPersonal =>
  ({
    tipo: 'valida',
    identidad: { userId: 'u', nombre: 'N', correo: 'c', rol, permisos },
  }) as unknown as EstadoSesionPersonal;
const rutas = (e: EstadoSesionPersonal, m = qaNav) => seccionesPorRol(e, m).map((s) => s.ruta);
const DOCENTE = valida('DOCENTE', ['CONSULTAR_CASO', 'CREAR_CASO', 'GESTIONAR_SESION']);

describe('DC-FE-UX-ROLES-24 navegación por rol', () => {
  it('docente: solo opciones docentes autorizadas y sin «Mi espacio de aprendizaje»', () => {
    expect(rutas(DOCENTE)).toEqual(['casos-academicos', 'rubricas', 'sesiones', 'convocatorias']);
    expect(rutas(DOCENTE)).not.toContain('estudiante');
  });
  it('docente sin GESTIONAR_SESION: no ve sesiones ni convocatorias', () => {
    expect(rutas(valida('DOCENTE', ['CONSULTAR_CASO']))).toEqual(['casos-academicos', 'rubricas']);
  });
  it('administrador: opciones administrativas, sin estudiantiles ni docentes', () => {
    const r = rutas(valida('ADMINISTRADOR', ['CONSULTAR_CASO', 'GESTIONAR_SESION']));
    expect(r).not.toContain('estudiante');
    expect(r).toEqual(['usuarios-docentes', 'configuracion']);
    // DC-FE-60: etiqueta del panel administrador.
    expect(seccionesPorRol(valida('ADMINISTRADOR', []), qaNav).map((x) => x.titulo)).toEqual([
      'Gestión de usuarios',
      'Configuración',
    ]);
    // En producción / QA ordinario sigue sin rutas.
    expect(rutas(valida('ADMINISTRADOR', []), MAPEO_RUTAS_PERSONAL_OFICIAL)).toEqual([]);
  });
  it('rol de semilla QA (`DocenteBruno`) con permisos docentes: secciones docentes, sin estudiante', () => {
    const r = rutas(valida('DocenteBruno', ['CONSULTAR_CASO', 'GESTIONAR_SESION']));
    expect(r).toEqual(['casos-academicos', 'rubricas', 'sesiones', 'convocatorias']);
  });
  it('personal sin permisos docentes: navegación vacía', () => {
    expect(rutas(valida('DocenteBruno', []))).toEqual([]);
  });
  it('rol vacío, con espacios o no textual: navegación restrictiva', () => {
    for (const rol of [' DOCENTE', '', null, 7])
      expect(rutas(valida(rol, ['CONSULTAR_CASO', 'GESTIONAR_SESION'])))
        .withContext(String(rol))
        .toEqual([]);
  });
  it('identidad pendiente, expirada o cerrada (logout/cambio de usuario): menú vacío', () => {
    for (const tipo of [
      'identidad-pendiente',
      'expirada',
      'cierre-confirmado',
      'sin-sesion',
      'acceso-denegado',
    ])
      expect(rutas({ tipo } as EstadoSesionPersonal))
        .withContext(tipo)
        .toEqual([]);
  });
  it('producción/QA ordinario: mapeo oficial, ninguna ruta visible ni habilitada', () => {
    expect(rutas(DOCENTE, MAPEO_RUTAS_PERSONAL_OFICIAL)).toEqual([]);
    expect(hayRutasHabilitadas(MAPEO_RUTAS_PERSONAL_OFICIAL)).toBeFalse();
    expect(hayRutasHabilitadas(qaNav)).toBeTrue();
  });
});
