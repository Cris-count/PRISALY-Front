import Phaser from 'phaser';
import { InstanciaVisual, paqueteCargado } from './adaptador-visual';
import { PaqueteVisual, RecursoVisual, validarPaqueteVisual } from './contrato-visual';
import { MUNDO_PRUEBA } from './mundo-tecnico.fixture';

/** Datos sintéticos exclusivos de tests, NO especificación de recursos de Cristian. */
function paqueteSintetico(): PaqueteVisual {
  const recurso = (tipo: RecursoVisual['tipo']): RecursoVisual => ({
    id: `test-${tipo}`, version: 1, tipo, escala: .5, alturaLogica: 48,
    orientaciones: ['sur', 'norte', 'este', 'oeste'],
    colision: tipo === 'personaje' ? { tipo: 'circulo', radio: 12 } : tipo === 'hospital' ? { tipo: 'rectangulo', huella: { x: -55, y: -105, ancho: 110, alto: 105 } } : { tipo: 'decorativo' },
    entrada: tipo === 'hospital' ? { x: -5, y: 45 } : undefined,
    capas: [{ id: 'cuerpo', ruta: `/images/test-${tipo}.png`, dimensiones: { ancho: 64, alto: 64 }, apoyoPx: { x: 32, y: 64 }, plano: 'volumen', desplazamientoApoyoY: 0, hoja: tipo === 'personaje' ? { columnas: 2, filas: 1 } : undefined }],
    animaciones: tipo !== 'personaje' ? [] : (['sur', 'norte', 'este', 'oeste'] as const).flatMap(orientacion => [
      { estado: 'reposo' as const, orientacion, fotogramas: [0], fps: 4 },
      { estado: 'caminar' as const, orientacion, fotogramas: [0, 1], fps: 8 },
    ]),
  });
  return { id: 'test', version: 1, perspectiva: { elevacion: 40, giro: 0, escalaSueloY: Math.sin(40 * Math.PI / 180) }, hospital: { edificioId: 'hospital-prueba', recurso: recurso('hospital') }, personaje: recurso('personaje'), arbol: { apoyo: { x: 270, y: 250 }, recurso: recurso('arbol') } };
}

describe('contrato de recursos visuales', () => {
  it('admite dimensiones gráficas distintas sin cambiar la huella lógica', () => {
    const p = paqueteSintetico();
    const antes = JSON.stringify(MUNDO_PRUEBA);
    validarPaqueteVisual(p, MUNDO_PRUEBA);
    validarPaqueteVisual({ ...p, hospital: { ...p.hospital, recurso: { ...p.hospital.recurso, escala: 2, capas: p.hospital.recurso.capas.map(c => ({ ...c, dimensiones: { ancho: 2048, alto: 2048 } })) } } }, MUNDO_PRUEBA);
    expect(JSON.stringify(MUNDO_PRUEBA)).toBe(antes);
  });
  it('rechaza perspectiva, huella y entrada incompatibles', () => {
    const p = paqueteSintetico();
    expect(() => validarPaqueteVisual({ ...p, perspectiva: { ...p.perspectiva, escalaSueloY: 1 } }, MUNDO_PRUEBA)).toThrowError(/perspectiva/);
    expect(() => validarPaqueteVisual({ ...p, hospital: { ...p.hospital, recurso: { ...p.hospital.recurso, entrada: { x: 0, y: 0 } } } }, MUNDO_PRUEBA)).toThrowError(/entrada/);
    expect(() => validarPaqueteVisual({ ...p, hospital: { ...p.hospital, recurso: { ...p.hospital.recurso, colision: { tipo: 'decorativo' } } } }, MUNDO_PRUEBA)).toThrowError(/huella/);
  });
  it('rechaza fotogramas inexistentes y anclajes fuera del lienzo', () => {
    const p = paqueteSintetico();
    expect(() => validarPaqueteVisual({ ...p, personaje: { ...p.personaje, animaciones: [] } }, MUNDO_PRUEBA)).toThrowError(/animación/);
    expect(() => validarPaqueteVisual({ ...p, personaje: { ...p.personaje, animaciones: p.personaje.animaciones.map(a => ({ ...a, fotogramas: [9] })) } }, MUNDO_PRUEBA)).toThrowError(/fotograma/);
    expect(() => validarPaqueteVisual({ ...p, personaje: { ...p.personaje, capas: p.personaje.capas.map(c => ({ ...c, apoyoPx: { x: 90, y: 90 } })) } }, MUNDO_PRUEBA)).toThrowError(/anclaje/);
  });
  it('exige un obstáculo explícito antes de convertir el árbol en bloqueante', () => {
    const p = paqueteSintetico();
    expect(() => validarPaqueteVisual({ ...p, arbol: { ...p.arbol, recurso: { ...p.arbol.recurso, colision: { tipo: 'rectangulo', huella: { x: -5, y: -5, ancho: 10, alto: 10 } } } } }, MUNDO_PRUEBA)).toThrowError(/tronco/);
  });
  it('activa sprites, animaciones y profundidad con texturas sintéticas y detecta un recurso ausente', async () => {
    const p = paqueteSintetico();
    const contenedor = document.createElement('div'); document.body.appendChild(contenedor);
    let juego: Phaser.Game | undefined;
    try {
      await new Promise<void>((resolve, reject) => {
        class Escena extends Phaser.Scene {
          create(): void {
            try {
              for (const r of [p.personaje, p.hospital.recurso, p.arbol.recurso]) for (const c of r.capas) {
                const canvas = document.createElement('canvas');
                canvas.width = c.dimensiones.ancho * (c.hoja?.columnas ?? 1); canvas.height = c.dimensiones.alto;
                const key = `visual:${r.id}:v${r.version}:${c.id}`;
                const t = this.textures.addCanvas(key, canvas)!;
                if (c.hoja) this.textures.addSpriteSheet(key, t, { frameWidth: 64, frameHeight: 64 });
              }
              expect(paqueteCargado(this, p)).toBeTrue();
              const persona = new InstanciaVisual(this, p.personaje, { x: 260, y: 230 });
              const arbol = new InstanciaVisual(this, p.arbol.recurso, p.arbol.apoyo);
              const hospital = new InstanciaVisual(this, p.hospital.recurso, { x: 800, y: 255 });
              expect(persona.objeto.depth).toBeLessThan(arbol.objeto.depth);
              expect(persona.objeto.depth).toBeLessThan(hospital.objeto.depth);
              persona.actualizar({ x: 260, y: 270 }, { x: 0, y: 40 });
              expect(persona.objeto.depth).toBeGreaterThan(arbol.objeto.depth);
              expect(persona.objeto.depth).toBeGreaterThan(hospital.objeto.depth);
              expect(persona.objeto.anims.currentAnim?.key).toContain('caminar:sur');
              persona.actualizar({ x: 260, y: 270 }, { x: 0, y: 0 });
              expect(persona.objeto.anims.currentAnim?.key).toContain('reposo:sur');
              expect(persona.objeto.originY).toBe(1);
              expect(persona.objeto.scaleX).toBe(persona.objeto.scaleY);
              const distintaDimension = { ...p, hospital: { ...p.hospital, recurso: { ...p.hospital.recurso, capas: p.hospital.recurso.capas.map(c => ({ ...c, dimensiones: { ancho: 128, alto: 64 } })) } } };
              expect(paqueteCargado(this, distintaDimension)).toBeFalse();
              this.textures.remove('visual:test-hospital:v1:cuerpo');
              expect(paqueteCargado(this, p)).toBeFalse();
              resolve();
            } catch (error) { reject(error); }
          }
        }
        juego = new Phaser.Game({ type: Phaser.CANVAS, parent: contenedor, width: 100, height: 100, audio: { noAudio: true }, scene: Escena });
      });
    } finally { juego?.destroy(true); contenedor.remove(); }
  });
});
