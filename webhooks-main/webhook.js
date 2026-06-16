const http = require("http");
const fs = require("fs");
const path = require("path");
const webhookVerification = require("./webhookVerification");
const messageHandling = require("./messageHandling");
const axios = require("./httpClient");
const config = require("./config");
const database = require("./database");

const frontendDir = path.join(__dirname, "..");
const publicDir = path.join(__dirname, "public");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...headers,
  });
  res.end(body);
}

function json(res, statusCode, body) {
  send(res, statusCode, JSON.stringify(body), {
    "Content-Type": "application/json; charset=utf-8",
  });
}

function createExpressLikeRes(res) {
  let currentStatus = 200;

  return {
    status(statusCode) {
      currentStatus = statusCode;
      return this;
    },
    send(body) {
      send(res, currentStatus, body == null ? "" : String(body), {
        "Content-Type": "text/plain; charset=utf-8",
      });
    },
    json(body) {
      json(res, currentStatus, body);
    },
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("JSON invalido"));
      }
    });
    req.on("error", reject);
  });
}

async function handlePago(req, res, number) {
  const govApiAuthToken = config.govApiAuthToken;
  const apiBaseUrl = config.govApiLiquidacionUrl ? `${config.govApiLiquidacionUrl}/` : "";

  if (!apiBaseUrl || !govApiAuthToken) {
    send(res, 500, "<h1>Configura GOV_API_LIQUIDACION_URL y GOV_API_AUTH_TOKEN</h1>", {
      "Content-Type": "text/html; charset=utf-8",
    });
    return;
  }

  try {
    const response = await axios.get(`${apiBaseUrl}${number}`, {
      headers: { Authorization: govApiAuthToken },
    });

    const {
      catTipoLiquidacionDescripcion,
      concepto,
      contribuyente,
      total,
      totalLetra,
    } = response.data;

    const htmlFilePath = path.join(frontendDir, "index.html");
    let html = await fs.promises.readFile(htmlFilePath, "utf8");

    html = html
      .replace(/{{catTipoLiquidacionDescripcion}}/g, catTipoLiquidacionDescripcion || "Tipo de pago no disponible")
      .replace(/{{concepto}}/g, concepto || "Concepto no disponible")
      .replace(/{{contribuyente}}/g, contribuyente || "Contribuyente no disponible")
      .replace(/{{total}}/g, total ? `$${Number(total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "$0.00")
      .replace(/{{totalLetra}}/g, totalLetra || "Total en letra no disponible");

    send(res, 200, html, { "Content-Type": "text/html; charset=utf-8" });
  } catch (error) {
    console.error("Error al obtener datos de la API:", error.message);
    send(res, 500, "<h1>Error al obtener datos de la API</h1>", {
      "Content-Type": "text/html; charset=utf-8",
    });
  }
}

function safeFilePath(baseDir, requestPath) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  const filePath = path.normalize(path.join(baseDir, cleanPath));
  if (!filePath.startsWith(baseDir)) return "";
  return filePath;
}

async function serveStatic(res, requestPath) {
  const isPublicAsset = requestPath.startsWith("/public/");
  const baseDir = isPublicAsset ? publicDir : frontendDir;
  const relativePath = isPublicAsset ? requestPath.replace(/^\/public/, "") : requestPath;
  let filePath = safeFilePath(baseDir, relativePath === "/" ? "/index.html" : relativePath);

  if (!filePath) {
    send(res, 403, "Acceso denegado");
    return;
  }

  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    const ext = path.extname(filePath).toLowerCase();
    const content = await fs.promises.readFile(filePath);
    send(res, 200, content, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
    });
  } catch (error) {
    send(res, 404, "No encontrado");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, {
        ok: true,
        service: "cita-ciudadana-webhooks",
        whatsappConfigured: Boolean(config.whatsappAccessToken && config.whatsappPhoneNumberId),
        governmentApiConfigured: Boolean(config.govApiBaseUrl || config.govApiLiquidacionUrl),
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/webhook") {
      req.query = Object.fromEntries(url.searchParams.entries());
      webhookVerification(req, createExpressLikeRes(res));
      return;
    }

    if (req.method === "POST" && url.pathname === "/webhook") {
      req.body = await readJsonBody(req);
      await messageHandling(req, createExpressLikeRes(res));
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/pago/")) {
      await handlePago(req, res, decodeURIComponent(url.pathname.replace("/pago/", "")));
      return;
    }

    // --- API RUTAS DEL FRONTEND ---
    if (req.method === "POST" && url.pathname === "/api/register") {
      const body = await readJsonBody(req);
      const result = database.handleRegister(body);
      json(res, result.success ? 200 : 400, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/login") {
      const body = await readJsonBody(req);
      const result = database.handleLogin(body);
      json(res, result.success ? 200 : 401, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/profile") {
      const body = await readJsonBody(req);
      const result = database.handleUpdateProfile(body);
      json(res, result.success ? 200 : 400, result);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/appointments") {
      const email = url.searchParams.get("email");
      const appointments = database.handleGetAppointments(email);
      json(res, 200, appointments);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/appointments") {
      const body = await readJsonBody(req);
      const result = database.handleCreateAppointment(body);
      json(res, result.success ? 201 : 400, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/analyze-symptoms") {
      const body = await readJsonBody(req);
      const result = database.handleAnalyzeSymptoms(body);
      json(res, 200, result);
      return;
    }

    if (req.method === "GET") {
      await serveStatic(res, url.pathname);
      return;
    }

    send(res, 405, "Metodo no permitido");
  } catch (error) {
    console.error("Error procesando request:", error.message);
    send(res, 500, "Error interno");
  }
});

server.listen(config.port, "0.0.0.0", () => {
  console.log(`Servidor LISTO en http://localhost:${config.port}`);
  console.log("(Escuchando en IPv4 para compatibilidad con Ngrok)");
});
