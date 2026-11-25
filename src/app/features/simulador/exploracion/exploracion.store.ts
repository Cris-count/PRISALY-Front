import { computed, Injectable, signal } from '@angular/core';
import { ConfiguracionMapa, EventoEspacioVisual, FaseExploracion } from './mapa.models';
import { MAPA_DEMOSTRACION } from './mapa-demo';

/** Estado visual en memoria. No inyecta M5, no persiste, no determina elegibilidad. */
@Injectable()
export class ExploracionStore {
  private readonly configuracionActual = signal<ConfiguracionMapa>(MAPA_DEMOSTRACION);
  private readonly faseActual = signal<FaseExploracion>('presentacion');
  private readonly seleccionActual = signal<string | null>(null);
  private readonly abiertoActual = signal<string | null>(null);
  private readonly visitasActuales = signal<ReadonlyMap<string, number>>(new Map());
  private readonly interaccionActual = signal(false);
  readonly configuracion = this.configuracionActual.asReadonly();
  readonly fase = this.faseActual.asReadonly();
  readonly seleccionado = this.seleccionActual.asReadonly();
  readonly visitas = this.visitasActuales.asReadonly();
  readonly interaccionActiva = this.interaccionActual.asReadonly();
  readonly espacioSeleccionado = computed(
    () => this.configuracion().espacios.find((e) => e.id === this.seleccionado()) ?? null,
  );
  readonly espacioAbierto = computed(
    () => this.configuracion().espacios.find((e) => e.id === this.abiertoActual()) ?? null,
  );

  configurar(configuracion: ConfiguracionMapa): void {
    const ids = configuracion.espacios.map((e) => e.id);
    if (
      !configuracion.id.startsWith('demo-') ||
      new Set(ids).size !== ids.length ||
      configuracion.espacios.some(
        (e) =>
          !e.id.startsWith('demo-') ||
          !e.nombre.trim() ||
          !e.plantillaVisual.trim() ||
          typeof e.disponible !== 'boolean' ||
          [e.posicion.x, e.posicion.y].some((v) => !Number.isFinite(v) || v < 10 || v > 90),
      )
    ) {
      throw new Error('Configuración demostrativa de mapa inválida.');
    }
    this.configuracionActual.set(structuredClone(configuracion));
    this.faseActual.set('presentacion');
    this.seleccionActual.set(null);
    this.abiertoActual.set(null);
    this.visitasActuales.set(new Map());
    this.interaccionActual.set(false);
  }
  comenzar(): void {
    if (this.fase() === 'presentacion') this.faseActual.set('explorando');
  }
  seleccionar(id: string): void {
    if (this.fase() !== 'explorando' || this.espacioAbierto()) return;
    if (this.configuracion().espacios.some((e) => e.id === id && e.disponible))
      this.seleccionActual.set(id);
  }
  entrar(): void {
    const espacio = this.espacioSeleccionado();
    if (this.fase() !== 'explorando' || this.espacioAbierto() || !espacio?.disponible) return;
    this.abiertoActual.set(espacio.id);
    const visitas = new Map(this.visitas());
    visitas.set(espacio.id, (visitas.get(espacio.id) ?? 0) + 1);
    this.visitasActuales.set(visitas);
    this.interaccionActual.set(false);
  }
  volverAlMapa(): void {
    if (this.fase() !== 'explorando') return;
    this.abiertoActual.set(null);
    this.interaccionActual.set(false);
  }
  solicitarPreguntas(): void {
    if (this.fase() === 'explorando' && !this.espacioAbierto()) this.faseActual.set('confirmando');
  }
  cancelarPreguntas(): void {
    if (this.fase() === 'confirmando') this.faseActual.set('explorando');
  }
  confirmarPreguntas(): void {
    if (this.fase() === 'confirmando') {
      this.faseActual.set('cuestionario');
      this.interaccionActual.set(false);
    }
  }
  completarDemostracion(): void {
    if (this.fase() === 'cuestionario') this.faseActual.set('completado');
  }
  recibirEvento(evento: EventoEspacioVisual): void {
    if (this.fase() !== 'explorando' || evento.espacioId !== this.espacioAbierto()?.id) return;
    switch (evento.tipo) {
      case 'interaccion-iniciada':
        this.interaccionActual.set(true);
        break;
      case 'interaccion-finalizada':
        this.interaccionActual.set(false);
        break;
      case 'salida-solicitada':
        this.volverAlMapa();
        break;
    }
  }
}
