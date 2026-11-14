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
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
  styleUrls: ['./login-page.css', './login-presentacion.css'],
})
export class LoginPage {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private temporizador?: ReturnType<typeof setTimeout>;
  protected readonly introduccionTerminada = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizador));
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
    if (preferencia.matches) {
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
  protected readonly aviso = signal('');
  protected readonly formulario = new FormGroup({
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    clave: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected enviar(): void {
    this.formulario.markAllAsTouched();
    this.aviso.set('');
    if (this.formulario.invalid) return;
    this.aviso.set(
      'Esta pantalla es una demostración visual. La autenticación todavía no está conectada',
    );
  }
}
