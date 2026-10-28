// Ayudas para recorrer una app en el navegador: sirve el repo, conecta el simulador y junta errores de consola.
// Uso: const { abrir } = require('./h'); const t = await abrir('/home/user/barberia', 'p_barberia');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { crear } = require('./sim');

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

function servir(raiz) {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      let f = path.join(raiz, decodeURIComponent(u.pathname));
      if (!f.startsWith(raiz)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    s.listen(0, () => ok(s));
  });
}

async function abrir(repo, db, opts = {}) {
  const servidor = await servir(repo);
  const base = 'http://localhost:' + servidor.address().port;
  const errores = [];
  const sim = crear({ db, funciones: opts.funciones, log: (m) => errores.push(m) });
  const browser = await chromium.launch();
  const nuevo = async () => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block', locale: 'es-CL', timezoneId: 'America/Santiago', acceptDownloads: true });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|unpkg\.com|tile|openstreetmap|cartocdn|challenges\.cloudflare/, (r) => {
      const u = r.request().url();
      if (/jsdelivr|unpkg/.test(u)) return r.continue().catch(() => r.abort());
      return r.fulfill({ status: 200, body: '' });
    });
    await sim.conectar(ctx);
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errores.push('[consola] ' + m.text()); });
    page.on('pageerror', (e) => errores.push('[página] ' + e.message));
    page.on('dialog', (d) => { (opts.dialogo || ((x) => x.accept()))(d); });
    return { ctx, page };
  };
  const { ctx, page } = await nuevo();
  const capt = path.join(__dirname, 'capturas', path.basename(repo));
  fs.mkdirSync(capt, { recursive: true });
  return {
    base, page, ctx, sim, errores, browser, nuevo,
    foto: (nombre, p) => (p || page).screenshot({ path: path.join(capt, nombre + '.png'), fullPage: true }),
    // Cierra los diálogos abiertos (p. ej. "Activa las notificaciones", que en el navegador de prueba siempre aparece).
    sinModales: (p) => (p || page).evaluate(() => { document.querySelectorAll('dialog[open]').forEach((d) => d.close()); document.querySelectorAll('.cfx-hoja').forEach((d) => d.remove()); document.querySelectorAll('.sheet .cerrar').forEach((b) => b.click()); }),
    anchoOk: async (p) => (p || page).evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    async cerrar() { await browser.close(); servidor.close(); await sim.cerrar(); },
  };
}

module.exports = { abrir, servir };
