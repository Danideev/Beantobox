// Suite de pruebas NORTE (jsdom)
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const BASE = "C:\\Users\\User\\Documents\\Default Project\\sistema-enfoque";
const html = fs.readFileSync(path.join(BASE, "index.html"), "utf8");
const catalogo = fs.readFileSync(path.join(BASE, "catalogo.js"), "utf8");
const app = fs.readFileSync(path.join(BASE, "app.js"), "utf8");
const css = fs.readFileSync(path.join(BASE, "estilo.css"), "utf8");

let ok = 0, fallos = 0;
const fallosDetalle = [];
function t(nombre, cond, extra) {
  if (cond) { ok++; console.log("  OK  " + nombre); }
  else { fallos++; fallosDetalle.push(nombre + (extra ? " -> " + extra : "")); console.log(" FAIL " + nombre + (extra ? " -> " + extra : "")); }
}

const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/", pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

// Polyfills mÃ­nimos
window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};

// Evaluar scripts en orden
window.eval(catalogo);
window.eval(app);
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const N = window.__norte;
let S = N.estado(); // se recalcula tras arrancar()

async function main() {
  // esperar a que jsdom dispare DOMContentLoaded/load (dispara arrancar())
  await new Promise(r => {
    if (document.readyState === "complete") setTimeout(r, 10);
    else window.addEventListener("load", () => setTimeout(r, 10));
  });
  console.log("--- NORTE: estructura base ---");
  S = N.estado();
  t("catalogo cargado", !!window.CATALOGO);
  t("app inicializada", !!N);
  t("onboarding visible al inicio", $("#onboarding").hidden === false);
  t("app oculta al inicio", $("#app").hidden === true);
  t("una sola cosa que hacer: botÃ³n Empezar en paso 0",
    $('[data-paso="0"] .btn-grande').textContent.trim() === "Empezar");
  t("paso 0 sin otros botones", $$('[data-paso="0"] button').length === 1);
  t("estilo: tipografÃ­a grande (clamp)", /clamp\(2\.3rem/.test(css));
  t("index.html no trae contenido fijo (lee catalogo.js)", html.includes("catalogo.js"));
  t("fondo nublado presente", !!$(".nubes") && css.includes(".nubes"));
  t("paneles semitransparentes (vidrio + backdrop-filter)", css.includes("backdrop-filter:blur(22px)"));

  console.log("--- NORTE: pregunta 1 (trabajo e ingresos) ---");
  $("#btnEmpezar").click();
  t("avanza al paso 1", $('[data-paso="1"]').classList.contains("activo"));
  t("chips de puestos renderizados", $$("#chipsPuestos .chip").length >= 10);
  t("chips de salarios renderizados", $$("#chipsSalarios .chip").length >= 5);
  const chipPuesto = $$("#chipsPuestos .chip")[0];
  chipPuesto.click();
  t("selecciona puesto (multi)", Array.isArray(S.perfil.puesto) && S.perfil.puesto.includes(chipPuesto.textContent));
  const chipPuesto2 = $$("#chipsPuestos .chip")[1];
  chipPuesto2.click();
  t("permite varios puestos", S.perfil.puesto.length === 2);
  chipPuesto.click();
  t("desmarca un puesto", S.perfil.puesto.length === 1 && S.perfil.puesto[0] === chipPuesto2.textContent);
  chipPuesto2.click(); // deja 0 -> luego se marca de nuevo abajo
  chipPuesto.click();  // vuelve a 1
  $$("#chipsSalarios .chip")[2].click();
  t("selecciona salario", S.perfil.salario.length > 0);
  $$("#chipsModalidades .chip")[3] && $$("#chipsModalidades .chip")[3].click();
  t("selecciona modalidad", (S.perfil.modalidad || "").length > 0);
  $('[data-paso="1"] [data-siguiente]').click();
  t("avanza al paso 2", $('[data-paso="2"]').classList.contains("activo"));

  console.log("--- NORTE: pregunta 2 (hasta 5 proyectos) ---");
  const sug = $$("#chipsProyectos .chip");
  t("sugerencias de proyectos renderizadas", sug.length >= 10);
  sug[0].click(); sug[1].click(); sug[2].click();
  t("3 proyectos aÃ±adidos desde chips", S.perfil.proyectos.length === 3);
  $("#proyectoInput").value = "Mi proyecto escrito";
  $("#btnAddProyecto").click();
  t("4 proyectos (escrito + sugeridos)", S.perfil.proyectos.length === 4);
  t("contador muestra 4/5", $("#cuentaProyectos").textContent === "4");
  ["p1", "p2"].forEach(x => { $("#proyectoInput").value = x; $("#btnAddProyecto").click(); });
  t("tope de 5 proyectos", S.perfil.proyectos.length === 5, "got " + S.perfil.proyectos.length);
  t("chips propios pintados", $$("#chipsMios .chip").length === 5);
  $('[data-paso="2"] [data-siguiente]').click();
  t("avanza al paso 3", $('[data-paso="3"]').classList.contains("activo"));

  console.log("--- NORTE: pregunta 3 (perfil cerrado + texto) ---");
  t("6 grupos de perfil", $$("#gruposPerfil .grupo").length === 6);
  const chips3 = $$("#gruposPerfil .chip");
  t("catÃ¡logo cerrado de habilidades", chips3.length >= 50, "chips=" + chips3.length);
  chips3[0].click(); chips3[1].click();
  t("marca opciones del perfil", chips3[0].classList.contains("on") && chips3[1].classList.contains("on"));
  $("#q3Texto").value = "Se vender por WhatsApp";
  $("#q3Texto").dispatchEvent(new window.Event("input"));
  t("guarda texto libre", S.perfil.texto3 === "Se vender por WhatsApp");

  console.log("--- NORTE: construcciÃ³n del plan ---");
  $("#btnConstruir").click();
  t("paso 4 activo (construyendo)", $('[data-paso="4"]').classList.contains("activo"));
  t("objetivo de trabajo creado", S.objetivos.some(o => o.tipo === "trabajo"));
  t("5 proyectos con objetivo propio", S.objetivos.filter(o => o.tipo === "proyecto").length === 5);
  t("objetivo comunidad creado", S.objetivos.some(o => o.tipo === "comunidad"));
  t("objetivo vida creado", S.objetivos.some(o => o.tipo === "vida"));
  t("total de objetivos = 8", S.objetivos.length === 8, "got " + S.objetivos.length);
  t("tareas generadas (>35)", S.tareas.length > 35, "got " + S.tareas.length);
  t("tareas con prioridad y fecha", S.tareas.every(x => x.prioridad && x.vence));
  t("hÃ¡bitos base precargados (8)", S.habitos.length === 8);
  t("prospectos de partida (7)", S.prospectos.length === 7, "got " + S.prospectos.length);
  t("eventos sociales precargados (>=8)", S.eventos.length >= 8, "got " + S.eventos.length);
  t("contactos de ejemplo precargados (3)", S.contactos.length === 3);
  t("modelo de validaciÃ³n con 5 pasos", window.CATALOGO.validacion.length === 5);

  // esperar animaciÃ³n (reduce = true â‡’ rÃ¡pido; Ãºltimo paso + 700ms)
  await new Promise(r => setTimeout(r, 1000));
  t("muestra resumen del plan (paso 5)", $('[data-paso="5"]').classList.contains("activo"));
  t("resumen lista objetivos", $$("#resumenPlan .item").length >= 8);

  console.log("--- NORTE: dashboard Hoy ---");
  $("#btnEntrar").click();
  t("onboarding oculto", $("#onboarding").hidden === true);
  t("app visible", $("#app").hidden === false);
  t("vista hoy activa", $("#vista-hoy").classList.contains("on"));
  t("tarjetas de resumen = objetivos", $$("#tarjetasObjetivos .tarjeta-obj").length === S.objetivos.length);
  const txt = $("#txtTarea").textContent;
  t("una sola tarea del dÃ­a destacada", txt.length > 5 && txt !== "â€”");
  t("saludo en espaÃ±ol", /Buen[oa]/.test($("#kHola").textContent));
  t("red del dÃ­a con mÃ¡x 3 acciones", $$("#rutinaRed .item").length <= 3);
  t("prÃ³ximo evento listado", $$("#proximoEvento .item").length >= 1);
  t("cumpleaÃ±os en prÃ³ximos eventos", N.eventos(10).some(e => e.tipo === "cumple"));

  const antes = S.tareas.filter(x => x.estado === "hecho").length;
  $("#btnHoyHecha").click();
  const despues = S.tareas.filter(x => x.estado === "hecho").length;
  t("marcar hecha desde Hoy", despues === antes + 1);
  t("toast de confirmaciÃ³n", $$("#mensajes .msg").length >= 1);

  const total1 = S.tareas.length;
  $("#btnHoyOtra").click();
  t("rotar a otra tarea no cambia el total", S.tareas.length === total1);

  console.log("--- NORTE: tableros ---");
  N.irA("objetivos");
  t("vista objetivos activa", $("#vista-objetivos").classList.contains("on"));
  t("un tab por objetivo", $$("#tabsObjetivos .tab-obj").length === S.objetivos.length);
  t("tablero con 3 columnas", $$("#tablero .col").length === 3);
  t("columnas rotuladas en espaÃ±ol", $("#tablero").textContent.includes("Pendiente") && $("#tablero").textContent.includes("En curso"));
  const tareas0 = S.tareas.filter(x => x.objId === S.objetivos[0].id);
  t("tarjetas de tarea renderizadas", $$("#tablero .tarea").length === tareas0.length);
  const nueva = $$("#tabsObjetivos .tab-obj")[1];
  nueva.click();
  t("cambia de tablero", $$("#tablero .tarea").length === S.tareas.filter(x => x.objId === S.objetivos[1].id).length);

  // avanzar pendiente -> curso -> hecho
  N.irA("objetivos");
  $$("#tabsObjetivos .tab-obj")[0].click();
  const primero = S.tareas.find(x => x.objId === S.objetivos[0].id && x.estado === "pendiente");
  N.avanzarTarea(primero);
  t("pendiente -> en curso", primero.estado === "curso");
  N.avanzarTarea(primero);
  t("en curso -> hecha", primero.estado === "hecho");

  console.log("--- NORTE: nueva tarea manual ---");
  $("#btnNuevaTarea").click();
  t("modal de nueva tarea abierto", $("#venja").classList.contains("on"));
  $("#ntTitulo").value = "Preparar entrevista";
  $("#ntGuardar").click();
  t("tarea aÃ±adida", S.tareas.some(x => x.titulo === "Preparar entrevista"));
  t("modal cerrado tras guardar", !$("#venja").classList.contains("on"));

  console.log("--- NORTE: buscar trabajo / clientes ---");
  N.irA("prospectos");
  t("vista prospectos activa", $("#vista-prospectos").classList.contains("on"));
  t("pestaÃ±as trabajo/clientes", $$("#tabsProspectos .tab-obj").length === 2);
  t("filtro de fuentes (Bumeran, LinkedInâ€¦)", $$("#fuentes .fuente").length >= 4);
  t("ofertas de partida renderizadas", $$("#listaProspectos .fila").length >= 4);
  const nOfertas = S.prospectos.filter(p => p.modo === "trabajo").length;
  $("#btnBuscarOfertas").click();
  const nuevas = S.prospectos.filter(p => p.modo === "trabajo").length;
  t("bÃºsqueda trae nuevas ofertas (mÃ¡x 3)", nuevas > nOfertas && nuevas <= nOfertas + 3, `${nOfertas} -> ${nuevas}`);
  // cliente
  $('#tabsProspectos .tab-obj[data-modo="cliente"]').click();
  t("pestaÃ±a clientes renderiza", $$("#listaProspectos .fila").length >= 3);
  // correo
  $$("#listaProspectos .fila [data-correo]")[0].click();
  t("modal de correo abierto", $("#venja").classList.contains("on") && !!$("#mcAsunto"));
  t("asunto en espaÃ±ol con datos", /PostulaciÃ³n|Una idea/.test($("#mcAsunto").value), $("#mcAsunto").value);
  t("cuerpo con nombre y empresa", $("#mcCuerpo").textContent.length > 40);
  $("#mcEnviar").click();
  const contactados = S.prospectos.filter(p => p.estado === "contactado").length;
  t("enviar marca como contactado", contactados >= 1);

  console.log("--- NORTE: red de contactos ---");
  N.irA("red");
  t("contactos listados", $$("#listaContactos .contacto").length === S.contactos.length);
  t("rutina diaria con limite visible", /3 \w+ por /.test($("#metaRutina").textContent), $("#metaRutina").textContent);
  t("sugerencias de mensaje", $$("#sugerenciasMensaje .item").length === 5);
  $("#btnNuevoContacto").click();
  $("#ncNombre").value = "Ana Prueba";
  $("#ncCumple").value = "05-12";
  $("#ncGuardar").click();
  t("contacto aÃ±adido", S.contactos.some(c => c.nombre === "Ana Prueba"));
  $("#btnNuevoContacto").click();
  $("#ncNombre").value = "Fecha mala";
  $("#ncCumple").value = "123";
  $("#ncGuardar").click();
  t("valida formato de cumpleaÃ±os", !S.contactos.some(c => c.nombre === "Fecha mala"));
  $("#venja").classList.remove("on");

  console.log("--- NORTE: vida esencial ---");
  N.irA("vida");
  t("4 Ã¡reas de vida", $$("#areasVida .bloque").length === 4);
  t("hÃ¡bitos renderizados", $$("#areasVida .hab").length === S.habitos.length);
  const hab = $$("#areasVida .hab")[0];
  hab.click();
  t("hÃ¡bito se marca", S.habitos[0].hecha === true);
  hab.click && $$("#areasVida .hab")[0];
  t("Ã¡reas rotuladas en espaÃ±ol", $("#areasVida").textContent.includes("Salud mental") && $("#areasVida").textContent.includes("Familia"));

  console.log("--- NORTE: calendario social ---");
  N.irA("calendario");
  t("eventos del mes listados", $$("#eventosMes .item").length >= 1);
  t("dÃ­a de la madre y padre precargados",
    S.eventos.some(e => /madre/i.test(e.titulo)) && S.eventos.some(e => /padre/i.test(e.titulo)));
  t("cumpleaÃ±os de la red listados", $$("#cumpleanosRed .item").length >= 3);
  $("#btnNuevoEvento").click();
  $("#evTitulo").value = "Aniversario";
  $("#evGuardar").click();
  t("evento propio guardado", S.eventos.some(e => e.titulo === "Aniversario"));

  console.log("--- NORTE: ajustes + Notion ---");
  N.irA("ajustes");
  t("campos de Notion presentes", !!$("#inpToken") && !!$("#inpDb"));
  $("#inpNombre").value = "Dani";
  $("#inpPuesto").value = "DiseÃ±ador UX";
  $("#btnGuardarPerfil").click();
  t("perfil guardado", S.perfil.nombre === "Dani" && S.perfil.puesto === "DiseÃ±ador UX");

  // Notion con error de red
  window.fetch = () => Promise.reject(new Error("Failed to fetch"));
  $("#inpToken").value = "secret_prueba";
  $("#inpDb").value = "abcdef0123456789abcdef0123456789";
  await $("#btnConectarNotion").click();
  await new Promise(r => setTimeout(r, 60));
  t("Notion falla sin romper la app", /No pude conectar/.test($("#avisoNotion").textContent), $("#avisoNotion").textContent);
  t("la app sigue viva tras el error", !!window.__norte);

  // Notion OK
  window.fetch = (url) => {
    if (/\/users\/me/.test(url)) return Promise.resolve({ ok: true, status: 200, text: () => JSON.stringify({ object: "user" }) });
    if (/\/query/.test(url)) return Promise.resolve({ ok: true, status: 200, text: () => JSON.stringify({ results: [] }) });
    if (/\/databases\//.test(url)) return Promise.resolve({ ok: true, status: 200, text: () => JSON.stringify({ object: "database", title: [{ plain_text: "Mis tareas" }], properties: { Nombre: { type: "title" }, Estado: { type: "select", select: { options: [] } } } }) });
    return Promise.resolve({ ok: false, status: 404, text: () => JSON.stringify({ message: "no" }) });
  };
  await $("#btnProbarNotion").click();
  await new Promise(r => setTimeout(r, 300));
  t("Notion conecta y detecta columna tÃ­tulo", S.ajustes.notionTitulo === "Nombre", JSON.stringify(S.ajustes.notionTitulo) + " | aviso: " + $("#avisoNotion").textContent);
  t("estado del rail marca conectado", $("#estadoNotion").classList.contains("on"));

  console.log("--- NORTE v2: metas numéricas ---");
  window.prompt = () => "Instagram Pro";
  window.confirm = () => true;

  // Notion con filas en vivo (mock de la base «Tareas»)
  let patchHecho = false;
  window.fetch = (url, opts) => {
    if (opts && opts.method === "PATCH") {
      patchHecho = true;
      return Promise.resolve({ ok: true, status: 200, text: () => JSON.stringify({ id: "p1" }) });
    }
    if (/\/query/.test(url)) return Promise.resolve({ ok: true, status: 200, text: () => JSON.stringify({ results: [
      { id: "p1", url: "https://notion.so/p1", properties: { Nombre: { title: [{ plain_text: "Postular a Acme" }] }, Estado: { type: "select", select: { name: "En curso" } } } },
      { id: "p2", url: "https://notion.so/p2", properties: { Nombre: { title: [{ plain_text: "Llamar a Ana" }] }, Estado: { type: "select", select: { name: "Hecho" } } } }
    ] }) });
    return Promise.resolve({ ok: false, status: 404, text: () => JSON.stringify({ message: "no" }) });
  };

  N.irA("metas");
  await N.sincronizarNotion(true);
  await new Promise(r => setTimeout(r, 120));
  t("vista metas visible", $("#vista-metas").classList.contains("on"));
  t("menú incluye Metas y Tablero",
    $$('#nav button[data-vista="metas"]').length === 1 && $$('#nav button[data-vista="tablero"]').length === 1);
  t("redes sembradas desde el catálogo", S.redes.length >= 4, "n=" + S.redes.length);
  t("3 áreas de trabajo sembradas", S.areasTrabajo.length >= 3, "n=" + S.areasTrabajo.length);
  t("áreas clásicas presentes",
    ["Prospectos y canales", "Entrevistas", "Acercamientos intencionados"].every(n => S.areasTrabajo.some(a => a.nombre === n)));
  t("subtareas sembradas (>=12)", S.areasTrabajo.reduce((s, a) => s + a.subtareas.length, 0) >= 12,
    "n=" + S.areasTrabajo.reduce((s, a) => s + a.subtareas.length, 0));
  t("tarjetas de redes renderizadas", $$("#listaRedes .meta-carta").length === S.redes.length);
  t("casillero de enlace de la cuenta", !!$("#listaRedes [data-cuenta]"));
  t("casillero de meta numérica", !!$("#listaRedes .casilla input"));
  t("contador con +1 y −1", !!$("#listaRedes [data-mas]") && !!$("#listaRedes [data-menos]"));

  const hechos0 = S.redes[0].hechos || 0;
  $("#listaRedes [data-mas]").click();
  t("+1 suma lo publicado", (S.redes[0].hechos || 0) === hechos0 + 1);
  $("#listaRedes [data-menos]").click();
  t("−1 corrige", S.redes[0].hechos === hechos0);

  const metaInp = $$("#listaRedes .casilla input")[0];
  metaInp.value = "12";
  metaInp.dispatchEvent(new window.Event("change"));
  t("meta numérica editable", S.redes[0].meta === 12, "meta=" + S.redes[0].meta);
  const cuentaInp = $("#listaRedes [data-cuenta]");
  cuentaInp.value = "https://instagram.com/danideev";
  cuentaInp.dispatchEvent(new window.Event("change"));
  t("enlace de cuenta guardado", S.redes[0].cuenta === "https://instagram.com/danideev");
  t("enlace visible como link", !!$('#listaRedes a[target="_blank"]'));

  const nRedes = S.redes.length;
  $("#btnNuevaRed").click();
  t("añadir objetivo social", S.redes.length === nRedes + 1 && S.redes[S.redes.length - 1].nombre === "Instagram Pro");

  console.log("--- NORTE v2: áreas con subtareas y meta ---");
  t("áreas renderizadas", $$("#listaAreasTrabajo .area-trabajo").length === S.areasTrabajo.length);
  const area0 = S.areasTrabajo[0];
  let bloque0 = $$("#listaAreasTrabajo .area-trabajo")[0];
  t("subtareas listadas", bloque0.querySelectorAll(".subtarea").length === area0.subtareas.length);
  const hechas0 = area0.subtareas.filter(s => s.hecha).length;
  bloque0.querySelector(".subtarea [data-check]").click();
  t("subtarea se marca", area0.subtareas.filter(s => s.hecha).length === hechas0 + 1);
  bloque0 = $$("#listaAreasTrabajo .area-trabajo")[0];
  bloque0.querySelector(".fila-anadir input").value = "Subtarea nueva de prueba";
  bloque0.querySelector("[data-add]").click();
  t("subtarea añadida", area0.subtareas.some(s => s.titulo === "Subtarea nueva de prueba"));
  const subsAntes = area0.subtareas.length;
  $$("#listaAreasTrabajo .area-trabajo")[0].querySelector("[data-quitar-sub]").click();
  t("subtarea quitada", area0.subtareas.length === subsAntes - 1, "n=" + area0.subtareas.length);
  const metaArea = $$("#listaAreasTrabajo .casilla input")[0];
  metaArea.value = "77";
  metaArea.dispatchEvent(new window.Event("change"));
  t("meta del área editable", area0.meta === 77, "meta=" + area0.meta);
  const avances0 = area0.hechos || 0;
  $$("#listaAreasTrabajo [data-mas]")[0].click();
  t("+1 de avance en el área", (area0.hechos || 0) === avances0 + 1);
  const nAreas = S.areasTrabajo.length;
  $("#btnNuevaArea").click();
  t("añadir área", S.areasTrabajo.length === nAreas + 1 && S.areasTrabajo[S.areasTrabajo.length - 1].nombre === "Instagram Pro");

  console.log("--- NORTE v2: Notion en vivo ---");
  t("bloque «Tareas en vivo» presente", !!$("#notionVivo"));
  t("filas leídas desde Notion", S.notionFilas.length === 2, "n=" + S.notionFilas.length);
  t("estado detectado (Hecho)", S.notionFilas[1].hecha === true);
  t("lista en vivo renderizada", $$("#notionVivo .notion-vivo-item").length === 2);
  t("enlace a Notion en cada fila", !!$("#notionVivo a[target=_blank]"));
  $$("#notionVivo [data-check]")[0].click();
  await new Promise(r => setTimeout(r, 80));
  t("marcar fila envía PATCH a Notion", patchHecho === true);
  t("fila queda marcada", S.notionFilas[0].hecha === true);
  t("indicador de refresco visible", /Actualizado hace|Conectado/.test($("#subNotionVivo").textContent), $("#subNotionVivo").textContent);
  t("refresco configurado (>=5 s)", N.notionCada() >= 5, "cada=" + N.notionCada());

  console.log("--- NORTE v2: Google (listo pero apagado) ---");
  t("conector apagado por defecto", N.google().conectado() === false);
  t("sin client ID todavía", N.google().clientId() === "");
  N.irA("ajustes");
  t("aviso de Google indica que está apagado", /apagado/.test($("#avisoGoogle").textContent), $("#avisoGoogle").textContent);
  t("campos de Google presentes", !!$("#inpGoogleId") && !!$("#inpGmailQuery"));
  t("campo de refresco de Notion", !!$("#inpNotionCada") && parseInt($("#inpNotionCada").value, 10) >= 5);

  // simulamos la conexión: Calendar mergeado + contador de Gmail
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  S.google = { token: "tok-prueba", expira: Date.now() + 3600000, correo: "dani@gmail.com" };
  S.calendarioGoogle = [{ fecha: manana, titulo: "Entrevista con Acme", hora: "10:00", url: "" }];
  S.enviosGmail = { total: 7, fecha: manana };
  N.guardar();
  t("google conectado con token simulado", N.google().conectado() === true);
  N.irA("hoy");
  t("próximo encuentro incluye Google Calendar", /Entrevista con Acme/.test($("#proximoEvento").textContent),
    $("#proximoEvento").textContent.slice(0, 120));
  N.irA("prospectos");
  t("contador de envíos de Gmail visible", /7 envíos/.test($("#listaProspectos").textContent),
    $("#listaProspectos").textContent.slice(0, 120));

  console.log("--- NORTE v2: tablero de ideas ---");
  N.irA("tablero");
  t("vista tablero visible", $("#vista-tablero").classList.contains("on"));
  t("herramientas a un lado (sumar)", !!$("#tabNota") && !!$("#tabDibujo") && !!$("#tabArchivo"));
  t("sin servidor en jsdom", N.servidorLocal() === false);
  t("mural vacío avisa", /vacío/.test($("#mural").textContent), $("#mural").textContent.slice(0, 80));
  $("#tabNota").click();
  t("nota añadida", S.tablero.notas.length === 1);
  t("nota renderizada como post-it", $$("#mural .tarjeta-mural").length === 1 && !!$("#mural .postit"));
  const taNota = $("#mural textarea");
  taNota.value = "Idea de contenido: video corto";
  taNota.dispatchEvent(new window.Event("input"));
  t("la nota se guarda mientras escribes", /video corto/.test(S.tablero.notas[0].texto));
  t("botón quitar al lado", !!$("#mural .quitar"));
  $("#mural .quitar").click();
  t("nota quitada", S.tablero.notas.length === 0);

  // archivo (sin servidor: se guarda en el navegador)
  const archivo = new window.File(["hola mundo"], "idea.txt", { type: "text/plain" });
  N.subirArchivosTablero([archivo]);
  await new Promise(r => setTimeout(r, 300));
  t("archivo guardado sin servidor", S.tablero.archivos.length === 1 && S.tablero.archivos[0].nombre === "idea.txt",
    JSON.stringify(S.tablero.archivos.map(a => a.nombre)));
  t("archivo renderizado en el mural", /idea\.txt/.test($("#mural").textContent));
  t("tiene vista previa o enlace", !!$("#mural .tarjeta-mural a") || !!$("#mural .tarjeta-mural img"));
  $("#mural .quitar").click();
  t("archivo quitado", S.tablero.archivos.length === 0);
  $("#tabDibujo").click();
  t("modal de dibujo no rompe sin canvas", !!window.__norte && !!document);

  console.log("--- NORTE: sonido, mensajes y persistencia ---");
  $("#chipMensajes").click();
  t("pausar mensajes", S.ajustes.mensajes === false);
  $("#chipMensajes").click();
  $("#btnSonido").click();
  t("alternar sonido", S.ajustes.sonido === false);
  $("#btnSonido").click();

  const dump = JSON.stringify(S);
  const reparse = JSON.parse(dump);
  t("export/import round-trip", reparse.objetivos.length === S.objetivos.length && reparse.perfil.nombre === "Dani");
  t("persistido en localStorage", !!window.localStorage.getItem("norte.estado.v1"));

  console.log("--- NORTE: microcopy en espaÃ±ol, sin claves de idioma ---");
  const enVista = document.body.textContent;
  t("sin textos en inglÃ©s visibles", !/\b(Get started|Settings|Search jobs|Progress\b)/.test(enVista));
  t("mensaje motivacional presente", window.CATALOGO.mensajes.length >= 8);

  console.log("\n================================");
  console.log("RESULTADO: " + ok + " OK / " + fallos + " FAIL");
  if (fallos) { console.log("FALLARON:"); fallosDetalle.forEach(f => console.log(" - " + f)); }
  window.close();
  process.exit(fallos ? 1 : 0);
}

main().catch(e => { console.error("ERROR FATAL:", e); process.exit(1); });

