#!/usr/bin/env node
/**
 * Local development server for your extracted website.
 * Zero external dependencies — uses only Node.js built-ins.
 *
 * Usage:
 *   node _serve.js          (then open http://localhost:3000)
 *   node _serve.js 8080     (custom port)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ROOT = __dirname;
const PORT = parseInt(process.argv[2] || "3000", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm":  "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml":  "application/xml; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico":  "image/x-icon",
  ".bmp":  "image/bmp",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".eot":  "application/vnd.ms-fontobject",
  ".otf":  "font/otf",
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".ogg":  "video/ogg",
  ".pdf":  "application/pdf",
  ".txt":  "text/plain; charset=utf-8",
  ".zip":  "application/zip",
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    "Content-Type": mime,
    "Content-Length": stat.size,
    "Cache-Control": "no-cache",
    "Access-Control-Allow-Origin": "*",
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];
  let decodedPath = urlPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {}

  // Resolve file path, checking both decoded path and raw percent-encoded filename if needed
  let filePath = path.join(ROOT, decodedPath);
  if (!fs.existsSync(filePath)) {
    const rawFilePath = path.join(ROOT, urlPath);
    if (fs.existsSync(rawFilePath)) {
      filePath = rawFilePath;
    }
  }

  try {
    // If favicon.ico is requested and doesn't exist at root, serve personal favicon
    if (urlPath === "/favicon.ico" && !fs.existsSync(filePath)) {
      const fav = path.join(ROOT, "public-resources", "assets", "icons", "wise-personal", "favicon.png");
      if (fs.existsSync(fav)) return serveFile(fav, res);
    }

    const stat = fs.existsSync(filePath) && fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      // Ensure trailing slash for directory requests to preserve relative link resolution
      if (!urlPath.endsWith("/")) {
        const query = req.url.includes("?") ? "?" + req.url.split("?")[1] : "";
        res.writeHead(301, { Location: decodedPath + "/" + query });
        return res.end();
      }
      const idx = path.join(filePath, "index.html");
      if (fs.existsSync(idx)) return serveFile(idx, res);
    }
    if (stat && stat.isFile()) return serveFile(filePath, res);

    // If a static asset with a file extension was not found, return 404 rather than HTML
    const ext = path.extname(decodedPath).toLowerCase();
    if (ext || urlPath.startsWith("/static-assets/") || urlPath.startsWith("/public-resources/") || urlPath.startsWith("/web-art/")) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404 Not Found: " + decodedPath);
    }

    // SPA fallback: serve the nearest index.html up the directory tree
    let dir = filePath;
    while (dir !== ROOT && dir !== path.dirname(dir)) {
      dir = path.dirname(dir);
      const idx = path.join(dir, "index.html");
      if (fs.existsSync(idx)) return serveFile(idx, res);
    }

    // Absolute fallback
    const rootIdx = path.join(ROOT, "index.html");
    if (fs.existsSync(rootIdx)) return serveFile(rootIdx, res);

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found: " + decodedPath);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("500 Internal Error: " + e.message);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const url = "http://localhost:" + PORT;
  console.log("\n  ✓ Serving extracted site at " + url + "\n");
  if (!process.env.NO_OPEN && !process.env.CI) {
    const open = process.platform === "darwin" ? "open"
               : process.platform === "win32"  ? "start"
               : "xdg-open";
    exec(open + " " + url, () => {});
  }
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error("  ✗ Port " + PORT + " is already in use. Try: node _serve.js " + (PORT + 1));
  } else {
    console.error("  ✗ Server error:", e.message);
  }
  process.exit(1);
});
