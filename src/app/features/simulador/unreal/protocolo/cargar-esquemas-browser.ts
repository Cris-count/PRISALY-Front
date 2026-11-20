import { InjectionToken } from '@angular/core';
import { crearEsquemas, type Catalogo, type Esquemas } from './validador-mensaje';
import type { Esquema } from './validador-esquema';

export const CARGAR_ESQUEMAS_UNREAL = new InjectionToken<typeof cargarEsquemasBrowser>(
  'CARGAR_ESQUEMAS_UNREAL', { providedIn: 'root', factory: () => cargarEsquemasBrowser },
);

export async function cargarEsquemasBrowser(signal?: AbortSignal): Promise<Esquemas> {
  const base = new URL('simulador-unreal/protocolo/v1/', document.baseURI);
  const cargar = async (archivo: string) => {
    const respuesta = await fetch(new URL(archivo, base), { signal, credentials: 'same-origin' });
    if (!respuesta.ok) throw new Error('No se pudo cargar el contrato visual de Unreal.');
    return respuesta.json();
  };
  const [catalogo, sobre] = await Promise.all([cargar('catalogo.json'), cargar('sobre.schema.json')]);
  const archivos = await Promise.all(Object.values((catalogo as Catalogo).tipos).map(async (tipo) => {
    // El catálogo procede del build; aun así no se permiten rutas a otros orígenes.
    if (!/^tipos\/[a-zA-Z._]+\.schema\.json$/.test(tipo.esquema)) throw new Error('Ruta de esquema no válida.');
    return [tipo.esquema, await cargar(tipo.esquema)] as [string, Esquema];
  }));
  return crearEsquemas(catalogo, sobre, Object.fromEntries(archivos));
}
