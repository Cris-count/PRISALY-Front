import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginPage } from './login-page';

describe('Login de demostración', () => {
  let fixture: ComponentFixture<LoginPage>;
  let elemento: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    elemento = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.expectNone(() => true);
    http.verify();
  });

  function escribir(selector: string, valor: string): void {
    const input = elemento.querySelector<HTMLInputElement>(selector)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(): void {
    elemento.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  async function prepararAnimacion(): Promise<void> {
    await fixture.whenStable();
    if (!elemento.classList.contains('intro-lista')) {
      await new Promise<void>((resolve) => {
        // La preparación real tiene un límite de carga; no dependemos de un RAF
        // que Chrome puede suspender si la ventana de Karma queda en segundo plano.
        const terminar = () => {
          observer.disconnect();
          clearTimeout(limite);
          resolve();
        };
        const observer = new MutationObserver(() => {
          if (elemento.classList.contains('intro-lista')) terminar();
        });
        const limite = setTimeout(terminar, 2500);
        observer.observe(elemento, { attributes: true, attributeFilter: ['class'] });
      });
    }
    expect(elemento.classList.contains('intro-lista')).toBeTrue();
  }

  function avanzar(tiempo: number, raiz = elemento): void {
    for (const animacion of raiz.getAnimations({ subtree: true })) {
      animacion.pause();
      animacion.currentTime = tiempo;
    }
  }

  async function terminarAnimacion(): Promise<void> {
    for (const animacion of elemento.getAnimations({ subtree: true })) animacion.finish();
    // Comprueba la finalización sin esperar al despacho visual de eventos en RAF.
    const escenario = elemento.querySelector('.login')!;
    expect(
      escenario.getAnimations().every((animacion) => animacion.playState === 'finished'),
    ).toBeTrue();
    escenario.dispatchEvent(new AnimationEvent('animationend', { bubbles: true }));
    await Promise.resolve();
    fixture.detectChanges();
  }

  it('comienza en oscuridad con las estelas decorativas fuera del recorrido de teclado', async () => {
    await prepararAnimacion();
    avanzar(0);
    expect(getComputedStyle(elemento.querySelector('.login')!).backgroundColor).toBe(
      'rgb(6, 11, 24)',
    );
    expect(getComputedStyle(elemento.querySelector('.escenario-claro')!).opacity).toBe('0');
    expect(getComputedStyle(elemento.querySelector('.tarjeta-login')!).visibility).toBe('hidden');
    const estelas = elemento.querySelector('.estelas')!;
    expect(estelas.getAttribute('aria-hidden')).toBe('true');
    expect(estelas.getAttribute('focusable')).toBe('false');
    expect(estelas.querySelectorAll('path').length).toBe(3);
    expect(estelas.querySelector('[tabindex]')).toBeNull();
  });

  it('desplaza las estelas y revela progresivamente el PNG original', async () => {
    await prepararAnimacion();
    avanzar(1200);
    const rastro = elemento.querySelector('.rastro')!;
    const logo = elemento.querySelector('.logo')!;
    const inicio = getComputedStyle(rastro).strokeDashoffset;
    const opacidad = Number(getComputedStyle(logo).opacity);
    avanzar(3500);
    expect(getComputedStyle(rastro).strokeDashoffset).not.toBe(inicio);
    expect(Number(getComputedStyle(logo).opacity)).toBeGreaterThan(opacidad);
    expect(getComputedStyle(logo).objectFit).toBe('contain');
    expect(logo.getAttribute('src')).toBe('images/prisaly-logo.png');
  });

  it('forma el logo un 60% más despacio y revela la palabra después del símbolo', async () => {
    await prepararAnimacion();
    expect(getComputedStyle(elemento.querySelector('.login')!).animationDuration).toBe('6.8s');
    expect(getComputedStyle(elemento.querySelector('.logo')!).animationDuration).toBe('3.744s');
    avanzar(2400);
    const logo = elemento.querySelector('.logo')!;
    const recorteSimbolo = getComputedStyle(logo).clipPath;
    expect(recorteSimbolo).toContain('16%');
    expect(getComputedStyle(logo).opacity).toBe('1');
    avanzar(3744);
    expect(getComputedStyle(logo).clipPath).not.toBe(recorteSimbolo);
    expect(getComputedStyle(logo).clipPath).not.toContain('16%');
    expect(elemento.querySelector('.ondas')?.getAttribute('focusable')).toBe('false');
    expect(elemento.querySelector('.ondas')?.parentElement?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('ralentiza las tres órbitas y sus desfases proporcionalmente sin cambiar sus trayectorias', async () => {
    await prepararAnimacion();
    expect(getComputedStyle(elemento.querySelector('.estelas')!).animationDuration).toBe('4.8s');
    for (const [selector, retraso] of [
      ['.rastro--azul', '0s'],
      ['.rastro--naranja', '0.24s'],
      ['.rastro--cian', '0.48s'],
    ]) {
      const estilo = getComputedStyle(elemento.querySelector(selector)!);
      expect(estilo.animationDuration).toBe('4.48s');
      expect(estilo.animationDelay).toBe(retraso);
    }
    avanzar(1200);
    const opacidad = Number(getComputedStyle(elemento.querySelector('.logo')!).opacity);
    expect(opacidad).toBeGreaterThan(0);
    expect(opacidad).toBeLessThan(1);
  });

  it('mantiene el logo completo durante un segundo antes de reducirlo y abrir el formulario', async () => {
    await prepararAnimacion();
    const logo = elemento.querySelector('.logo')!;
    const presentacion = elemento.querySelector('.presentacion')!;
    const estilo = getComputedStyle(presentacion);
    expect(Number.parseFloat(estilo.animationDelay) * 1000 - 3744).toBeCloseTo(1000, 5);
    expect(estilo.animationDuration).toBe('0.63s');
    avanzar(3744);
    const anchoCompleto = presentacion.getBoundingClientRect().width;
    const recorteCompleto = getComputedStyle(logo).clipPath;
    for (const tiempo of [4200, 4743]) {
      avanzar(tiempo);
      expect(getComputedStyle(logo).clipPath).toBe(recorteCompleto);
      expect(getComputedStyle(logo).opacity).toBe('1');
      expect(presentacion.getBoundingClientRect().width).toBeCloseTo(anchoCompleto, 3);
      expect(getComputedStyle(elemento.querySelector('.escenario-claro')!).opacity).toBe('0');
      expect(getComputedStyle(elemento.querySelector('.tarjeta-login')!).visibility).toBe('hidden');
    }
    avanzar(4900);
    expect(presentacion.getBoundingClientRect().width).toBeLessThan(anchoCompleto);
    expect(getComputedStyle(elemento.querySelector('.tarjeta-login')!).animationDelay).toBe(
      '5.824s',
    );
  });

  it('centra el logo grande en el viewport y mantiene oculto el formulario durante la pausa', async () => {
    await prepararAnimacion();
    const logo = elemento.querySelector<HTMLElement>('.presentacion')!;
    expect(logo.getAnimations().length).toBeGreaterThan(0);
    avanzar(4200);
    const caja = logo.getBoundingClientRect();
    const anchoEsperado = Math.min(
      window.innerWidth * (window.innerWidth <= 600 ? 0.8 : 0.5),
      (window.innerHeight * 0.8 * parseFloat(getComputedStyle(logo).width)) /
        parseFloat(getComputedStyle(logo).height),
    );
    expect(Math.abs(caja.width - anchoEsperado)).toBeLessThan(1);
    expect(Math.abs(caja.left + caja.width / 2 - window.innerWidth / 2)).toBeLessThan(1);
    expect(Math.abs(caja.top + caja.height / 2 - window.innerHeight / 2)).toBeLessThan(1);
    expect(caja.left).toBeGreaterThanOrEqual(0);
    expect(caja.right).toBeLessThanOrEqual(window.innerWidth + 1);
    const escala = new DOMMatrix(getComputedStyle(logo).transform);
    expect(escala.a).toBeCloseTo(escala.d, 5);
    expect(getComputedStyle(elemento.querySelector('.logo')!).opacity).toBe('1');
    expect(getComputedStyle(elemento.querySelector('.tarjeta-login')!).visibility).toBe('hidden');
  });

  it('termina con el tamaño estable anterior y el formulario abierto', async () => {
    await prepararAnimacion();
    await terminarAnimacion();
    const logo = elemento.querySelector<HTMLElement>('.presentacion')!;
    const caja = logo.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    expect(Math.abs(caja.width - 11.2 * rem)).toBeLessThan(1);
    expect(Math.abs(caja.height - 8.4 * rem)).toBeLessThan(1);
    expect(getComputedStyle(elemento.querySelector('.tarjeta-login')!).visibility).toBe('visible');
    expect(getComputedStyle(elemento.querySelector('.interior')!).opacity).toBe('1');
    expect(getComputedStyle(elemento.querySelector('.login')!).backgroundColor).toBe(
      'rgb(246, 248, 252)',
    );
    expect(elemento.classList.contains('intro-finalizada')).toBeTrue();
    expect(elemento.getAnimations({ subtree: true }).length).toBe(0);
    escribir('#correo', 'demo@example.org');
    escribir('#clave', 'solo-demostracion');
    expect(elemento.getAnimations({ subtree: true }).length).toBe(0);
    expect(getComputedStyle(elemento.querySelector('.tarjeta-login')!).visibility).toBe('visible');
  });

  it('aclara el entorno gradualmente mientras reduce el logo y antes de abrir el formulario', async () => {
    await prepararAnimacion();
    avanzar(4200);
    const anchoGrande = elemento.querySelector('.presentacion')!.getBoundingClientRect().width;
    avanzar(5000);
    const opacidadClara = Number(
      getComputedStyle(elemento.querySelector('.escenario-claro')!).opacity,
    );
    expect(opacidadClara).toBeGreaterThan(0);
    expect(opacidadClara).toBeLessThan(1);
    const anchoIntermedio = elemento.querySelector('.presentacion')!.getBoundingClientRect().width;
    expect(anchoIntermedio).toBeLessThan(anchoGrande);
    expect(anchoIntermedio).toBeGreaterThan(
      parseFloat(getComputedStyle(elemento.querySelector('.presentacion')!).width),
    );
    expect(getComputedStyle(elemento.querySelector('.tarjeta-login')!).visibility).toBe('hidden');
    avanzar(6200);
    expect(getComputedStyle(elemento.querySelector('.tarjeta-login')!).visibility).toBe('visible');
  });

  it('permite omitir la presentación y lleva el foco al correo', () => {
    elemento.querySelector<HTMLButtonElement>('.omitir')!.click();
    fixture.detectChanges();
    expect(elemento.classList.contains('intro-finalizada')).toBeTrue();
    expect(elemento.querySelector<HTMLButtonElement>('.omitir')!.hidden).toBeTrue();
    expect(document.activeElement).toBe(elemento.querySelector('#correo'));
    expect(getComputedStyle(elemento.querySelector('.login')!).backgroundColor).toBe(
      'rgb(246, 248, 252)',
    );
    expect(elemento.getAnimations({ subtree: true }).length).toBe(0);
  });

  it('muestra directamente el formulario claro con movimiento reducido', async () => {
    fixture.destroy();
    const preferencia = {
      matches: true,
      addEventListener: jasmine.createSpy('addEventListener'),
      removeEventListener: jasmine.createSpy('removeEventListener'),
    } as unknown as MediaQueryList;
    spyOn(window, 'matchMedia').and.returnValue(preferencia);
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    await fixture.whenStable();
    elemento = fixture.nativeElement;
    expect(elemento.classList.contains('intro-finalizada')).toBeTrue();
    expect(elemento.style.getPropertyValue('--logo-escala')).toBe('');
    expect(getComputedStyle(elemento.querySelector('.login')!).backgroundColor).toBe(
      'rgb(246, 248, 252)',
    );
    expect(getComputedStyle(elemento.querySelector('.tarjeta-login')!).visibility).toBe('visible');
    expect(elemento.getAnimations({ subtree: true }).length).toBe(0);
  });

  it('libera el formulario aunque la decodificación del logo no termine', async () => {
    fixture.destroy();
    jasmine.clock().install();
    try {
      spyOn(HTMLImageElement.prototype, 'decode').and.returnValue(
        new Promise<void>(() => undefined),
      );
      fixture = TestBed.createComponent(LoginPage);
      fixture.detectChanges();
      elemento = fixture.nativeElement;
      jasmine.clock().tick(1200);
      await Promise.resolve();
      expect(elemento.classList.contains('intro-lista')).toBeTrue();
      jasmine.clock().tick(7299);
      fixture.detectChanges();
      expect(elemento.classList.contains('intro-finalizada')).toBeFalse();
      jasmine.clock().tick(1);
      fixture.detectChanges();
      expect(elemento.classList.contains('intro-finalizada')).toBeTrue();
      expect(getComputedStyle(elemento.querySelector('.tarjeta-login')!).visibility).toBe(
        'visible',
      );
      fixture.destroy();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('finaliza si la preferencia de movimiento reducido cambia durante la presentación', async () => {
    fixture.destroy();
    let cambiar = () => undefined;
    const preferencia = {
      matches: false,
      addEventListener: (_tipo: string, funcion: () => undefined) => {
        cambiar = funcion;
      },
      removeEventListener: jasmine.createSpy('removeEventListener'),
    };
    spyOn(window, 'matchMedia').and.returnValue(preferencia as unknown as MediaQueryList);
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    elemento = fixture.nativeElement;
    await prepararAnimacion();
    preferencia.matches = true;
    cambiar();
    fixture.detectChanges();
    expect(elemento.classList.contains('intro-finalizada')).toBeTrue();
    expect(elemento.getAnimations({ subtree: true }).length).toBe(0);
    fixture.destroy();
    expect(preferencia.removeEventListener).toHaveBeenCalled();
  });

  for (const ancho of [390, 768, 1440]) {
    it(`mantiene el logo inicial centrado y la versión clara sin desbordar a ${ancho}px`, async () => {
      await prepararAnimacion();
      const frame = document.createElement('iframe');
      frame.style.cssText = `position:absolute;left:-10000px;width:${ancho}px;height:1000px;border:0`;
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        const style = doc.createElement('style');
        style.textContent =
          Array.from(document.styleSheets)
            .map((hoja) =>
              Array.from(hoja.cssRules)
                .map((regla) => regla.cssText)
                .join('\n'),
            )
            .join('\n') + '\nbody { margin: 0; }';
        doc.head.appendChild(style);
        const copia = elemento.cloneNode(true) as HTMLElement;
        copia.classList.add('intro-finalizada');
        doc.body.appendChild(copia);
        const ventana = frame.contentWindow!;
        const logo = copia.querySelector<HTMLElement>('.presentacion')!;
        const estable = logo.getBoundingClientRect();
        const anchoInicial = Math.min(
          ancho * (ancho <= 600 ? 0.8 : 0.5),
          (800 * estable.width) / estable.height,
        );
        copia.style.setProperty('--logo-x', `${ancho / 2 - estable.left - estable.width / 2}px`);
        copia.style.setProperty('--logo-y', `${500 - estable.top - estable.height / 2}px`);
        copia.style.setProperty('--logo-escala', `${anchoInicial / estable.width}`);
        copia.classList.remove('intro-finalizada');
        avanzar(4200, copia);
        const inicial = logo.getBoundingClientRect();
        expect(Math.abs(inicial.width - anchoInicial)).toBeLessThan(1);
        expect(Math.abs(inicial.left + inicial.width / 2 - ancho / 2)).toBeLessThan(1);
        expect(Math.abs(inicial.top + inicial.height / 2 - 500)).toBeLessThan(1);
        expect(inicial.width / inicial.height).toBeCloseTo(estable.width / estable.height, 3);
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(ventana.innerWidth);
        copia.classList.add('intro-finalizada');
        expect(ventana.getComputedStyle(copia.querySelector('.login')!).backgroundColor).toBe(
          'rgb(246, 248, 252)',
        );
        expect(ventana.getComputedStyle(copia.querySelector('.tarjeta-login')!).visibility).toBe(
          'visible',
        );
        for (const input of copia.querySelectorAll('input')) {
          const caja = input.getBoundingClientRect();
          expect(caja.width).toBeGreaterThan(0);
          expect(caja.left).toBeGreaterThanOrEqual(0);
          expect(caja.right).toBeLessThanOrEqual(ventana.innerWidth);
        }
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(ventana.innerWidth);
        doc.documentElement.style.fontSize = '200%';
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(ventana.innerWidth);
        for (const control of copia.querySelectorAll<HTMLElement>('input, .iniciar')) {
          const caja = control.getBoundingClientRect();
          expect(caja.width).toBeGreaterThan(0);
          expect(caja.left).toBeGreaterThanOrEqual(0);
          expect(caja.right).toBeLessThanOrEqual(ventana.innerWidth);
        }
      } finally {
        frame.remove();
      }
    });
  }

  it('mantiene contraste de texto normal en campos, etiquetas y mensajes sobre el formulario claro', () => {
    elemento.querySelector<HTMLButtonElement>('.omitir')!.click();
    fixture.detectChanges();
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
    function contraste(texto: string, fondo: string): number {
      const a = luminancia(texto),
        b = luminancia(fondo);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    }
    for (const selector of ['label', '.nota', '.subtitulo', '.explorar-demo']) {
      expect(
        contraste(getComputedStyle(elemento.querySelector(selector)!).color, 'rgb(255, 255, 255)'),
      ).toBeGreaterThanOrEqual(4.5);
    }
    const input = elemento.querySelector('input')!;
    expect(
      contraste(getComputedStyle(input).color, getComputedStyle(input).backgroundColor),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contraste(
        getComputedStyle(input, '::placeholder').color,
        getComputedStyle(input).backgroundColor,
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(getComputedStyle(elemento.querySelector('.iniciar')!).color).toBe('rgb(255, 255, 255)');
    expect(contraste('rgb(255, 255, 255)', 'rgb(8, 101, 223)')).toBeGreaterThanOrEqual(4.5);
  });

  it('aumenta la jerarquía tipográfica sin cambiar los controles ni los tiempos de animación', () => {
    expect(getComputedStyle(elemento.querySelector('h1')!).fontWeight).toBe('700');
    expect(
      parseFloat(getComputedStyle(elemento.querySelector('h1')!).fontSize),
    ).toBeGreaterThanOrEqual(26.4);
    for (const selector of ['.subtitulo', 'input', '.iniciar']) {
      expect(getComputedStyle(elemento.querySelector(selector)!).fontSize).toBe('16px');
    }
    expect(getComputedStyle(elemento.querySelector('label')!).fontSize).toBe('15px');
    expect(getComputedStyle(elemento.querySelector('input')!).fontWeight).toBe('600');
    expect(getComputedStyle(elemento.querySelector('.login')!).animationDuration).toBe('6.8s');
  });

  it('presenta el logo original y los controles etiquetados', () => {
    expect(elemento.querySelector('img')?.getAttribute('src')).toBe('images/prisaly-logo.png');
    expect(elemento.querySelector('label[for="correo"]')).not.toBeNull();
    expect(elemento.querySelector('input[type="email"]')).not.toBeNull();
    expect(elemento.querySelector('label[for="clave"]')).not.toBeNull();
    expect(elemento.querySelector('input[type="password"]')).not.toBeNull();
    expect(elemento.querySelector('button[type="submit"]')?.textContent).toContain(
      'Iniciar sesión',
    );
    expect(elemento.querySelector('#nota-demo')?.textContent).toContain('no está disponible');
  });

  it('permite mostrar y ocultar la contraseña sin enviar el formulario', () => {
    const boton = elemento.querySelector<HTMLButtonElement>('.mostrar')!;
    boton.click();
    fixture.detectChanges();
    expect(elemento.querySelector<HTMLInputElement>('#clave')!.type).toBe('text');
    expect(boton.getAttribute('aria-pressed')).toBe('true');
    expect(boton.getAttribute('aria-label')).toBe('Ocultar contraseña');
    boton.click();
    fixture.detectChanges();
    expect(elemento.querySelector<HTMLInputElement>('#clave')!.type).toBe('password');
    expect(elemento.querySelector('[role="status"]')!.textContent).toBe('');
  });

  it('rechaza campos vacíos y correo inválido con errores asociados', () => {
    enviar();
    expect(elemento.querySelectorAll('[aria-invalid="true"]').length).toBe(2);
    expect(elemento.querySelector('#error-correo')?.textContent).toContain('Ingresa tu correo');
    expect(elemento.querySelector('#error-clave')).not.toBeNull();
    escribir('#correo', 'correo-invalido');
    escribir('#clave', 'solo-demostracion');
    enviar();
    expect(elemento.querySelector('#error-correo')?.textContent).toContain('válido');
    expect(elemento.querySelector('[role="status"]')!.textContent).toBe('');
  });

  it('muestra únicamente el aviso de demostración al enviar datos válidos, sin HTTP', () => {
    escribir('#correo', 'demo@example.org');
    escribir('#clave', 'solo-demostracion');
    enviar();
    expect(elemento.querySelectorAll('[aria-invalid="true"]').length).toBe(0);
    expect(elemento.querySelector('[role="status"]')!.textContent).toBe(
      'Esta pantalla es una demostración visual. La autenticación todavía no está conectada',
    );
    expect(elemento.querySelector('form')).not.toBeNull();
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
