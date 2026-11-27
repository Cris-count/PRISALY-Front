import { Injectable, Injector, computed, inject, runInInjectionContext, signal } from '@angular/core';
import { GUIONES_POR_EDIFICIO } from '../demo/guiones-edificios-demo';
import { GUION_PACIENTE_HOSPITAL_DEMO } from '../demo/guion-paciente-hospital-demo';
import { LibretaStore } from '../investigacion/libreta.store';
import { MotorNarrativo } from '../narrativa/motor-narrativo';
import type { GuionNarrativo } from '../narrativa/narrativa.models';
import { CoordinadorNarrativoInteriores } from '../services/coordinador-narrativo-interiores';
import { SesionVisualUnreal } from './configuracion-unreal';
import { Mensaje } from './protocolo/validador-mensaje';
import { PuenteUnreal } from './puente/puente-unreal';
import { HOSPITAL_UNREAL, INTERIORES_NARRATIVOS_UNREAL, InteriorNarrativoUnreal, NPCS_HOSPITAL_UNREAL, NpcInteriorUnreal } from './interiores-narrativos-unreal';
import { PLAZA_UNREAL } from './correspondencia-mundo';
import { AvisoInteraccion, CategoriaInteractuable, InteractuableDisponible, TEXTO_RESTRINGIDO, avisoInteraccion } from './aviso-interaccion';
import { ErrorOrden } from './puente/puente-unreal';

export { HOSPITAL_UNREAL, NPCS_HOSPITAL_UNREAL } from './interiores-narrativos-unreal';

export interface VistaHospital {
  readonly estado: MotorNarrativo['estado'];
  readonly dialogo: MotorNarrativo['dialogoActual'];
  readonly decisiones: MotorNarrativo['decisionesDisponibles'];
  readonly terminado: boolean;
}

export interface ProgresoInteriorUnreal {
  readonly edificioId: string;
  readonly zonaId: string;
  readonly nombre: string;
  readonly visitado: boolean;
  readonly npcs: readonly {
    readonly espacialId: string;
    readonly nombre: string;
    readonly estado: 'pendiente' | 'en_curso' | 'completado';
  }[];
}

function nuevoRecorrido(): readonly ProgresoInteriorUnreal[] {
  return INTERIORES_NARRATIVOS_UNREAL.map(e => ({
    edificioId: e.edificioId, zonaId: e.zonaId, nombre: e.nombre, visitado: false,
    npcs: e.npcs.map(npc => ({ espacialId: npc.espacialId, nombre: npc.nombre, estado: 'pendiente' as const })),
  }));
}

/** Narrativa de los tres interiores. Conserva el nombre público de la integración inicial. */
@Injectable()
export class HospitalUnreal {
  private readonly narrativa = inject(CoordinadorNarrativoInteriores);
  // Progreso independiente por NPC, con el mismo edificio, adaptador de pistas y libreta.
  // No se crean identificadores de edificios ficticios para separar las conversaciones.
  private readonly narrativaPaciente = runInInjectionContext(inject(Injector), () => new CoordinadorNarrativoInteriores());
  private readonly guionesPaciente = { [HOSPITAL_UNREAL.edificioId]: GUION_PACIENTE_HOSPITAL_DEMO };
  private readonly libreta = inject(LibretaStore);
  readonly edificioActivo = signal<InteriorNarrativoUnreal | null>(null);
  readonly npcActivo = signal<NpcInteriorUnreal>(NPCS_HOSPITAL_UNREAL.doctor);
  readonly espacio = signal<'exterior' | 'entrando' | 'interior'>('exterior');
  readonly conversacion = signal<'cerrada' | 'abriendo' | 'abierta' | 'cerrando' | 'error'>('cerrada');
  readonly vista = signal<VistaHospital | null>(null);
  readonly error = signal<string | null>(null);
  readonly recorrido = signal(nuevoRecorrido());
  readonly ultimaZona = signal<string | null>(null);
  readonly recuperando = signal(false);
  readonly libretaAbierta = signal(false);
  private readonly contextoDisponible = signal(false);
  readonly enInterior = computed(() => this.espacio() === 'interior');
  readonly modal = computed(() => this.conversacion() !== 'cerrada');
  readonly ocupado = computed(() => this.espacio() === 'entrando' || this.modal() || this.libretaAbierta() || this.recuperando());
  readonly puedeDialogar = computed(() => this.enInterior() && this.edificioActivo() !== null && this.conversacion() === 'abierta' && !this.libretaAbierta());
  readonly puedeAbrirLibreta = computed(() => this.contextoDisponible() && !this.recuperando() && this.espacio() !== 'entrando' && ['cerrada', 'abierta'].includes(this.conversacion()));
  /** CB-05A: en la vista previa, nombre de cada NPC del caso por id espacial; null fuera de ella. */
  private readonly nombresCaso = signal<ReadonlyMap<string, string> | null>(null);
  /** Recorrido que se muestra: en la vista previa, solo los edificios y personajes del caso, con sus nombres. */
  readonly recorridoVisible = computed(() => {
    const nombres = this.nombresCaso();
    if (!nombres) return this.recorrido();
    return this.recorrido()
      .map(e => ({ ...e, npcs: e.npcs.filter(n => nombres.has(n.espacialId)).map(n => ({ ...n, nombre: nombres.get(n.espacialId)! })) }))
      .filter(e => e.npcs.length > 0);
  });
  /** G4-V11: interactuable que Unreal declara al alcance (`interactuable.disponible`), hasta su `no_disponible`. */
  readonly disponible = signal<InteractuableDisponible | null>(null);
  /** Zonas que habilita el caso aplicado (`edificiosHabilitados` de caso.configurar); null en la demostración. */
  readonly zonasHabilitadas = signal<ReadonlySet<string> | null>(null);
  /** Aviso contextual del visor, derivado solo del estado confirmado por Unreal. */
  aviso(conectado: boolean): AvisoInteraccion | null {
    const habilitadas = this.zonasHabilitadas();
    const interior = this.edificioActivo();
    return avisoInteraccion({
      conectado, recuperando: this.recuperando(), libretaAbierta: this.libretaAbierta(),
      espacio: this.espacio(), conversacion: this.conversacion(), interior: interior?.nombre ?? null,
      disponible: this.disponible(),
      puerta: (id) => {
        const destino = INTERIORES_NARRATIVOS_UNREAL.find(e => e.puertaId === id);
        return destino ? { nombre: destino.nombre, habilitado: !habilitadas || habilitadas.has(destino.zonaId) } : null;
      },
      personaje: (id) => {
        if (!interior?.npcs.some(n => n.espacialId === id) || (this.guionesCaso && !this.guionesCaso.has(id))) return null;
        const progreso = this.recorridoVisible().flatMap(e => e.npcs).find(n => n.espacialId === id);
        return progreso ? { nombre: progreso.nombre, completado: progreso.estado === 'completado' } : null;
      },
    });
  }
  readonly conversacionesTerminadas = computed(() => this.recorridoVisible().flatMap(e => e.npcs).filter(n => n.estado === 'completado').length);
  readonly totalConversaciones = computed(() => this.recorridoVisible().flatMap(e => e.npcs).length);
  private puente: PuenteUnreal | null = null;
  private contexto: string | null = null;
  private sesion: string | null = null;
  private revision = 0;
  private esperaEntrada: ReturnType<typeof setTimeout> | null = null;

  vincular(puente: PuenteUnreal, sesion: SesionVisualUnreal): void {
    this.desvincular();
    const contexto = JSON.stringify([sesion.sesion, sesion.casoId]);
    if (this.contexto !== contexto) {
      this.narrativa.reiniciarSesion();
      this.narrativaPaciente.reiniciarSesion();
      this.libreta.reiniciarDemostracion();
      this.npcActivo.set(NPCS_HOSPITAL_UNREAL.doctor);
      this.vista.set(null);
      this.recorrido.set(nuevoRecorrido());
      this.ultimaZona.set(null);
    }
    this.contexto = contexto;
    this.sesion = sesion.sesion;
    this.puente = puente;
    this.contextoDisponible.set(true);
    this.error.set(null);
  }

  desvincular(): void {
    this.guardar();
    ++this.revision;
    this.cancelarEspera();
    this.puente = null;
    this.sesion = null;
    this.espacio.set('exterior');
    this.conversacion.set('cerrada');
    this.edificioActivo.set(null);
    this.libretaAbierta.set(false);
    this.recuperando.set(false);
    this.disponible.set(null);
  }

  abrirLibreta(): void { if (this.puedeAbrirLibreta()) this.libretaAbierta.set(true); }
  cerrarLibreta(): void { this.libretaAbierta.set(false); }

  /** v1 restaura las zonas exteriores; se recupera el acceso, no coordenadas interiores. */
  async restaurarEstadoVisual(): Promise<string | null> {
    const puente = this.puente, revision = this.revision, zona = this.ultimaZona();
    if (!puente || !zona) return null;
    const vigente = () => this.puente === puente && this.revision === revision;
    const recorrido = this.recorrido();
    this.recuperando.set(true);
    this.cerrarLibreta();
    try {
      await puente.enviar('estado.restaurar', {
        zonaActual: zona,
        // En la vista previa solo se restauran los NPC del caso: los demás están excluidos en Unreal.
        interactuables: recorrido.flatMap(e => e.npcs.filter(n => !this.guionesCaso || this.guionesCaso.has(n.espacialId)).map(n => ({
          interactuableId: n.espacialId, estado: n.estado === 'completado' ? 'completado' : 'disponible',
        }))),
        edificiosVisitados: recorrido.filter(e => e.visitado).map(e => e.zonaId),
        exploracionBloqueada: false,
      });
      if (!vigente()) return null;
      await puente.enviar('camara.liberar', {});
      // MUNDO-24 suprime hechos espaciales durante 1 s tras estado.restaurar.
      // Mantener los controles cerrados hasta superar esa ventana evita perder edificio.entro.
      await new Promise<void>(resolver => setTimeout(resolver, 1100));
      return vigente() ? zona : null;
    } finally {
      if (vigente()) this.recuperando.set(false);
    }
  }

  async procesar(mensaje: Mensaje): Promise<void> {
    if (!this.puente || this.puente.bloqueado || mensaje.sesion !== this.sesion || mensaje.origen !== 'unreal') return;
    const datos = mensaje.datos;
    const interior = this.edificioActivo();
    if (mensaje.tipo === 'interactuable.disponible') {
      this.disponible.set({ id: datos['interactuableId'] as string, categoria: datos['categoria'] as CategoriaInteractuable });
      return;
    }
    if (mensaje.tipo === 'interactuable.no_disponible') {
      if (this.disponible()?.id === datos['interactuableId']) this.disponible.set(null);
      return;
    }
    // Un cambio de espacio deja atrás lo que estaba al alcance.
    if (mensaje.tipo === 'edificio.entro' || mensaje.tipo === 'edificio.salio') this.disponible.set(null);
    if (mensaje.tipo === 'zona.entro' && this.espacio() === 'exterior' &&
        (datos['zoneId'] === PLAZA_UNREAL.zonaId || INTERIORES_NARRATIVOS_UNREAL.some(e => e.zonaId === datos['zoneId']))) {
      this.ultimaZona.set(datos['zoneId'] as string);
    } else if (mensaje.tipo === 'edificio.entro' && interior && datos['zoneId'] === interior.zonaId) {
      // El ack de puerta.abrir no acredita por sí solo que la sala esté lista.
      if (this.espacio() === 'entrando') {
        this.cancelarEspera();
        this.espacio.set('interior');
        this.error.set(null);
        this.ultimaZona.set(interior.zonaId);
        this.recorrido.update(actual => actual.map(e => e.edificioId === interior.edificioId ? { ...e, visitado: true } : e));
      }
    } else if (mensaje.tipo === 'edificio.salio' && interior && datos['zoneId'] === interior.zonaId) {
      if (this.espacio() === 'exterior') return;
      this.guardar();
      ++this.revision; // Ningún ack tardío vuelve a abrir el diálogo tras salir.
      this.cancelarEspera();
      this.espacio.set('exterior');
      this.conversacion.set('cerrada');
      this.edificioActivo.set(null);
    } else if (mensaje.tipo === 'interactuable.activado' && !this.libretaAbierta() && !this.recuperando()) {
      if (datos['categoria'] === 'puerta') {
        const destino = INTERIORES_NARRATIVOS_UNREAL.find(e => e.puertaId === datos['interactuableId']);
        if (destino) await this.abrirPuerta(destino);
      } else if (datos['categoria'] === 'npc') {
        const npc = interior?.npcs.find(n => n.espacialId === datos['interactuableId']);
        if (npc) await this.abrirConversacion(npc);
      }
    }
  }

  avanzarDialogo(): void {
    if (!this.puedeDialogar()) return;
    this.narrativaActual.avanzarDialogo(this.edificioActivo()!.edificioId);
    this.refrescar();
  }

  elegir(decisionId: string): void {
    if (!this.puedeDialogar() || !this.vista()?.decisiones.some(d => d.id === decisionId)) return;
    this.narrativaActual.elegirOpcion(this.edificioActivo()!.edificioId, decisionId);
    this.refrescar(); // El coordinador real registra la pista mediante su adaptador.
  }

  completarTransicion(): void {
    if (!this.puedeDialogar()) return;
    this.narrativaActual.completarTransicion(this.edificioActivo()!.edificioId);
    this.refrescar();
  }

  async cerrarConversacion(): Promise<void> {
    if (!this.puente || !this.enInterior() || !this.modal() || this.libretaAbierta() || ['abriendo', 'cerrando'].includes(this.conversacion())) return;
    const puente = this.puente, revision = this.revision;
    const npc = this.npcActivo();
    const vigente = () => this.puente === puente && this.revision === revision;
    this.conversacion.set('cerrando');
    this.guardar();
    // Un fallo decorativo no debe impedir liberar el bloqueo de movimiento.
    let falloVisual = false;
    try { await puente.enviar('npc.reproducirAnimacion', { npcId: npc.espacialId, animacion: 'idle' }); }
    catch { falloVisual = true; }
    if (!vigente()) return;
    if (this.vista()?.terminado) {
      try { await puente.enviar('interactuable.estado', { interactuableId: npc.espacialId, estado: 'completado' }); }
      catch { falloVisual = true; }
      if (!vigente()) return;
    }
    try {
      await puente.enviar('camara.liberar', {});
      if (!vigente()) return;
      this.conversacion.set('cerrada');
      this.error.set(falloVisual ? 'La conversación se cerró y el progreso se conserva. El estado visual del personaje no fue confirmado.' : null);
    } catch {
      if (!vigente()) return;
      this.conversacion.set('error');
      this.error.set('El mundo no confirmó el cierre. Tu progreso se conserva; puedes volver a intentar cerrar.');
    }
  }

  private async abrirPuerta(interior: InteriorNarrativoUnreal): Promise<void> {
    if (!this.puente || this.espacio() !== 'exterior' || this.ocupado()) return;
    const puente = this.puente, revision = this.revision;
    this.edificioActivo.set(interior);
    this.npcActivo.set(interior.npcs[0]);
    this.vista.set(null);
    this.espacio.set('entrando');
    this.error.set(null);
    this.esperaEntrada = setTimeout(() => {
      if (this.puente === puente && this.revision === revision && this.espacio() === 'entrando') {
        this.error.set(`El mundo todavía no confirmó la entrada a ${interior.nombre}. Reconecta para comprobar su estado.`);
      }
    }, 8000);
    try {
      await puente.enviar('puerta.abrir', { zoneId: interior.zonaId });
    } catch (e) {
      if (this.puente !== puente || this.revision !== revision || this.enInterior()) return;
      this.cancelarEspera();
      this.espacio.set('exterior');
      this.edificioActivo.set(null);
      // CB-04: Unreal rechaza la puerta de un edificio que el caso no habilita. No es un fallo que se pueda reintentar.
      this.error.set(e instanceof ErrorOrden && e.codigo === 'EDIFICIO_RESTRINGIDO'
        ? `${TEXTO_RESTRINGIDO}: ${interior.nombre} no está disponible en este caso.`
        : `No se confirmó la apertura de ${interior.nombre}. Puedes volver a interactuar con la puerta.`);
    }
  }

  private async abrirConversacion(npc: NpcInteriorUnreal): Promise<void> {
    const interior = this.edificioActivo();
    if (!this.puente || !this.enInterior() || this.modal() || !interior || !interior.npcs.includes(npc)) return;
    const puente = this.puente, revision = this.revision;
    const vigente = () => this.puente === puente && this.revision === revision;
    const delCaso = this.guionesCaso?.get(npc.espacialId);
    if (this.guionesCaso && !delCaso) {
      this.error.set('Este personaje no participa en el caso.');
      return;
    }
    this.npcActivo.set(delCaso ? { ...npc, nombre: delCaso.personajes[0]?.nombre ?? npc.nombre } : npc);
    this.vista.set(null); // No mostrar el diálogo del otro NPC mientras se confirma el enfoque.
    this.conversacion.set('abriendo');
    this.error.set(null);
    try {
      await puente.enviar('camara.enfocar', { objetivoId: npc.espacialId, modo: 'conversacion' });
      if (!vigente()) return;
      await puente.enviar('npc.reproducirAnimacion', { npcId: npc.espacialId, animacion: 'hablar' });
      if (!vigente()) return;
      this.narrativaActual.iniciarOReanudar(interior.edificioId, this.guionesPara(npc.espacialId, interior.edificioId));
      this.refrescar();
      this.conversacion.set('abierta');
    } catch {
      if (!vigente()) return;
      this.conversacion.set('error');
      this.error.set('No se confirmó la conversación. Cierra este panel para volver a intentarlo.');
    }
  }

  private refrescar(): void {
    const interior = this.edificioActivo();
    const motor = interior && this.narrativaActual.obtenerMotor(interior.edificioId);
    if (motor) {
      this.vista.set({ estado: motor.estado, dialogo: motor.dialogoActual, decisiones: motor.decisionesDisponibles, terminado: motor.terminado });
      const npcId = this.npcActivo().espacialId;
      const estado: ProgresoInteriorUnreal['npcs'][number]['estado'] = motor.terminado ? 'completado' : 'en_curso';
      this.recorrido.update(actual => actual.map(e => e.edificioId === interior!.edificioId ? {
        ...e, npcs: e.npcs.map(n => n.espacialId === npcId ? { ...n, estado } : n),
      } : e));
    }
  }

  private get narrativaActual(): CoordinadorNarrativoInteriores {
    return this.npcActivo().espacialId === NPCS_HOSPITAL_UNREAL.paciente.espacialId ? this.narrativaPaciente : this.narrativa;
  }
  private guardar(): void {
    for (const interior of INTERIORES_NARRATIVOS_UNREAL)
      this.narrativa.pausarYGuardar(interior.edificioId, this.guionesPara(interior.npcs[0].espacialId, interior.edificioId));
    this.narrativaPaciente.pausarYGuardar(HOSPITAL_UNREAL.edificioId,
      this.guionesPara(NPCS_HOSPITAL_UNREAL.paciente.espacialId, HOSPITAL_UNREAL.edificioId));
  }

  /**
   * CB-05A: guiones del caso persistido en M3, por NPC espacial. En la vista previa docente sustituyen a los guiones
   * de demostración; un NPC sin guion en el caso no conversa. `null` vuelve al comportamiento anterior.
   */
  usarGuionesDelCaso(guiones: ReadonlyMap<string, GuionNarrativo> | null): void {
    this.guionesCaso = guiones;
    this.nombresCaso.set(guiones
      ? new Map([...guiones].map(([npcId, g]) => [npcId, g.personajes[0]?.nombre ?? npcId] as const))
      : null);
  }
  private guionesCaso: ReadonlyMap<string, GuionNarrativo> | null = null;
  private guionesPara(npcId: string, edificioId: string): Readonly<Record<string, GuionNarrativo>> {
    if (this.guionesCaso) {
      const guion = this.guionesCaso.get(npcId);
      return guion ? { [edificioId]: guion } : {};
    }
    return npcId === NPCS_HOSPITAL_UNREAL.paciente.espacialId ? this.guionesPaciente : GUIONES_POR_EDIFICIO;
  }
  private cancelarEspera(): void {
    if (this.esperaEntrada) clearTimeout(this.esperaEntrada);
    this.esperaEntrada = null;
  }
}
