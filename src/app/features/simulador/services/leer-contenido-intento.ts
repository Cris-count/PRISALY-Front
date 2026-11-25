import { ContenidoIntentoM5 } from '../models/contenido-intento.models';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function exigir(condicion: boolean): void {
  if (!condicion) throw new Error('Contenido de intento no interpretable.');
}
function objeto(valor: unknown): Record<string, unknown> {
  exigir(!!valor && typeof valor === 'object' && !Array.isArray(valor));
  return valor as Record<string, unknown>;
}
function cadena(valor: unknown): string {
  exigir(typeof valor === 'string');
  return valor as string;
}
function nullable(valor: unknown): string | null {
  return valor === null ? null : cadena(valor);
}
function id(valor: unknown, usados?: Set<string>): string {
  const identificador = cadena(valor);
  exigir(UUID.test(identificador));
  if (usados) {
    exigir(!usados.has(identificador.toLowerCase()));
    usados.add(identificador.toLowerCase());
  }
  return identificador;
}
function orden(valor: unknown): number {
  exigir(
    Number.isInteger(valor) && (valor as number) >= -2147483648 && (valor as number) <= 2147483647,
  );
  return valor as number;
}

/** Conserva el orden del servidor; rechaza incoherencias, no inventa un recorrido. */
function lista<T extends { readonly orden: number }>(
  valor: unknown,
  leer: (valor: unknown) => T,
  identificador: (elemento: T) => string,
): readonly T[] {
  exigir(Array.isArray(valor));
  const elementos = (valor as unknown[]).map(leer);
  for (let i = 1; i < elementos.length; i++) {
    const a = elementos[i - 1];
    const b = elementos[i];
    exigir(
      a.orden < b.orden ||
        (a.orden === b.orden && identificador(a).toLowerCase() < identificador(b).toLowerCase()),
    );
  }
  return elementos;
}

/** Lista permitida: descarta campos adicionales, incluidos datos reservados. */
export function leerContenidoIntento(
  valor: unknown,
  intentoSolicitado: string,
): ContenidoIntentoM5 {
  const contenido = objeto(valor);
  const caso = objeto(contenido['caso']);
  const idIntento = id(contenido['idIntento']);
  exigir(idIntento.toLowerCase() === intentoSolicitado.toLowerCase());
  const escenarios = new Set<string>();
  const preguntas = new Set<string>();
  const opciones = new Set<string>();
  return {
    idIntento,
    idSesion: id(contenido['idSesion']),
    caso: {
      idCaso: id(caso['idCaso']),
      titulo: cadena(caso['titulo']),
      historia: nullable(caso['historia']),
      desarrolloSituacional: nullable(caso['desarrolloSituacional']),
      escenarios: lista(
        caso['escenarios'],
        (valorEscenario) => {
          const e = objeto(valorEscenario);
          return {
            idEscenario: id(e['idEscenario'], escenarios),
            titulo: nullable(e['titulo']),
            contexto: nullable(e['contexto']),
            instrucciones: nullable(e['instrucciones']),
            orden: orden(e['orden']),
            preguntas: lista(
              e['preguntas'],
              (valorPregunta) => {
                const p = objeto(valorPregunta);
                return {
                  idPregunta: id(p['idPregunta'], preguntas),
                  enunciado: cadena(p['enunciado']),
                  orden: orden(p['orden']),
                  opciones: lista(
                    p['opciones'],
                    (valorOpcion) => {
                      const o = objeto(valorOpcion);
                      return {
                        idOpcion: id(o['idOpcion'], opciones),
                        texto: cadena(o['texto']),
                        orden: orden(o['orden']),
                      };
                    },
                    (o) => o.idOpcion,
                  ),
                };
              },
              (p) => p.idPregunta,
            ),
          };
        },
        (e) => e.idEscenario,
      ),
    },
  };
}
