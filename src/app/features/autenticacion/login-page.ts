import { DEMOSTRACIONES_HABILITADAS } from './entorno-demostracion';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { computed } from '@angular/core';
import { M1_PERSONAL_LOCAL } from './m1-personal-http';
import { SesionPersonalM1 } from './m1-personal-sesion';
import { VigilanciaAccesoPersonal } from './vigilancia-acceso-personal';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
  styleUrls: ['./login-page.css', './login-presentacion.css'],
})
export class LoginPage {
  protected readonly qaPersonal = inject(M1_PERSONAL_LOCAL);
  /** DC-FULLSTACK-DEMO-ESTUDIANTE-04: enlace a la entrada estudiantil solo en el entorno demo. */
  protected readonly demostraciones = inject(DEMOSTRACIONES_HABILITADAS) === true;
  private readonly sesion = this.qaPersonal ? inject(SesionPersonalM1) : null;
  private readonly router = inject(Router);
  protected readonly enviando = computed(() => {
    const tipo = this.sesion?.estado().tipo;
    return tipo === 'autenticando' || tipo === 'identidad-pendiente';
  });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private temporizador?: ReturnType<typeof setTimeout>;
  protected readonly introduccionTerminada = signal(false);
  protected readonly segundosRestantes = signal(0);
  private finEspera = 0;
  private cuentaRegresiva?: ReturnType<typeof setInterval>;

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.temporizador);
      clearInterval(this.cuentaRegresiva);
    });
    afterNextRender(() => {
      void this.prepararPresentacion();
    });
  }

  private async prepararPresentacion(): Promise<void> {
    const preferencia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reducirMovimiento = () => {
      if (preferencia.matches) this.finalizarPresentacion();
    };
    preferencia.addEventListener('change', reducirMovimiento);
    this.destroyRef.onDestroy(() => preferencia.removeEventListener('change', reducirMovimiento));
    // DC-115: al llegar desde /acceso (perfil elegido) el formulario aparece de inmediato, sin presentación.
    // I-08: con el aviso de sesión vencida, también (el mensaje debe verse sin esperar la animación).
    if (preferencia.matches || new URLSearchParams(window.location.search).has('perfil') || this.sesionVencida) {
      this.finalizarPresentacion();
      return;
    }
    // La decodificación nunca retiene indefinidamente el formulario.
    await new Promise<void>((resolve) => {
      const limiteCarga = setTimeout(resolve, 1200);
      const completar = () => {
        clearTimeout(limiteCarga);
        resolve();
      };
      this.host.querySelector<HTMLImageElement>('.logo')!.decode().then(completar, completar);
      this.destroyRef.onDestroy(completar);
    });
    if (this.destroyRef.destroyed || this.introduccionTerminada()) return;
    const caja = this.host.querySelector<HTMLElement>('.presentacion')!.getBoundingClientRect();
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    const anchoInicial = Math.min(
      ancho * (ancho <= 600 ? 0.8 : 0.5),
      (alto * 0.8 * caja.width) / caja.height,
    );
    this.host.style.setProperty('--logo-x', `${ancho / 2 - caja.left - caja.width / 2}px`);
    this.host.style.setProperty('--logo-y', `${alto / 2 - caja.top - caja.height / 2}px`);
    this.host.style.setProperty('--logo-escala', `${anchoInicial / caja.width}`);
    this.host.classList.add('intro-lista');
    this.temporizador = setTimeout(() => this.finalizarPresentacion(), 7300);
  }

  protected alTerminarEscenario(evento: AnimationEvent): void {
    if (evento.target === evento.currentTarget) this.finalizarPresentacion();
  }

  protected finalizarPresentacion(enfocar = false): void {
    clearTimeout(this.temporizador);
    this.host.classList.add('intro-finalizada');
    this.introduccionTerminada.set(true);
    if (enfocar)
      this.host.querySelector<HTMLInputElement>('#correo')?.focus({ preventScroll: true });
  }

  protected readonly mostrarClave = signal(false);
  /** I-08: llegada desde una sesión de personal vencida (aviso fijado por `VigilanciaAccesoPersonal`). */
  private readonly sesionVencida =
    this.qaPersonal &&
    inject(ActivatedRoute).snapshot.queryParamMap.get('aviso') === VigilanciaAccesoPersonal.AVISO_SESION_VENCIDA;
  protected readonly aviso = signal(
    this.sesionVencida ? 'Tu sesión venció o se cerró en el servidor. Inicia sesión nuevamente para continuar.' : '',
  );
  protected readonly formulario = new FormGroup({
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    clave: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  private iniciarEspera(segundos: number): void {
    this.finEspera = Date.now() + segundos * 1000;
    this.segundosRestantes.set(segundos);
    clearInterval(this.cuentaRegresiva);
    this.cuentaRegresiva = setInterval(() => {
      const restantes = Math.max(0, Math.ceil((this.finEspera - Date.now()) / 1000));
      this.segundosRestantes.set(restantes);
      if (restantes === 0) {
        clearInterval(this.cuentaRegresiva);
        this.aviso.set('Ya puedes intentar iniciar sesión nuevamente.');
      }
    }, 1000);
  }

  protected enviar(): void {
    if (Date.now() < this.finEspera || this.enviando()) return;
    this.formulario.markAllAsTouched();
    this.aviso.set('');
    if (this.formulario.invalid || this.enviando()) return;
    if (this.sesion) {
      const datos = {
        correo: this.formulario.controls.correo.value,
        password: this.formulario.controls.clave.value,
      };
      this.formulario.controls.clave.reset();
      this.mostrarClave.set(false);
      this.sesion
        .autenticar(datos)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (estado) => {
            if (estado.tipo === 'valida') {
              void this.router.navigateByUrl('/dashboard');
            } else {
              const espera = estado.fallo?.reintentarEnSegundos;
              this.aviso.set(estado.fallo?.mensaje ?? 'No se pudo verificar la sesión.');
              if (espera) this.iniciarEspera(espera);
            }
          },
          error: () => this.aviso.set('No fue posible completar el acceso. Inténtalo nuevamente.'),
        });
      return;
    }
    this.aviso.set(
      'Esta pantalla es una demostración visual. La autenticación todavía no está conectada',
    );
  }
}
