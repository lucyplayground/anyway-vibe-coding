import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { generatePalette, PaletteError } from './gemini.mjs';

// Serve only public assets; configuration and server code are never served.
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);

export function createPaletteServer({ apiKey, model, fallbackModel, fetchImpl, sleep, log } = {}) {
  return createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    try {
      const host = req.headers.host ?? '';
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
        return send(403, { error: '로컬 주소로 접속해 주세요.' });
      }
      const url = new URL(req.url, `http://${host}`);
      if (url.pathname === '/api/palette') {
        if (req.method !== 'POST') return send(405, { error: 'POST 요청이 필요합니다.' });
        if (req.headers.origin && req.headers.origin !== `http://${host}`) {
          return send(403, { error: '같은 페이지에서 요청해 주세요.' });
        }
        if (!req.headers['content-type']?.startsWith('application/json')) {
          return send(415, { error: 'JSON 요청이 필요합니다.' });
        }
        let body = '';
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4096) throw new PaletteError(413, '입력 내용이 너무 깁니다.');
          body += chunk;
        }
        let data;
        try { data = JSON.parse(body); }
        catch { throw new PaletteError(400, '올바른 입력을 보내 주세요.'); }
        const result = await generatePalette(data?.keyword, { apiKey, model, fallbackModel, fetchImpl, sleep, log });
        return send(200, result);
      }
      const asset = assets.get(url.pathname);
      if (!asset || !['GET', 'HEAD'].includes(req.method)) return send(404, { error: '페이지를 찾을 수 없습니다.' });
      const contents = await readFile(new URL(asset[0], import.meta.url));
      res.writeHead(200, { 'Content-Type': asset[1], 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : contents);
    } catch (error) {
      send(error instanceof PaletteError ? error.status : 500, {
        error: error instanceof PaletteError ? error.message : '서버에서 오류가 발생했어요. 다시 시도해 주세요.',
      });
    }
  });
}

// Importing this module for tests neither reads .env nor starts a real API connection.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const server = createPaletteServer({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || undefined,
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL || undefined,
    log: message => console.warn(message),
  });
  server.listen(port, '127.0.0.1', () => console.log(`컬러 팔레트: http://127.0.0.1:${port}`));
  server.on('error', () => {
    console.error('서버를 시작하지 못했습니다. 포트가 사용 중인지 확인해 주세요.');
    process.exitCode = 1;
  });
}
