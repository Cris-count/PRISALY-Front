/** Registro de evidencia: una linea por mensaje, con ids de correlacion (criterio CA-06). */
export interface EntradaRegistro {
  ts: number;
  actor: 'angular' | 'unreal-simulado';
  direccion: 'salida' | 'entrada';
  tipo: string | null;
  id: string | null;
  correlacion: string | null;
  sesion: string | null;
  resultado: string; // ENVIADO, ACEPTADO, DESCARTADO:<codigo>, ACK, ERROR:<codigo>, IGNORADO:<motivo>
}

export class Registro {
  readonly entradas: EntradaRegistro[] = [];
  agregar(e: EntradaRegistro): void {
    this.entradas.push(e);
    if (this.entradas.length > 250) this.entradas.shift();
  }
  comoJsonl(): string { return this.entradas.map((e) => JSON.stringify(e)).join('\n') + '\n'; }
}
