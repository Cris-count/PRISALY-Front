import { EntradaAvisoInteraccion, TEXTO_RESTRINGIDO, avisoConexion, avisoInteraccion } from './aviso-interaccion';

describe('G4-V11 / FE-UX-09 · avisos de interacción de MUNDO-24', () => {
  const base: EntradaAvisoInteraccion = {
    conectado: true, recuperando: false, libretaAbierta: false, espacio: 'exterior', conversacion: 'cerrada',
    interior: null, disponible: null,
    puerta: (id) => id === 'hosp-puerta' ? { nombre: 'Hospital Central', habilitado: true }
      : id === 'fis-puerta' ? { nombre: 'Fiscalía de Turno', habilitado: false } : null,
    personaje: (id) => id === 'fis-npc-fiscal' ? { nombre: 'Dra. Valenzuela', completado: false }
      : id === 'hosp-npc-doctor' ? { nombre: 'Dr. Mendoza', completado: true } : null,
  };

  it('sin interactuable disponible no muestra aviso', () => {
    expect(avisoInteraccion(base)).toBeNull();
  });

  it('cerca de una entrada habilitada indica E · Entrar', () => {
    expect(avisoInteraccion({ ...base, disponible: { id: 'hosp-puerta', categoria: 'puerta' } }))
      .toEqual({ tipo: 'accion', tecla: 'E', texto: 'Entrar a Hospital Central' });
  });

  it('una entrada que el caso no habilita no promete la tecla E', () => {
    expect(avisoInteraccion({ ...base, disponible: { id: 'fis-puerta', categoria: 'puerta' } }))
      .toEqual({ tipo: 'restriccion', texto: TEXTO_RESTRINGIDO });
  });

  it('cerca de un personaje del interior indica E · Conversar, o volver a conversar si ya terminó', () => {
    const interior = { ...base, espacio: 'interior' as const, interior: 'Fiscalía de Turno' };
    expect(avisoInteraccion({ ...interior, disponible: { id: 'fis-npc-fiscal', categoria: 'npc' } }))
      .toEqual({ tipo: 'accion', tecla: 'E', texto: 'Conversar con Dra. Valenzuela' });
    expect(avisoInteraccion({ ...interior, disponible: { id: 'hosp-npc-doctor', categoria: 'npc' } }))
      .toEqual({ tipo: 'accion', tecla: 'E', texto: 'Volver a conversar con Dr. Mendoza' });
  });

  it('un personaje sin guion en el caso, una puerta desde el interior o el punto de la plaza no generan aviso', () => {
    expect(avisoInteraccion({ ...base, espacio: 'interior', disponible: { id: 'pol-npc-oficial', categoria: 'npc' } })).toBeNull();
    expect(avisoInteraccion({ ...base, espacio: 'interior', disponible: { id: 'hosp-puerta', categoria: 'puerta' } })).toBeNull();
    expect(avisoInteraccion({ ...base, disponible: { id: 'plaza-punto', categoria: 'cierre' } })).toBeNull();
  });

  it('durante la entrada y la conversación orienta sin tecla; con la libreta, la recuperación o sin conexión se oculta', () => {
    expect(avisoInteraccion({ ...base, espacio: 'entrando', interior: 'Hospital Central' }))
      .toEqual({ tipo: 'informacion', texto: 'Entrando a Hospital Central…' });
    expect(avisoInteraccion({ ...base, espacio: 'interior', conversacion: 'abierta', disponible: { id: 'fis-npc-fiscal', categoria: 'npc' } }))
      .toEqual({ tipo: 'informacion', texto: 'Continúa el diálogo en el panel de conversación' });
    const cerca = { ...base, disponible: { id: 'hosp-puerta', categoria: 'puerta' as const } };
    expect(avisoInteraccion({ ...cerca, libretaAbierta: true })).toBeNull();
    expect(avisoInteraccion({ ...cerca, recuperando: true })).toBeNull();
    expect(avisoInteraccion({ ...cerca, conectado: false })).toBeNull();
    expect(avisoInteraccion({ ...cerca, conversacion: 'abriendo' })).toBeNull();
  });

  it('estado de la conexión: inicio, conexión, reconexión, fallo y nada con la ciudad conectada', () => {
    const c = { conectado: false, conectando: false, reconectando: false, fallo: false };
    expect(avisoConexion(c)?.tipo).toBe('inicio');
    expect(avisoConexion({ ...c, conectando: true })?.texto).toBe('Conectando con la ciudad 3D…');
    expect(avisoConexion({ ...c, conectando: true, reconectando: true })?.texto).toBe('Reconectando con la ciudad 3D…');
    expect(avisoConexion({ ...c, fallo: true })).toEqual({ tipo: 'problema', texto: 'No fue posible establecer la conexión con la ciudad 3D' });
    expect(avisoConexion({ ...c, reconectando: true })?.tipo).toBe('problema');
    expect(avisoConexion({ ...c, conectado: true })).toBeNull();
  });
});
