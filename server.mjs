import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequestPost } from './functions/api/enquiry.js';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = createServer(async (req, res) => {
  const requestPath = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;

  // Reuse the Cloudflare Pages Function for local form testing as well.
  if (requestPath === '/api/enquiry') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ success: false, message: 'Method not allowed.' }));
      return;
    }
    try {
      let rawBody = '';
      for await (const chunk of req) {
        rawBody += chunk.toString('utf8');
        if (rawBody.length > 12000) throw new Error('Request too large');
      }
      const host = req.headers.host || 'localhost';
      const headers = { 'content-type': req.headers['content-type'] || 'application/json' };
      if (req.headers.origin) headers.origin = req.headers.origin;
      const webRequest = new Request(`http://${host}/api/enquiry`, {
        method: 'POST',
        headers,
        body: rawBody
      });
      const apiResponse = await onRequestPost({
        request: webRequest,
        env: {
          GOOGLE_APPS_SCRIPT_URL: process.env.GOOGLE_APPS_SCRIPT_URL,
          APPS_SCRIPT_SHARED_SECRET: process.env.APPS_SCRIPT_SHARED_SECRET
        }
      });
      res.writeHead(apiResponse.status, Object.fromEntries(apiResponse.headers.entries()));
      res.end(await apiResponse.text());
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ success: false, message: error.message === 'Request too large' ? 'The enquiry is too large.' : 'Could not process the enquiry.' }));
    }
    return;
  }
  const cleanPath = requestPath === '/' ? '/index.html' : requestPath;
  const candidate = normalize(join(root, cleanPath));
  const safe = candidate.startsWith(root) ? candidate : join(root, 'index.html');
  let file = safe;
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, 'index.html');
  } catch {
    if (requestPath.startsWith('/api/') || requestPath === '/favicon.ico') {
      res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
      res.end('Not found');
      return;
    }
    file = join(root, 'index.html');
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'Cache-Control': requestPath === '/manus-routes.json' ? 'no-cache' : 'public, max-age=0'
    });
    res.end(body);
  } catch {
    res.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
    res.end('Server error');
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Kani Ceramics listening on ${port}`));
