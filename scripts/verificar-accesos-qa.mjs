import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Solo inspección: no llama al login, no lee secretos y no modifica contenedores.
const [perfil, directorio] = process.argv.slice(2);
if (!['dc106-qa', 'dc106-qa-sim', 'production'].includes(perfil) || !directorio) {
  throw new Error('Uso: node scripts/verificar-accesos-qa.mjs <dc106-qa|dc106-qa-sim|production> <directorio-browser>');
}
const root = resolve(directorio);
readFileSync(join(root, 'index.html'), 'utf8');
const archivos = readdirSync(root).filter(n => n.endsWith('.js'));
if (!archivos.length) throw new Error('No hay bundles JavaScript para comprobar');
const codigo = archivos.map(n => readFileSync(join(root, n), 'utf8')).join('\n');
const indicadores = [...codigo.matchAll(/accesoRapidoQa\s*:\s*(!0\b|true\b|!1\b|false\b)/g)].map(m => m[1]);
// El visor hereda el QA y lo sobrescribe en el mismo objeto compilado.
const esperados = perfil === 'dc106-qa' ? ['!0'] : perfil === 'dc106-qa-sim' ? ['!0', '!1'] : [];
const normalizados = indicadores.map(v => v === 'true' ? '!0' : v === 'false' ? '!1' : v);
const habilitado = perfil === 'dc106-qa';
if (JSON.stringify(normalizados) !== JSON.stringify(esperados)) {
  throw new Error(`Artefacto incompatible con ${perfil}: revisar fileReplacements y directorio de empaquetado`);
}
if (perfil === 'dc106-qa') {
  for (const etiqueta of ['Administrador QA', 'Docente QA', 'Estudiante QA']) {
    if (!codigo.includes(etiqueta)) throw new Error(`Falta el botón ${etiqueta}`);
  }
}
console.log(`OK: ${perfil}, ${archivos.length} bundles; acceso rápido QA ${habilitado ? 'habilitado' : 'deshabilitado'}`);
