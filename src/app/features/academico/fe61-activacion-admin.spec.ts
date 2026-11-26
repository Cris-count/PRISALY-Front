import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideApiConfig } from '../../core/config/api.config';
import { EstadoSesionPersonal } from '../autenticacion/m1-personal.models';
import { SesionPersonalM1 } from '../autenticacion/m1-personal-sesion';
import { FalloAcademico } from './academico-http';
import { AdministracionM1Api } from './administracion-m1.api';
import { provideCapacidadesDc99 } from './capacidades-dc99';
import { PanelAdministracionM1 } from './panel-administracion-m1';

/**
 * FE-61 Fase 3 · D-05 (administrador). DOBLES HTTP con la forma de `ActivacionDocenteController`
 * (Backend DC-99 32922bb). Un 202 solo indica emisión aceptada: no prueba la entrega del correo.
 */
const B = '/api-prueba';
const YO = '11111111-1111-4111-8111-111111111111';
const D = '66666666-6666-4666-8666-666666666666';

describe('FE-61 D-05 AdministracionM1Api (doble HTTP)', () => {
  let http: HttpTestingController;
  let api: AdministracionM1Api;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfig(B)],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(AdministracionM1Api);
  });
  afterEach(() => http.verify());

  it('emite con POST sin cuerpo exigiendo 202 y revoca exigiendo 204', () => {
    const hechos: string[] = [];
    api.emitirActivacionDocente(D).subscribe(() => hechos.push('emitida'));
    const post = http.expectOne({ method: 'POST', url: `${B}/v1/admin/docentes/${D}/activacion` });
    expect(post.request.body).toBeNull();
    post.flush(null, { status: 202, statusText: 'Accepted' });
    api.revocarActivacionDocente(D).subscribe(() => hechos.push('revocada'));
    http
      .expectOne({ method: 'DELETE', url: `${B}/v1/admin/docentes/${D}/activacion` })
      .flush(null, { status: 204, statusText: 'No Content' });
    expect(hechos).toEqual(['emitida', 'revocada']);
  });

  it('un 200 no se acepta como emisión y un UUID inválido no hace HTTP', () => {
    const errores: unknown[] = [];
    api.emitirActivacionDocente(D).subscribe({ error: (e) => errores.push(e) });
    http
      .expectOne(`${B}/v1/admin/docentes/${D}/activacion`)
      .flush(null, { status: 200, statusText: 'OK' });
    api.emitirActivacionDocente('no-uuid').subscribe({ error: (e) => errores.push(e) });
    http.expectNone(() => true);
    expect(errores.length).toBe(2);
    expect(errores.every((e) => e instanceof FalloAcademico)).toBeTrue();
  });
});

describe('FE-61 D-05 PanelAdministracionM1', () => {
  let http: HttpTestingController;

  function montar(habilitada: boolean): ComponentFixture<PanelAdministracionM1> {
    const estado = signal({
      tipo: 'valida',
      identidad: {
        userId: YO,
        correo: 'admin@example.invalid',
        nombre: 'Admin QA',
        rol: 'ADMINISTRADOR',
        permisos: [],
        authPrototype: 'TD-M1-AUTH-PROVISIONAL',
      },
    } as EstadoSesionPersonal);
    TestBed.configureTestingModule({
      imports: [PanelAdministracionM1],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig(B),
        provideCapacidadesDc99({ activacionDocente: habilitada }),
        { provide: SesionPersonalM1, useValue: { estado } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(PanelAdministracionM1);
    f.detectChanges();
    return f;
  }
  const raiz = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  function seleccionar(f: ComponentFixture<PanelAdministracionM1>) {
    (f.componentInstance as any).seleccionarUsuario({idUsuario:D, idEstudiante:null, nombre:'Docente QA',correo:'docente@example.invalid',rol:'DOCENTE',estado:'Activo',credencialPersonalConfigurada:false,estadoInvitacion:'NO_EMITIDA'});
    http.expectOne(`${B}/v1/admin/usuarios/${D}/permisos`).flush([]);
    f.detectChanges();
  }
  function emitir(f: ComponentFixture<PanelAdministracionM1>, _id: string) {
    if (!(f.componentInstance as any).seleccionado()) seleccionar(f);
    const boton = [...raiz(f).querySelectorAll('button')].find(b=>b.textContent?.trim()==='Emitir invitación')!;
    boton.click();f.detectChanges();
  }
  afterEach(() => http.verify());

  it('deshabilitada por el entorno: explica el requisito y no ofrece acciones', () => {
    const f = montar(false);
    seleccionar(f);
    expect(raiz(f).querySelector('[data-prueba="activacion-admin-no-habilitada"]')).not.toBeNull();
    expect([...raiz(f).querySelectorAll('button')].some(b=>b.textContent?.trim()==='Emitir invitación')).toBeFalse();
    expect(raiz(f).textContent).not.toContain('pendiente (D-05)');
  });

  it('202: informa la emisión aceptada sin afirmar que el correo llegó', () => {
    const f = montar(true);
    emitir(f, D);
    http
      .expectOne({ method: 'POST', url: `${B}/v1/admin/docentes/${D}/activacion` })
      .flush(null, { status: 202, statusText: 'Accepted' });
    f.detectChanges();
    const texto = raiz(f).textContent ?? '';
    expect(texto).toContain('aceptó la emisión');
    expect(texto).toContain('no se verifica');
    expect(texto).not.toMatch(/correo (enviado|entregado)/i);
  });

  it('404 sin código (interruptor apagado) y 404 USER_NOT_FOUND se distinguen', () => {
    const f = montar(true);
    emitir(f, D);
    http
      .expectOne(`${B}/v1/admin/docentes/${D}/activacion`)
      .flush(null, { status: 404, statusText: 'x' });
    f.detectChanges();
    expect(raiz(f).textContent).toContain('no tiene habilitada la activación docente');
    emitir(f, D);
    http
      .expectOne(`${B}/v1/admin/docentes/${D}/activacion`)
      .flush({ code: 'USER_NOT_FOUND', message: 'x' }, { status: 404, statusText: 'x' });
    f.detectChanges();
    expect(raiz(f).textContent).toContain('No existe un usuario con ese identificador');
  });
});
