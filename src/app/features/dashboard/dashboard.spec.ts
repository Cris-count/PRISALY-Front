import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
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
    expect(raiz().textContent).toContain('Interfaz de demostración');
    expect(raiz().querySelector('form')).toBeNull();
    expect(raiz().querySelector('table')).toBeNull();
    expect(raiz().querySelector('img')?.getAttribute('src')).toBe('images/prisaly-logo.png');
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
        seccion.ruta === 'usuarios-docentes' ? 'Gestión de usuarios y docentes' : seccion.titulo,
      );
      expect(raiz().querySelector('.titulo-pantalla')?.textContent).toBe(seccion.titulo);
      expect(raiz().querySelector('nav [aria-current="page"]')?.textContent).toContain(
        seccion.titulo,
      );
      expect(raiz().querySelectorAll('.alcance').length).toBe(
        seccion.ruta === 'configuracion' ? 3 : 0,
      );
      expect(raiz().textContent).toContain('Implementación pendiente');
      await pulsar('.regreso');
      expect(TestBed.inject(Router).url).toBe('/dashboard');
    });
  }

  it('las tarjetas llevan a sus vistas y las secciones admiten acceso directo', async () => {
    await pulsar('.acceso[href="/dashboard/casos-academicos"]');
    expect(raiz().querySelector('h1')?.textContent).toBe('Casos académicos');
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
    expect(raiz().querySelector('h1')?.textContent).toBe('Gestión de usuarios y docentes');
    expect(raiz().textContent).toContain('Sin sesión administrativa autenticada');
    await pulsar('nav a[href="/dashboard/sesiones"]');
    expect(raiz().querySelector('h1')?.textContent).toBe('Sesiones');
  });

  it('mantiene deshabilitadas las acciones y filtros administrativos sin modificar ni persistir datos', async () => {
    await harness.navigateByUrl('/dashboard/usuarios-docentes');
    const pagina = raiz().querySelector('app-dashboard-administracion')!;
    const guardar = spyOn(Storage.prototype, 'setItem');
    const borrar = spyOn(Storage.prototype, 'removeItem');
    const vaciar = spyOn(Storage.prototype, 'clear');
    const contenido = pagina.innerHTML;
    const acciones = pagina.querySelectorAll<HTMLButtonElement>('.acciones-admin button');
    expect(Array.from(acciones, (boton) => boton.textContent!.replace(/\s+/g, ' ').trim())).toEqual(
      [
        'Registrar docente Pendiente',
        'Editar información Pendiente',
        'Administrar roles Pendiente',
        'Consultar permisos Pendiente',
      ],
    );
    for (const control of pagina.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLButtonElement
    >('input, select, button')) {
      expect(control.disabled).toBeTrue();
      expect(pagina.querySelector(`#${control.getAttribute('aria-describedby')}`)).not.toBeNull();
      control.click();
    }
    expect(pagina.querySelector('label[for="buscar-docente"]')).not.toBeNull();
    expect(pagina.querySelector('label[for="estado-docente"]')).not.toBeNull();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(pagina.innerHTML).toBe(contenido);
    expect(TestBed.inject(Router).url).toBe('/dashboard/usuarios-docentes');
    for (const operacion of [guardar, borrar, vaciar]) {
      expect(operacion).not.toHaveBeenCalled();
    }
  });

  it('presenta docentes vacíos y catálogos pendientes sin inventar registros o privilegios', async () => {
    await harness.navigateByUrl('/dashboard/usuarios-docentes');
    const pagina = raiz().querySelector('app-dashboard-administracion')!;
    expect(pagina.querySelector('tbody')?.children.length).toBe(0);
    expect(pagina.querySelectorAll('th[scope="col"]').length).toBe(3);
    expect(
      pagina.querySelector('.docentes app-estado-panel [role="status"]')?.textContent,
    ).toContain('Esta demostración no consulta ni contiene registros docentes');
    expect(pagina.querySelector('.roles')?.textContent).toContain(
      'La consulta requerirá una sesión autorizada',
    );
    expect(pagina.querySelector('.roles')?.textContent).toContain(
      'No se han consultado roles ni permisos',
    );
    expect(
      pagina.querySelector(':scope > .administracion > app-estado-panel')?.textContent,
    ).toContain('Integración pendiente');
    expect(pagina.querySelector('form, [data-id-docente], [data-id-usuario]')).toBeNull();
    expect(pagina.querySelector<HTMLInputElement>('input')?.value).toBe('');
  });

  it('expone los estados de carga, vacío, error y acceso restringido solo como ejemplos desplegables', async () => {
    await harness.navigateByUrl('/dashboard/usuarios-docentes');
    const ejemplos = raiz().querySelector<HTMLDetailsElement>('.estados-demo')!;
    expect(ejemplos.open).toBeFalse();
    expect(ejemplos.querySelector<HTMLElement>('[role="alert"]')!.checkVisibility()).toBeFalse();
    expect(
      raiz().querySelector(
        'app-dashboard-administracion > .administracion > app-estado-panel [aria-busy="true"]',
      ),
    ).toBeNull();
    await pulsar('.estados-demo summary');
    expect(ejemplos.open).toBeTrue();
    expect(ejemplos.querySelectorAll('.ejemplos-admin section').length).toBe(4);
    expect(ejemplos.textContent?.replace(/\s+/g, ' ')).toContain(
      'No representan consultas, errores ni decisiones de acceso',
    );
    expect(ejemplos.querySelector('[aria-busy="true"]')?.textContent).toContain(
      'No hay una consulta en curso',
    );
    expect(ejemplos.querySelector('[role="alert"]')?.textContent).toContain(
      'No se ha producido ningún fallo',
    );
    expect(ejemplos.textContent).toContain('No se ha evaluado ninguna autorización');
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
          'form, tbody tr, time, output, input[type="number"], [data-id-caso], [data-id-sesion], [data-id-estudiante]',
        ),
      ).toBeNull();
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
              expect(estilo.getPropertyValue(`border-${lado}-color`)).toBe('rgb(199, 213, 232)');
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
              ancho <= 600 ? 1 : ancho <= 1200 ? 2 : 3,
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
          expect(parseFloat(titulo.fontSize)).toBeGreaterThanOrEqual(28 * escala);
          expect(parseFloat(titulo.fontSize)).toBeLessThanOrEqual(32 * escala);
          expect(titulo.fontWeight).toBe('700');
          const enlaceMenu = ventana.getComputedStyle(doc.querySelector('nav a')!);
          expect(parseFloat(enlaceMenu.fontSize)).toBe(15 * escala);
          expect(enlaceMenu.fontWeight).toBe('600');
          if (ancho > 800) expect(lateral.getBoundingClientRect().width).toBeCloseTo(272, 0);
          if (ancho === 1440 && ruta === '/dashboard') {
            expect(doc.querySelectorAll('.tarjetas > .acceso').length).toBe(
              DASHBOARD_NAVEGACION.length,
            );
            expect(doc.querySelector('.acceso--estudiante')?.getAttribute('href')).toBe(
              '/dashboard/estudiante',
            );
            expect(doc.documentElement.scrollHeight).toBeLessThanOrEqual(alto);
          }
          expect(ventana.getComputedStyle(lateral).display).toBe(ancho <= 800 ? 'none' : 'flex');
          lateral.classList.add('lateral--abierta');
          expect(ventana.getComputedStyle(lateral).display).toBe('flex');
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(ventana.innerWidth);
          const fondo = doc.querySelector<HTMLElement>('.fondo-dashboard')!;
          expect(ventana.getComputedStyle(fondo).pointerEvents).toBe('none');
          expect(ventana.getComputedStyle(fondo).animationName).toBe('none');
          expect(
            Math.abs(fondo.getBoundingClientRect().width - doc.documentElement.clientWidth),
          ).toBeLessThan(1);
          expect(fondo.querySelectorAll('path').length).toBe(4);
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
