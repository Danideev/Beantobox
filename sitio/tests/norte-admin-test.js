// Suite de pruebas NORTE · panel de administración (jsdom)
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const BASE = "C:\\Users\\User\\Documents\\Default Project\\sistema-enfoque";
const html = fs.readFileSync(path.join(BASE, "admin.html"), "utf8");
const catalogo = fs.readFileSync(path.join(BASE, "catalogo.js"), "utf8");
const admin = fs.readFileSync(path.join(BASE, "admin.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(BASE, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(BASE, "app.js"), "utf8");

let ok = 0, fallos = 0;
const detalle = [];
function t(nombre, cond, extra) {
  if (cond) { ok++; console.log("  OK  " + nombre); }
  else { fallos++; detalle.push(nombre + (extra ? " -> " + extra : "")); console.log(" FAIL " + nombre + (extra ? " -> " + extra : "")); }
}

function nuevaVentana(codigoExtra) {
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/", pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
  w.scrollTo = () => {};
  w.confirm = () => true;
  w.alert = () => {};
  w.eval(catalogo);
  w.eval(admin);
  if (codigoExtra) w.eval(codigoExtra);
  return w;
}

async function esperarCarga(w) {
  await new Promise(r => {
    if (w.document.readyState === "complete") setTimeout(r, 10);
    else w.addEventListener("load", () => setTimeout(r, 10));
  });
}

async function main() {
  console.log("--- PANEL: carga y estructura ---");
  const w = nuevaVentana();
  await esperarCarga(w);
  const d = w.document;
  const $ = (s) => d.querySelector(s);
  const $$ = (s) => Array.from(d.querySelectorAll(s));
  const A = w.__admin;

  t("admin cargado", !!A);
  t("catálogo con ui", !!A.get("ui"));
  t("12 secciones en el menú", $$("#navAdmin button").length === 12, "n=" + $$("#navAdmin button").length);
  t("sección activa por defecto (marca)", $("#sec-marca").classList.contains("on"));
  t("título de sección actualizado", $("#tituloSec").textContent === "Marca e inicio");
  t("estado inicial sin cambios", $("#estadoEdicion").textContent === "Sin cambios");
  t("enlace de vuelta al panel", !!$('a[href="index.html"]'));
  t("estilo reutiliza el diseño del panel", html.includes("estilo.css") && html.includes("nubes"));

  console.log("--- PANEL: edición de textos ---");
  const inpNombre = $("#campos-marca input");
  t("campo de marca renderizado", inpNombre && inpNombre.value === w.CATALOGO.ui.marca.nombre, inpNombre && inpNombre.value);
  inpNombre.value = "Brújula";
  inpNombre.dispatchEvent(new w.Event("input"));
  t("marca editada en el modelo", A.get("ui.marca.nombre") === "Brújula");
  t("marca sucia", A.esSucio() === true);
  t("indicador de cambios", $("#estadoEdicion").textContent === "Cambios sin guardar");

  console.log("--- PANEL: saludos y textos del día ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "marca").click();
  const saludoInput = $$("#campos-saludo input")[0];
  saludoInput.value = "Qué tal";
  saludoInput.dispatchEvent(new w.Event("input"));
  t("saludo editable", A.get("ui.saludo.manana") === "Qué tal");

  console.log("--- PANEL: preguntas iniciales ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "preguntas").click();
  t("3 bloques de preguntas", $$("#preguntasDinamicas .bloque").length === 4, "n=" + $$("#preguntasDinamicas .bloque").length);
  const preg1 = $$("#preguntasDinamicas .bloque")[0];
  const campoPreg = preg1.querySelector("input");
  t("texto de la pregunta 1", campoPreg && campoPreg.value.includes("puesto o cargo"), campoPreg && campoPreg.value);
  campoPreg.value = "¿Dónde quieres trabajar?";
  campoPreg.dispatchEvent(new w.Event("input"));
  t("pregunta 1 editada", A.get("ui.pasos.0.titulo") === "¿Dónde quieres trabajar?");

  // opciones cerradas
  const bloquesOpciones = $$("#preguntasDinamicas .bloque");
  const bloqueOpciones = bloquesOpciones[bloquesOpciones.length - 1];
  t("lista de puestos presente", bloqueOpciones.textContent.includes("Puestos (pregunta 1)"));
  const contPuestos = d.querySelector("#opc_0");
  const filasPuestos = contPuestos.querySelectorAll(".fila-edit");
  const nPuestos = filasPuestos.length;
  t("puestos cargados (14)", nPuestos === 14, "n=" + nPuestos);
  // editar
  const primerPuesto = filasPuestos[0].querySelector("input");
  primerPuesto.value = "Diseñador/a de producto";
  primerPuesto.dispatchEvent(new w.Event("input"));
  t("puesto editado", A.get("puestos")[0] === "Diseñador/a de producto");
  // añadir
  const inputAnadir = contPuestos.querySelector(".anadir input");
  const btnAnadir = contPuestos.querySelector(".anadir .btn");
  inputAnadir.value = "Ilustrador/a";
  btnAnadir.click();
  t("puesto añadido", A.get("puestos").length === nPuestos + 1 && A.get("puestos").includes("Ilustrador/a"));
  // quitar (vuelve a pintarse el contenedor)
  const contPuestos2 = d.querySelector("#opc_0");
  const nuevasFilas = contPuestos2.querySelectorAll(".fila-edit");
  nuevasFilas[nuevasFilas.length - 1].querySelector(".borrar").click();
  t("puesto quitado", A.get("puestos").length === nPuestos && !A.get("puestos").includes("Ilustrador/a"));

  // grupos del paso 3
  t("grupos del perfil editables", $("#grupos-paso3") && $$("#grupos-paso3 .fila-obj").length === 6);
  const labelGrupo = $$("#grupos-paso3 .ed-campo")[1].querySelector("input");
  labelGrupo.value = "Talento";
  labelGrupo.dispatchEvent(new w.Event("input"));
  t("grupo renombrado", A.get("ui.pasos.2.grupos")[0].label === "Talento");

  // opciones de habilidades
  t("6 listas de perfil", $$("#preguntasDinamicas #campos-marca, #preguntasDinamicas .lista-edit").length > 6);

  console.log("--- PANEL: menú ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "menu").click();
  const itemsMenu = $$("#campos-menu-items input");
  t("9 secciones del menú", itemsMenu.length === 9, "n=" + itemsMenu.length);
  itemsMenu[0].value = "Mi día";
  itemsMenu[0].dispatchEvent(new w.Event("input"));
  t("menú renombrado", A.get("ui.menu.items.hoy") === "Mi día");
  const movil = $$("#campos-menu-movil input");
  t("etiquetas móviles separadas", movil.length === 8 && A.get("ui.menu.movil.objetivos") === "Metas");

  console.log("--- PANEL: botones ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "botones").click();
  const botones = $$("#campos-botones input");
  t("25 botones editables", botones.length === 25, "n=" + botones.length);
  botones[0].value = "Crear tarea";
  botones[0].dispatchEvent(new w.Event("input"));
  t("botón editado", A.get("ui.botones.nuevaTarea") === "Crear tarea");

  console.log("--- PANEL: encabezados y bloques ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "textos").click();
  t("9 pantallas con encabezados", $$("#encabezadosDinamicos .bloque").length === 9, "n=" + $$("#encabezadosDinamicos .bloque").length);
  const encHoy = $$("#encabezadosDinamicos .bloque")[0];
  const h2 = encHoy.querySelectorAll("input")[1];
  h2.value = "Todo tu progreso";
  h2.dispatchEvent(new w.Event("input"));
  t("encabezado editado", A.get("ui.enc.hoy.h2") === "Todo tu progreso");
  t("bloques del inicio editables", $$("#campos-bloques .ed-campo").length >= 10);
  t("tipos de tarjeta editables", $$("#campos-misc .ed-campo").length >= 12, "n=" + $$("#campos-misc .ed-campo").length);

  console.log("--- PANEL: planes y validación ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "plan").click();
  t("4 planes renderizados", $$("#planesDinamicos .bloque").length === 4, "n=" + $$("#planesDinamicos .bloque").length);
  const planTrabajo = $("#plan-trabajo");
  t("tareas del plan trabajo", planTrabajo.querySelectorAll(".fila-obj").length === 7);
  const primeraTarea = planTrabajo.querySelectorAll(".fila-obj")[0].querySelector("input");
  primeraTarea.value = "Pulir mi CV hoy mismo";
  primeraTarea.dispatchEvent(new w.Event("input"));
  t("tarea del plan editada", A.get("planes.trabajo")[0].titulo === "Pulir mi CV hoy mismo");
  const filaNueva = planTrabajo.querySelector(".anadir .btn");
  filaNueva.click();
  t("tarea añadida al plan", A.get("planes.trabajo").length === 8);
  t("modelo de validación editable", $$("#campos-validacion .fila-obj").length === 5);

  console.log("--- PANEL: fechas y hábitos ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "social").click();
  t("fechas fijas editables", $$("#campos-eventosFijos .fila-obj").length === 9);
  t("fechas móviles editables", $$("#campos-eventosMoviles .fila-obj").length === 3);
  t("hábitos editables", $$("#campos-habitos .fila-obj").length === 8);
  const ev = $$("#campos-eventosFijos .fila-obj")[0].querySelectorAll("input")[1];
  ev.value = "Año nuevoito";
  ev.dispatchEvent(new w.Event("input"));
  t("fecha editada", A.get("eventosFijos")[0].titulo === "Año nuevoito");

  console.log("--- PANEL: mensajes ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "mensajes").click();
  const msgs = $$("#lista-mensajes .fila-edit");
  t("10 mensajes", msgs.length === 10, "n=" + msgs.length);
  msgs[0].querySelector("input").value = "Tú puedes con todo.";
  msgs[0].querySelector("input").dispatchEvent(new w.Event("input"));
  t("mensaje editado", A.get("mensajes")[0] === "Tú puedes con todo.");
  t("hitos editables", $$("#lista-hitos .fila-edit").length === 4);
  t("pasos de construcción editables", $$("#lista-pasosConstruir .fila-edit").length === 5);

  console.log("--- PANEL: ofertas y clientes ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "ofertas").click();
  t("12 ofertas editables", $$("#lista-ofertas .fila-obj").length === 12);
  t("6 clientes editables", $$("#lista-clientes .fila-obj").length === 6);
  t("fuentes editables", $$("#lista-fuentes .fila-edit").length >= 5);
  t("plantillas de correo", $$("#campos-correo .ed-campo").length === 2 && $$("#campos-correoCuerpo .ed-campo").length === 2);

  console.log("--- PANEL: metas y áreas ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "metas").click();
  const redes = $$("#redes-plantilla .fila-obj");
  t("4 objetivos sociales en la plantilla", redes.length === 4, "n=" + redes.length);
  t("campos: red, enlace y meta", redes[0].querySelectorAll("input").length === 3);
  const inpCuenta = redes[0].querySelectorAll("input")[1];
  inpCuenta.value = "https://instagram.com/norte";
  inpCuenta.dispatchEvent(new w.Event("input"));
  t("enlace de cuenta editable", A.get("areasMetas.redes")[0].cuenta === "https://instagram.com/norte");
  const inpMeta = redes[0].querySelectorAll("input")[2];
  inpMeta.value = "45";
  inpMeta.dispatchEvent(new w.Event("input"));
  t("meta numérica editable", String(A.get("areasMetas.redes")[0].meta) === "45");
  t("3 áreas de trabajo", $$("#areas-plantilla .ed-grid").length === 3, "n=" + $$("#areas-plantilla .ed-grid").length);
  const subs0 = $("#subs-area-0");
  t("subtareas del área 1 editables", subs0.querySelectorAll(".fila-edit").length === 4, "n=" + subs0.querySelectorAll(".fila-edit").length);
  subs0.querySelector(".anadir input").value = "Pedir retro a un reclutador";
  subs0.querySelector(".anadir .btn").click();
  t("subtarea añadida a la plantilla", A.get("areasMetas.trabajo")[0].subtareas.length === 5, "n=" + A.get("areasMetas.trabajo")[0].subtareas.length);
  $("#subs-area-0 .fila-edit .borrar").click();
  t("subtarea quitada de la plantilla", A.get("areasMetas.trabajo")[0].subtareas.length === 4, "n=" + A.get("areasMetas.trabajo")[0].subtareas.length);
  const nAreasPlant = A.get("areasMetas.trabajo").length;
  const anadirArea = $$("#areas-plantilla .anadir").pop();
  anadirArea.querySelector("input").value = "Portafolios";
  anadirArea.querySelector("button").click();
  t("área nueva añadida", A.get("areasMetas.trabajo").length === nAreasPlant + 1, "n=" + A.get("areasMetas.trabajo").length);
  t("área nueva con sus casilleros", !!$("#subs-area-3"));

  console.log("--- PANEL: integraciones ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "integraciones").click();
  t("campo de refresco de Notion", $$("#campos-notion-int input").length === 1);
  const inCada = $("#campos-notion-int input");
  inCada.value = "30";
  inCada.dispatchEvent(new w.Event("input"));
  t("refresco editable", String(A.get("integraciones.notionCada")) === "30");
  t("3 campos de Google", $$("#campos-google .ed-campo").length === 3, "n=" + $$("#campos-google .ed-campo").length);
  const inId = $$("#campos-google input")[0];
  inId.value = "pepe.apps.googleusercontent.com";
  inId.dispatchEvent(new w.Event("input"));
  t("client ID editable", A.get("integraciones.google.clientId") === "pepe.apps.googleusercontent.com");

  console.log("--- PANEL: JSON ---");
  $$("#navAdmin button").find(b => b.dataset.sec === "json").click();
  const ta = $("#jsonBruto");
  t("JSON cargado", ta.value.length > 500 && JSON.parse(ta.value).ui.marca.nombre === "Brújula");
  t("JSON incluye areasMetas e integraciones", !!JSON.parse(ta.value).areasMetas && !!JSON.parse(ta.value).integraciones);
  ta.value = "{ no es json";
  $("#btnAplicarJSON").click();
  t("JSON inválido rechazado", A.get("ui.marca.nombre") === "Brújula");
  ta.value = JSON.stringify({ marca: 1 });
  $("#btnAplicarJSON").click();
  t("JSON sin claves obligatorias rechazado", A.get("ui").marca.nombre === "Brújula");
  ta.value = JSON.stringify(Object.assign(A.datos(), { nota: "ok" }), null, 2);
  $("#btnAplicarJSON").click();
  t("JSON válido aplicado", A.get("nota") === "ok");

  console.log("--- PANEL: descartar ---");
  A.set("ui.marca.nombre", "Temporal");
  $$("#navAdmin button").find(b => b.dataset.sec === "marca").click();
  $("#btnDescartar").click();
  t("descartar restaura el contenido original", A.get("ui.marca.nombre") === w.CATALOGO.ui.marca.nombre);
  t("descartar limpia el indicador", $("#estadoEdicion").textContent === "Sin cambios");

  console.log("--- PANEL: guardar (servidor OK) ---");
  A.set("ui.marca.nombre", "Brújula");
  let bodyEnviado = null;
  w.fetch = (url, opts) => {
    if (String(url).includes("/api/guardar")) {
      bodyEnviado = opts.body;
      return Promise.resolve({ ok: true, status: 200 });
    }
    return Promise.resolve({ ok: false, status: 404, text: () => Promise.stringify("") });
  };
  $("#btnGuardar").click();
  await new Promise(r => setTimeout(r, 80));
  t("POST a /api/guardar", bodyEnviado !== null);
  t("body es catalogo.js válido", /^\/\/ NORTE[\s\S]*window\.CATALOGO = \{/.test(bodyEnviado));
  const parseado = JSON.parse(bodyEnviado.replace(/[\s\S]*?window\.CATALOGO = /, "").replace(/;\s*$/, ""));
  t("el JSON serializa todo el catálogo", !!parseado.ui && !!parseado.planes && !!parseado.ofertas);
  t("edición reflejada en el body", parseado.ui.marca.nombre === "Brújula");
  t("marca como guardado", $("#estadoEdicion").textContent === "Guardado");
  t("indica éxito del servidor", /servidor|actualizado/i.test($("#avisoServer").textContent),
     $("#avisoServer").textContent);

  console.log("--- PANEL: guardar sin servidor (fallback) ---");
  const w2 = nuevaVentana();
  await esperarCarga(w2);
  let descargado = null;
  w2.URL.createObjectURL = () => "blob:x";
  w2.URL.revokeObjectURL = () => {};
  w2.HTMLAnchorElement.prototype.click = function () { descargado = this.download; };
  w2.fetch = () => Promise.reject(new Error("sin red"));
  const A2 = w2.__admin;
  A2.set("ui.marca.sub", "Descargable");
  w2.document.querySelector("#btnGuardar").click();
  await new Promise(r => setTimeout(r, 100));
  t("fallback descarga catalogo.js", descargado === "catalogo.js", String(descargado));
  t("avisa que no hubo servidor", /no disponible|descargó/i.test(w2.document.querySelector("#avisoServer").textContent),
     w2.document.querySelector("#avisoServer").textContent);

  console.log("--- COHERENCIA con la app ---");
  t("index.html consume ui via data-ui", /data-ui="ui\.menu\.items\.hoy"/.test(indexHtml));
  t("index.html sin menú hardcodeado", !/<button class="on" data-vista="hoy">\s*Hoy\b/.test(indexHtml));
  t("app.js pinta la UI desde el catálogo", appJs.includes("pintarUI"));
  t("app.js usa saludos del catálogo", appJs.includes("CAT.ui.saludo"));
  t("app.js usa nombres de menú del catálogo", appJs.includes("CAT.ui.menu.items") || appJs.includes("ui.menu.items"));
  t("admin no rompe el catálogo: ui.pasos 3", Array.isArray(w.CATALOGO.ui.pasos) && w.CATALOGO.ui.pasos.length === 3);

  console.log("\n================================");
  console.log("RESULTADO: " + ok + " OK / " + fallos + " FAIL");
  if (fallos) { console.log("FALLARON:"); detalle.forEach(f => console.log(" - " + f)); }
  w.close(); w2.close();
  process.exit(fallos ? 1 : 0);
}

main().catch(e => { console.error("ERROR FATAL:", e); process.exit(1); });
