// Verifica que el código de la aplicación no contenga direcciones de backend
// codificadas. La URL de la API solo puede vivir en src/environments/.
// Uso: npm run check:urls   (sale con código 1 si encuentra alguna)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const directorio = join(raiz, 'src', 'app');
const patron = /(https?:\/\/|\blocalhost\b|127\.0\.0\.1|\b0\.0\.0\.0\b)/i;
const extensiones = ['.ts', '.html', '.css'];

function archivos(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

const hallazgos = archivos(directorio)
  .filter((ruta) => extensiones.some((ext) => ruta.endsWith(ext)) && !ruta.endsWith('.spec.ts'))
  .flatMap((ruta) =>
    readFileSync(ruta, 'utf8')
      .split(/\r?\n/)
      .map((linea, i) => ({ ruta, numero: i + 1, linea }))
      .filter(({ linea }) => patron.test(linea)),
  );

if (hallazgos.length > 0) {
  console.error('URLs de backend codificadas fuera de src/environments/:');
  for (const { ruta, numero, linea } of hallazgos) {
    console.error(`  ${relative(raiz, ruta)}:${numero}: ${linea.trim()}`);
  }
  process.exit(1);
}
console.log('Sin URLs de backend codificadas en src/app.');
