import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const base = resolve(process.argv[2]);
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const servidor = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const archivo = resolve(base, pathname === '/' ? 'index.html' : '.' + pathname);
  if (!archivo.startsWith(base + sep)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'Content-Type': tipos[extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(await readFile(archivo)); }
  catch { res.writeHead(404).end(); }
});
servidor.listen(4318, '127.0.0.1', () => console.log('Laboratorio: http://127.0.0.1:4318'));
