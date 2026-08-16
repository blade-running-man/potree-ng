// Zero-dependency static file server for the Potree examples.
//
// Example pages reference the project with relative paths (../build, ../libs,
// ../pointclouds), so they must be served from the project root. Playwright's
// `webServer` starts this on demand and shuts it down after the run. The root
// is derived from this file's location, not the cwd, so it works regardless of
// where the process is launched from.

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 5183;
const HOST = process.env.HOST || '127.0.0.1';

// ES modules and classic scripts only execute when served with a JavaScript
// MIME type, so .js/.mjs must be correct. Unknown extensions (octree .bin/.hrc
// and other point-cloud payloads) fall back to a binary type.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.glsl': 'text/plain; charset=utf-8',
  '.vs': 'text/plain; charset=utf-8',
  '.fs': 'text/plain; charset=utf-8',
  '.bin': 'application/octet-stream',
  '.hrc': 'application/octet-stream',
};

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

// Resolve a request path to an absolute file inside ROOT, rejecting traversal.
function resolveWithinRoot(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const resolved = path.normalize(path.join(ROOT, decoded));
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) return null;
  return resolved;
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end('Method Not Allowed');
    return;
  }

  // Browsers auto-request a favicon; this project ships none. Answer 204 so the
  // request doesn't 404 and pollute the console/network during tests and manual
  // use. (Headed Chromium issues this request from the browser process.)
  if ((req.url || '/').split('?')[0] === '/favicon.ico') {
    res.writeHead(204).end();
    return;
  }

  const resolved = resolveWithinRoot(req.url || '/');
  if (!resolved) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let target = resolved;
  try {
    const stat = await fsp.stat(target);
    if (stat.isDirectory()) target = path.join(target, 'index.html');
  } catch {
    res.writeHead(404).end('Not Found');
    return;
  }

  let fileStat;
  try {
    fileStat = await fsp.stat(target);
  } catch {
    res.writeHead(404).end('Not Found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentType(target),
    'Content-Length': fileStat.size,
    'Cache-Control': 'no-store',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = fs.createReadStream(target);
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500);
    res.end('Internal Server Error');
  });
  stream.pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`static-server: serving ${ROOT} at http://${HOST}:${PORT}/`);
});
