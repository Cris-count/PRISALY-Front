import { Injectable, Injector, computed, inject, runInInjectionContext, signal } from '@angular/core';
import { GUIONES_POR_EDIFICIO } from '../demo/guiones-edificios-demo';
import { GUION_PACIENTE_HOSPITAL_DEMO } from '../demo/guion-paciente-hospital-demo';
import { LibretaStore } from '../investigacion/libreta.store';
import { MotorNarrativo } from '../narrativa/motor-narrativo';
import { CoordinadorNarrativoInteriores } from '../services/coordinador-narrativo-interiores';
import { SesionVisualUnreal } from './configuracion-unreal';
import { Mensaje } from './protocolo/validador-mensaje';
import { PuenteUnreal } from './puente/puente-unreal';

export const HOSPITAL_UNREAL = {
  edificioId: 'hospital-prueba', zonaId: 'hospital_entrada', puertaId: 'hosp-puerta', npcId: 'hosp-npc-doctor',
} as const;

/** Correspondencia provisional compartida con el responsable del mundo 3D. */
export const NPCS_HOSPITAL_UNREAL = {
  doctor: { espacialId: HOSPITAL_UNREAL.npcId, personajeId: 'doctor', nombre: 'Dr. Mendoza', guionId: 'guion-hospital-demo' },
  paciente: { espacialId: 'hosp-npc-paciente-01', personajeId: 'paciente-01', nombre: 'Paciente (demostración)', guionId: GUION_PACIENTE_HOSPITAL_DEMO.id },
} as const;
type NpcHospital = typeof NPCS_HOSPITAL_UNREAL[keyof typeof NPCS_HOSPITAL_UNREAL];

export interface VistaHospital {
  readonly estado: MotorNarrativo['estado'];
  readonly dialogo: MotorNarrativo['dialogoActual'];
  readonly decisiones: MotorNarrativo['decisionesDisponibles'];
  readonly terminado: boolean;
}

/** Narrativa demostrativa por sesión. Solo consume mensajes existentes del catálogo v1. */
@Injectable()
export class HospitalUnreal {
  private readonly narrativa = inject(CoordinadorNarrativoInteriores);
  // Progreso independiente por NPC, con el mismo edificio, adaptador de pistas y libreta.
  // No se crean identificadores de edificios ficticios para separar las conversaciones.
  private readonly narrativaPaciente = runInInjectionContext(inject(Injector), () => new CoordinadorNarrativoInteriores());
  private readonly guionesPaciente = { [HOSPITAL_UNREAL.edificioId]: GUION_PACIENTE_HOSPITAL_DEMO };
  private readonly libreta = inject(LibretaStore);
  readonly npcActivo = signal<NpcHospital>(NPCS_HOSPITAL_UNREAL.doctor);
  readonly espacio = signal<'exterior' | 'entrando' | 'interior'>('exterior');
  readonly conversacion = signal<'cerrada' | 'abriendo' | 'abierta' | 'cerrando' | 'error'>('cerrada');
  readonly vista = signal<VistaHospital | null>(null);
  readonly error = signal<string | null>(null);
  readonly enInterior = computed(() => this.espacio() === 'interior');
  readonly modal = computed(() => this.conversacion() !== 'cerrada');
  readonly ocupado = computed(() => this.espacio() === 'entrando' || this.modal());
  readonly puedeDialogar = computed(() => this.enInterior() && this.conversacion() === 'abierta');
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
    }
    this.contexto = contexto;
    this.sesion = sesion.sesion;
    this.puente = puente;
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
  }

  async procesar(mensaje: Mensaje): Promise<void> {
    if (!this.puente || this.puente.bloqueado || mensaje.sesion !== this.sesion || mensaje.origen !== 'unreal') return;
    const datos = mensaje.datos;
    if (mensaje.tipo === 'edificio.entro' && datos['zoneId'] === HOSPITAL_UNREAL.zonaId) {
      // El ack de puerta.abrir no acredita por sí solo que la sala esté lista.
      if (this.espacio() === 'entrando') {
        this.cancelarEspera();
        this.espacio.set('interior');
        this.error.set(null);
      }
    } else if (mensaje.tipo === 'edificio.salio' && datos['zoneId'] === HOSPITAL_UNREAL.zonaId) {
      if (this.espacio() === 'exterior') return;
      this.guardar();
      ++this.revision; // Ningún ack tardío vuelve a abrir el diálogo tras salir.
      this.cancelarEspera();
      this.espacio.set('exterior');
      this.conversacion.set('cerrada');
    } else if (mensaje.tipo === 'interactuable.activado') {
      if (datos['interactuableId'] === HOSPITAL_UNREAL.puertaId && datos['categoria'] === 'puerta') await this.abrirPuerta();
      else if (datos['categoria'] === 'npc') {
        const npc = Object.values(NPCS_HOSPITAL_UNREAL).find(n => n.espacialId === datos['interactuableId']);
        if (npc) await this.abrirConversacion(npc);
      }
    }
  }

  avanzarDialogo(): void {
    if (!this.puedeDialogar()) return;
    this.narrativaActual.avanzarDialogo(HOSPITAL_UNREAL.edificioId);
    this.refrescar();
  }

  elegir(decisionId: string): void {
    if (!this.puedeDialogar() || !this.vista()?.decisiones.some(d => d.id === decisionId)) return;
    this.narrativaActual.elegirOpcion(HOSPITAL_UNREAL.edificioId, decisionId);
    this.refrescar(); // El coordinador real registra la pista mediante su adaptador.
  }

  completarTransicion(): void {
    if (!this.puedeDialogar()) return;
    this.narrativaActual.completarTransicion(HOSPITAL_UNREAL.edificioId);
    this.refrescar();
  }

  async cerrarConversacion(): Promise<void> {
    if (!this.puente || !this.enInterior() || !this.modal() || ['abriendo', 'cerrando'].includes(this.conversacion())) return;
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

  private async abrirPuerta(): Promise<void> {
    if (!this.puente || this.espacio() !== 'exterior') return;
    const puente = this.puente, revision = this.revision;
    this.espacio.set('entrando');
    this.error.set(null);
    this.esperaEntrada = setTimeout(() => {
      if (this.puente === puente && this.revision === revision && this.espacio() === 'entrando') {
        this.error.set('El mundo todavía no confirmó la entrada al Hospital. Reconecta para comprobar su estado.');
      }
    }, 8000);
    try {
      await puente.enviar('puerta.abrir', { zoneId: HOSPITAL_UNREAL.zonaId });
    } catch {
      if (this.puente !== puente || this.revision !== revision || this.enInterior()) return;
      this.cancelarEspera();
      this.espacio.set('exterior');
      this.error.set('No se confirmó la apertura del Hospital. Puedes volver a interactuar con la puerta.');
    }
  }

  private async abrirConversacion(npc: NpcHospital): Promise<void> {
    if (!this.puente || !this.enInterior() || this.modal()) return;
    const puente = this.puente, revision = this.revision;
    const vigente = () => this.puente === puente && this.revision === revision;
    this.npcActivo.set(npc);
    this.vista.set(null); // No mostrar el diálogo del otro NPC mientras se confirma el enfoque.
    this.conversacion.set('abriendo');
    this.error.set(null);
    try {
      await puente.enviar('camara.enfocar', { objetivoId: npc.espacialId, modo: 'conversacion' });
      if (!vigente()) return;
      await puente.enviar('npc.reproducirAnimacion', { npcId: npc.espacialId, animacion: 'hablar' });
      if (!vigente()) return;
      this.narrativaActual.iniciarOReanudar(HOSPITAL_UNREAL.edificioId,
        npc.espacialId === NPCS_HOSPITAL_UNREAL.paciente.espacialId ? this.guionesPaciente : GUIONES_POR_EDIFICIO);
      this.refrescar();
      this.conversacion.set('abierta');
    } catch {
      if (!vigente()) return;
      this.conversacion.set('error');
      this.error.set('No se confirmó la conversación. Cierra este panel para volver a intentarlo.');
    }
  }

  private refrescar(): void {
    const motor = this.narrativaActual.obtenerMotor(HOSPITAL_UNREAL.edificioId);
    if (motor) this.vista.set({ estado: motor.estado, dialogo: motor.dialogoActual, decisiones: motor.decisionesDisponibles, terminado: motor.terminado });
  }

  private get narrativaActual(): CoordinadorNarrativoInteriores {
    return this.npcActivo().espacialId === NPCS_HOSPITAL_UNREAL.paciente.espacialId ? this.narrativaPaciente : this.narrativa;
  }
  private guardar(): void {
    this.narrativa.pausarYGuardar(HOSPITAL_UNREAL.edificioId);
    this.narrativaPaciente.pausarYGuardar(HOSPITAL_UNREAL.edificioId, this.guionesPaciente);
  }
  private cancelarEspera(): void {
    if (this.esperaEntrada) clearTimeout(this.esperaEntrada);
    this.esperaEntrada = null;
  }
}
