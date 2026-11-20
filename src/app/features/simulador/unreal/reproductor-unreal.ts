import { InjectionToken } from '@angular/core';
import { SesionVisualUnreal, validarSesionVisual } from './configuracion-unreal';
import { TransportePixelStreaming } from './transporte-pixel-streaming';

export interface ReproductorUnreal {
  readonly transporte: TransportePixelStreaming;
  conectar(): void;
  reproducir(): void;
  permitirEntrada(valor: boolean): void;
  cerrar(): void;
}

export type FabricaReproductorUnreal = (
  contenedor: HTMLElement, sesion: SesionVisualUnreal,
  informar: (estado: 'canal-abierto' | 'desconectado' | 'video-listo' | 'reproduccion-requerida') => void,
) => Promise<ReproductorUnreal>;

/** La biblioteca de streaming solo se descarga al conectar explícitamente este visor. */
export const FABRICA_REPRODUCTOR_UNREAL = new InjectionToken<FabricaReproductorUnreal>(
  'FABRICA_REPRODUCTOR_UNREAL', { providedIn: 'root', factory: () => crearReproductorUnreal },
);

export const crearReproductorUnreal: FabricaReproductorUnreal = async (contenedor, sesion, informar) => {
  validarSesionVisual(sesion);
  const { Config, PixelStreaming, Flags, TextParameters, OptionParameters, NumericParameters } =
    await import('@epicgames-ps/lib-pixelstreamingfrontend-ue5.8');
  const config = new Config({ useUrlParams: false, initialSettings: {
    [TextParameters.SignallingServerUrl]: sesion.urlSenalizacion,
    [OptionParameters.StreamerId]: sesion.streamerId,
    [Flags.AutoConnect]: false,
    [Flags.AutoPlayVideo]: true,
    [Flags.StartVideoMuted]: true,
    [Flags.WaitForStreamer]: false,
    [Flags.MatchViewportResolution]: false,
    [Flags.UseMic]: false,
    [Flags.UseCamera]: false,
    [Flags.KeyboardInput]: false,
    [Flags.MouseInput]: false,
    [Flags.TouchInput]: false,
    [Flags.GamepadInput]: false,
    [Flags.SuppressBrowserKeys]: false,
    [NumericParameters.MaxReconnectAttempts]: 0,
  } });
  const pixel = new PixelStreaming(config, { videoElementParent: contenedor });
  const transporte = new TransportePixelStreaming(pixel);
  const abrir = () => { transporte.abrir(); informar('canal-abierto'); };
  const cerrar = () => { transporte.notificarDesconexion(); informar('desconectado'); };
  const video = () => informar('video-listo');
  const reproduccion = () => informar('reproduccion-requerida');
  pixel.addEventListener('dataChannelOpen', abrir);
  pixel.addEventListener('dataChannelClose', cerrar);
  pixel.addEventListener('webRtcDisconnected', cerrar);
  pixel.addEventListener('webRtcFailed', cerrar);
  pixel.addEventListener('playStream', video);
  pixel.addEventListener('playStreamRejected', reproduccion);
  const permitirEntrada = (valor: boolean) => {
    for (const flag of [Flags.KeyboardInput, Flags.MouseInput, Flags.TouchInput]) config.setFlagEnabled(flag, valor);
  };
  return {
    transporte,
    conectar: () => pixel.connect(),
    reproducir: () => pixel.play(),
    permitirEntrada,
    cerrar: () => {
      permitirEntrada(false);
      pixel.removeEventListener('dataChannelOpen', abrir);
      pixel.removeEventListener('dataChannelClose', cerrar);
      pixel.removeEventListener('webRtcDisconnected', cerrar);
      pixel.removeEventListener('webRtcFailed', cerrar);
      pixel.removeEventListener('playStream', video);
      pixel.removeEventListener('playStreamRejected', reproduccion);
      transporte.cerrar();
      contenedor.replaceChildren();
    },
  };
};
