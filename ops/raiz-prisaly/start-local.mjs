import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const state = join(root, '.prisaly-local');
const config = join(state, 'config.json');
try {
  const mode = process.argv[2] ?? 'all';
  if (!['all', 'status', 'check', 'stop'].includes(mode)) throw new Error('Comando de orquestación desconocido.');
  const settings = JSON.parse(readFileSync(config, 'utf8').replace(/^\uFEFF/, ''));
  const front = resolve(root, settings.frontendDir ?? 'PRISALY-Front');
  const controller = join(front, 'scripts', 'start-local.ps1');
  if (!existsSync(controller)) throw new Error('No se encontró el orquestador en el Frontend configurado.');
  const child = spawn('pwsh.exe', ['-NoProfile', '-File', controller, '-Mode', mode, '-StateDirectory', state], {
    cwd: root, stdio: 'inherit', windowsHide: true,
  });
  process.on('SIGINT', () => {});
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
