import {
  CondicionNarrativa, ConsecuenciaNarrativa, EstadoNarrativo, GuionNarrativo,
} from './narrativa.models';

/** Motor sin HTTP, almacenamiento, temporizadores ni dependencia de evaluación. */
export class MotorNarrativo {
  private readonly guion: GuionNarrativo;
  private actual: EstadoNarrativo;
  private historial: EstadoNarrativo[] = [];

  constructor(guion: GuionNarrativo) {
    // El autor no puede modificar el guion mientras se reproduce.
    this.guion = congelar(structuredClone(guion));
    this.validar();
    this.actual = this.inicial();
  }

  get estado(): EstadoNarrativo { return this.actual; }
  get escena() { return this.guion.escenas.find(e => e.id === this.actual.escenaId)!; }
  get dialogos() { return this.escena.dialogos.filter(d => this.cumple(d.condicion)); }
  get dialogoActual() { return this.dialogos[this.actual.dialogo] ?? null; }
  get decisionesDisponibles() {
    return this.dialogoActual || this.actual.transicion ? [] : this.escena.decisiones;
  }
  get terminado() {
    return !this.dialogoActual && !this.actual.transicion && this.escena.decisiones.length === 0;
  }
  get puedeVolver() { return this.historial.length > 0; }
  get totalEscenas() { return this.guion.escenas.length; }

  avanzarDialogo(): void {
    if (!this.dialogoActual || this.actual.transicion) return;
    this.guardar();
    this.actual = congelar({ ...this.actual, dialogo: this.actual.dialogo + 1 });
  }

  elegir(id: string): void {
    const decision = this.decisionesDisponibles.find(d => d.id === id);
    if (!decision) return;
    this.guardar();
    this.actual = this.aplicar(this.actual, decision.consecuencias);
    const ruta = decision.rutas.find(r => this.cumple(r.condicion))!;
    this.actual = congelar({ ...this.actual,
      transicion: { destino: ruta.destino, texto: ruta.texto } });
  }

  completarTransicion(): void {
    const transicion = this.actual.transicion;
    if (!transicion) return;
    this.guardar();
    const escena = this.guion.escenas.find(e => e.id === transicion.destino)!;
    this.actual = this.aplicar({ ...this.actual, escenaId: escena.id, dialogo: 0,
      visitadas: [...new Set([...this.actual.visitadas, escena.id])], transicion: null }, escena.alEntrar);
  }

  volver(): void {
    const anterior = this.historial.pop();
    if (anterior) this.actual = anterior;
  }

  reiniciar(): void { this.historial = []; this.actual = this.inicial(); }

  private inicial(): EstadoNarrativo {
    const escena = this.guion.escenas.find(e => e.id === this.guion.inicio)!;
    return this.aplicar({ escenaId: escena.id, dialogo: 0, marcas: {},
      personajes: this.guion.personajes, visitadas: [escena.id], transicion: null }, escena.alEntrar);
  }

  private guardar(): void { this.historial.push(this.actual); }
  private cumple(condicion?: CondicionNarrativa): boolean {
    return !condicion || (this.actual.marcas[condicion.marca] ?? false) === condicion.valor;
  }

  private aplicar(estado: EstadoNarrativo, efectos: readonly ConsecuenciaNarrativa[]): EstadoNarrativo {
    let marcas = { ...estado.marcas };
    let personajes = [...estado.personajes];
    for (const efecto of efectos) {
      if (efecto.tipo === 'marca') marcas = { ...marcas, [efecto.marca]: efecto.valor };
      else if (efecto.tipo === 'personaje') personajes = personajes.map(p =>
        p.id === efecto.personajeId ? { ...p, estado: efecto.estado, expresion: efecto.expresion } : p);
    }
    return congelar({ ...estado, marcas, personajes });
  }

  private validar(): void {
    const ids = this.guion.escenas.map(e => e.id);
    const personajes = this.guion.personajes.map(p => p.id);
    const exigir = (valido: boolean) => { if (!valido) throw new Error('Guion narrativo inválido'); };
    exigir(ids.length > 0 && ids.includes(this.guion.inicio) && new Set(ids).size === ids.length);
    exigir(new Set(personajes).size === personajes.length);
    const expresion = (valor: string) => ['serena', 'atenta', 'alegre'].includes(valor);
    this.guion.personajes.forEach(p => exigir(expresion(p.expresion)));
    const efecto = (e: ConsecuenciaNarrativa) => {
      exigir(e.tipo === 'marca' || e.tipo === 'personaje');
      if (e.tipo === 'personaje') exigir(personajes.includes(e.personajeId) && expresion(e.expresion));
      if (e.tipo === 'marca') exigir(!!e.marca && typeof e.valor === 'boolean');
    };
    for (const escena of this.guion.escenas) {
      exigir(new Set(escena.decisiones.map(d => d.id)).size === escena.decisiones.length);
      escena.dialogos.forEach(d => exigir(personajes.includes(d.personajeId)));
      escena.alEntrar.forEach(efecto);
      for (const decision of escena.decisiones) {
        decision.consecuencias.forEach(efecto);
        exigir(decision.rutas.length > 0 && !decision.rutas.at(-1)!.condicion);
        decision.rutas.forEach((r, i) => {
          exigir(ids.includes(r.destino));
          exigir(i === decision.rutas.length - 1 || !!r.condicion);
        });
      }
    }
    // Cada escena debe poder llegar a un cierre; rechaza callejones sin salida.
    const cerrables = new Set(this.guion.escenas.filter(e => !e.decisiones.length).map(e => e.id));
    let cambio = true;
    while (cambio) {
      cambio = false;
      for (const escena of this.guion.escenas) {
        if (!cerrables.has(escena.id) && escena.decisiones.some(d => d.rutas.some(r => cerrables.has(r.destino)))) {
          cerrables.add(escena.id); cambio = true;
        }
      }
    }
    exigir(ids.every(id => cerrables.has(id)));
  }
}

function congelar<T>(valor: T): T {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.values(valor).forEach(congelar);
    Object.freeze(valor);
  }
  return valor;
}
