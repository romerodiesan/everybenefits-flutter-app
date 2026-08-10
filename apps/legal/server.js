import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Self-contained entry for App Hosting (`scripts.runCommand` / `server.js`).
// Keep this file free of local imports so output pruning cannot drop the server.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "build");
const port = Number(process.env.PORT || 3003);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function safeJoin(base, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0] || "/");
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(base, cleaned);
  if (!full.startsWith(base)) return null;
  return full;
}

function resolveFile(urlPath) {
  const candidate = safeJoin(root, urlPath);
  if (!candidate) return null;

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  const asIndex = path.join(candidate, "index.html");
  if (fs.existsSync(asIndex) && fs.statSync(asIndex).isFile()) {
    return asIndex;
  }

  if (!path.extname(candidate)) {
    const asHtml = `${candidate}.html`;
    if (fs.existsSync(asHtml) && fs.statSync(asHtml).isFile()) {
      return asHtml;
    }
  }

  const fallback = path.join(root, "404.html");
  if (fs.existsSync(fallback)) return fallback;
  return null;
}

if (!fs.existsSync(root)) {
  console.error(`@pulse/legal missing build output at ${root}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const file = resolveFile(req.url || "/");
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const status = file.endsWith(`${path.sep}404.html`) ? 404 : 200;
  res.writeHead(status, {
    "content-type": TYPES[ext] || "application/octet-stream",
    "cache-control":
      ext === ".html"
        ? "public, max-age=0, must-revalidate"
        : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`@pulse/legal serving ${root} on :${port}`);
});
