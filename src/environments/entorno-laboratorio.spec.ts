import { environment as entornoDemo } from './environment.demo';
import { environment as entornoDesarrollo } from './environment.development';
import { environment as entornoLaboratorio } from './environment.laboratorio';
import { environment as entornoQa } from './environment.qa';
import { environment as entornoQaNavegacion } from './environment.qa-navegacion';

// `./environment` (producción) no se importa: el builder de pruebas compila con la configuración
// `development` y lo reemplaza por environment.development.ts, así que no reflejaría producción.

describe('Entorno laboratorio (prueba H4)', () => {
  it('combina demostraciones y Unreal local contra el backend de este equipo', () => {
    expect(entornoLaboratorio.demostracionesHabilitadas).toBeTrue();
    expect(entornoLaboratorio.simuladorUnrealLocal).toBeTrue();
    expect(entornoLaboratorio.production).toBeFalse();
    expect(entornoLaboratorio.apiBaseUrl).toBe('http://localhost:8080/api');
  });

  it('ningún otro entorno tiene esa combinación y los existentes siguen igual', () => {
    const combinacion = (e: { demostracionesHabilitadas: boolean; simuladorUnrealLocal: boolean }) => [
      e.demostracionesHabilitadas,
      e.simuladorUnrealLocal,
    ];
    expect(combinacion(entornoDemo)).withContext('demo').toEqual([true, false]);
    expect(combinacion(entornoDesarrollo)).withContext('development').toEqual([false, true]);
    expect(combinacion(entornoQa)).withContext('qa').toEqual([false, false]);
    expect(combinacion(entornoQaNavegacion)).withContext('qa-navegacion').toEqual([false, false]);
  });
});
