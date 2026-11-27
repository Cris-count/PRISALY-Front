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
type EstadoEtapa = 'completa' | 'pendiente' | 'bloqueada';
interface Etapa { readonly numero: number; readonly titulo: string; readonly estado: EstadoEtapa; readonly detalle: string }

const TEXTO_ESTADO: Record<EstadoEtapa, string> = { completa: 'Completa', pendiente: 'Pendiente', bloqueada: 'Bloqueada' };
/** Intervenciones de un diálogo: cada párrafo separado por una línea en blanco (igual que `construirGuion`). */
export const contarIntervenciones = (dialogo: string) => dialogo.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean).length;

/**
 * CB-05A · FE-UX-06. Constructor docente del caso visual por etapas: información del caso (panel superior), edificios,
 * personajes, narrativa (nombre y rol), diálogos, revisión y vista previa en MUNDO-24. Usa solo el catálogo canónico
 * (no amplía puestos). Guarda el guion prisaly-guion-1 en M3 (`PUT …/narrativa`) y lo vuelve a leer: lo que se muestra
 * como guardado y lo que usa la vista previa es siempre la versión del servidor. Con cambios sin guardar la vista previa
 * queda bloqueada, porque mostraría la versión anterior.
 */
@Component({
  selector: 'app-constructor-caso-visual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './panel-academico.css',
  template: `
    <section class="constructor" aria-labelledby="constructor-visual-titulo" data-prueba="constructor-visual">
      <header class="constructor-cabecera">
        <div>
          <h3 id="constructor-visual-titulo">Constructor del caso en la ciudad 3D</h3>
          <p class="etiqueta-real">Elige los edificios y los personajes que participan y escribe lo que dice cada uno. Lo que no elijas queda cerrado o vacío en la simulación.</p>
        </div>
        <p class="estado-guardado" [attr.data-estado]="estadoGuardado().clave" data-prueba="estado-guardado">
          <span class="punto" aria-hidden="true"></span>{{ estadoGuardado().texto }}
        </p>
      </header>

      <ol class="etapas" aria-label="Etapas del constructor" data-prueba="etapas">
        @for (e of etapas(); track e.numero) {
          <li class="etapa" [attr.data-estado]="e.estado">
            <span class="etapa-numero" aria-hidden="true">@if (e.estado === 'completa') {<svg viewBox="0 0 16 16" width="12" height="12" focusable="false"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>} @else {<span>{{ e.numero }}</span>}</span>
            <span class="etapa-texto"><strong>{{ e.numero }}. {{ e.titulo }}</strong><small>{{ textoEstado[e.estado] }} · {{ e.detalle }}</small></span>
          </li>
        }
      </ol>
      @if (siguientePaso(); as paso) {
        <p class="siguiente-paso" data-prueba="siguiente-paso">{{ paso }}</p>
      }

      @if (noDisponible()) {
        <p class="mensaje" role="status" data-prueba="diseno-no-disponible">
          El diseño del caso en la ciudad 3D no está disponible en este servidor: no está habilitado en este entorno
          o el caso no admite diseño 3D. Puedes consultar las opciones, pero no se guardarán ni abrirán en la vista previa.
        </p>
      }
      @if (aviso(); as a) {
        <p class="mensaje" [class.error]="a.tipo === 'error'" [class.exito]="a.tipo === 'exito'" [attr.role]="a.tipo === 'error' ? 'alert' : 'status'">{{ a.texto }}</p>
      }
      @if (catalogo(); as cat) {
        <fieldset class="etapa-bloque">
          <legend>2. Edificios</legend>
          <div class="tarjetas-edificio">
            @for (e of cat.catalogo.edificios; track e.clave) {
              <label class="tarjeta-edificio" [class.seleccionada]="edificios().includes(e.clave)">
                <input type="checkbox" [checked]="edificios().includes(e.clave)" (change)="alternarEdificio(e.clave)"
                  [disabled]="bloqueado()" [attr.data-prueba]="'edificio-' + e.zoneId" />
                <span class="tarjeta-edificio-texto">
                  <strong>{{ e.nombre }}</strong>
                  <small>{{ ocupacion(e.clave) }} de {{ capacidad(e.clave) }} {{ capacidad(e.clave) === 1 ? 'puesto' : 'puestos' }} en uso</small>
                  <small class="estado-texto">{{ edificios().includes(e.clave) ? 'Incluido en el caso' : 'Cerrado en este caso' }}</small>
                </span>
              </label>
            }
          </div>
        </fieldset>

        @for (e of cat.catalogo.edificios; track e.clave) {
          @if (edificios().includes(e.clave)) {
            <fieldset class="etapa-bloque">
              <legend>3–5. Personajes y diálogos · {{ e.nombre }}</legend>
              @for (p of puestosDe(e.clave); track p.clave) {
                <div class="puesto" [class.seleccionado]="!!personajes()[p.clave]">
                  <label class="opcion">
                    <input type="checkbox" [checked]="!!personajes()[p.clave]" (change)="alternarPuesto(p.clave)"
                      [disabled]="bloqueado()" [attr.data-prueba]="'puesto-' + p.npcId" />
                    <span><strong>{{ modelos[p.modelo] ?? p.modelo }}</strong>
                      <small>{{ personajes()[p.clave] ? 'Participa en el caso' : 'Disponible' }}</small></span>
                  </label>
                  @if (personajes()[p.clave]; as per) {
                    <div class="campos campos-puesto">
                      <label>Nombre del personaje <input [value]="per.nombre" (input)="editar(p.clave, 'nombre', $event)" (blur)="tocar(p.clave, 'nombre')" maxlength="120" [disabled]="bloqueado()"
                        [attr.aria-invalid]="errorCampo(p.clave, 'nombre') ? 'true' : null" [attr.aria-describedby]="errorCampo(p.clave, 'nombre') ? 'error-nombre-' + p.npcId : null" [attr.data-prueba]="'nombre-' + p.npcId" /></label>
                      @if (errorCampo(p.clave, 'nombre'); as err) { <small class="error-campo-texto" [id]="'error-nombre-' + p.npcId" [attr.data-prueba]="'error-nombre-' + p.npcId">{{ err }}</small> }
                      <label>Rol <input [value]="per.rol" (input)="editar(p.clave, 'rol', $event)" maxlength="120" [disabled]="bloqueado()" [attr.data-prueba]="'rol-' + p.npcId" /></label>
                      <label class="campo-dialogo">Diálogo
                        <textarea rows="4" [value]="per.dialogo" (input)="editar(p.clave, 'dialogo', $event)" (blur)="tocar(p.clave, 'dialogo')" [disabled]="bloqueado()"
                          [attr.aria-invalid]="errorCampo(p.clave, 'dialogo') ? 'true' : null"
                          [attr.aria-describedby]="'ayuda-' + p.npcId + (errorCampo(p.clave, 'dialogo') ? ' error-dialogo-' + p.npcId : '')" [attr.data-prueba]="'dialogo-' + p.npcId"></textarea>
                      </label>
                      @if (errorCampo(p.clave, 'dialogo'); as err) { <small class="error-campo-texto" [id]="'error-dialogo-' + p.npcId" [attr.data-prueba]="'error-dialogo-' + p.npcId">{{ err }}</small> }
                      <small class="etiqueta-real" [id]="'ayuda-' + p.npcId">Una línea en blanco separa las intervenciones · {{ contarIntervenciones(per.dialogo) }} {{ contarIntervenciones(per.dialogo) === 1 ? 'intervención' : 'intervenciones' }}</small>
                    </div>
                  }
                </div>
              }
            </fieldset>
          }
        }

        <section class="etapa-bloque revision" aria-labelledby="revision-titulo" data-prueba="revision">
          <h4 id="revision-titulo">6. Revisión</h4>
          @if (resumen().length) {
            <ul class="resumen">
              @for (r of resumen(); track r.edificio) {
                <li><strong>{{ r.edificio }}</strong>
                  @if (r.personajes.length) {
                    <ul>@for (p of r.personajes; track p.texto) { <li>{{ p.texto }}</li> }</ul>
                  } @else { <span class="etiqueta-real"> · sin personajes</span> }
                </li>
              }
            </ul>
          } @else {
            <p class="etiqueta-real">Todavía no hay edificios en el caso.</p>
          }
          @if (erroresLocales().length) {
            <ul class="error-campo" data-prueba="errores-locales">
              @for (err of erroresLocales(); track $index) { <li>{{ describir(err) }}</li> }
            </ul>
          }
        </section>

        <div class="acciones">
          <button type="button" (click)="guardar()" [disabled]="bloqueado() || erroresLocales().length > 0 || !hayCambios()" data-prueba="guardar-narrativa">Guardar en el caso</button>
          <button type="button" (click)="vistaPrevia()" [disabled]="bloqueado() || !guardado() || hayCambios()" data-prueba="vista-previa"
            aria-describedby="ayuda-vista-previa">7. Vista previa en la ciudad 3D</button>
        </div>
        <p class="etiqueta-real" id="ayuda-vista-previa">
          @if (noDisponible()) { Sin el diseño 3D habilitado en el servidor no se puede guardar ni abrir la vista previa. }
          @else if (!guardado()) { Guarda el caso para poder verlo en la ciudad 3D. }
          @else if (hayCambios()) { Guarda los cambios: la vista previa muestra la versión guardada en el servidor. }
          @else { La vista previa usa exactamente la versión guardada. }
        </p>
        <dl class="versiones" data-prueba="narrativa-guardada">
          <div><dt>Borrador en el servidor</dt>
            <dd data-prueba="version-borrador">@if (guardado(); as g) { Versión {{ g.version }}{{ hayCambios() ? ' · tus cambios aún no están en ella' : '' }} } @else { Todavía no guardado }</dd></div>
          <div><dt>Versión publicada</dt>
            <dd data-prueba="version-publicada">@if (publicado(); as pub) { Versión {{ pub.version }} } @else { Sin versión publicada todavía }</dd></div>
        </dl>
      } @else if (catalogoFallido()) {
        <div class="mensaje error" role="alert" data-prueba="catalogo-fallido">
          <p>No se pudo cargar el catálogo de edificios y personajes de la ciudad 3D.</p>
          <button type="button" (click)="cargarCatalogo()" data-prueba="reintentar-catalogo">Volver a intentar</button>
        </div>
      } @else {
        <p class="mensaje" role="status">Cargando el catálogo visual…</p>
      }
    </section>
  `,
  styles: [`
    .constructor { display: grid; gap: 1rem; }
    .constructor-cabecera { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: .75rem; }
    .constructor-cabecera h3 { margin: 0 0 .25rem; }
    .estado-guardado { display: inline-flex; align-items: center; gap: .4rem; margin: 0; padding: .3rem .7rem; border: 1px solid var(--color-borde, #d5d9e0); border-radius: 999px; font-weight: 600; font-size: .875rem; }
    .estado-guardado .punto { width: .6rem; height: .6rem; border-radius: 50%; background: currentColor; }
    .estado-guardado[data-estado='guardado'] { color: var(--color-exito, #1d6b45); background: var(--color-exito-fondo, #e6f4ec); border-color: currentColor; }
    .estado-guardado[data-estado='cambios'] { color: var(--color-aviso, #8a5a00); background: var(--color-aviso-fondo, #fff4d6); border-color: currentColor; }
    .etapas { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr)); gap: .5rem; }
    .etapa { display: flex; gap: .5rem; align-items: flex-start; padding: .5rem .6rem; border: 1px solid var(--color-borde, #d5d9e0); border-radius: .5rem; background: var(--color-superficie, #fff); }
    .etapa-numero { flex: none; display: grid; place-items: center; width: 1.6rem; height: 1.6rem; border-radius: 50%; border: 1px solid currentColor; font-weight: 700; font-size: .75rem; }
    .etapa-texto { display: grid; gap: .1rem; font-size: .875rem; }
    .etapa-texto small { color: var(--color-texto-suave, #52606d); }
    .etapa[data-estado='completa'] { border-color: var(--color-exito, #1d6b45); }
    .etapa[data-estado='completa'] .etapa-numero { background: var(--color-exito, #1d6b45); color: #fff; border-color: transparent; }
    .etapa[data-estado='bloqueada'] { background: var(--color-fondo, #f4f6fa); }
    .etapa-bloque { border: 1px solid var(--color-borde, #d5d9e0); border-radius: .75rem; padding: .75rem 1rem; margin: 0; }
    .etapa-bloque legend, .etapa-bloque h4 { font-weight: 700; padding: 0 .25rem; margin: 0 0 .5rem; }
    .tarjetas-edificio { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .5rem; }
    .tarjeta-edificio { display: flex; gap: .6rem; align-items: flex-start; padding: .7rem .8rem; border: 1px solid var(--color-borde, #d5d9e0); border-radius: .5rem; cursor: pointer; }
    .tarjeta-edificio.seleccionada { border: 2px solid var(--color-primario, #0755d9); background: var(--p-suave, #edf4ff); }
    .tarjeta-edificio-texto, .opcion > span { display: grid; gap: .1rem; }
    .tarjeta-edificio small, .opcion small { color: var(--color-texto-suave, #52606d); }
    .tarjeta-edificio.seleccionada .estado-texto { color: var(--color-primario, #0755d9); font-weight: 600; }
    .puesto { padding: .6rem 0; border-top: 1px solid var(--color-borde, #d5d9e0); }
    .puesto:first-of-type { border-top: 0; }
    .opcion { display: flex; flex-direction: row; align-items: flex-start; gap: .5rem; }
    .campos-puesto { margin: .5rem 0 0 1.6rem; }
    .resumen { margin: 0; padding-left: 1.1rem; display: grid; gap: .35rem; }
    .resumen ul { margin: .2rem 0 0; padding-left: 1rem; }
    .siguiente-paso { margin: 0; padding: .6rem .8rem; border: 1px solid var(--color-borde, #d5d9e0); border-radius: .5rem; background: var(--p-suave, #edf4ff); }
    .error-campo-texto { display: block; margin-top: .25rem; color: var(--color-error, #b42318); font-weight: 600; }
    [aria-invalid='true'] { border-color: var(--color-error, #b42318); }
    .versiones { display: flex; flex-wrap: wrap; gap: .5rem 2rem; margin: 0; }
    .versiones dt { font-size: .875rem; color: var(--color-texto-suave, #52606d); }
    .versiones dd { margin: 0; font-weight: 600; }
    @media (max-width: 30rem) { .campos-puesto { margin-left: 0; } }
  `],
})
export class ConstructorCasoVisual {
  readonly idCaso = input.required<string>();
  private readonly api = inject(CasosM3Api);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly modelos: Record<string, string> = {
    medico: 'Médico', 'paciente-acostado': 'Paciente (en camilla)', oficial: 'Oficial de Policía', fiscal: 'Fiscal',
  };
  protected readonly textoEstado = TEXTO_ESTADO;
  protected readonly contarIntervenciones = contarIntervenciones;
  protected readonly catalogo = signal<CatalogoCargado | null>(null);
  protected readonly edificios = signal<string[]>([]);
  protected readonly personajes = signal<Record<string, Personaje>>({});
  protected readonly guardado = signal<GuionGuardado | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly aviso = signal<{ tipo: 'exito' | 'error' | 'info'; texto: string } | null>(null);
  /**
   * FE-UX-06 (DC-MVP-09-R12): el servidor respondió 404 al pedir la narrativa del caso (p. ej. narrativa M3 apagada en
   * este entorno). No se ofrece una edición que no se podrá guardar: los campos y acciones quedan desactivados.
   */
  protected readonly noDisponible = signal(false);
  protected readonly bloqueado = computed(() => this.ocupado() || this.noDisponible());
  /** Versión publicada de la narrativa (la del servidor); distinta del borrador que edita el docente. */
  protected readonly publicado = signal<GuionGuardado | null>(null);
  protected readonly catalogoFallido = signal(false);
  /** Campos que el docente ya dejó: sus errores se muestran junto al campo. */
  private readonly tocados = signal<ReadonlySet<string>>(new Set());

  private readonly seleccion = computed<SeleccionCaso>(() => {
    const cat = this.catalogo()?.catalogo;
    const orden = cat ? cat.puestos.map((p) => p.clave) : [];
    const ordenEdificios = cat ? cat.edificios.map((e) => e.clave) : [];
    return {
      edificios: [...this.edificios()].sort((a, b) => ordenEdificios.indexOf(a) - ordenEdificios.indexOf(b)),
      personajes: Object.entries(this.personajes()).sort(([a], [b]) => orden.indexOf(a) - orden.indexOf(b))
        .map(([puesto, p]) => ({ puesto, ...p })),
    };
  });
  protected readonly erroresLocales = computed(() => {
    const cat = this.catalogo()?.catalogo;
    return cat ? validarSeleccion(cat, this.seleccion()) : [];
  });

  /** Cambios sin guardar: el guion que saldría del formulario frente al que devolvió el servidor (misma normalización). */
  protected readonly hayCambios = computed(() => {
    const cat = this.catalogo()?.catalogo;
    if (!cat) return false;
    const actual = JSON.stringify(construirGuion(cat, this.seleccion()));
    const g = this.guardado();
    if (!g) return this.seleccion().edificios.length > 0 || this.seleccion().personajes.length > 0;
    const guardadoSel = seleccionDesdeGuion(g.definicion as unknown as GuionM3);
    const ordenEdificios = cat.edificios.map((e) => e.clave), orden = cat.puestos.map((p) => p.clave);
    const normal = {
      edificios: [...guardadoSel.edificios].sort((a, b) => ordenEdificios.indexOf(a) - ordenEdificios.indexOf(b)),
      personajes: [...guardadoSel.personajes].sort((a, b) => orden.indexOf(a.puesto) - orden.indexOf(b.puesto)),
    };
    return actual !== JSON.stringify(construirGuion(cat, normal));
  });

  protected readonly estadoGuardado = computed(() =>
    !this.guardado()
      ? { clave: 'nuevo', texto: this.hayCambios() ? 'Sin guardar' : 'Caso sin diseño 3D' }
      : this.hayCambios()
        ? { clave: 'cambios', texto: 'Cambios sin guardar' }
        : { clave: 'guardado', texto: `Guardado · versión ${this.guardado()!.version}` },
  );

  protected readonly etapas = computed<Etapa[]>(() => {
    const s = this.seleccion();
    const errores = this.erroresLocales();
    const conCodigo = (c: string) => errores.some((e) => e.codigo === c);
    const nE = s.edificios.length, nP = s.personajes.length;
    const narrativaOk = nP > 0 && !conCodigo('NOMBRE_REQUERIDO');
    const dialogosOk = nP > 0 && !conCodigo('DIALOGO_REQUERIDO') && !conCodigo('TEXTO_DEMASIADO_LARGO') && !conCodigo('MARCADO_NO_PERMITIDO');
    const revisionOk = nE > 0 && errores.length === 0;
    const previaOk = !!this.guardado() && !this.hayCambios();
    return [
      { numero: 1, titulo: 'Información del caso', estado: 'completa', detalle: 'caso creado' },
      { numero: 2, titulo: 'Edificios', estado: nE ? 'completa' : 'pendiente', detalle: `${nE} de ${this.catalogo()?.catalogo.edificios.length ?? 0}` },
      { numero: 3, titulo: 'Personajes', estado: nP ? 'completa' : nE ? 'pendiente' : 'bloqueada', detalle: `${nP} ${nP === 1 ? 'personaje' : 'personajes'}` },
      { numero: 4, titulo: 'Narrativa', estado: narrativaOk ? 'completa' : nP ? 'pendiente' : 'bloqueada', detalle: 'nombre y rol' },
      { numero: 5, titulo: 'Diálogos', estado: dialogosOk ? 'completa' : nP ? 'pendiente' : 'bloqueada', detalle: 'intervenciones' },
      { numero: 6, titulo: 'Revisión', estado: revisionOk ? 'completa' : nE ? 'pendiente' : 'bloqueada', detalle: errores.length ? `${errores.length} por corregir` : 'sin errores' },
      { numero: 7, titulo: 'Vista previa', estado: previaOk ? 'completa' : this.guardado() ? 'pendiente' : 'bloqueada', detalle: previaOk ? 'disponible' : 'requiere guardar' },
    ];
  });

  protected readonly resumen = computed(() => {
    const cat = this.catalogo()?.catalogo;
    if (!cat) return [];
    const s = this.seleccion();
    return s.edificios.map((clave) => ({
      edificio: cat.edificios.find((e) => e.clave === clave)?.nombre ?? clave,
      personajes: s.personajes.filter((p) => cat.puestos.find((x) => x.clave === p.puesto)?.edificio === clave).map((p) => {
        const modelo = cat.puestos.find((x) => x.clave === p.puesto)?.modelo ?? '';
        const n = contarIntervenciones(p.dialogo);
        return { texto: `${p.nombre.trim() || 'Sin nombre'} — ${this.modelos[modelo] ?? modelo}${p.rol.trim() ? ', ' + p.rol.trim() : ''} · ${n} ${n === 1 ? 'intervención' : 'intervenciones'}` };
      }),
    }));
  });

  /** Qué hacer ahora, según la primera etapa sin completar. */
  protected readonly siguientePaso = computed(() => {
    if (this.noDisponible() || !this.catalogo()) return null;
    const pendiente = this.etapas().find((e) => e.estado !== 'completa');
    switch (pendiente?.numero) {
      case 2: return 'Siguiente: elige al menos un edificio donde ocurre el caso.';
      case 3: return 'Siguiente: elige qué personajes participan en los edificios del caso.';
      case 4: return 'Siguiente: escribe el nombre de cada personaje.';
      case 5: return 'Siguiente: escribe el diálogo de cada personaje.';
      case 6: return 'Siguiente: corrige lo indicado en la revisión.';
      case 7: return 'Siguiente: guarda el caso para poder abrir la vista previa.';
      case undefined: return 'El caso está guardado. Abre la vista previa para recorrerlo en la ciudad 3D.';
      default: return null;
    }
  });

  constructor() {
    this.cargarCatalogo();
    effect(() => this.recuperar(this.idCaso()));
  }

  protected cargarCatalogo(): void {
    this.catalogoFallido.set(false);
    cargarCatalogoVisual().then((c) => this.catalogo.set(c), () => this.catalogoFallido.set(true));
  }

  protected tocar(clave: string, campo: 'nombre' | 'dialogo'): void {
    this.tocados.update((t) => new Set(t).add(`${clave}:${campo}`));
  }

  /** Error de un campo del personaje, solo si el docente ya salió de él. */
  protected errorCampo(clave: string, campo: 'nombre' | 'dialogo'): string | null {
    if (!this.tocados().has(`${clave}:${campo}`)) return null;
    const codigos = campo === 'nombre' ? ['NOMBRE_REQUERIDO'] : ['DIALOGO_REQUERIDO', 'TEXTO_DEMASIADO_LARGO', 'MARCADO_NO_PERMITIDO'];
    const err = this.erroresLocales().find((e) => e.campo === clave && codigos.includes(e.codigo));
    return err ? this.textoError(err.codigo) : null;
  }

  protected capacidad(edificio: string): number {
    const cat = this.catalogo()?.catalogo;
    return cat ? capacidadEfectiva(cat, edificio) : 0;
  }
  protected ocupacion(edificio: string): number {
    return this.puestosDe(edificio).filter((p) => !!this.personajes()[p.clave]).length;
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

  /** Error en lenguaje del docente, con el personaje o edificio al que se refiere (nunca la ruta interna). */
  protected describir(e: { campo: string; codigo: string }): string {
    const donde = this.lugarDe(e.campo);
    return donde ? `${donde}: ${this.textoError(e.codigo)}` : this.textoError(e.codigo);
  }

  private lugarDe(campo: string): string | null {
    const cat = this.catalogo()?.catalogo;
    if (!cat) return null;
    const servidor = /^personajes\[(\d+)\]/.exec(campo);
    const clave = servidor ? this.seleccion().personajes[Number(servidor[1])]?.puesto : campo;
    const puesto = cat.puestos.find((p) => p.clave === clave);
    if (puesto) {
      const edificio = cat.edificios.find((x) => x.clave === puesto.edificio)?.nombre ?? '';
      const nombre = this.personajes()[puesto.clave]?.nombre.trim();
      return `${nombre || (this.modelos[puesto.modelo] ?? puesto.modelo)} · ${edificio}`;
    }
    return cat.edificios.find((x) => x.clave === clave)?.nombre ?? null;
  }

  private textoError(codigo: string): string {
    const textos: Record<string, string> = {
      EDIFICIO_REQUERIDO: 'Elige al menos un edificio.',
      CAPACIDAD_EXCEDIDA: 'Hay más personajes que puestos en ese edificio.',
      PUESTO_DUPLICADO: 'Ese puesto ya está ocupado.',
      EDIFICIO_NO_SELECCIONADO: 'El personaje pertenece a un edificio no elegido.',
      NOMBRE_REQUERIDO: 'Falta el nombre del personaje.',
      DIALOGO_REQUERIDO: 'Falta el diálogo del personaje.',
      TEXTO_DEMASIADO_LARGO: 'Cada intervención admite hasta 1000 caracteres.',
      MARCADO_NO_PERMITIDO: 'El texto no puede contener etiquetas.',
      RECURSO_VISUAL_NO_CATALOGADO: 'Ese elemento no existe en el catálogo de la ciudad 3D.',
    };
    return textos[codigo] ?? 'Revisa este dato.';
  }

  protected guardar(): void {
    const cat = this.catalogo()?.catalogo;
    if (!cat || this.bloqueado() || this.erroresLocales().length) return;
    const idCaso = this.idCaso();
    this.ocupado.set(true);
    this.aviso.set(null);
    // Persistencia: tras el PUT se vuelve a consultar la narrativa y se muestra lo que devuelve el servidor.
    this.api.guardarNarrativa(idCaso, construirGuion(cat, this.seleccion()))
      .pipe(switchMap(() => this.api.narrativa(idCaso)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (n) => {
          this.aplicar(n.borrador);
          this.publicado.set(n.publicado);
          this.ocupado.set(false);
          this.aviso.set({ tipo: 'exito', texto: 'Caso guardado y verificado en el servidor.' });
        },
        error: (e: unknown) => this.fallar(e),
      });
  }

  protected vistaPrevia(): void {
    if (!this.guardado() || this.hayCambios()) return;
    void this.router.navigate(['/simulador-unreal'], { state: { vistaPreviaDocente: { idCaso: this.idCaso() } } });
  }

  private recuperar(idCaso: string): void {
    this.ocupado.set(true);
    this.noDisponible.set(false);
    this.api.narrativa(idCaso).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (n) => { this.aplicar(n.borrador); this.publicado.set(n.publicado); this.ocupado.set(false); },
      error: (e: unknown) => {
        if (aFalloAcademico(e).estado === 404) {
          this.ocupado.set(false);
          this.noDisponible.set(true);
          return;
        }
        this.fallar(e);
      },
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
      // FE-UX-06 (DC-MVP-09-R07-IMP): el docente lee qué corregir, no el código interno de validación.
      this.aviso.set({ tipo: 'error', texto: `El servidor no guardó el caso. Corrige: ${errores.map((x) => this.describir(x)).join(' · ')}` });
      return;
    }
    const fallo = aFalloAcademico(e);
    this.aviso.set({ tipo: 'error', texto: `${mensajeFallo(fallo)}${fallo.estado > 0 ? ` (HTTP ${fallo.estado})` : ''}` });
  }
}
