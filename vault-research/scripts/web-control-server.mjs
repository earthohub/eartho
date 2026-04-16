#!/usr/bin/env node

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const WEB_ROOT = path.resolve(REPO_ROOT, "vault-research/web");
const UPDATE_SCRIPT = path.resolve(REPO_ROOT, "vault-research/scripts/update-analysis.mjs");
const PORT = Number(process.env.VAULT_WEB_PORT ?? 8787);
const HOST = process.env.VAULT_WEB_HOST ?? "127.0.0.1";

let updateRunning = false;
let lastUpdate = null;

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
]);

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function serveStaticFile(urlPath, res) {
  const normalized = urlPath === "/" ? "/index.html" : urlPath;
  const decoded = decodeURIComponent(normalized);
  const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const absolutePath = path.resolve(WEB_ROOT, `.${safePath}`);

  if (!absolutePath.startsWith(WEB_ROOT)) {
    json(res, 403, { ok: false, error: "Forbidden" });
    return;
  }

  try {
    const content = await readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME_TYPES.get(ext) ?? "application/octet-stream");
    res.end(content);
  } catch (error) {
    json(res, 404, { ok: false, error: "Not found" });
  }
}

function runUpdateScript() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [UPDATE_SCRIPT], {
      cwd: REPO_ROOT,
      env: process.env,
      shell: false,
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ code, output });
      } else {
        reject(new Error(`update-analysis exited with code ${code}\n${output}`));
      }
    });
  });
}

const server = createServer(async (req, res) => {
  const reqUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${HOST}:${PORT}`}`);

  if (req.method === "GET" && reqUrl.pathname === "/api/status") {
    json(res, 200, {
      ok: true,
      updateRunning,
      lastUpdate,
      command: "node vault-research/scripts/update-analysis.mjs",
    });
    return;
  }

  if (req.method === "POST" && reqUrl.pathname === "/api/update") {
    if (updateRunning) {
      json(res, 409, {
        ok: false,
        error: "Update is already running.",
        updateRunning: true,
      });
      return;
    }

    updateRunning = true;
    const startedAt = new Date().toISOString();

    try {
      const result = await runUpdateScript();
      const finishedAt = new Date().toISOString();
      lastUpdate = {
        status: "success",
        startedAt,
        finishedAt,
        logTail: result.output.split("\n").slice(-50).join("\n"),
      };
      json(res, 200, {
        ok: true,
        startedAt,
        finishedAt,
        message: "Analysis updated successfully. Reloading is safe now.",
      });
    } catch (error) {
      const finishedAt = new Date().toISOString();
      lastUpdate = {
        status: "failed",
        startedAt,
        finishedAt,
        error: error.message,
      };
      json(res, 500, {
        ok: false,
        startedAt,
        finishedAt,
        error: error.message,
      });
    } finally {
      updateRunning = false;
    }
    return;
  }

  if (req.method === "GET") {
    await serveStaticFile(reqUrl.pathname, res);
    return;
  }

  json(res, 405, { ok: false, error: "Method Not Allowed" });
});

server.listen(PORT, HOST, () => {
  console.log(`Vault research web server: http://${HOST}:${PORT}`);
  console.log("Click update button in Settings to trigger analysis refresh.");
});
