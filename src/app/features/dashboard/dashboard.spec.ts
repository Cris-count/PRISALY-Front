import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { provideEntornoDemostracionAutorizado } from '../autenticacion/entorno-demostracion';
import { ParticipacionGateway } from '../simulador/services/participacion.gateway';
import { DASHBOARD_NAVEGACION, DASHBOARD_SECCIONES } from './dashboard-secciones';

describe('Dashboard público de demostración', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let gateway: jasmine.SpyObj<ParticipacionGateway>;

  beforeEach(async () => {
    gateway = jasmine.createSpyObj<ParticipacionGateway>('ParticipacionGateway', [
      'consultarSesionesAutorizadas',
      'iniciarIntento',
      'consultarIntento',
      'registrarRespuesta',
      'consultarProgreso',
      'reanudarIntento',
      'finalizarIntento',
    ]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        // FE-58-05 (H-58-01): esta suite prueba el dashboard demostrativo, que solo existe en el
        // entorno de demostración autorizado.
        provideEntornoDemostracionAutorizado(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ParticipacionGateway, useValue: gateway },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create('/dashboard');
  });

  afterEach(() => {
    http.expectNone(() => true);
    http.verify();
    for (const operacion of Object.values(gateway)) expect(operacion).not.toHaveBeenCalled();
  });

  function raiz(): HTMLElement {
    return harness.routeNativeElement!;
  }

  async function pulsar(selector: string): Promise<void> {
    raiz().querySelector<HTMLElement>(selector)!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('se abre directamente sin autenticación y muestra accesos sin estadísticas ni registros', () => {
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(raiz().querySelectorAll('.acceso').length).toBe(DASHBOARD_NAVEGACION.length);
    expect(raiz().textContent).toContain('Sin sesión autenticada');
    expect(raiz().textContent).toContain('Entorno local de pruebas');
    expect(raiz().querySelector('form')).toBeNull();
    expect(raiz().querySelector('table')).toBeNull();
    expect(raiz().querySelector('img')?.getAttribute('src')).toBe('images/prisaly-logo.png');
  });

  it('mantiene la portada sin búsqueda ficticia ni ilustraciones detrás del contenido', async () => {
    expect(raiz().querySelector('app-dashboard-inicio input')).toBeNull();
    expect(raiz().querySelector('.ciudad-inicio')).toBeNull();
    await pulsar('.acceso[href="/dashboard/casos-academicos"]');
    expect(TestBed.inject(Router).url).toBe('/dashboard/casos-academicos');
  });

  it('contrae y expande conservando nombres accesibles, navegación y estado local', async () => {
    // Headless puede usar un viewport móvil, donde el control de escritorio está oculto.
    // Se mueve la instancia real (no un clon) a una vista de escritorio con el CSS original.
    const frame = document.createElement('iframe');
    frame.title = 'Prueba del menú de escritorio';
    frame.style.cssText = 'position:absolute;left:-10000px;width:1440px;height:1000px;border:0';
    const host = harness.fixture.nativeElement as HTMLElement;
    const padre = host.parentNode!;
    const siguiente = host.nextSibling;
    document.body.appendChild(frame);
    try {
      const doc = frame.contentDocument!;
      const estilo = doc.createElement('style');
      estilo.textContent = Array.from(document.styleSheets)
        .flatMap((hoja) => Array.from(hoja.cssRules, (regla) => regla.cssText))
        .join('\n');
      doc.head.appendChild(estilo);
      doc.body.appendChild(host);
      const guardar = spyOn(Storage.prototype, 'setItem');
      const boton = raiz().querySelector<HTMLButtonElement>('.contraer-menu')!;
      expect(frame.contentWindow!.innerWidth).toBe(1440);
      expect(frame.contentWindow!.getComputedStyle(boton).display).not.toBe('none');
      expect(boton.getBoundingClientRect().width).toBeGreaterThan(0);
      expect(boton.disabled).toBeFalse();
      expect(boton.tabIndex).toBe(0);
      expect(boton.getAttribute('aria-expanded')).toBe('true');
      boton.focus({ preventScroll: true });
      expect(doc.activeElement).toBe(boton);
      await pulsar('.contraer-menu');
      expect(boton.getAttribute('aria-expanded')).toBe('false');
      expect(boton.getAttribute('aria-label')).toBe('Expandir menú lateral');
      expect(doc.activeElement).toBe(boton);
      expect(raiz().querySelector('.dashboard--compacto')).not.toBeNull();
      for (const enlace of raiz().querySelectorAll('nav a')) {
        expect(enlace.getAttribute('aria-label')?.trim()).toBeTruthy();
        expect(enlace.getAttribute('title')).toBe(enlace.getAttribute('aria-label'));
        expect(enlace.querySelector('svg')).not.toBeNull();
      }
      const enlace = raiz().querySelector<HTMLAnchorElement>(
        'nav a[href="/dashboard/usuarios-docentes"]',
      )!;
      expect(enlace.tabIndex).toBe(0);
      enlace.focus({ preventScroll: true });
      expect(doc.activeElement).toBe(enlace);
      await pulsar('nav a[href="/dashboard/usuarios-docentes"]');
      expect(raiz().querySelector('.dashboard--compacto')).not.toBeNull();
      expect(raiz().querySelector('nav [aria-current="page"]')?.getAttribute('href')).toBe(
        '/dashboard/usuarios-docentes',
      );
      boton.focus({ preventScroll: true });
      await pulsar('.contraer-menu');
      expect(boton.getAttribute('aria-expanded')).toBe('true');
      expect(doc.activeElement).toBe(boton);
      expect(guardar).not.toHaveBeenCalled();
    } finally {
      padre.insertBefore(host, siguiente);
      frame.remove();
    }
  });

  it('conserva el mismo sidebar y su identidad al recorrer las ocho secciones expandido y contraído', async () => {
    const frame = document.createElement('iframe');
    frame.title = 'Identidad del sidebar entre módulos';
    frame.style.cssText = 'position:absolute;left:-10000px;width:1440px;height:1000px;border:0';
    const host = harness.fixture.nativeElement as HTMLElement;
    const padre = host.parentNode!;
    const siguiente = host.nextSibling;
    document.body.appendChild(frame);
    try {
      const doc = frame.contentDocument!;
      const ventana = frame.contentWindow!;
      const estilo = doc.createElement('style');
      estilo.textContent = Array.from(document.styleSheets)
        .flatMap((hoja) => Array.from(hoja.cssRules, (regla) => regla.cssText))
        .join('\n');
      doc.head.appendChild(estilo);
      doc.body.appendChild(host);
      const lateral = raiz().querySelector<HTMLElement>('.lateral')!;
      const logo = lateral.querySelector<HTMLImageElement>('.marca img')!;
      const enlaces = Array.from(lateral.querySelectorAll<HTMLAnchorElement>('nav a'));
      const rutas = [
        '/dashboard',
        // DC-FE-UX-ROLES-24: el espacio estudiantil tiene su propio menú (se prueba aparte).
        ...DASHBOARD_NAVEGACION.filter((s) => s.ruta !== 'estudiante').map(
          (s) => '/dashboard/' + s.ruta,
        ),
        '/dashboard',
      ];
      function identidad() {
        const menu = ventana.getComputedStyle(lateral);
        const campus = ventana.getComputedStyle(lateral, '::before');
        const esquina = ventana.getComputedStyle(lateral, '::after');
        const marca = ventana.getComputedStyle(logo);
        return {
          fondo: menu.backgroundImage,
          espacio: menu.padding,
          campus: [campus.backgroundImage, campus.height, campus.bottom, campus.borderRadius],
          esquina: [esquina.backgroundImage, esquina.height],
          logo: [marca.width, marca.height],
          grupo: ventana.getComputedStyle(lateral.querySelector('.grupo')!).margin,
          enlaces: enlaces.map((e) => {
            const css = ventana.getComputedStyle(e);
            return [
              e.getAttribute('href'),
              e.textContent,
              e.querySelector('path')?.getAttribute('d'),
              css.borderRadius,
              css.padding,
              css.fontSize,
            ];
          }),
        };
      }
      for (const contraido of [false, true]) {
        if (contraido) await pulsar('.contraer-menu');
        const referencia = identidad();
        expect(referencia.campus[0]).toContain('inicio-ciudad.webp');
        expect(referencia.esquina[0]).toContain('radial-gradient');
        for (const ruta of rutas) {
          await pulsar('nav a[href="' + ruta + '"]');
          expect(TestBed.inject(Router).url).toBe(ruta);
          expect(raiz().querySelector('.lateral')).toBe(lateral);
          expect(lateral.querySelector('.marca img')).toBe(logo);
          expect(logo.getAttribute('src')).toBe('images/prisaly-logo.png');
          expect(lateral.querySelectorAll('nav a').length).toBe(8);
          expect(lateral.querySelectorAll('nav [aria-current="page"]').length).toBe(1);
          expect(lateral.querySelector('nav [aria-current="page"]')?.getAttribute('href')).toBe(
            ruta,
          );
          expect(lateral.getBoundingClientRect().width).toBeCloseTo(contraido ? 88 : 272, 0);
          expect(identidad())
            .withContext(ruta + ' / compacto=' + contraido)
            .toEqual(referencia);
          expect(lateral.querySelector('.nota-demo')?.textContent).toContain(
            'Entorno local de pruebas',
          );
          expect(lateral.querySelector('.volver')?.getAttribute('href')).toBe('/login');
          expect(raiz().querySelector('.area h1')).not.toBeNull();
        }
      }
    } finally {
      padre.insertBefore(host, siguiente);
      frame.remove();
    }
  });

  it('permite explorar desde el login sin completar credenciales y regresar', async () => {
    await harness.navigateByUrl('/login');
    await pulsar('.explorar-demo');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(raiz().querySelector('#bienvenida-dashboard')).not.toBeNull();
    await pulsar('.volver');
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(raiz().querySelector('form')).not.toBeNull();
  });

  for (const seccion of DASHBOARD_SECCIONES) {
    it(`navega a ${seccion.titulo} y señala el alcance pendiente`, async () => {
      await pulsar(`nav a[href="/dashboard/${seccion.ruta}"]`);
      expect(TestBed.inject(Router).url).toBe(`/dashboard/${seccion.ruta}`);
      expect(raiz().querySelector('h1')?.textContent).toBe(
        seccion.ruta === 'usuarios-docentes' ? 'Gestión de usuarios' : seccion.titulo,
      );
      expect(raiz().querySelector('.titulo-pantalla')?.textContent).toBe(seccion.titulo);
      expect(raiz().querySelector('nav [aria-current="page"]')?.textContent).toContain(
        seccion.titulo,
      );
      expect(raiz().querySelectorAll('.alcance').length).toBe(
        seccion.ruta === 'configuracion' ? 6 : 0,
      );
      expect(raiz().textContent).toContain(
        seccion.ruta === 'usuarios-docentes'
          ? 'sesión administrativa verificada'
          : 'Implementación pendiente',
      );
      await pulsar('.regreso');
      expect(TestBed.inject(Router).url).toBe('/dashboard');
    });
  }

  it('presenta Configuración sin activar preferencias ni operaciones administrativas', async () => {
    const guardar = spyOn(Storage.prototype, 'setItem');
    await harness.navigateByUrl('/dashboard/configuracion');
    expect(raiz().querySelectorAll('.config-tarjeta').length).toBe(6);
    const preferencias = raiz().querySelectorAll<HTMLInputElement>('.preferencia input');
    expect(preferencias.length).toBe(4);
    for (const preferencia of preferencias) {
      expect(preferencia.disabled).toBeTrue();
      expect(preferencia.checked).toBeFalse();
      preferencia.click();
      expect(preferencia.checked).toBeFalse();
    }
    expect(raiz().textContent).toContain('No habilita operaciones administrativas reales');
    expect(raiz().textContent).toContain('Referencia estática demostrativa');
    expect(raiz().querySelectorAll('.config-tarjeta a, .config-tarjeta button').length).toBe(0);
    expect(guardar).not.toHaveBeenCalled();
  });

  it('las tarjetas llevan a sus vistas y las secciones admiten acceso directo', async () => {
    expect(
      Array.from(raiz().querySelectorAll('.acceso'), (enlace) => enlace.getAttribute('href')),
    ).toEqual(DASHBOARD_NAVEGACION.map((seccion) => `/dashboard/${seccion.ruta}`));
    expect(raiz().querySelector('.accion')).toBeNull();
    await pulsar('.acceso[href="/dashboard/casos-academicos"]');
    expect(raiz().querySelector('h1')?.textContent).toBe('Casos académicos');
    expect(raiz().querySelector('.notificaciones-inicio')).toBeNull();
    await harness.navigateByUrl('/dashboard/configuracion');
    expect(raiz().querySelector('h1')?.textContent).toBe('Configuración');
  });

  it('abre administración desde su tarjeta y directamente conservando el mismo layout', async () => {
    const layout = raiz();
    await pulsar('.acceso[href="/dashboard/usuarios-docentes"]');
    expect(TestBed.inject(Router).url).toBe('/dashboard/usuarios-docentes');
    expect(raiz()).toBe(layout);
    expect(raiz().querySelectorAll('app-dashboard-administracion').length).toBe(1);
    expect(raiz().querySelectorAll('aside.lateral').length).toBe(1);
    expect(raiz().querySelectorAll('nav').length).toBe(1);
    expect(raiz().querySelectorAll('.superior').length).toBe(1);
    await harness.navigateByUrl('/dashboard/usuarios-docentes');
    expect(raiz().querySelector('h1')?.textContent).toBe('Gestión de usuarios');
    expect(raiz().textContent).toContain(
      'La gestión requiere una sesión administrativa verificada.',
    );
    await pulsar('nav a[href="/dashboard/sesiones"]');
    expect(raiz().querySelector('h1')?.textContent).toBe('Sesiones');
  });

  it('no publica controles administrativos ni persiste datos sin sesión', async () => {
    await harness.navigateByUrl('/dashboard/usuarios-docentes');
    const p = raiz().querySelector('app-dashboard-administracion')!;
    expect(p.querySelectorAll('input,select,button,form,table').length).toBe(0);
    expect(p.textContent).toContain('sesión administrativa verificada');
  });
  it('no presenta registros o privilegios ficticios', async () => {
    await harness.navigateByUrl('/dashboard/usuarios-docentes');
    expect(raiz().querySelector('app-panel-administracion-m1')).toBeNull();
    expect(raiz().querySelector('app-dashboard-administracion table')).toBeNull();
  });
  it('no presenta ejemplos de errores como estados operativos', async () => {
    await harness.navigateByUrl('/dashboard/usuarios-docentes');
    expect(raiz().querySelector('.estados-demo')).toBeNull();
    expect(raiz().querySelector('app-dashboard-administracion [aria-busy="true"]')).toBeNull();
  });

  it('abre el panel estudiantil directamente dentro del único layout existente', async () => {
    await harness.navigateByUrl('/dashboard/estudiante');
    expect(TestBed.inject(Router).url).toBe('/dashboard/estudiante');
    expect(raiz().querySelector('h1')?.textContent).toBe('Mi espacio de aprendizaje');
    expect(raiz().querySelector('.titulo-pantalla')?.textContent).toBe('Mi espacio de aprendizaje');
    expect(raiz().querySelectorAll('aside.lateral').length).toBe(1);
    expect(raiz().querySelectorAll('nav').length).toBe(1);
    expect(raiz().querySelectorAll('.superior').length).toBe(1);
    expect(raiz().textContent).toContain('Sin identidad estudiantil autenticada');
  });

  it('permite acceder al espacio estudiantil desde la tarjeta y desde el menú móvil', async () => {
    await pulsar('.acceso[href="/dashboard/estudiante"]');
    expect(raiz().querySelector('app-dashboard-estudiante')).not.toBeNull();
    await harness.navigateByUrl('/dashboard');
    await pulsar('.abrir-menu');
    await pulsar('nav a[href="/dashboard/estudiante"]');
    expect(TestBed.inject(Router).url).toBe('/dashboard/estudiante');
    expect(raiz().querySelector('.lateral--abierta')).toBeNull();
    expect(raiz().querySelector('nav [aria-current="page"]')?.textContent).toContain(
      'Mi espacio de aprendizaje',
    );
    // DC-FE-UX-ROLES-24: menú lateral exclusivamente estudiantil.
    const opciones = Array.from(raiz().querySelectorAll('aside nav a'), (a) =>
      a.textContent?.trim(),
    );
    expect(opciones).toEqual([
      'Mi espacio de aprendizaje',
      'Mis sesiones',
      'Mis convocatorias',
      'Mis actividades',
      'Notificaciones',
      'Recorrido estudiantil',
      'Mi perfil',
      'Simulador',
    ]);
    await pulsar('.regreso');
    expect(raiz().querySelector('#bienvenida-dashboard')).not.toBeNull();
  });

  it('presenta únicamente integración pendiente sin convocatorias ni intentos ficticios', async () => {
    await harness.navigateByUrl('/dashboard/estudiante');
    const pagina = raiz().querySelector('app-dashboard-estudiante')!;
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain('Integración pendiente');
    expect(pagina.querySelectorAll('app-estado-panel').length).toBe(1);
    expect(pagina.querySelector('[role="alert"], [aria-busy="true"]')).toBeNull();
    expect(pagina.querySelector('#sesiones-estudiante')?.parentElement?.textContent).toContain(
      'Las sesiones y convocatorias estudiantiles estarán disponibles cuando se habilite su integración institucional',
    );
    expect(
      pagina.querySelector('#participaciones-estudiante')?.parentElement?.textContent,
    ).toContain('No hay información de participación disponible en este entorno de demostración');
    expect(
      pagina.querySelector('table, time, input, [data-id-intento], [data-id-sesion]'),
    ).toBeNull();
    expect(pagina.textContent).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    expect(pagina.querySelector('a[href^="/simulador"]')).toBeNull();
  });

  it('distribuye el alto sobrante del panel estudiantil sin recortar contenido ni activar acciones', async () => {
    await harness.navigateByUrl('/dashboard/estudiante');
    const frame = document.createElement('iframe');
    frame.title = 'Espacio disponible del panel estudiantil';
    frame.style.cssText = 'position:absolute;left:-10000px;width:2560px;height:1440px;border:0';
    document.body.appendChild(frame);
    try {
      const doc = frame.contentDocument!;
      const ventana = frame.contentWindow!;
      const style = doc.createElement('style');
      style.textContent =
        Array.from(document.styleSheets)
          .flatMap((hoja) => Array.from(hoja.cssRules, (regla) => regla.cssText))
          .join('\n') + '\nbody{margin:0}html{font-size:16px}';
      doc.head.appendChild(style);
      doc.body.appendChild(raiz().cloneNode(true));
      const pagina = doc.querySelector<HTMLElement>('.panel-estudiantil')!;
      const pie = pagina.querySelector('.pie-estudiante')!.getBoundingClientRect();
      expect(ventana.innerHeight - pie.bottom).toBeLessThanOrEqual(32);
      expect(pie.bottom).toBeLessThanOrEqual(ventana.innerHeight);
      expect(doc.documentElement.scrollHeight).toBeLessThanOrEqual(ventana.innerHeight);
      expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(ventana.innerWidth);
      expect(pagina.querySelectorAll('.portal-estudiante > section').length).toBe(7);
      for (const panel of pagina.querySelectorAll<HTMLElement>('.portal-estudiante > section')) {
        expect(panel.scrollHeight).toBeLessThanOrEqual(panel.clientHeight + 1);
      }
      expect(pagina.querySelector<HTMLButtonElement>('#entrada-simulador')!.disabled).toBeTrue();
      expect(
        ventana.getComputedStyle(pagina.querySelector('.campus-estudiante')!).pointerEvents,
      ).toBe('none');
    } finally {
      frame.remove();
    }
  });

  it('mantiene deshabilitada la participación y no navega ni solicita un intento', async () => {
    await harness.navigateByUrl('/dashboard/estudiante');
    const boton = raiz().querySelector<HTMLButtonElement>('#entrada-simulador')!;
    expect(boton.disabled).toBeTrue();
    expect(boton.getAttribute('aria-describedby')).toBe('requisito-intento');
    expect(raiz().querySelector('#requisito-intento')?.textContent).toBe(
      'Disponible cuando exista un intento autorizado',
    );
    boton.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/dashboard/estudiante');
  });

  it('abre y cierra el menú por control, Escape y navegación, incluso al destino actual', async () => {
    const selector = '.abrir-menu';
    await pulsar(selector);
    expect(raiz().querySelector(selector)?.getAttribute('aria-expanded')).toBe('true');
    expect(raiz().querySelector('.lateral--abierta')).not.toBeNull();
    await pulsar('.cerrar-menu');
    expect(raiz().querySelector(selector)?.getAttribute('aria-expanded')).toBe('false');
    await pulsar(selector);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    harness.detectChanges();
    expect(raiz().querySelector('.lateral--abierta')).toBeNull();
    await pulsar(selector);
    await pulsar('nav a[href="/dashboard/sesiones"]');
    expect(raiz().querySelector('.lateral--abierta')).toBeNull();
    await pulsar(selector);
    await pulsar('nav a[href="/dashboard/sesiones"]');
    expect(raiz().querySelector(selector)?.getAttribute('aria-expanded')).toBe('false');
  });

  const rutasDocentes = ['casos-academicos', 'rubricas', 'sesiones', 'convocatorias'] as const;

  for (const ruta of rutasDocentes) {
    it(`${ruta} muestra integración pendiente y acciones inertes sin crear ni persistir registros`, async () => {
      await harness.navigateByUrl(`/dashboard/${ruta}`);
      const pagina = raiz().querySelector<HTMLElement>('app-dashboard-docente')!;
      expect(pagina).not.toBeNull();
      expect(pagina.textContent).toContain('Sin sesión docente autenticada');
      expect(pagina.querySelectorAll('app-estado-panel').length).toBe(2);
      expect(pagina.querySelector('[role="status"]')?.textContent).toContain(
        'Integración pendiente',
      );
      expect(pagina.querySelector('.panel-docente app-estado-panel')?.textContent).toContain(
        'Sin registros consultados',
      );
      expect(
        pagina.querySelector(
          'form, tbody:not([data-demostracion="visual"]) tr, time, output, input[type="number"], [data-id-caso], [data-id-sesion], [data-id-estudiante]',
        ),
      ).toBeNull();
      if (ruta === 'sesiones') {
        const tabla = pagina.querySelector('table');
        expect(tabla?.getAttribute('aria-describedby')).toBe('nota-tabla');
        expect(pagina.querySelector('#nota-tabla')?.textContent).toContain(
          'No son sesiones ni casos reales',
        );
        expect(pagina.querySelectorAll('tbody[data-demostracion="visual"] tr').length).toBe(3);
        expect(pagina.querySelectorAll('tbody tr small').length).toBe(6);
        expect(
          pagina.querySelectorAll('tbody .accion-pendiente[aria-disabled="true"]').length,
        ).toBe(3);
        expect(pagina.querySelectorAll('tbody td:nth-child(3)').length).toBe(3);
        for (const fecha of pagina.querySelectorAll('tbody td:nth-child(3)'))
          expect(fecha.textContent).toBe('Sin fecha');
      }
      const guardar = spyOn(Storage.prototype, 'setItem');
      const borrar = spyOn(Storage.prototype, 'removeItem');
      const vaciar = spyOn(Storage.prototype, 'clear');
      const contenido = pagina.innerHTML;
      const acciones = pagina.querySelectorAll<HTMLButtonElement>('.acciones-docentes button');
      expect(acciones.length).toBeGreaterThan(0);
      for (const control of pagina.querySelectorAll<HTMLElement>(
        'button, input, select, textarea',
      )) {
        expect(control.matches(':disabled')).toBeTrue();
        control.click();
      }
      for (const boton of acciones) {
        expect(boton.getAttribute('aria-describedby')).toBe('limites-docentes');
        expect(boton.textContent).toContain('Pendiente de integración');
      }
      for (const campo of pagina.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input, textarea',
      )) {
        expect(campo.value).toBe('');
        expect(pagina.querySelector(`label[for="${campo.id}"]`)).not.toBeNull();
      }
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(pagina.innerHTML).toBe(contenido);
      expect(TestBed.inject(Router).url).toBe(`/dashboard/${ruta}`);
      for (const operacion of [guardar, borrar, vaciar]) expect(operacion).not.toHaveBeenCalled();
    });
  }

  it('los estados de casos son referencias sin registros y el esquema no es un editor', async () => {
    await harness.navigateByUrl('/dashboard/casos-academicos');
    const pagina = raiz().querySelector('app-dashboard-docente')!;
    expect(
      Array.from(
        pagina.querySelectorAll('.referencia-estados li'),
        (elemento) => elemento.textContent,
      ),
    ).toEqual(['BORRADOR', 'PUBLICADO', 'ARCHIVADO']);
    expect(pagina.querySelector('.referencia-estados')?.textContent).toContain(
      'no corresponden a casos existentes',
    );
    expect(
      Array.from(
        pagina.querySelectorAll('app-estructura-docente h3'),
        (elemento) => elemento.textContent,
      ),
    ).toEqual([
      'Información general',
      'Escenarios',
      'Preguntas',
      'Opciones de respuesta',
      'Orden del contenido',
    ]);
    expect(
      Array.from(pagina.querySelectorAll('button'), (boton) =>
        boton.childNodes[0].textContent?.trim(),
      ),
    ).toEqual(['Crear caso', 'Editar caso', 'Consultar caso', 'Publicar caso', 'Archivar caso']);
    expect(
      pagina.querySelector('input, textarea, select, [contenteditable], [draggable]'),
    ).toBeNull();
  });

  it('las rúbricas reservan criterios, dimensiones y descriptores sin evaluaciones inventadas', async () => {
    await harness.navigateByUrl('/dashboard/rubricas');
    const pagina = raiz().querySelector('app-dashboard-docente')!;
    expect(
      Array.from(
        pagina.querySelectorAll('app-estructura-docente h3'),
        (elemento) => elemento.textContent,
      ),
    ).toEqual(['Criterios', 'Dimensiones', 'Descriptores']);
    expect(pagina.querySelector('#limites-docentes')?.textContent).toContain(
      'No se guardan rúbricas ni se calculan puntajes o calificaciones',
    );
    expect(pagina.querySelector('input, textarea, select, output, progress, meter')).toBeNull();
    expect(pagina.querySelector('.referencia-estados')).toBeNull();
    const rubricas = pagina.querySelector('.rubricas')!;
    expect(rubricas.querySelectorAll('tbody[data-demostracion="visual"] tr').length).toBe(6);
    expect(rubricas.querySelector('#ejemplo-rubricas')?.textContent).toContain(
      'No son rúbricas oficiales ni registros consultados',
    );
    expect(rubricas.querySelector('#nota-matriz')?.textContent).toContain(
      'No corresponde a una rúbrica configurada',
    );
    expect(
      rubricas.querySelectorAll('.matriz td[aria-label="Celda decorativa sin puntuación"]').length,
    ).toBe(12);
    expect(
      Array.from(rubricas.querySelectorAll('.matriz thead th'), (celda) =>
        celda.textContent?.trim(),
      ),
    ).toEqual(['Criterio / Dimensión', 'Inicial', 'Básico', 'Alto', 'Superior']);
  });

  it('la programación permanece no disponible, sin fechas ni casos BORRADOR seleccionables', async () => {
    await harness.navigateByUrl('/dashboard/sesiones');
    const pagina = raiz().querySelector('app-dashboard-docente')!;
    expect(pagina.querySelector('#limites-docentes')?.textContent).toContain(
      'Programación no disponible',
    );
    expect(pagina.querySelector('#limites-docentes')?.textContent).toContain(
      'La validación académica definitiva corresponde al Backend',
    );
    expect(pagina.querySelector<HTMLFieldSetElement>('fieldset')?.disabled).toBeTrue();
    expect(pagina.querySelector<HTMLInputElement>('#fecha-sesion')?.value).toBe('');
    expect(pagina.querySelectorAll('#caso-sesion option').length).toBe(1);
    expect(pagina.querySelector('#caso-sesion')?.textContent).not.toContain('BORRADOR');
    expect(pagina.querySelector('#nota-programacion')?.textContent?.replace(/\s+/g, ' ')).toContain(
      'No se pueden programar casos BORRADOR',
    );
  });

  it('las convocatorias reservan destinatarios y condiciones sin convocados ni entregas ficticias', async () => {
    await harness.navigateByUrl('/dashboard/convocatorias');
    const pagina = raiz().querySelector('app-dashboard-docente')!;
    expect(
      Array.from(
        pagina.querySelectorAll('app-estructura-docente h3'),
        (elemento) => elemento.textContent,
      ),
    ).toEqual(['Sesión académica', 'Destinatarios', 'Condiciones']);
    expect(pagina.querySelector('#limites-docentes')?.textContent).toContain(
      'No hay estudiantes convocados, mensajes enviados ni notificaciones entregadas',
    );
    expect(pagina.querySelectorAll('#sesion-convocatoria option').length).toBe(1);
    expect(pagina.querySelector<HTMLInputElement>('#destinatarios-convocatoria')?.value).toBe('');
    expect(pagina.querySelector<HTMLTextAreaElement>('#condiciones-convocatoria')?.value).toBe('');
    expect(pagina.querySelector('a[href^="mailto:"], form')).toBeNull();
    expect(pagina.querySelectorAll('.tarjeta-resumen').length).toBe(4);
    expect(pagina.querySelector('#nota-resumen')?.textContent).toContain('Cifras estáticas');
    expect(pagina.querySelectorAll('tbody[data-demostracion="visual"] tr').length).toBe(5);
    expect(pagina.querySelector('#nota-listado')?.textContent).toContain(
      'No son convocatorias reales',
    );
    expect(pagina.querySelectorAll('.opciones-convocatoria button:disabled').length).toBe(5);
    expect(pagina.querySelectorAll('.acciones-fila button:disabled').length).toBe(15);
    expect(pagina.querySelector('time, progress, meter, output')).toBeNull();
  });

  it('actualiza el contenido al navegar entre las cuatro vistas docentes sin duplicar el layout', async () => {
    const layout = raiz();
    for (const ruta of rutasDocentes) {
      await pulsar(`nav a[href="/dashboard/${ruta}"]`);
      expect(raiz()).toBe(layout);
      expect(raiz().querySelectorAll('app-dashboard-docente').length).toBe(1);
      expect(raiz().querySelectorAll('aside.lateral').length).toBe(1);
      expect(raiz().querySelectorAll('.superior').length).toBe(1);
      expect(raiz().querySelector('nav [aria-current="page"]')?.getAttribute('href')).toBe(
        `/dashboard/${ruta}`,
      );
      expect(raiz().querySelector('h1')?.textContent).toBe(
        raiz().querySelector('.titulo-pantalla')?.textContent,
      );
      expect(raiz().querySelector('.panel-docente h2')?.textContent).toContain(
        ruta === 'casos-academicos' ? 'casos' : ruta === 'rubricas' ? 'rúbricas' : ruta,
      );
    }
  });

  it('prepara el perfil y los avisos estudiantiles sin identidad, editor de avatar ni persistencia', async () => {
    await harness.navigateByUrl('/dashboard/estudiante');
    const pagina = raiz().querySelector('app-dashboard-estudiante')!;
    expect(pagina.querySelector('.perfil-estudiante')?.textContent).toContain(
      'Sin sesión estudiantil autorizada',
    );
    expect(pagina.querySelector('.personalizacion-pendiente')?.textContent).toContain(
      'pendiente de confirmación institucional',
    );
    expect(pagina.querySelector('.avatar-estudiantil')?.getAttribute('aria-hidden')).toBe('true');
    expect(
      pagina.querySelector('.perfil-estudiante img, input, textarea, [contenteditable], form'),
    ).toBeNull();
    expect(pagina.querySelector('#convocatorias-estudiante')).not.toBeNull();
    expect(pagina.querySelector('.notificaciones-estudiante')?.textContent).toContain(
      'No se han consultado notificaciones',
    );
    const guardar = spyOn(Storage.prototype, 'setItem');
    const borrar = spyOn(Storage.prototype, 'removeItem');
    const vaciar = spyOn(Storage.prototype, 'clear');
    const contenido = pagina.innerHTML;
    pagina.querySelector<HTMLButtonElement>('#entrada-simulador')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(pagina.innerHTML).toBe(contenido);
    for (const operacion of [guardar, borrar, vaciar]) expect(operacion).not.toHaveBeenCalled();
  });

  for (const [ancho, escala] of [
    [390, 1],
    [768, 1],
    [1440, 1],
    [2560, 1],
    [768, 2],
  ]) {
    it(`todas las vistas se adaptan a ${ancho}px con texto al ${escala * 100}% sin desbordar y conservan la navegación`, async () => {
      for (const ruta of [
        '/dashboard',
        ...DASHBOARD_NAVEGACION.map((seccion) => `/dashboard/${seccion.ruta}`),
      ]) {
        await harness.navigateByUrl(ruta);
        // Un iframe permite verificar las media queries con un viewport real independiente.
        const frame = document.createElement('iframe');
        const alto = ruta === '/dashboard' && ancho === 1440 ? 1000 : 844;
        frame.style.cssText = `position:absolute;left:-10000px;width:${ancho}px;height:${alto}px;border:0`;
        document.body.appendChild(frame);
        try {
          const doc = frame.contentDocument!;
          const estilos = Array.from(document.styleSheets)
            .map((hoja) =>
              Array.from(hoja.cssRules)
                .map((regla) => regla.cssText)
                .join('\n'),
            )
            .join('\n');
          const style = doc.createElement('style');
          style.textContent = `${estilos}\nbody { margin: 0; } html { font-size: ${16 * escala}px; }`;
          doc.head.appendChild(style);
          doc.body.appendChild(raiz().cloneNode(true));
          const ventana = frame.contentWindow!;
          const lateral = doc.querySelector<HTMLElement>('.lateral')!;
          // Compara con la declaración original: Windows puede rasterizar 1px como 0.8px.
          const referencia = doc.createElement('div');
          referencia.style.cssText = 'position:fixed;visibility:hidden;border:1px solid #c7d5e8';
          doc.body.appendChild(referencia);
          const grosorOriginal = ventana.getComputedStyle(referencia).borderTopWidth;
          referencia.remove();
          for (const [selector, lado] of [
            ['.bienvenida', 'top'],
            ['.estado', 'bottom'],
            ['.acceso', 'top'],
            ['.alcance', 'top'],
          ]) {
            const panel = doc.querySelector<HTMLElement>(selector);
            if (panel) {
              const estilo = ventana.getComputedStyle(panel);
              expect(estilo.getPropertyValue(`border-${lado}-style`)).toBe('solid');
              expect(estilo.getPropertyValue(`border-${lado}-width`)).toBe(grosorOriginal);
              expect(estilo.getPropertyValue(`border-${lado}-color`)).toBe(
                panel.matches('.bienvenida') ? 'rgb(219, 226, 236)' : 'rgb(199, 213, 232)',
              );
            }
          }
          const paneles = Array.from(
            doc.querySelectorAll<HTMLElement>(
              '.acceso, .alcance, .tarjeta-estudiante, .entrada-academica, .panel-admin, .panel-docente, .perfil-estudiante, .notificaciones-estudiante',
            ),
            (panel) => panel.getBoundingClientRect(),
          );
          for (let a = 0; a < paneles.length; a++) {
            for (let b = a + 1; b < paneles.length; b++) {
              const interseccionX =
                Math.min(paneles[a].right, paneles[b].right) -
                Math.max(paneles[a].left, paneles[b].left);
              const interseccionY =
                Math.min(paneles[a].bottom, paneles[b].bottom) -
                Math.max(paneles[a].top, paneles[b].top);
              expect(interseccionX > 0.5 && interseccionY > 0.5)
                .withContext(`${ruta} a ${ancho}px: paneles ${a}/${b}`)
                .toBeFalse();
            }
          }
          const rejilla = doc.querySelector<HTMLElement>('.tarjetas, .alcances');
          if (rejilla) {
            const estilo = ventana.getComputedStyle(rejilla);
            expect(estilo.display).toBe('grid');
            expect(estilo.gridTemplateColumns.split(' ').length).toBe(
              ruta === '/dashboard' && escala === 2 ? 1 : ancho <= 600 ? 1 : ancho <= 1200 ? 2 : 3,
            );
            expect(estilo.gap).toBe(`${16 * escala}px`);
          }
          const vacio = doc.querySelector<HTMLElement>('.sin-datos');
          if (vacio) {
            const estilo = ventana.getComputedStyle(vacio);
            expect(estilo.backgroundColor).toBe('rgb(255, 255, 255)');
            expect(estilo.borderTopStyle).toBe('dashed');
            expect(estilo.borderTopColor).toBe('rgb(199, 213, 232)');
            expect(estilo.padding).toBe(`${24 * escala}px`);
            expect(estilo.borderRadius).toBe(`${16 * escala}px`);
          }
          const ejemplos = doc.querySelector<HTMLDetailsElement>('.estados-demo');
          if (ejemplos) {
            ejemplos.open = true;
            expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(ventana.innerWidth);
          }
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(ventana.innerWidth);
          const titulo = ventana.getComputedStyle(doc.querySelector('h1')!);
          const tituloAmpliado = ['/dashboard/rubricas', '/dashboard/configuracion'].includes(ruta);
          expect(parseFloat(titulo.fontSize)).toBeGreaterThanOrEqual(28 * escala);
          expect(parseFloat(titulo.fontSize)).toBeLessThanOrEqual(
            (tituloAmpliado
              ? 34
              : [
                    '/dashboard',
                    '/dashboard/estudiante',
                    '/dashboard/configuracion',
                    '/dashboard/usuarios-docentes',
                  ].includes(ruta)
                ? 48
                : 32) * escala,
          );
          expect(titulo.fontWeight).toBe('700');
          const enlaceMenu = ventana.getComputedStyle(doc.querySelector('nav a')!);
          expect(parseFloat(enlaceMenu.fontSize)).toBe(15 * escala);
          expect(enlaceMenu.fontWeight).toBe('600');
          if (ancho > 800) expect(lateral.getBoundingClientRect().width).toBeCloseTo(272, 0);
          if (ancho === 1440) {
            const banner = doc.querySelector<HTMLElement>(
              '.bienvenida, .cabecera-admin, .casos .cabecera-docente, .banner-rubricas, .banner-sesiones, .banner-convocatorias, .config-hero, .bienvenida-estudiante',
            )!;
            expect(banner.getBoundingClientRect().height).toBeGreaterThanOrEqual(96);
            expect(banner.getBoundingClientRect().height).toBeLessThanOrEqual(200);
            const margenIzquierdo =
              banner.getBoundingClientRect().left -
              doc.querySelector('.area')!.getBoundingClientRect().left;
            expect(margenIzquierdo).toBeCloseTo(28, 0);
            expect(parseFloat(ventana.getComputedStyle(doc.querySelector('h1')!).fontSize)).toBe(
              tituloAmpliado ? 34 : 32,
            );
          }
          if (ancho === 1440 && ruta === '/dashboard') {
            expect(doc.querySelectorAll('.tarjetas > .acceso').length).toBe(
              DASHBOARD_NAVEGACION.length,
            );
            expect(
              doc.querySelector('.acceso[href="/dashboard/estudiante"]')?.getAttribute('href'),
            ).toBe('/dashboard/estudiante');
            // Inicio conserva su escala y permite scroll vertical natural, sin comprimirlo.
            const paginaInicio = doc.querySelector<HTMLElement>('app-dashboard-inicio .pagina')!;
            const paginaRect = paginaInicio.getBoundingClientRect();
            const areaRect = doc.querySelector('.area')!.getBoundingClientRect();
            expect(paginaRect.width / areaRect.width).toBeCloseTo(0.95, 2);
            const barraSuperior = doc.querySelector('.superior')!.getBoundingClientRect();
            // El layout actual deja 32px de aire sin desplazar todo con un margen adicional.
            expect(paginaRect.top - barraSuperior.bottom).toBeGreaterThanOrEqual(32 * escala);
            const pieInicio = doc.querySelector('.pie-pagina')!.getBoundingClientRect();
            const aprendizaje = doc
              .querySelector('.acceso[href="/dashboard/estudiante"]')!
              .getBoundingClientRect();
            expect(pieInicio.top).toBeGreaterThanOrEqual(aprendizaje.bottom);
            expect(pieInicio.bottom).toBeLessThanOrEqual(paginaRect.bottom + 1);
            expect(ventana.getComputedStyle(paginaInicio).maxHeight).toBe('none');
            for (const descripcion of doc.querySelectorAll('.acceso p')) {
              expect(
                parseFloat(ventana.getComputedStyle(descripcion).fontSize),
              ).toBeGreaterThanOrEqual(15 * escala);
            }
          }
          if (ruta === '/dashboard' && ancho >= 1440) {
            expect(doc.querySelector('.ciudad-inicio')).toBeNull();
            for (const tarjeta of doc.querySelectorAll('.acceso'))
              expect(tarjeta.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
          }
          expect(ventana.getComputedStyle(lateral).display).toBe(ancho <= 800 ? 'none' : 'flex');
          lateral.classList.add('lateral--abierta');
          expect(ventana.getComputedStyle(lateral).display).toBe('flex');
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(ventana.innerWidth);
          const contenedor = doc.querySelector<HTMLElement>('.dashboard')!;
          const principal = doc.querySelector<HTMLElement>('.area')!;
          const anchoPrincipal = principal.getBoundingClientRect().width;
          contenedor.classList.add('dashboard--compacto');
          if (ancho > 800) {
            expect(lateral.getBoundingClientRect().width).toBeCloseTo(88, 0);
            expect(principal.getBoundingClientRect().width).toBeGreaterThan(anchoPrincipal);
            expect(ventana.getComputedStyle(doc.querySelector('.nav-texto')!).clipPath).toBe(
              'inset(50%)',
            );
          } else {
            expect(ventana.getComputedStyle(doc.querySelector('.contraer-menu')!).display).toBe(
              'none',
            );
            expect(ventana.getComputedStyle(doc.querySelector('.nav-texto')!).position).not.toBe(
              'absolute',
            );
          }
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(ventana.innerWidth);
          contenedor.classList.remove('dashboard--compacto');
          const fondo = doc.querySelector<HTMLElement>('.fondo-dashboard')!;
          expect(ventana.getComputedStyle(fondo).display).toBe('none');
          expect(ventana.getComputedStyle(fondo).pointerEvents).toBe('none');
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(ventana.innerWidth);
          // Contraste WCAG AA para textos peque?os sobre las superficies claras.
          function luminancia(color: string): number {
            const canales = color
              .match(/[\d.]+/g)!
              .slice(0, 3)
              .map(Number)
              .map((valor) => {
                const canal = valor / 255;
                return canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
              });
            return canales[0] * 0.2126 + canales[1] * 0.7152 + canales[2] * 0.0722;
          }
          for (const elemento of doc.querySelectorAll<HTMLElement>(
            'nav a, .titulo-pantalla, .contexto, .perfil small, .acceso p, .tarjeta-estudiante p, .aviso, #entrada-simulador, .panel-admin p, .panel-admin button, .panel-admin input, .panel-admin select, .panel-admin th, .sello-demo, .panel-docente p, .panel-docente button, .panel-docente input, .panel-docente select, .panel-docente textarea, .referencia-estados li, app-estructura-docente p, .perfil-estudiante p, .notificaciones-estudiante p',
          )) {
            let superficie: Element | null = elemento;
            let fondoColor = 'rgb(246, 248, 252)';
            while (superficie) {
              const color = ventana.getComputedStyle(superficie).backgroundColor;
              if (color.startsWith('rgb(')) {
                fondoColor = color;
                break;
              }
              superficie = superficie.parentElement;
            }
            const texto = luminancia(ventana.getComputedStyle(elemento).color);
            const fondoLuz = luminancia(fondoColor);
            expect((Math.max(texto, fondoLuz) + 0.05) / (Math.min(texto, fondoLuz) + 0.05))
              .withContext(`${ruta} ${ancho}px: ${elemento.className || elemento.id}`)
              .toBeGreaterThanOrEqual(4.5);
          }
        } finally {
          frame.remove();
        }
      }
    });
  }
});
