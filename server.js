// 战舰世界资产管理器 —— 零依赖 Node 服务器
// 数据保存在 ./save 目录下，每个账号一个 JSON 文件（文件名经 encodeURIComponent 编码，杜绝路径穿越）
// 运行：node server.js  然后浏览器打开 http://localhost:8787
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PUBLIC = path.join(__dirname, 'public');
// 数据目录：默认 ./save；可通过环境变量 SAVE_DIR 指向持久卷（避免临时文件系统重启丢数据）
const SAVE = process.env.SAVE_DIR ? path.resolve(process.env.SAVE_DIR) : path.join(__dirname, 'save');
fs.mkdirSync(SAVE, { recursive: true });
const PORT = process.env.PORT || 8787;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function safeFile(name) {
  // 仅允许账号名映射为安全文件名，禁止 ../ 等穿越
  if (typeof name !== 'string' || !name.trim()) return null;
  const enc = encodeURIComponent(name.trim());
  if (!enc) return null;
  return path.join(SAVE, enc + '.json');
}
function listAccounts() {
  try {
    return fs.readdirSync(SAVE).filter(f => f.endsWith('.json')).map(f => decodeURIComponent(f.slice(0, -5)));
  } catch (e) { return []; }
}
function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 64 * 1024 * 1024) req.destroy(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const u = url.parse(req.url, true);
  const p = u.pathname;
  try {
    // ---------- API ----------
    if (p === '/api/ping') return sendJSON(res, 200, { ok: true });

    if (p === '/api/accounts') return sendJSON(res, 200, { accounts: listAccounts() });

    if (p === '/api/load') {
      const f = safeFile(u.query.account);
      if (!f || !fs.existsSync(f)) return sendJSON(res, 404, { error: 'not found' });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return fs.createReadStream(f).pipe(res);
    }

    if (p === '/api/save' && req.method === 'POST') {
      const body = await readBody(req);
      let o; try { o = JSON.parse(body); } catch (e) { return sendJSON(res, 400, { error: 'bad json' }); }
      const f = safeFile(o && o.account);
      if (!f) return sendJSON(res, 400, { error: 'invalid account' });
      fs.writeFileSync(f, JSON.stringify(o.data || {}));
      return sendJSON(res, 200, { ok: true });
    }

    if (p === '/api/rename' && req.method === 'POST') {
      const body = await readBody(req);
      let o; try { o = JSON.parse(body); } catch (e) { return sendJSON(res, 400, { error: 'bad json' }); }
      const of = safeFile(o && o.old), nf = safeFile(o && o.neu);
      if (!of || !nf || !fs.existsSync(of)) return sendJSON(res, 400, { error: 'invalid' });
      fs.renameSync(of, nf);
      return sendJSON(res, 200, { ok: true });
    }

    if (p === '/api/delete' && req.method === 'POST') {
      const body = await readBody(req);
      let o; try { o = JSON.parse(body); } catch (e) { return sendJSON(res, 400, { error: 'bad json' }); }
      const f = safeFile(o && o.name);
      if (!f) return sendJSON(res, 400, { error: 'invalid' });
      if (fs.existsSync(f)) fs.unlinkSync(f);
      return sendJSON(res, 200, { ok: true });
    }

    // ---------- 静态文件 ----------
    // 预览快照含真实账号数据，禁止在运行时直接访问（仅本地静态沙盒需要）
    if (p.startsWith('/preview-data')) { res.writeHead(404); return res.end('not found'); }

    let rel = p === '/' ? '/index.html' : p;
    let fp = path.normalize(path.join(PUBLIC, rel));
    if (!fp.startsWith(PUBLIC)) { res.writeHead(403); return res.end('forbidden'); }
    if (!fs.existsSync(fp) || !fs.statSync(fp).isFile()) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  } catch (e) {
    sendJSON(res, 500, { error: String(e) });
  }
});

server.listen(PORT, () => {
  console.log('战舰世界资产管理器已启动： http://localhost:' + PORT);
  console.log('账号数据目录： ' + SAVE);
});
