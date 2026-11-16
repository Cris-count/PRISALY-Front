import { MUNDO_PRUEBA } from './mundo-tecnico.fixture';
import { iniciarMundoPhaser } from './phaser-mundo';
import { EventoMundo } from './mundo-tecnico.models';
import { aPantalla } from './proyeccion-tecnica';

describe('Ciclo de vida de Phaser', () => {
  it('pausa dos veces una ruta real, descarta clics y comandos, y reanuda el destino original', async () => {
    const contenedor = document.createElement('div'); contenedor.style.width = '600px'; contenedor.style.height = '360px'; document.body.appendChild(contenedor);
    let avisar!: () => void, avisarLlegada!: () => void;
    const listo = new Promise<void>(resolve => { avisar = resolve; });
    const llegada = new Promise<void>(resolve => { avisarLlegada = resolve; });
    const eventos: EventoMundo[] = [];
    const control = iniciarMundoPhaser(contenedor, MUNDO_PRUEBA, e => { eventos.push(e); if (e.tipo === 'listo') avisar(); if (e.tipo === 'llegada' && e.entradaId === 'hospital-prueba') avisarLlegada(); });
    const esperar = () => new Promise<void>(resolve => setTimeout(resolve, 150));
    try {
      await listo;
      const canvas = contenedor.querySelector('canvas')!;
      control.irA('entrada'); await esperar();
      for (let i = 0; i < 2; i++) {
        control.suspenderInteraccion(true); control.suspenderInteraccion(true);
        const estado = control.consultarEstado(), numeroEventos = eventos.length;
        expect(estado.interaccion).toBe('suspendida');
        control.irA('fiscalia-entrada'); control.direccion({ x: 0, y: -1 });
        const rect = canvas.getBoundingClientRect(), clic = aPantalla({ x: 260, y: 200 });
        const opciones = { bubbles: true, clientX: rect.x + clic.x * rect.width / 900, clientY: rect.y + clic.y * rect.height / 540, buttons: 1 };
        canvas.dispatchEvent(new MouseEvent('mousedown', opciones)); canvas.dispatchEvent(new MouseEvent('mouseup', { ...opciones, buttons: 0 }));
        await esperar();
        expect(control.consultarEstado()).toEqual(estado);
        expect(eventos.length).toBe(numeroEventos);
        control.suspenderInteraccion(false); control.suspenderInteraccion(false);
        await esperar();
        expect(control.consultarEstado().posicion).not.toEqual(estado.posicion);
        expect(control.consultarEstado().destino).toEqual({ x: 795, y: 300 });
        expect(contenedor.querySelector('canvas')).toBe(canvas);
      }
      await llegada;
      expect(eventos.at(-1)).toEqual({ tipo: 'llegada', posicion: { x: 795, y: 300 }, entradaId: 'hospital-prueba' });
      expect(contenedor.querySelectorAll('canvas').length).toBe(1);
    } finally { control.destruir(); contenedor.remove(); }
  }, 15000);
  it('reemplaza un destino durante el recorrido y llega a la nueva entrada', async () => {
    const contenedor = document.createElement('div');
    contenedor.style.width = '600px'; contenedor.style.height = '360px';
    document.body.appendChild(contenedor);
    let resolver!: () => void;
    const llegada = new Promise<void>(resolve => { resolver = resolve; });
    let control: ReturnType<typeof iniciarMundoPhaser>;
    try {
      control = iniciarMundoPhaser(contenedor, MUNDO_PRUEBA, evento => {
        if (evento.tipo === 'listo') {
          control.irA('entrada');
          setTimeout(() => control.irA('fiscalia-entrada'), 100);
        }
        if (evento.tipo === 'llegada' && evento.entradaId === 'fiscalia-prueba') resolver();
      });
      await llegada;
      expect(contenedor.querySelectorAll('canvas').length).toBe(1);
    } finally {
      control!.destruir(); contenedor.remove();
    }
  }, 10000);
  it('destruye la escena antes de crear otra en el mismo contenedor', async () => {
    const contenedor = document.createElement('div');
    contenedor.style.width = '600px';
    contenedor.style.height = '360px';
    document.body.appendChild(contenedor);

    const iniciar = () => {
      let avisarListo!: () => void;
      const listo = new Promise<void>((resolve) => { avisarListo = resolve; });
      const control = iniciarMundoPhaser(contenedor, MUNDO_PRUEBA, (evento) => {
        if (evento.tipo === 'listo') avisarListo();
      });
      return { control, listo };
    };

    let actual: ReturnType<typeof iniciar> | undefined;
    try {
      actual = iniciar();
      await actual.listo;
      expect(contenedor.querySelectorAll('canvas').length).toBe(1);
      actual.control.destruir();
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      expect(contenedor.querySelectorAll('canvas').length).toBe(0);

      actual = iniciar();
      await actual.listo;
      expect(contenedor.querySelectorAll('canvas').length).toBe(1);
      actual.control.destruir();
      actual = undefined;
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      expect(contenedor.querySelectorAll('canvas').length).toBe(0);
    } finally {
      actual?.control.destruir();
      contenedor.remove();
    }
  }, 10000);
});
