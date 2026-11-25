import { TestBed } from '@angular/core/testing';
import { EstadoPanel, TipoEstadoPanel } from './estado-panel';

describe('Estados accesibles del panel académico', () => {
  const casos: readonly [TipoEstadoPanel, string, string][] = [
    ['cargando', 'Cargando', 'status'],
    ['sin-datos', 'Sin datos disponibles', 'status'],
    ['no-autorizado', 'Acceso no autorizado', 'status'],
    ['no-disponible', 'Contenido no disponible', 'status'],
    ['error-servidor', 'Error de servidor', 'alert'],
    ['pendiente', 'Integración pendiente', 'status'],
  ];

  for (const [estado, titulo, rol] of casos) {
    it(`presenta ${estado} con texto explícito y semántica de anuncio`, () => {
      const fixture = TestBed.createComponent(EstadoPanel);
      fixture.componentRef.setInput('estado', estado);
      fixture.detectChanges();
      const elemento = fixture.nativeElement as HTMLElement;
      const aviso = elemento.querySelector(`[role="${rol}"]`);
      expect(aviso).not.toBeNull();
      expect(aviso?.querySelector('strong')?.textContent).toBe(titulo);
      expect(aviso?.querySelector('p')?.textContent?.trim().length).toBeGreaterThan(0);
      expect(elemento.querySelector('[aria-busy="true"]') !== null).toBe(estado === 'cargando');
      expect(elemento.querySelector('button, a, input')).toBeNull();
    });
  }

  it('muestra solo la integración pendiente por defecto y admite un mensaje contextual', () => {
    const fixture = TestBed.createComponent(EstadoPanel);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.textContent).toContain('Integración pendiente');
    expect(elemento.querySelector('[role="alert"]')).toBeNull();
    fixture.componentRef.setInput('mensaje', 'Pendiente de integración institucional.');
    fixture.detectChanges();
    expect(elemento.querySelector('p')?.textContent).toBe(
      'Pendiente de integración institucional.',
    );
  });

  it('actualiza el anuncio al cambiar de carga a contenido no disponible', () => {
    const fixture = TestBed.createComponent(EstadoPanel);
    fixture.componentRef.setInput('estado', 'cargando');
    fixture.detectChanges();
    fixture.componentRef.setInput('estado', 'no-disponible');
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('[aria-busy="true"]')).toBeNull();
    expect(elemento.querySelector('[role="status"]')?.textContent).toContain(
      'Contenido no disponible',
    );
    expect(elemento.textContent).not.toContain('Cargando');
  });
});
