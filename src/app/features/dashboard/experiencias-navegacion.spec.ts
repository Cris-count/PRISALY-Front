import { MAPEO_RUTAS_PERSONAL_OFICIAL } from '../autenticacion/m1-mapeo-rutas';
import {
  MENU_ADMINISTRADOR,
  MENU_DOCENTE,
  MENU_ESTUDIANTE_DEMO,
  experienciaDeRol,
  menuDeRol,
} from './experiencias-navegacion';

describe('FE-59 menús por experiencia', () => {
  it('habilita las rutas aprobadas de la matriz FE-58 (DC-FE-59)', () => {
    for (const entrada of Object.values(MAPEO_RUTAS_PERSONAL_OFICIAL)) {
      expect(entrada.habilitada).withContext(entrada.ruta).toBeTrue();
    }
  });

  it('el administrador no recibe el menú docente y sus secciones quedan navegables', () => {
    expect(experienciaDeRol('ADMINISTRADOR')).toBe('administrador');
    expect(menuDeRol('ADMINISTRADOR').map((e) => e.titulo)).toEqual(
      MENU_ADMINISTRADOR.map((e) => e.titulo),
    );
    expect(menuDeRol('ADMINISTRADOR').some((e) => e.titulo === 'Casos académicos')).toBeFalse();
    for (const entrada of MENU_ADMINISTRADOR.filter((e) => e.ruta)) {
      expect(entrada.aviso).withContext(entrada.titulo).toBeNull();
    }
  });

  it('el docente no recibe gestión institucional y sus secciones quedan navegables', () => {
    expect(menuDeRol('DOCENTE').map((e) => e.titulo)).toEqual(MENU_DOCENTE.map((e) => e.titulo));
    expect(menuDeRol('DOCENTE').some((e) => e.titulo === 'Gestión de docentes')).toBeFalse();
    expect(MENU_DOCENTE.find((e) => e.ruta === 'casos-academicos')?.aviso).toBeNull();
  });

  it('un rol desconocido, incluido ESTUDIANTE de personal, no hereda menús', () => {
    expect(menuDeRol('ESTUDIANTE')).toEqual([]);
    expect(menuDeRol('INVITADO')).toEqual([]);
    expect(menuDeRol(null)).toEqual([]);
  });

  it('el recorrido estudiantil no apunta a una ruta de simulador académico', () => {
    expect(MENU_ESTUDIANTE_DEMO.map((e) => e.titulo)).toContain('Mi espacio de aprendizaje');
    expect(MENU_ESTUDIANTE_DEMO.every((e) => !e.ancla.startsWith('/'))).toBeTrue();
  });
});
