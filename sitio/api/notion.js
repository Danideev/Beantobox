// ============================================================
// NORTE · proxy de Notion en Vercel (función serverless)
// Misma interfaz que el proxy de servidor.ps1:
//   POST /api/notion  { token, metodo, ruta, cuerpo }
// Devuelve la respuesta de Notion tal cual (passthrough).
// ============================================================
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end("Usa POST /api/notion");
    return;
  }

  var b = req.body || {};
  var token = b.token;
  var ruta = b.ruta;
  var metodo = String(b.metodo || "GET").toUpperCase();
  var cuerpo = b.cuerpo;

  if (!token || typeof ruta !== "string" || !ruta) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Faltan token y ruta" }));
    return;
  }
  // ruta de Notion válida: /databases/xxx/query, /pages/xxx…
  if (!/^\/[A-Za-z0-9/_.:-]+$/.test(ruta)) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Ruta no valida" }));
    return;
  }
  if (["GET", "POST", "PATCH", "DELETE"].indexOf(metodo) < 0) metodo = "GET";

  try {
    var r = await fetch("https://api.notion.com/v1" + ruta, {
      method: metodo,
      headers: {
        Authorization: "Bearer " + token,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: metodo === "GET" ? undefined : (cuerpo ? JSON.stringify(cuerpo) : undefined)
    });
    var txt = await r.text();
    res.statusCode = r.status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(txt);
  } catch (e) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
  }
};
