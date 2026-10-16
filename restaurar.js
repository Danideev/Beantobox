// ============================================================
// beantobox · restaura el sitio Norte desde beantobox.json
// Uso:  node restaurar.js [carpetaDestino]   (por defecto ./sitio)
// ============================================================
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const jsonPath = path.join(__dirname, "beantobox.json");
const destino = path.resolve(process.argv[2] || path.join(__dirname, "sitio"));

if (!fs.existsSync(jsonPath)) {
  console.error("No encuentro beantobox.json junto a este script.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
console.log(data.sitio + " · " + data.creado.slice(0, 10) + " · " + data.archivos.length + " archivos\n");

let ok = 0, mal = 0;
for (const a of data.archivos) {
  const buf = Buffer.from(a.texto, "utf8");
  const h = crypto.createHash("sha256").update(buf).digest("hex");
  if (h !== a.sha256 || buf.length !== a.bytes) {
    console.log("  ✗ hash distinto: " + a.ruta);
    mal++;
    continue;
  }
  const dst = path.join(destino, a.ruta);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, buf);
  ok++;
  console.log("  ✓ " + a.ruta);
}

console.log("");
if (mal) { console.log("restaurados " + ok + ", fallaron " + mal); process.exit(1); }
console.log("Sitio restaurado (" + ok + " archivos) en: " + destino);
console.log("");
console.log("Para abrirlo:");
console.log('  powershell -ExecutionPolicy Bypass -File "' + path.join(destino, "servidor.ps1") + '"');
console.log("  → http://127.0.0.1:8750/   (panel: /admin.html)");
console.log("");
console.log("Nota: los tests (tests/*.js) apuntan a la constante BASE de su propia ruta;");
console.log("      ajústala a donde restaures si los vas a ejecutar.");
