/* ============================================================
   NORTE · panel de administración de catalogo.js
   Edita contenidos, menú, botones y preguntas iniciales.
   Guarda en el servidor (POST /api/guardar) o descarga el archivo.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  var ORIGINAL = clone(window.CATALOGO || {});   // lo que trajo el servidor
  var D = clone(ORIGINAL);                        // lo que se está editando
  var sucio = false;
  var notasOK = false;                            // ¿el servidor confirmó guardar?

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>\"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------------- avisos ---------------- */
  function aviso(titulo, texto, tipo) {
    var c = $("#mensajes");
    var el = document.createElement("div");
    el.className = "msg" + (tipo ? " " + tipo : "");
    el.innerHTML = "<b></b><span></span>";
    el.firstChild.textContent = titulo || "";
    el.lastChild.textContent = texto || "";
    c.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .35s, transform .35s";
      el.style.opacity = "0"; el.style.transform = "translateY(12px)";
      setTimeout(function () { el.remove(); }, 380);
    }, 4600);
  }

  /* ---------------- rutas ---------------- */
  function get(ruta) {
    return ruta.split(".").reduce(function (o, k) { return (o == null) ? undefined : o[k]; }, D);
  }
  function set(ruta, valor) {
    var partes = ruta.split(".");
    var ultimo = partes.pop();
    var obj = partes.reduce(function (o, k) { return o[k]; }, D);
    obj[ultimo] = valor;
  }
  function marcarSucio() {
    if (!sucio) {
      sucio = true;
      var e = $("#estadoEdicion");
      e.textContent = "Cambios sin guardar";
      e.classList.remove("limpio");
    }
  }

  /* ---------------- constructores de edición ---------------- */
  function campoTexto(ruta, etiqueta, multilinea, placeholder) {
    var d = document.createElement("div");
    d.className = "ed-campo";
    var id = "f_" + ruta.replace(/[^a-z0-9]/gi, "_");
    d.innerHTML = '<label for="' + id + '">' + esc(etiqueta) + "</label>";
    var el = document.createElement(multilinea ? "textarea" : "input");
    el.id = id;
    if (placeholder) el.placeholder = placeholder;
    var v = get(ruta);
    el.value = (v == null) ? "" : v;
    el.addEventListener("input", function () { set(ruta, el.value); marcarSucio(); });
    d.appendChild(el);
    return d;
  }

  function etiquetaRuta(ruta) {
    // "ui.enc.hoy.h2" -> "enc.hoy · h2"
    var p = ruta.split(".");
    p.shift(); // ui
    if (p[0] === "pasos") return "paso " + (parseInt(p[1], 10) + 1) + " · " + p.slice(2).join(".");
    if (p[0] === "menu") return "menú · " + p.slice(1).join(".");
    return p.join(" · ");
  }

  function rellenar(contenedor, rutas) {
    var c = $(contenedor); if (!c) return;
    c.innerHTML = "";
    rutas.forEach(function (r) { c.appendChild(campoTexto(r, etiquetaRuta(r))); });
  }

  /* lista de strings: añadir / editar / quitar */
  function listaStrings(ruta, contenedor, placeholder) {
    var c = $(contenedor); if (!c) return;
    var arr = get(ruta);
    if (!Array.isArray(arr)) { c.innerHTML = '<div class="ed-nota">No encontré la lista ' + esc(ruta) + "</div>"; return; }
    c.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "lista-edit";
    arr.forEach(function (item, i) {
      var fila = document.createElement("div");
      fila.className = "fila-edit";
      var inp = document.createElement("input");
      inp.value = item;
      inp.setAttribute("aria-label", "Elemento " + (i + 1));
      inp.addEventListener("input", function () { arr[i] = inp.value; marcarSucio(); });
      var q = document.createElement("button");
      q.className = "borrar"; q.type = "button"; q.textContent = "✕";
      q.setAttribute("aria-label", "Quitar " + item);
      q.addEventListener("click", function () { arr.splice(i, 1); marcarSucio(); listaStrings(ruta, contenedor, placeholder); });
      fila.appendChild(inp); fila.appendChild(q);
      wrap.appendChild(fila);
    });
    c.appendChild(wrap);

    var anadir = document.createElement("div");
    anadir.className = "anadir";
    var nuevo = document.createElement("input");
    nuevo.placeholder = placeholder || "Añadir…";
    var btn = document.createElement("button");
    btn.className = "btn btn-medio btn-mini"; btn.type = "button"; btn.textContent = "+ Añadir";
    var agregar = function () {
      var v = nuevo.value.trim();
      if (!v) return;
      arr.push(v); marcarSucio(); listaStrings(ruta, contenedor, placeholder);
    };
    btn.addEventListener("click", agregar);
    nuevo.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); agregar(); } });
    anadir.appendChild(nuevo); anadir.appendChild(btn);
    c.appendChild(anadir);
  }

  /* lista de objetos: editar varias propiedades por fila */
  function listaObjetos(ruta, contenedor, campos) {
    var c = $(contenedor); if (!c) return;
    var arr = get(ruta);
    if (!Array.isArray(arr)) { c.innerHTML = '<div class="ed-nota">No encontré la lista ' + esc(ruta) + "</div>"; return; }
    c.innerHTML = "";

    arr.forEach(function (item, i) {
      var fila = document.createElement("div");
      fila.className = "fila-obj";
      var grid = document.createElement("div");
      grid.className = "campos";
      campos.forEach(function (f) {
        var d = document.createElement("div");
        d.className = "ed-campo";
        var id = "o_" + ruta.replace(/[^a-z0-9]/gi, "_") + "_" + i + "_" + f.k;
        d.innerHTML = '<label for="' + id + '">' + esc(f.label) + "</label>";
        var el = document.createElement(f.area ? "textarea" : "input");
        el.id = id;
        el.value = item[f.k] == null ? "" : item[f.k];
        el.addEventListener("input", function () {
          item[f.k] = (f.tipo === "numero") ? (parseFloat(el.value) || 0) : el.value;
          marcarSucio();
        });
        d.appendChild(el);
        grid.appendChild(d);
      });
      fila.appendChild(grid);

      var pie = document.createElement("div");
      pie.className = "pie-fila";
      var q = document.createElement("button");
      q.className = "borrar"; q.type = "button"; q.textContent = "✕ Quitar fila";
      q.addEventListener("click", function () { arr.splice(i, 1); marcarSucio(); listaObjetos(ruta, contenedor, campos); });
      pie.appendChild(q);
      fila.appendChild(pie);
      c.appendChild(fila);
    });

    var anadir = document.createElement("div");
    anadir.className = "anadir";
    var btn = document.createElement("button");
    btn.className = "btn btn-medio btn-mini"; btn.type = "button"; btn.textContent = "+ Añadir fila";
    btn.addEventListener("click", function () {
      var nuevo = {};
      campos.forEach(function (f) { nuevo[f.k] = (f.tipo === "numero") ? 0 : ""; });
      arr.push(nuevo); marcarSucio(); listaObjetos(ruta, contenedor, campos);
    });
    anadir.appendChild(btn);
    c.appendChild(anadir);
  }

  /* ---------------- secciones ---------------- */
  function pintarSeccion(sec) {
    if (sec === "marca") {
      rellenar("#campos-marca", ["ui.marca.nombre", "ui.marca.sub", "ui.marca.pie"]);
      var ci = $("#campos-inicio");
      ci.innerHTML = "";
      ci.appendChild(campoTexto("ui.inicio.titulo1", "Título · línea 1"));
      ci.appendChild(campoTexto("ui.inicio.titulo2", "Título · línea 2 (resaltada)"));
      ci.appendChild(campoTexto("ui.inicio.lede", "Texto de bienvenida", true));
      ci.appendChild(campoTexto("ui.inicio.btn", "Botón de entrada"));
      ci.appendChild(campoTexto("ui.inicio.aviso", "Nota bajo el botón"));
      rellenar("#campos-saludo", ["ui.saludo.manana", "ui.saludo.tarde", "ui.saludo.noche",
        "ui.hoy.titulo", "ui.hoy.limpio"]);
    }

    if (sec === "preguntas") pintarPreguntas();

    if (sec === "menu") {
      rellenar("#campos-menu-grupos", ["ui.menu.grupos.enfoque", "ui.menu.grupos.vida", "ui.menu.grupos.sistema"]);
      rellenar("#campos-menu-items", Object.keys(D.ui.menu.items).map(function (k) { return "ui.menu.items." + k; }));
      rellenar("#campos-menu-movil", Object.keys(D.ui.menu.movil).map(function (k) { return "ui.menu.movil." + k; }));
      rellenar("#campos-topbar", ["ui.topbar.menu", "ui.topbar.sonido"]);
    }

    if (sec === "botones") {
      rellenar("#campos-botones", Object.keys(D.ui.botones).map(function (k) { return "ui.botones." + k; }));
      rellenar("#campos-acciones", ["ui.acciones.volver", "ui.acciones.siguiente", "ui.acciones.construir",
        "ui.construyendo.marca", "ui.construyendo.sub", "ui.construyendo.titulo"]);
      rellenar("#campos-listo", ["ui.listo.titulo", "ui.listo.sub", "ui.listo.btn"]);
    }

    if (sec === "textos") pintarTextos();

    if (sec === "plan") {
      var cont = $("#planesDinamicos");
      cont.innerHTML = "";
      Object.keys(D.planes).forEach(function (clave) {
        var b = document.createElement("div");
        b.className = "bloque vidrio";
        b.style.marginBottom = "18px";
        b.innerHTML = '<div class="area">Plan · ' + esc(clave) + "</div>" +
          '<div class="ed-nota">Tareas que se generan para "' + esc(clave) + '". Prioridad: alta, media o baja. Días: plazo desde hoy.</div>';
        var destino = document.createElement("div");
        destino.id = "plan-" + clave;
        b.appendChild(destino);
        cont.appendChild(b);
        listaObjetos("planes." + clave, "#plan-" + clave, [
          { k: "titulo", label: "Tarea" },
          { k: "prioridad", label: "Prioridad" },
          { k: "dias", label: "Días desde hoy", tipo: "numero" }
        ]);
      });
      listaObjetos("validacion", "#campos-validacion", [
        { k: "paso", label: "Paso" },
        { k: "pregunta", label: "Pregunta" },
        { k: "entrega", label: "Entrega" }
      ]);
    }

    if (sec === "social") {
      listaObjetos("eventosFijos", "#campos-eventosFijos", [
        { k: "mmdd", label: "Mes-día (05-12)" }, { k: "titulo", label: "Nombre" }, { k: "tipo", label: "Tipo" }
      ]);
      listaObjetos("eventosMoviles", "#campos-eventosMoviles", [
        { k: "clave", label: "Clave" }, { k: "titulo", label: "Nombre" }, { k: "tipo", label: "Tipo" }
      ]);
      listaObjetos("habitosBase", "#campos-habitos", [
        { k: "area", label: "Área" }, { k: "titulo", label: "Ritual" }
      ]);
    }

    if (sec === "mensajes") {
      listaStrings("mensajes", "#lista-mensajes", "Escribe un mensaje que sostenga…");
      listaStrings("hitos", "#lista-hitos", "Texto al cumplir 3 tareas…");
      listaStrings("ui.construyendo.pasos", "#lista-pasosConstruir", "Paso de la construcción…");
    }

    if (sec === "ofertas") {
      listaStrings("fuentes", "#lista-fuentes", "Nombre de la bolsa…");
      listaObjetos("ofertas", "#lista-ofertas", [
        { k: "fuente", label: "Fuente" }, { k: "empresa", label: "Empresa" },
        { k: "puesto", label: "Puesto" }, { k: "lugar", label: "Lugar" }, { k: "rango", label: "Salario" }
      ]);
      listaObjetos("clientes", "#lista-clientes", [
        { k: "empresa", label: "Empresa" }, { k: "rubro", label: "Rubro" },
        { k: "contacto", label: "Contacto" }, { k: "cargo", label: "Cargo" }, { k: "ciudad", label: "Ciudad" }
      ]);
      rellenar("#campos-correo", ["correo.asuntoTrabajo", "correo.asuntoCliente"]);
      var cc = $("#campos-correoCuerpo");
      cc.innerHTML = "";
      ["correo.cuerpoTrabajo", "correo.cuerpoCliente"].forEach(function (r) {
        cc.appendChild(campoTexto(r, r.replace("correo.", "").replace("cuerpo", "Cuerpo · "), true));
      });
    }

    if (sec === "metas") {
      if (!D.areasMetas) D.areasMetas = { redes: [], trabajo: [] };
      if (!Array.isArray(D.areasMetas.redes)) D.areasMetas.redes = [];
      if (!Array.isArray(D.areasMetas.trabajo)) D.areasMetas.trabajo = [];
      listaObjetos("areasMetas.redes", "#redes-plantilla", [
        { k: "nombre", label: "Red u objetivo" },
        { k: "cuenta", label: "Enlace de la cuenta" },
        { k: "meta", label: "Meta de contenidos", tipo: "numero" }
      ]);
      pintarAreasPlantilla();
    }

    if (sec === "integraciones") {
      if (!D.integraciones) D.integraciones = { notionCada: 15, google: {} };
      if (!D.integraciones.google) D.integraciones.google = { clientId: "", calendarioId: "primary", queryGmail: "" };
      var cn = $("#campos-notion-int");
      cn.innerHTML = "";
      cn.appendChild(campoTexto("integraciones.notionCada", "Segundos entre refrescos de Notion", false, "15"));
      var cg = $("#campos-google");
      cg.innerHTML = "";
      cg.appendChild(campoTexto("integraciones.google.clientId", "Client ID de Google", false, "xxxx.apps.googleusercontent.com"));
      cg.appendChild(campoTexto("integraciones.google.calendarioId", "ID del calendario", false, "primary"));
      cg.appendChild(campoTexto("integraciones.google.queryGmail", "Búsqueda de Gmail · qué cuenta como envío", true, "in:sent postulación newer_than:30d"));
    }

    if (sec === "json") refrescarJSON();
  }

  /* plantilla de áreas de trabajo: nombre + meta numérica + subtareas */
  function pintarAreasPlantilla() {
    var cont = $("#areas-plantilla"); if (!cont) return;
    cont.innerHTML = "";
    var arr = D.areasMetas.trabajo;
    arr.forEach(function (area, i) {
      if (!Array.isArray(area.subtareas)) area.subtareas = [];
      var bloque = document.createElement("div");
      bloque.style.cssText = "border-top:1px solid var(--linea);padding-top:14px;margin-top:14px";
      var cab = document.createElement("div");
      cab.className = "ed-grid";
      cab.appendChild(campoTexto("areasMetas.trabajo." + i + ".nombre", "Nombre del área"));
      cab.appendChild(campoTexto("areasMetas.trabajo." + i + ".meta", "Meta numérica", false, "50"));
      bloque.appendChild(cab);

      var subs = document.createElement("div");
      subs.id = "subs-area-" + i;
      subs.style.marginTop = "8px";
      bloque.appendChild(subs);

      var quitar = document.createElement("button");
      quitar.className = "btn btn-suave btn-mini"; quitar.type = "button";
      quitar.textContent = "✕ Eliminar área";
      quitar.style.marginTop = "10px";
      quitar.setAttribute("aria-label", "Eliminar área " + area.nombre);
      quitar.addEventListener("click", function () {
        if (!confirm("¿Eliminar el área «" + area.nombre + "» de la plantilla?")) return;
        arr.splice(i, 1); marcarSucio(); pintarAreasPlantilla();
      });
      bloque.appendChild(quitar);
      cont.appendChild(bloque);
      listaStrings("areasMetas.trabajo." + i + ".subtareas", "#subs-area-" + i, "Añadir subtarea…");
    });

    var anadir = document.createElement("div");
    anadir.className = "anadir";
    anadir.style.marginTop = "16px";
    var inp = document.createElement("input");
    inp.placeholder = "Nueva área (ej: Portafolios)…";
    inp.setAttribute("aria-label", "Nueva área");
    var btn = document.createElement("button");
    btn.className = "btn btn-medio btn-mini"; btn.type = "button"; btn.textContent = "+ Añadir área";
    var crear = function () {
      var v = inp.value.trim(); if (!v) return;
      arr.push({ nombre: v, meta: 10, subtareas: [] });
      marcarSucio(); pintarAreasPlantilla();
    };
    btn.addEventListener("click", crear);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); crear(); } });
    anadir.appendChild(inp); anadir.appendChild(btn);
    cont.appendChild(anadir);
  }

  function pintarPreguntas() {
    var cont = $("#preguntasDinamicas");
    cont.innerHTML = "";
    D.ui.pasos.forEach(function (paso, i) {
      var b = document.createElement("div");
      b.className = "bloque vidrio";
      b.style.marginBottom = "18px";
      b.innerHTML = '<div class="area">Pregunta ' + (i + 1) + "</div>";
      var grid = document.createElement("div");
      grid.className = "ed-grid";
      b.appendChild(grid);
      cont.appendChild(b);

      var claves = Object.keys(paso).filter(function (k) { return k !== "grupos"; });
      claves.forEach(function (k) {
        var multilinea = k === "sub" || k === "phTexto";
        grid.appendChild(campoTexto("ui.pasos." + i + "." + k, k, multilinea));
      });

      if (paso.grupos) {
        var extra = document.createElement("div");
        extra.style.gridColumn = "1 / -1";
        extra.innerHTML = '<div class="area" style="margin-top:6px">Grupos de opciones cerradas (paso 3)</div>';
        var destino = document.createElement("div");
        destino.id = "grupos-paso3";
        extra.appendChild(destino);
        b.appendChild(extra);
        listaObjetos("ui.pasos." + i + ".grupos", "#grupos-paso3", [
          { k: "id", label: "Clave (sin espacios)" }, { k: "label", label: "Nombre visible" }
        ]);
      }
    });

    // opciones cerradas del cuestionario
    var opciones = document.createElement("div");
    opciones.className = "bloque vidrio";
    opciones.innerHTML = '<div class="area">Opciones cerradas que se marcan</div>';
    cont.appendChild(opciones);

    var bloques = [
      ["puestos", "Puestos (pregunta 1)"],
      ["salarios", "Salarios (pregunta 1)"],
      ["modalidades", "Modalidad (pregunta 1)"],
      ["proyectosSugeridos", "Proyectos sugeridos (pregunta 2)"]
    ];
    Object.keys(D.habilidades).forEach(function (g) {
      bloques.push(["habilidades." + g, "Perfil · " + g + " (pregunta 3)"]);
    });
    bloques.forEach(function (b, i) {
      var destino = document.createElement("div");
      destino.id = "opc_" + i;
      var titulo = document.createElement("div");
      titulo.className = "area";
      titulo.style.marginTop = i === 0 ? "0" : "20px";
      titulo.textContent = b[1];
      opciones.appendChild(titulo);
      opciones.appendChild(destino);
      listaStrings(b[0], "#opc_" + i, "Añadir opción…");
    });
  }

  function pintarTextos() {
    var cont = $("#encabezadosDinamicos");
    cont.innerHTML = "";
    Object.keys(D.ui.enc).forEach(function (vista) {
      var b = document.createElement("div");
      b.className = "bloque vidrio";
      b.style.marginBottom = "18px";
      b.innerHTML = '<div class="area">Pantalla · ' + esc(vista) + "</div>";
      var grid = document.createElement("div");
      grid.className = "ed-grid";
      ["k", "h2", "p"].forEach(function (k) {
        grid.appendChild(campoTexto("ui.enc." + vista + "." + k, k === "k" ? "Antetítulo" : (k === "h2" ? "Título" : "Bajada"), k === "p"));
      });
      b.appendChild(grid);
      cont.appendChild(b);
    });

    var rutas = [];
    rutas.push("ui.bloques.metaTarea", "ui.bloques.metaRutina");
    ["red", "evento", "rutina", "comun", "redes", "trabajo", "notionVivo", "googleVivo"].forEach(function (k) {
      rutas.push("ui.bloques." + k + ".t", "ui.bloques." + k + ".d");
    });
    rellenar("#campos-bloques", rutas);

    rellenar("#campos-misc", ["ui.tabs.trabajo", "ui.tabs.cliente",
      "ui.areas.mes", "ui.areas.cumple", "ui.areas.perfil", "ui.areas.notion",
      "ui.areas.datos", "ui.areas.acompanar"]);
    var tipos = document.createElement("div");
    tipos.style.gridColumn = "1 / -1";
    tipos.innerHTML = '<div class="area">Etiquetas de tipo de tarjeta</div>';
    var grid2 = document.createElement("div");
    grid2.className = "ed-grid";
    Object.keys(D.ui.tipo).forEach(function (k) {
      grid2.appendChild(campoTexto("ui.tipo." + k, k));
    });
    tipos.appendChild(grid2);
    $("#campos-misc").appendChild(tipos);
  }

  /* ---------------- JSON ---------------- */
  function archivoTexto() {
    return "// NORTE · catálogo de contenido\n" +
      "// Editado desde admin.html · " + new Date().toISOString() + "\n" +
      "window.CATALOGO = " + JSON.stringify(D, null, 2) + ";\n";
  }
  function refrescarJSON() {
    var ta = $("#jsonBruto");
    if (ta) ta.value = JSON.stringify(D, null, 2);
  }

  /* ---------------- guardar ---------------- */
  async function guardar() {
    var texto = archivoTexto();
    var btn = $("#btnGuardar");
    btn.disabled = true;
    btn.textContent = "Guardando…";
    try {
      var r = await fetch("/api/guardar", {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: texto
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      sucio = false;
      notasOK = true;
      ORIGINAL = clone(D);
      var e = $("#estadoEdicion");
      e.textContent = "Guardado";
      e.classList.add("limpio");
      aviso("Guardado", "catalogo.js actualizado. El panel ya lo muestra en la próxima recarga.", "ok");
      $("#avisoServer").innerHTML = "Guardado en el servidor. <a href='index.html' style='color:var(--acento)'>Ver el panel →</a>";
    } catch (err) {
      notasOK = false;
      descargar(texto);
      aviso("Servidor no disponible", "Te dejé el archivo catalogo.js para reemplazarlo a mano.", "suave");
      $("#avisoServer").innerHTML = "Sin servidor: se descargó <b>catalogo.js</b>. Reemplázalo junto a index.html y listo.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Guardar";
    }
  }

  function descargar(texto) {
    try {
      var blob = new Blob([texto], { type: "application/javascript;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "catalogo.js";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    } catch (e) {
      aviso("No pude descargar", e.message, "suave");
    }
  }

  /* ---------------- navegación ---------------- */
  function irA(sec) {
    $$(".sec").forEach(function (s) { s.classList.toggle("on", s.id === "sec-" + sec); });
    $$("#navAdmin button").forEach(function (b) { b.classList.toggle("on", b.dataset.sec === sec); });
    var activa = $("#sec-" + sec);
    $("#tituloSec").textContent = activa ? activa.dataset.titulo : sec;
    pintarSeccion(sec);
    cerrarRail();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function abrirRail() { $("#rail").classList.add("on"); var s = $("#scrimRail"); s.hidden = false; s.classList.add("on"); $("#btnMenu").setAttribute("aria-expanded", "true"); }
  function cerrarRail() { $("#rail").classList.remove("on"); var s = $("#scrimRail"); s.classList.remove("on"); s.hidden = true; $("#btnMenu").setAttribute("aria-expanded", "false"); }

  /* ---------------- eventos ---------------- */
  function eventos() {
    $$("#navAdmin button").forEach(function (b) {
      b.addEventListener("click", function () { irA(b.dataset.sec); });
    });
    $("#btnMenu").addEventListener("click", function () {
      if ($("#rail").classList.contains("on")) cerrarRail(); else abrirRail();
    });
    $("#scrimRail").addEventListener("click", cerrarRail);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarRail(); });

    $("#btnGuardar").addEventListener("click", guardar);

    $("#btnDescargar").addEventListener("click", function () {
      descargar(archivoTexto());
      aviso("Archivo descargado", "catalogo.js listo para subir o reemplazar.", "ok");
    });

    $("#btnDescartar").addEventListener("click", function () {
      if (sucio && !confirm("¿Descartar los cambios y volver al contenido actual?")) return;
      D = clone(ORIGINAL);
      sucio = false;
      var e = $("#estadoEdicion");
      e.textContent = "Sin cambios";
      e.classList.add("limpio");
      pintarSeccion(($$(".sec.on")[0] || {}).id.replace("sec-", "") || "marca");
      aviso("Cambios descartados", "Volviste al contenido guardado.", "");
    });

    $("#btnAplicarJSON").addEventListener("click", function () {
      try {
        var obj = JSON.parse($("#jsonBruto").value);
        if (!obj.ui || !obj.planes) throw new Error("Faltan claves obligatorias: ui y planes");
        D = obj;
        marcarSucio();
        aviso("JSON aplicado", "Revisa las secciones y pulsa Guardar.", "ok");
        irA("marca");
      } catch (err) {
        aviso("JSON inválido", err.message, "suave");
      }
    });
    $("#btnCopiarJSON").addEventListener("click", function () {
      var ta = $("#jsonBruto");
      ta.select();
      try {
        document.execCommand("copy");
        aviso("Copiado", "El JSON está en tu portapapeles.", "ok");
      } catch (e) {
        aviso("Selecciona y copia", "Ctrl+C sobre el texto.", "suave");
      }
    });
    $("#btnRecargarJSON").addEventListener("click", function () {
      D = clone(ORIGINAL);
      sucio = false;
      refrescarJSON();
      aviso("Recargado", "El JSON vuelve al contenido actual.", "");
    });

    window.addEventListener("beforeunload", function (e) {
      if (sucio) { e.preventDefault(); e.returnValue = ""; }
    });
  }

  /* ---------------- arranque ---------------- */
  function arrancar() {
    if (!window.CATALOGO || !window.CATALOGO.ui) {
      $("#principal").innerHTML = '<div class="bloque vidrio" style="margin-top:40px"><h2>No pude cargar catalogo.js</h2>' +
        '<p class="intro">Abre la página con el servidor local para que el panel pueda leer y escribir el contenido.</p></div>';
      return;
    }
    $("#subMarca").textContent = D.ui.marca.nombre + " · " + D.ui.marca.sub;
    eventos();
    pintarSeccion("marca");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();

  // API mínima para pruebas
  window.__admin = {
    datos: function () { return D; },
    set: function (r, v) { set(r, v); marcarSucio(); },
    get: get,
    esSucio: function () { return sucio; },
    texto: archivoTexto,
    irA: irA,
    listaStrings: listaStrings,
    listaObjetos: listaObjetos
  };
})();
