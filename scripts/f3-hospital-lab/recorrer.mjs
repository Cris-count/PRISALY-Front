import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const salida = resolve(process.argv[2]);
await mkdir(salida, { recursive: true });
const esperar = ms => new Promise(r => setTimeout(r, ms));
const paginas = await (await fetch('http://127.0.0.1:9328/json/list')).json();
const pagina = paginas.find(p => p.type === 'page');
if (!pagina) throw new Error('Chrome no expone una página de laboratorio');
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let numero = 0;
const pendientes = new Map();
const consola = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id) { const p = pendientes.get(m.id); pendientes.delete(m.id); if (m.error) p?.reject(new Error(JSON.stringify(m.error))); else p?.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Log.entryAdded') consola.push(m);
});
const ordenar = (method, params = {}) => new Promise((resolve, reject) => { const id = ++numero; pendientes.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluar = async expression => {
  const r = await ordenar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result?.value;
};
const hasta = async (expresion, nombre, limite = 30000) => {
  const fin = Date.now() + limite;
  while (Date.now() < fin) { if (await evaluar(expresion)) return; await esperar(200); }
  throw new Error('Tiempo agotado: ' + nombre);
};
const pulsar = async texto => {
  const encontrado = await evaluar(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(texto)});if(!b||b.disabled)return false;b.click();return true})()`);
  if (!encontrado) throw new Error('Botón no disponible: ' + texto);
  await esperar(200);
};
const capturar = async nombre => {
  const shot = await ordenar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(resolve(salida, nombre + '.png'), Buffer.from(shot.data, 'base64'));
  await writeFile(resolve(salida, nombre + '.html'), await evaluar('document.documentElement.outerHTML'));
};
const resultado = () => evaluar('window.laboratorioHospital.resultado()');
const controles = [];
const comprobar = (nombre, ok) => { controles.push({ nombre, ok }); if (!ok) throw new Error('Falló: ' + nombre); };
let final;
try {
  await ordenar('Runtime.enable'); await ordenar('Log.enable');
  await ordenar('Page.navigate', { url: 'http://127.0.0.1:4318/' });
  await hasta('!!window.laboratorioHospital', 'Angular iniciado');
  await pulsar('Conectar laboratorio');
  await hasta('window.laboratorioHospital.resultado().listo', 'sesion.iniciar confirmada', 60000);
  await pulsar('Estímulo simulado: activar puerta');
  await hasta("window.laboratorioHospital.resultado().espacio==='interior'", 'edificio.entro real');
  await pulsar('Estímulo simulado: activar doctor');
  await hasta("window.laboratorioHospital.resultado().conversacion==='abierta'", 'doctor confirmado por Unreal');
  comprobar('Texto del guion real en el DOM', (await evaluar('document.body.innerText')).includes('Bienvenido al Hospital Central'));
  await capturar('01-dialogo-angular');
  await pulsar('Siguiente diálogo'); await pulsar('Siguiente diálogo');
  await pulsar('Solicitar informe de ingreso del paciente');
  const antes = await resultado();
  comprobar('Pista y origen del catálogo real', antes.libreta.pistas.length === 1 && antes.libreta.pistas[0].id === 'pista-historial-clinico' && antes.libreta.pistas[0].origen.interaccionId === 'triaje-historial');
  comprobar('Transición narrativa prevista', antes.vista.estado.transicion.destino === 'sala-consulta');
  await pulsar('Libreta (1)');
  await hasta("!!document.querySelector('dialog[open]')", 'libreta modal real');
  comprobar('Pista mostrada por LibretaPanel', (await evaluar("document.querySelector('dialog').innerText")).includes('Historia Clínica de Emergencia'));
  await capturar('02-libreta-angular');
  await pulsar('Cerrar');
  await pulsar('Cerrar conversación');
  await hasta("window.laboratorioHospital.resultado().espacio==='exterior'", 'edificio.salio real', 45000);
  await esperar(500);
  await pulsar('Reconectar misma sesión');
  await hasta('window.laboratorioHospital.resultado().listo', 'reconexión real');
  await pulsar('Estímulo simulado: activar puerta');
  await hasta("window.laboratorioHospital.resultado().espacio==='interior'", 'reingreso real');
  await pulsar('Estímulo simulado: activar doctor');
  await hasta("window.laboratorioHospital.resultado().conversacion==='abierta'", 'reanudar doctor');
  const reingreso = await resultado();
  comprobar('Reingreso y reconexión conservan transición y decisiones', JSON.stringify(antes.vista.estado) === JSON.stringify(reingreso.vista.estado));
  comprobar('Una sola pista tras reingreso', reingreso.libreta.pistas.length === 1);
  await pulsar('Continuar conversación'); await pulsar('Siguiente diálogo');
  comprobar('Guion real terminado', (await resultado()).vista.terminado === true);
  await capturar('03-reingreso-progreso');
  await pulsar('Cerrar conversación');
  await hasta("window.laboratorioHospital.resultado().espacio==='exterior'", 'segunda salida espacial', 45000);
  final = await resultado();
  comprobar('Dos entradas y dos salidas emitidas por Unreal real', final.hechos.filter(m => m.tipo === 'edificio.entro').length === 2 && final.hechos.filter(m => m.tipo === 'edificio.salio').length === 2);
  comprobar('Todas las órdenes recibieron ack real', final.registro.filter(r => r.direccion === 'salida' && r.resultado === 'ENVIADO').every(r => final.registro.some(a => a.direccion === 'entrada' && a.correlacion === r.id && a.resultado === 'ACK')));
  comprobar('Sin errores de JavaScript', consola.filter(m => m.method === 'Runtime.exceptionThrown').length === 0);
  await capturar('04-retorno-exterior');
  await writeFile(resolve(salida, 'resultado-real.json'), JSON.stringify({ resultado: 'VALIDO', alcance: 'Angular real + Unreal real por WebSocket; activaciones E simuladas y salida automatizada; sin Pixel Streaming', controles, ...final }, null, 2));
  console.log(JSON.stringify({ resultado: 'VALIDO', controles: controles.length, pistas: final.libreta.pistas.length, hechosMotor: final.hechos.length }));
} catch (e) {
  try { final = await resultado(); await capturar('fallo'); } catch {}
  await writeFile(resolve(salida, 'resultado-fallido.json'), JSON.stringify({ resultado: 'FALLIDO', error: String(e), controles, ...final }, null, 2));
  process.exitCode = 1; console.error(e);
} finally {
  await writeFile(resolve(salida, 'consola-browser.json'), JSON.stringify(consola, null, 2));
  ws.close();
}
