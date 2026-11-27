import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideApiConfig } from '../../core/config/api.config';
import { contextoAcademico, personalAcademicoInterceptor } from '../academico/academico-http';
import { LoginPage } from './login-page';
import { personalM1Interceptor, provideM1PersonalLocal } from './m1-personal-http';
import { SesionPersonalM1 } from './m1-personal-sesion';
import { VigilanciaAccesoPersonal } from './vigilancia-acceso-personal';

/**
 * I-08 (FE-UX-03, DC-FE-IMP-03). Una sesión de personal vencida no puede seguir mostrándose como
 * «Identidad verificada»: el 401 retira la credencial y la vigilancia lleva al acceso con un aviso,
 * también desde el Inicio (pantalla sin guard de sección). Un 403 o un fallo del servidor no cierran
 * la sesión. HTTP simulado; sin credenciales reales.
 */
const B = '/api-prueba';
const YO = '11111111-1111-4111-8111-111111111111';
const USUARIOS = `${B}/v1/admin/usuarios?q=&rol=DOCENTE&limite=25&offset=0`;

@Component({ template: '<p>pantalla</p>' })
class Pantalla {}

const respuesta = () => ({
  accessToken: 'token-administrador-prueba', tokenType: 'Bearer', userId: YO, correo: 'admin@example.invalid',
  nombre: 'Administrador prueba', rol: 'ADMINISTRADOR', permisos: [], authPrototype: 'TD-M1-AUTH-PROVISIONAL',
});

async function microtareas(): Promise<void> {
  for (let i = 0; i < 40; i++) await Promise.resolve();
  TestBed.tick();
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe('I-08 · sesión de personal vencida (FE-UX-03)', () => {
  let http: HttpTestingController;
  let sesion: SesionPersonalM1;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', component: Pantalla }, { path: 'dashboard', component: Pantalla }]),
        provideApiConfig(B),
        provideM1PersonalLocal(),
        provideHttpClient(withInterceptors([personalM1Interceptor, personalAcademicoInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(SesionPersonalM1);
    router = TestBed.inject(Router);
    TestBed.inject(VigilanciaAccesoPersonal); // como en DashboardLayout
    sesion.autenticar({ correo: 'admin@example.invalid', password: 'solo-prueba' }).subscribe();
    http.expectOne(`${B}/v1/personal/autenticar`).flush(respuesta());
    http.expectOne(`${B}/v1/personal/me`).flush({ ...respuesta(), accessToken: null });
    await router.navigateByUrl('/dashboard'); // Inicio: sin guard de sección ni ruta vigilada
    await microtareas();
    expect(sesion.estado().tipo).toBe('valida');
  });
  afterEach(() => http.verify());

  const consultarUsuarios = () =>
    TestBed.inject(HttpClient).get(USUARIOS, { context: contextoAcademico() }).subscribe({ error: () => undefined });

  it('la consulta de usuarios del Inicio lleva la credencial de personal (antes salía sin Bearer y fingía un vencimiento)', () => {
    consultarUsuarios();
    const req = http.expectOne(USUARIOS);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-administrador-prueba');
    req.flush({ items: [], total: 0 });
  });

  it('un 401 deja de mostrar la identidad como verificada y lleva al acceso con el aviso de sesión vencida', async () => {
    consultarUsuarios();
    http.expectOne(USUARIOS).flush({ code: 'NO_AUTENTICADO' }, { status: 401, statusText: 'Unauthorized' });
    await microtareas();
    expect(sesion.estado().tipo).toBe('expirada');
    expect(router.url).toBe('/login?aviso=sesion-vencida');
    // Sin bucle ni reintentos con la credencial inválida: ninguna petición más.
    await microtareas();
    expect(router.url).toBe('/login?aviso=sesion-vencida');
    http.expectNone(() => true);
  });

  it('un 403 de una operación no es un vencimiento: confirma la identidad y no cierra la sesión', async () => {
    consultarUsuarios();
    http.expectOne(USUARIOS).flush({ code: 'ACCESO_DENEGADO' }, { status: 403, statusText: 'Forbidden' });
    await microtareas();
    http.expectOne(`${B}/v1/personal/me`).flush({ ...respuesta(), accessToken: null });
    await microtareas();
    expect(sesion.estado().tipo).toBe('valida');
    expect(router.url).toBe('/dashboard');
  });

  it('un 500 o un fallo de red no cierran la sesión', async () => {
    consultarUsuarios();
    http.expectOne(USUARIOS).flush({}, { status: 500, statusText: 'Server Error' });
    consultarUsuarios();
    http.expectOne(USUARIOS).error(new ProgressEvent('error'));
    await microtareas();
    expect(sesion.estado().tipo).toBe('valida');
    expect(router.url).toBe('/dashboard');
  });
});

describe('I-08 · aviso en el acceso', () => {
  function crear(aviso: string | null) {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        provideM1PersonalLocal(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(aviso ? { aviso } : {}) } } },
      ],
    });
    const f = TestBed.createComponent(LoginPage);
    f.detectChanges();
    return (f.nativeElement as HTMLElement).querySelector('.aviso[role="status"]')?.textContent?.trim() ?? '';
  }

  it('explica que la sesión venció y pide iniciar sesión otra vez', () => {
    expect(crear('sesion-vencida')).toContain('Tu sesión venció');
  });

  it('sin aviso (o con otro valor) no muestra nada', () => {
    expect(crear(null)).toBe('');
    TestBed.resetTestingModule();
    expect(crear('cualquier-cosa')).toBe('');
  });
});
