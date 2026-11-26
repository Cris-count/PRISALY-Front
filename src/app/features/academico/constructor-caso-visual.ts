import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';
import type { GuionM3 } from '../simulador/narrativa/adaptador-guion-m3';
import {
  CatalogoCargado, SeleccionCaso, capacidadEfectiva, cargarCatalogoVisual, construirGuion, seleccionDesdeGuion, validarSeleccion,
} from '../simulador/unreal/caso-visual';
import { aFalloAcademico, mensajeFallo } from './academico-http';
import { CasosM3Api, ErrorGuion, GuionGuardado, erroresGuion } from './casos-m3.api';

type Personaje = { nombre: string; rol: string; dialogo: string };

/**
 * CB-05A. Constructor docente del caso visual: edificios y personajes del catálogo canónico, con su diálogo.
 * Guarda el guion prisaly-guion-1 en M3 (`PUT …/narrativa`) y lo vuelve a leer del servidor; lo que se muestra y lo
 * que usa la vista previa es siempre la versión persistida, no el formulario.
 */
@Component({
  selector: 'app-constructor-caso-visual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './panel-academico.css',
  template: `
    <section class="fila" aria-labelledby="constructor-visual-titulo" data-prueba="constructor-visual">
      <h3 id="constructor-visual-titulo">Constructor del caso en la ciudad 3D</h3>
      <p class="etiqueta-real">Elige los edificios y los personajes que participan y escribe lo que dice cada uno. Lo que no elijas queda cerrado o vacío en la simulación.</p>
      @if (aviso(); as a) {
        <p class="mensaje" [class.error]="a.tipo === 'error'" [class.exito]="a.tipo === 'exito'" role="status">{{ a.texto }}</p>
      }
      @if (catalogo(); as cat) {
        <fieldset>
          <legend>Edificios</legend>
          @for (e of cat.catalogo.edificios; track e.clave) {
            <label class="opcion">
              <input type="checkbox" [checked]="edificios().includes(e.clave)" (change)="alternarEdificio(e.clave)"
                [disabled]="ocupado()" [attr.data-prueba]="'edificio-' + e.zoneId" />
              {{ e.nombre }} <span class="etiqueta-real">(hasta {{ capacidad(e.clave) }} personaje{{ capacidad(e.clave) === 1 ? '' : 's' }})</span>
            </label>
          }
        </fieldset>
        @for (e of cat.catalogo.edificios; track e.clave) {
          @if (edificios().includes(e.clave)) {
            <fieldset>
              <legend>Personajes · {{ e.nombre }}</legend>
              @for (p of puestosDe(e.clave); track p.clave) {
                <div class="campos">
                  <label class="opcion">
                    <input type="checkbox" [checked]="!!personajes()[p.clave]" (change)="alternarPuesto(p.clave)"
                      [disabled]="ocupado()" [attr.data-prueba]="'puesto-' + p.npcId" />
                    {{ modelos[p.modelo] ?? p.modelo }}
                  </label>
                  @if (personajes()[p.clave]; as per) {
                    <label>Nombre <input [value]="per.nombre" (input)="editar(p.clave, 'nombre', $event)" maxlength="120" [disabled]="ocupado()" [attr.data-prueba]="'nombre-' + p.npcId" /></label>
                    <label>Rol <input [value]="per.rol" (input)="editar(p.clave, 'rol', $event)" maxlength="120" [disabled]="ocupado()" /></label>
                    <label>Diálogo (una línea en blanco separa intervenciones)
                      <textarea rows="4" [value]="per.dialogo" (input)="editar(p.clave, 'dialogo', $event)" [disabled]="ocupado()" [attr.data-prueba]="'dialogo-' + p.npcId"></textarea>
                    </label>
                  }
                </div>
              }
            </fieldset>
          }
        }
        @if (erroresLocales().length) {
          <ul class="error-campo" data-prueba="errores-locales">
            @for (err of erroresLocales(); track $index) { <li>{{ describir(err) }}</li> }
          </ul>
        }
        <div class="acciones">
          <button type="button" (click)="guardar()" [disabled]="ocupado() || erroresLocales().length > 0" data-prueba="guardar-narrativa">Guardar en el caso</button>
          <button type="button" (click)="vistaPrevia()" [disabled]="ocupado() || !guardado()" data-prueba="vista-previa">Vista previa en la ciudad 3D</button>
        </div>
        @if (guardado(); as g) {
          <p class="etiqueta-real" data-prueba="narrativa-guardada">
            Guardado en el servidor: versión {{ g.version }} · {{ g.estado }} · huella <span class="mono">{{ g.hashDefinicion.slice(0, 12) }}…</span>
          </p>
        }
      } @else {
        <p class="mensaje">Cargando el catálogo visual…</p>
      }
    </section>
  `,
  styles: [`fieldset { border: 1px solid #d0d7de; border-radius: 6px; padding: .5rem .75rem; } .opcion { flex-direction: row; align-items: center; gap: .4rem; }`],
})
export class ConstructorCasoVisual {
  readonly idCaso = input.required<string>();
  private readonly api = inject(CasosM3Api);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly modelos: Record<string, string> = {
    medico: 'Médico', 'paciente-acostado': 'Paciente (en camilla)', oficial: 'Oficial de Policía', fiscal: 'Fiscal',
  };
  protected readonly catalogo = signal<CatalogoCargado | null>(null);
  protected readonly edificios = signal<string[]>([]);
  protected readonly personajes = signal<Record<string, Personaje>>({});
  protected readonly guardado = signal<GuionGuardado | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly aviso = signal<{ tipo: 'exito' | 'error' | 'info'; texto: string } | null>(null);

  private readonly seleccion = computed<SeleccionCaso>(() => {
    const cat = this.catalogo()?.catalogo;
    const orden = cat ? cat.puestos.map((p) => p.clave) : [];
    return {
      edificios: this.edificios(),
      personajes: Object.entries(this.personajes()).sort(([a], [b]) => orden.indexOf(a) - orden.indexOf(b))
        .map(([puesto, p]) => ({ puesto, ...p })),
    };
  });
  protected readonly erroresLocales = computed(() => {
    const cat = this.catalogo()?.catalogo;
    return cat ? validarSeleccion(cat, this.seleccion()) : [];
  });

  constructor() {
    cargarCatalogoVisual().then((c) => this.catalogo.set(c),
      () => this.aviso.set({ tipo: 'error', texto: 'No se pudo cargar el catálogo visual.' }));
    effect(() => this.recuperar(this.idCaso()));
  }

  protected capacidad(edificio: string): number {
    const cat = this.catalogo()?.catalogo;
    return cat ? capacidadEfectiva(cat, edificio) : 0;
  }
  protected puestosDe(edificio: string) {
    return this.catalogo()?.catalogo.puestos.filter((p) => p.edificio === edificio) ?? [];
  }

  protected alternarEdificio(clave: string): void {
    const activo = this.edificios().includes(clave);
    this.edificios.update((l) => (activo ? l.filter((e) => e !== clave) : [...l, clave]));
    if (activo) {
      const puestos = new Set(this.puestosDe(clave).map((p) => p.clave));
      this.personajes.update((m) => Object.fromEntries(Object.entries(m).filter(([k]) => !puestos.has(k))));
    }
  }
  protected alternarPuesto(clave: string): void {
    this.personajes.update((m) => {
      if (m[clave]) { const { [clave]: _, ...resto } = m; return resto; }
      return { ...m, [clave]: { nombre: '', rol: '', dialogo: '' } };
    });
  }
  protected editar(clave: string, campo: keyof Personaje, evento: Event): void {
    const valor = (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.personajes.update((m) => ({ ...m, [clave]: { ...m[clave], [campo]: valor } }));
  }

  protected describir(e: { campo: string; codigo: string }): string {
    const textos: Record<string, string> = {
      EDIFICIO_REQUERIDO: 'Elige al menos un edificio.',
      CAPACIDAD_EXCEDIDA: 'Hay más personajes que puestos en ese edificio.',
      PUESTO_DUPLICADO: 'Ese puesto ya está ocupado.',
      EDIFICIO_NO_SELECCIONADO: 'El personaje pertenece a un edificio no elegido.',
      NOMBRE_REQUERIDO: 'Falta el nombre del personaje.',
      DIALOGO_REQUERIDO: 'Falta el diálogo del personaje.',
      TEXTO_DEMASIADO_LARGO: 'Cada intervención admite hasta 1000 caracteres.',
      MARCADO_NO_PERMITIDO: 'El texto no puede contener etiquetas.',
    };
    return `${textos[e.codigo] ?? e.codigo} (${e.campo})`;
  }

  protected guardar(): void {
    const cat = this.catalogo()?.catalogo;
    if (!cat || this.ocupado() || this.erroresLocales().length) return;
    const idCaso = this.idCaso();
    this.ocupado.set(true);
    this.aviso.set(null);
    // Persistencia: tras el PUT se vuelve a consultar la narrativa y se muestra lo que devuelve el servidor.
    this.api.guardarNarrativa(idCaso, construirGuion(cat, this.seleccion()))
      .pipe(switchMap(() => this.api.narrativa(idCaso)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (n) => {
          this.aplicar(n.borrador);
          this.ocupado.set(false);
          this.aviso.set({ tipo: 'exito', texto: 'Caso guardado y verificado en el servidor.' });
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected vistaPrevia(): void {
    if (!this.guardado()) return;
    void this.router.navigate(['/simulador-unreal'], { state: { vistaPreviaDocente: { idCaso: this.idCaso() } } });
  }

  private recuperar(idCaso: string): void {
    this.ocupado.set(true);
    this.api.narrativa(idCaso).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (n) => { this.aplicar(n.borrador); this.ocupado.set(false); },
      error: (e: unknown) => this.fallar(e),
    });
  }

  private aplicar(guion: GuionGuardado | null): void {
    this.guardado.set(guion);
    if (!guion) { this.edificios.set([]); this.personajes.set({}); return; }
    const s = seleccionDesdeGuion(guion.definicion as unknown as GuionM3);
    this.edificios.set([...s.edificios]);
    this.personajes.set(Object.fromEntries(s.personajes.map((p) => [p.puesto, { nombre: p.nombre, rol: p.rol, dialogo: p.dialogo }])));
  }

  private fallar(e: unknown): void {
    this.ocupado.set(false);
    const errores: ErrorGuion[] = erroresGuion(e);
    if (errores.length) {
      this.aviso.set({ tipo: 'error', texto: `El servidor rechazó el caso: ${errores.map((x) => `${x.campo} ${x.codigo}`).join('; ')}` });
      return;
    }
    const fallo = aFalloAcademico(e);
    this.aviso.set({ tipo: 'error', texto: `${mensajeFallo(fallo)}${fallo.estado > 0 ? ` (HTTP ${fallo.estado})` : ''}` });
  }
}
