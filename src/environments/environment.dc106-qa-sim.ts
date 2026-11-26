import { environment as qa } from './environment.dc106-qa';
import type { ConfiguracionVisorUnreal } from '../app/features/simulador/unreal/configuracion-unreal';
/** QA optativo: MUNDO-24 no entregado. No reutiliza la asignación PS2-LAB-03. */
export const environment = {
  ...qa,
  simuladorUnrealLocal: true,
  accesoRapidoQa: false,
  simuladorUnreal: {
    origenVisor: 'http://localhost:4200',
    asignacion: null,
  } as ConfiguracionVisorUnreal,
};
