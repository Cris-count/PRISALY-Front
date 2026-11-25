import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  EstadoRecorridoEstudiantil,
  EstadoRecorridoEstudiantilPanel,
  TipoRecorridoEstudiantil,
} from './estado-recorrido-estudiantil';

describe('Estados independientes del recorrido estudiantil', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [EstadoRecorridoEstudiantilPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => {
    const http = TestBed.inject(HttpTestingController);
    http.expectNone(() => true);
    http.verify();
  });

  it('inicia en preparación sin confundir falta de contrato con una consulta vacía o un error', () => {
    const fixture = TestBed.createComponent(EstadoRecorridoEstudiantilPanel);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('[data-origen="preparacion"]')).not.toBeNull();
    expect(elemento.textContent).toContain('DD-02');
    expect(elemento.textContent).toContain('No se han realizado consultas');
    expect(elemento.querySelector('[role="alert"], [aria-busy="true"]')).toBeNull();
    expect(elemento.textContent).not.toContain('Sin datos disponibles');
  });

  const casos: readonly [TipoRecorridoEstudiantil, string][] = [
    ['cargando-sesiones', 'Consultando las sesiones estudiantiles'],
    ['sesiones-disponibles', 'Sesiones disponibles'],
    ['participaciones-pendientes', 'Participaciones pendientes'],
    ['sin-convocatorias', 'no devolvió convocatorias'],
    ['acceso-denegado', 'El servicio denegó el acceso'],
    ['error-conexion', 'No fue posible conectar'],
    ['participacion-no-habilitada', 'No se iniciará un intento'],
  ];
  for (const [tipo, texto] of casos) {
    it(`prepara ${tipo} a partir de un estado suministrado sin fabricar datos ni activar SIM-01`, () => {
      const fixture = TestBed.createComponent(EstadoRecorridoEstudiantilPanel);
      fixture.componentRef.setInput('estado', {
        tipo,
        origen: 'servicio-autorizado',
      } satisfies EstadoRecorridoEstudiantil);
      fixture.detectChanges();
      const elemento = fixture.nativeElement as HTMLElement;
      expect(elemento.textContent).toContain(texto);
      expect(elemento.querySelector('[data-origen="servicio-autorizado"]')).not.toBeNull();
      expect(elemento.querySelector('button, a, table, time, input, [data-id-intento]')).toBeNull();
      expect(elemento.querySelector('[aria-busy="true"]') !== null).toBe(
        tipo === 'cargando-sesiones',
      );
      expect(elemento.querySelector('[role="alert"]') !== null).toBe(tipo === 'error-conexion');
    });
  }

  it('identifica expresamente los ejemplos y permite regresar a preparación sin retener errores', () => {
    const fixture = TestBed.createComponent(EstadoRecorridoEstudiantilPanel);
    fixture.componentRef.setInput('estado', {
      tipo: 'error-conexion',
      origen: 'demostracion',
    } satisfies EstadoRecorridoEstudiantil);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="note"]')?.textContent).toContain(
      'no representa consultas, errores ni resultados reales',
    );
    fixture.componentRef.setInput('estado', {
      tipo: 'pendiente',
      origen: 'preparacion',
    } satisfies EstadoRecorridoEstudiantil);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"], [role="note"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Integración pendiente');
  });
});
