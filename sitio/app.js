/* ============================================================
   NORTE · sistema de enfoque
   Lógica: onboarding de 3 preguntas → plan → tableros →
   prospectos → red → vida esencial → calendario → Notion.
   Sin dependencias. Estado en localStorage + export JSON.
   ============================================================ */
(function () {
  "use strict";

  var CAT = window.CATALOGO || {};
  var CLAVE = "norte.estado.v1";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- UI desde catálogo (admin) ---------------- */
  function rutaUI(ruta) {
    return ruta.split(".").reduce(function (o, k) { return (o == null) ? undefined : o[k]; }, CAT);
  }
  function pintarUI() {
    $$("[data-ui]").forEach(function (el) {
      var v = rutaUI(el.dataset.ui);
      if (typeof v === "string") el.textContent = v;
    });
    $$("[data-ui-ph]").forEach(function (el) {
      var v = rutaUI(el.dataset.uiPh);
      if (typeof v === "string") el.placeholder = v;
    });
    var ui = CAT.ui || {};
    if (ui.marca && ui.marca.nombre) document.title = ui.marca.nombre + " · " + (ui.marca.sub || "");
  }

  /* ---------------- utilidades ---------------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function hoy() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function sumar(dias) { var d = hoy(); d.setDate(d.getDate() + dias); return iso(d); }
  function fmtFecha(v) {
    try {
      return new Date(v + "T12:00:00").toLocaleDateString("es-EC", { day: "numeric", month: "short" });
    } catch (e) { return v; }
  }
  function diasDesde(v) {
    var a = new Date(v + "T12:00:00").getTime(), b = hoy().getTime();
    return Math.round((a - b) / 86400000);
  }
  function mmdd(fecha) { return fecha.slice(5); }

  /* ---------------- estado ---------------- */
  var S = null;

  function estadoVacio() {
    return {
      version: 2,
      perfil: { nombre: "", puesto: "", salario: "", modalidad: "", texto1: "", proyectos: [], habilidades: {}, texto3: "" },
      objetivos: [],
      tareas: [],
      contactos: [],
      prospectos: [],
      habitos: [],
      eventos: [],
      rutina: [],
      redes: [],
      areasTrabajo: [],
      tablero: { notas: [], archivos: [], dibujos: [] },
      notionFilas: [],
      enviosGmail: { total: 0, fecha: "" },
      calendarioGoogle: [],
      hechas: 0,
      ajustes: {
        sonido: true, mensajes: true,
        notionToken: "", notionDb: "", notionTitulo: "", notionEstado: "",
        notionCada: 0, googleClientId: "", gmailQuery: ""
      },
      google: { token: "", expira: 0, correo: "" },
      vistoOnboarding: false,
      diaRutina: ""
    };
  }
  /* completa claves que falten en estados guardados antes de esta versión */
  function parchear(obj) {
    var base = estadoVacio();
    Object.keys(base).forEach(function (k) {
      if (obj[k] === undefined) obj[k] = base[k];
    });
    Object.keys(base.ajustes).forEach(function (k) {
      if (obj.ajustes[k] === undefined) obj.ajustes[k] = base.ajustes[k];
    });
    Object.keys(base.google).forEach(function (k) {
      if (!obj.google[k]) obj.google[k] = base.google[k];
    });
    if (!obj.tablero) obj.tablero = base.tablero;
    ["notas", "archivos", "dibujos"].forEach(function (k) { if (!Array.isArray(obj.tablero[k])) obj.tablero[k] = []; });
    return obj;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) {}
  }
  function cargar() {
    try {
      var crudo = localStorage.getItem(CLAVE);
      if (crudo) { S = parchear(JSON.parse(crudo)); return true; }
    } catch (e) {}
    S = estadoVacio();
    return false;
  }

  /* ---------------- metas numéricas (siembra desde el catálogo) ---------------- */
  function sembrarMetas() {
    var plantilla = (CAT.areasMetas) || {};
    if (!Array.isArray(S.redes)) S.redes = [];
    (plantilla.redes || []).forEach(function (r) {
      if (!S.redes.some(function (x) { return x.nombre === r.nombre; })) {
        S.redes.push({ id: uid(), nombre: r.nombre, cuenta: r.cuenta || "", meta: r.meta || 0, hechos: 0, ultimo: "" });
      }
    });
    if (!Array.isArray(S.areasTrabajo)) S.areasTrabajo = [];
    (plantilla.trabajo || []).forEach(function (a) {
      var existente = S.areasTrabajo.filter(function (x) { return x.nombre === a.nombre; })[0];
      if (!existente) {
        existente = { id: uid(), nombre: a.nombre, meta: a.meta || 0, hechos: 0, subtareas: [] };
        S.areasTrabajo.push(existente);
      }
      if (!Array.isArray(existente.subtareas)) existente.subtareas = [];
      (a.subtareas || []).forEach(function (t) {
        if (!existente.subtareas.some(function (s) { return s.titulo === t; })) {
          existente.subtareas.push({ id: uid(), titulo: t, hecha: false });
        }
      });
    });
  }

  /* ---------------- sonido ---------------- */
  var ac = null;
  function audio() {
    if (!S || !S.ajustes.sonido) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function tono(freq, retraso, dur, vol) {
    var c = audio(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = freq;
    var t = c.currentTime + retraso;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.14, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.5));
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + (dur || 0.5) + 0.05);
  }
  function suenaOk() { tono(523.25, 0, 0.45); tono(659.25, 0.12, 0.45); tono(783.99, 0.24, 0.6); }
  function suave() { tono(392, 0, 0.5, 0.1); tono(523.25, 0.14, 0.5, 0.1); }
  function inicio() { tono(440, 0, 0.4, 0.1); tono(587.33, 0.16, 0.5, 0.1); }

  /* ---------------- mensajes ---------------- */
  function mensaje(titulo, texto, tipo) {
    var c = $("#mensajes");
    if (!c) return;
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
    }, 5200);
  }
  function aleatorio(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ============================================================
     ONBOARDING
     ============================================================ */
  var pasoActual = 0;
  function mostrarPaso(n) {
    pasoActual = n;
    $$(".paso").forEach(function (p) { p.classList.toggle("activo", +p.dataset.paso === n); });
    var t = $(".tarjeta"); if (t) t.scrollTop = 0;
  }
  function chips(contenedor, items, destino, multiple, max) {
    var c = $(contenedor); if (!c) return;
    c.innerHTML = "";
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = it;
      b.addEventListener("click", function () {
        if (destino === "proyectos") { agregarProyecto(it); return; }
        // salarios/modalidades son selección única (string); puestos admite varios (array)
        if (destino === "salario" || destino === "modalidad") {
          if (b.classList.contains("on")) { b.classList.remove("on"); S.perfil[destino] = ""; }
          else {
            $$(".chip", c).forEach(function (x) { x.classList.remove("on"); });
            b.classList.add("on");
            S.perfil[destino] = it;
          }
          guardar(); return;
        }
        var arr = S.perfil[destino] || (S.perfil[destino] = []);
        if (b.classList.contains("on")) {
          b.classList.remove("on");
          var i = arr.indexOf(it); if (i > -1) arr.splice(i, 1);
        } else {
          if (max && arr.length >= max) { mensaje("Máximo " + max, "Ya marcaste " + max + " opciones.", "suave"); return; }
          b.classList.add("on");
          if (arr.indexOf(it) < 0) arr.push(it);
        }
        guardar();
      });
      if (destino === "habilidades") b.dataset.grupo = contenedor;
      c.appendChild(b);
    });
  }

  function pintarPerfil() {
    var cont = $("#gruposPerfil"); if (!cont) return;
    cont.innerHTML = "";
    var defs = (CAT.ui && CAT.ui.pasos && CAT.ui.pasos[2] && CAT.ui.pasos[2].grupos) || [
      ["hobbies", "Hobbies"], ["logros", "Logros"], ["habilidades", "Habilidades"],
      ["estilo", "Estilo (personalidad)"], ["experiencias", "Experiencias"], ["conocimientos", "Conocimientos"]
    ];
    defs = defs.map(function (d) { return Array.isArray(d) ? d : [d.id, d.label]; });
    defs.forEach(function (d) {
      var g = document.createElement("div");
      g.className = "grupo";
      g.innerHTML = '<span class="et">' + esc(d[1]) + "</span>";
      var chipsEl = document.createElement("div");
      chipsEl.className = "chips"; chipsEl.id = "grupo-" + d[0];
      g.appendChild(chipsEl);
      cont.appendChild(g);

      (CAT.habilidades && CAT.habilidades[d[0]] || []).forEach(function (item) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "chip"; b.textContent = item;
        if ((S.perfil.habilidades[d[0]] || []).indexOf(item) > -1) b.classList.add("on");
        b.addEventListener("click", function () {
          var arr = S.perfil.habilidades[d[0]] || (S.perfil.habilidades[d[0]] = []);
          var i = arr.indexOf(item);
          if (i > -1) { arr.splice(i, 1); b.classList.remove("on"); }
          else { arr.push(item); b.classList.add("on"); }
          guardar();
        });
        chipsEl.appendChild(b);
      });
    });
  }

  function agregarProyecto(texto) {
    var v = String(texto || "").trim();
    if (!v) return;
    var arr = S.perfil.proyectos;
    if (arr.indexOf(v) > -1) { mensaje("Ya lo tienes", "Ese proyecto está en tu lista.", "suave"); return; }
    if (arr.length >= 5) { mensaje("Máximo 5 proyectos", "Quita uno si quieres añadir otro.", "suave"); return; }
    arr.push(v);
    if (v.indexOf("Otro") !== 0) pintarProyectosMios();
    $("#proyectoInput").value = "";
    pintarProyectosMios(); guardar(); suave();
    $("#avisoProyectos").hidden = true;
  }
  function pintarProyectosMios() {
    var c = $("#chipsMios"); if (!c) return;
    c.innerHTML = "";
    S.perfil.proyectos.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip on"; b.textContent = p + "  ✕";
      b.setAttribute("aria-label", "Quitar " + p);
      b.addEventListener("click", function () {
        var i = S.perfil.proyectos.indexOf(p);
        if (i > -1) S.perfil.proyectos.splice(i, 1);
        pintarProyectosMios(); guardar();
        $("#avisoProyectos").hidden = S.perfil.proyectos.length > 0;
      });
      c.appendChild(b);
    });
    $("#cuentaProyectos").textContent = S.perfil.proyectos.length;
  }

  /* ============================================================
     CONSTRUCCIÓN DEL PLAN
     ============================================================ */
  function nuevoObjetivo(tipo, titulo, meta) {
    var o = { id: uid(), tipo: tipo, titulo: titulo, meta: meta };
    S.objetivos.push(o);
    return o;
  }
  function agregarTareas(obj, plan, sufijo) {
    (plan || []).forEach(function (p, i) {
      S.tareas.push({
        id: uid(),
        objId: obj.id,
        titulo: p.titulo.replace("{{puesto}}", S.perfil.puesto || "tu puesto")
                         .replace("{{nombre}}", S.perfil.nombre || "")
                         + (sufijo ? " · " + sufijo : ""),
        prioridad: p.prioridad,
        vence: sumar(p.dias),
        estado: "pendiente",
        origen: obj.titulo
      });
    });
  }

  function construirPlan() {
    var p = S.perfil;
    if (!p.nombre) p.nombre = "amig@";
    // puestos: puede llegar como array (multi-select) o string (texto libre)
    if (Array.isArray(p.puesto)) {
      p.puesto = p.puesto.filter(function (x) { return x.indexOf("Otro") !== 0; }).join(" · ").trim();
    }
    p.puesto = String(p.puesto || "").trim() || String(p.texto1 || "").trim() || "Puesto por definir";
    if (Array.isArray(p.salario)) p.salario = p.salario[0] || "";

    // 1 · trabajo e ingresos
    var oTrabajo = nuevoObjetivo("trabajo", "Conseguir trabajo",
      (p.puesto || "Puesto por definir") + " · " + (p.salario || "ingreso a definir"));
    agregarTareas(oTrabajo, CAT.planes.trabajo);

    // 2 · proyectos (hasta 5)
    p.proyectos.slice(0, 5).forEach(function (nombre) {
      var o = nuevoObjetivo("proyecto", nombre, "Validar y vender");
      agregarTareas(o, CAT.planes.proyecto, nombre);
    });

    // 3 · comunidad / red
    var oCom = nuevoObjetivo("comunidad", "Construir mi red", "Contactos, mensajes y presencia");
    agregarTareas(oCom, CAT.planes.comunidad);

    // 4 · vida esencial
    var oVida = nuevoObjetivo("vida", "Vida esencial", "Salud mental, física, espiritual y familia");
    agregarTareas(oVida, CAT.planes.vida);

    // hábitos base
    (CAT.habitosBase || []).forEach(function (h) {
      S.habitos.push({ id: uid(), area: h.area, titulo: h.titulo, hecha: false });
    });

    // prospectos de partida: 4 ofertas + 3 clientes
    (CAT.ofertas || []).slice(0, 4).forEach(function (o) { S.prospectos.push(ofertaANegocio(o, "trabajo")); });
    (CAT.clientes || []).slice(0, 3).forEach(function (c) { S.prospectos.push(clienteANegocio(c)); });

    // eventos precargados del año
    refrescarEventos();

    // contactos de ejemplo (para que la red no nazca vacía)
    S.contactos.push(
      { id: uid(), nombre: "Mamá", rol: "Familia", empresa: "", cumple: "05-12", tipo: "familia" },
      { id: uid(), nombre: "Carlos Pérez", rol: "Compañero de estudio", empresa: "Estudio Nube", cumple: "03-04", tipo: "comunidad" },
      { id: uid(), nombre: "Lucía Torres", rol: "Ex jefa", empresa: "Andes Digital", cumple: "11-19", tipo: "cliente" }
    );

    S.vistoOnboarding = true;
    guardar();
  }

  function ofertaANegocio(o, modo) {
    return {
      id: uid(), modo: modo || "trabajo", fuente: o.fuente, empresa: o.empresa, puesto: o.puesto,
      lugar: o.lugar, rango: o.rango, contacto: "", cargo: "", rubro: "",
      estado: "nuevo", correo: ""
    };
  }
  function clienteANegocio(c) {
    return {
      id: uid(), modo: "cliente", fuente: "Referido directo", empresa: c.empresa, puesto: c.rubro,
      lugar: c.ciudad, rango: "", contacto: c.contacto, cargo: c.cargo, rubro: c.rubro,
      estado: "nuevo", correo: ""
    };
  }

  /* ---------------- fechas sociales ---------------- */
  function domingo(mes, n) { // mes 1-12, n-ésimo domingo
    var d = new Date(new Date().getFullYear(), mes - 1, 1);
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    d.setDate(d.getDate() + (n - 1) * 7);
    return iso(d);
  }
  function refrescarEventos() {
    var anio = new Date().getFullYear();
    var lista = [];
    (CAT.eventosFijos || []).forEach(function (e) {
      lista.push({ fecha: anio + "-" + e.mmdd, titulo: e.titulo, tipo: e.tipo, origen: "precargado" });
    });
    var moviles = {
      madre: domingo(5, 2), padre: domingo(6, 3), amigo: anio + "-07-20"
    };
    (CAT.eventosMoviles || []).forEach(function (e) {
      if (moviles[e.clave]) lista.push({ fecha: moviles[e.clave], titulo: e.titulo, tipo: e.tipo, origen: "precargado" });
    });
    (S.eventos || []).filter(function (e) { return e.origen === "propio"; }).forEach(function (e) { lista.push(e); });
    S.eventos = lista;
  }
  function proximosEventos(cantidad) {
    var hoyISO = iso(hoy());
    var conCumple = S.contactos.filter(function (c) { return c.cumple; }).map(function (c) {
      var fecha = hoyISO.slice(0, 4) + "-" + c.cumple;
      if (fecha < hoyISO) fecha = (parseInt(hoyISO.slice(0, 4), 10) + 1) + "-" + c.cumple;
      return { fecha: fecha, titulo: "Cumpleaños de " + c.nombre, tipo: "cumple", origen: "red", contactoId: c.id };
    });
    var todos = S.eventos.concat(conCumple).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    var futuro = todos.filter(function (e) { return e.fecha >= hoyISO; });
    return futuro.slice(0, cantidad || 5);
  }

  /* ---------------- tarea del día ---------------- */
  function score(t) {
    var s = { alta: 3, media: 2, baja: 1 }[t.prioridad] || 1;
    var d = diasDesde(t.vence);
    if (d < 0) s += 5;           // atrasada
    else if (d === 0) s += 4;    // hoy
    else if (d === 1) s += 2;    // mañana
    else if (d > 5) s -= 1;
    if (t.objetivo === "trabajo") s += 2;
    if (t.objetivo === "vida") s += 1;
    return s;
  }
  var rotacion = 0;
  function tareaDelDia() {
    var abiertas = S.tareas.filter(function (t) { return t.estado !== "hecho"; });
    if (!abiertas.length) return null;
    abiertas.forEach(function (t) { t._s = score(t); });
    abiertas.sort(function (a, b) { return b._s - a._s; });
    return abiertas[rotacion % Math.min(3, abiertas.length)];
  }

  /* ============================================================
     VISTAS
     ============================================================ */
  var vistaActual = "hoy";
  var tableroActivo = null;
  var modoProspecto = "trabajo";
  var fuenteActiva = "todas";

  function irA(vista) {
    vistaActual = vista;
    $$(".vista").forEach(function (v) { v.classList.toggle("on", v.id === "vista-" + vista); });
    $$("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.vista === vista); });
    $$("#barraMovil button").forEach(function (b) { b.classList.toggle("on", b.dataset.vista === vista); });
    var nombres = (CAT.ui && CAT.ui.menu && CAT.ui.menu.items) || {};
    $("#crumb").innerHTML = "<b>" + esc(nombres[vista] || vista) + "</b> · <span id='fechaHoy'>" + esc(fechaLarga()) + "</span>";
    cerrarRail();
    renderTodo();
    if (vista === "tablero") refrescarArchivosServidor();
    if (vista === "metas" && !S.notionFilas.length) sincronizarNotion();
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  function fechaLarga() {
    try { return new Date().toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long" }); }
    catch (e) { return ""; }
  }
  function saludo() {
    var h = new Date().getHours();
    var s = (CAT.ui && CAT.ui.saludo) || {};
    if (h < 12) return s.manana || "Buenos días";
    if (h < 19) return s.tarde || "Buenas tardes";
    return s.noche || "Buenas noches";
  }

  /* ---------------- HOY ---------------- */
  function renderHoy() {
    $("#kHola").textContent = saludo() + (S.perfil.nombre ? ", " + S.perfil.nombre : "");
    var total = S.tareas.length || 1;
    var hechas = S.tareas.filter(function (t) { return t.estado === "hecho"; }).length;
    var pct = Math.round(hechas / total * 100);
    var uiHoy = (CAT.ui && CAT.ui.hoy) || {};
    $("#tituloHoy").textContent = pct === 100
      ? (uiHoy.limpio || "Todo tu tablero está limpio. ¿Cuál es el siguiente sueño?")
      : (uiHoy.titulo || "Hoy decides hacia dónde tiras.");
    $("#porcentajeHoy").textContent = hechas + " de " + S.tareas.length + " tareas cumplidas · " + pct + "% de tu sistema en marcha";

    var t = tareaDelDia();
    var metaBase = (CAT.ui && CAT.ui.bloques && CAT.ui.bloques.metaTarea) || "Tu única tarea de hoy";
    if (t) {
      $("#metaTarea").textContent = (t.prioridad === "alta" ? metaBase + " · prioridad alta" : metaBase) + " · " + t.origen;
      $("#txtTarea").textContent = t.titulo;
      $("#btnHoyHecha").dataset.id = t.id;
      $("#btnHoyHecha").disabled = false;
    } else {
      $("#metaTarea").textContent = metaBase;
      $("#txtTarea").textContent = "No hay tareas abiertas. Añade una desde Objetivos o celebra este momento.";
      $("#btnHoyHecha").disabled = true;
    }

    renderTarjetas();
    renderRutinaHoy();
    renderProximoEvento();
  }

  function progreso(objId) {
    var ts = S.tareas.filter(function (t) { return t.objId === objId; });
    var ok = ts.filter(function (t) { return t.estado === "hecho"; }).length;
    return { total: ts.length, ok: ok, pct: ts.length ? Math.round(ok / ts.length * 100) : 0 };
  }

  function renderTarjetas() {
    var cont = $("#tarjetasObjetivos"); if (!cont) return;
    cont.innerHTML = "";
    S.objetivos.forEach(function (o) {
      var p = progreso(o.id);
      var abiertas = S.tareas.filter(function (t) { return t.objId === o.id && t.estado !== "hecho"; });
      abiertas.sort(function (a, b) { return a.vence < b.vence ? -1 : 1; });
      var d = document.createElement("article");
      d.className = "tarjeta-obj vidrio subir";
      d.tabIndex = 0;
      d.innerHTML =
        '<div class="arriba"><span class="tipo ' + esc(o.tipo) + '">' + esc(tipoNombre(o.tipo)) + "</span>" +
        '<span class="p" style="color:var(--suave);font-size:.85rem">' + esc(o.meta || "") + "</span></div>" +
        "<h3>" + esc(o.titulo) + "</h3>" +
        '<div class="prox">' + (abiertas.length ? "Siguiente: " + esc(abiertas[0].titulo) : "Sin pendientes. Retoma cuando quieras.") + "</div>" +
        '<div class="barra"><i style="width:' + p.pct + '%"></i></div>' +
        '<div class="cifras"><span class="n">' + p.pct + "%</span><span class='p'>" + p.ok + "/" + p.total + " tareas</span></div>";
      var abrir = function () { detalleObjetivo(o); };
      d.addEventListener("click", abrir);
      d.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } });
      cont.appendChild(d);
    });
  }

  function tipoNombre(t) {
    var m = (CAT.ui && CAT.ui.tipo) || {};
    return m[t] || { trabajo: "Trabajo", proyecto: "Proyecto", comunidad: "Comunidad", vida: "Vida esencial" }[t] || t;
  }

  function renderRutinaHoy() {
    var cont = $("#rutinaRed"); if (!cont) return;
    var items = S.rutina.filter(function (r) { return r.fecha === iso(hoy()); });
    if (!items.length) {
      cont.innerHTML = '<div class="vacio2">Hoy sin tareas de red. Mañana volvemos a mirar.</div>';
      return;
    }
    cont.innerHTML = "";
    items.forEach(function (r) {
      var el = document.createElement("div");
      el.className = "item";
      el.innerHTML = '<div class="cuerpo"><div class="t">' + esc(r.texto) + '</div>' +
        '<div class="d">' + esc(r.detalles || "Un mensaje basta.") + "</div></div>";
      var b = document.createElement("button");
      b.className = "btn btn-mini " + (r.hecha ? "ok" : "suave");
      b.textContent = r.hecha ? "Hecho ✓" : "Hacerlo";
      b.addEventListener("click", function () {
        r.hecha = !r.hecha; guardar(); suenaOk(); renderTodo();
        if (r.hecha) mensaje("Red al día", aleatorio(CAT.mensajes || ["Así se construye."]), "ok");
      });
      el.appendChild(b);
      cont.appendChild(el);
    });
  }

  function renderProximoEvento() {
    var cont = $("#proximoEvento"); if (!cont) return;
    var evs = proximosEventos(4);
    // agrega Google Calendar por delante si está conectado
    var google = (S.calendarioGoogle || []).filter(function (e) { return e.fecha && e.fecha >= iso(hoy()); }).slice(0, 2).map(function (e) {
      return { fecha: e.fecha, titulo: e.titulo, tipo: "google", origen: "Google Calendar", hora: e.hora };
    });
    var todos = google.concat(evs).slice(0, 4);
    if (!todos.length) { cont.innerHTML = '<div class="vacio2">Añade cumpleaños desde la Red para no olvidar fechas.</div>'; return; }
    cont.innerHTML = "";
    todos.forEach(function (e) {
      var d = diasDesde(e.fecha);
      var cuando = d === 0 ? "HOY" : d === 1 ? "MAÑANA" : "en " + d + " días";
      var el = document.createElement("div");
      el.className = "item";
      el.innerHTML = '<div class="cuerpo"><div class="t">' + esc(e.titulo) + "</div>" +
        '<div class="d">' + esc(tipoEvento(e.tipo)) + " · " + esc(fmtFecha(e.fecha)) + (e.hora ? " · " + esc(e.hora) : "") + "</div></div>" +
        '<span class="fecha">' + esc(cuando) + "</span>";
      cont.appendChild(el);
    });
  }
  function tipoEvento(t) {
    return { feriado: "Feriado", social: "Fecha social", salud: "Salud", cumple: "Cumpleaños", google: "Google Calendar" }[t] || "Fecha";
  }

  /* ---------------- OBJETIVOS / TABLERO ---------------- */
  function renderObjetivos() {
    var tabs = $("#tabsObjetivos"); if (!tabs) return;
    if (!S.objetivos.length) { tabs.innerHTML = ""; $("#tablero").innerHTML = ""; return; }
    if (!tableroActivo || !S.objetivos.some(function (o) { return o.id === tableroActivo; })) tableroActivo = S.objetivos[0].id;

    tabs.innerHTML = "";
    S.objetivos.forEach(function (o) {
      var b = document.createElement("button");
      b.className = "tab-obj" + (o.id === tableroActivo ? " on" : "");
      b.textContent = o.titulo;
      b.addEventListener("click", function () { tableroActivo = o.id; renderObjetivos(); });
      tabs.appendChild(b);
    });

    var cols = { pendiente: [], curso: [], hecho: [] };
    S.tareas.filter(function (t) { return t.objId === tableroActivo; }).forEach(function (t) { cols[t.estado].push(t); });

    var defs = [["pendiente", "Pendiente"], ["curso", "En curso"], ["hecho", "Hechas"]];
    var cont = $("#tablero");
    cont.innerHTML = "";
    defs.forEach(function (d) {
      var col = document.createElement("div");
      col.className = "col vidrio";
      col.innerHTML = "<h4>" + esc(d[1]) + " <span>" + cols[d[0]].length + "</span></h4>";
      if (!cols[d[0]].length) col.innerHTML += '<div class="vacio2">Aquí aparecen tus tareas.</div>';
      cols[d[0]].forEach(function (t) { col.appendChild(tarjetaTarea(t)); });
      cont.appendChild(col);
    });
  }

  function tarjetaTarea(t) {
    var el = document.createElement("article");
    el.className = "tarea" + (t.estado === "hecho" ? " hecha" : "");
    var acciones = "";
    if (t.estado === "pendiente") acciones = '<button class="btn btn-mini suave" data-avanzar>Empezar →</button>';
    if (t.estado === "curso") acciones = '<button class="btn btn-mini ok" data-avanzar>Terminar ✓</button>';
    if (t.estado === "hecho") acciones = '<button class="btn btn-mini suave" data-reabrir>Reabrir</button>';
    el.innerHTML =
      '<div class="tt">' + esc(t.titulo) + "</div>" +
      '<div class="pie2"><span class="prior ' + esc(t.prioridad) + '">' + esc(t.prioridad) + "</span>" +
      '<span class="fecha">' + esc(fmtFecha(t.vence)) + "</span>" + acciones + "</div>";
    var av = el.querySelector("[data-avanzar]");
    if (av) av.addEventListener("click", function () { avanzarTarea(t); });
    var re = el.querySelector("[data-reabrir]");
    if (re) re.addEventListener("click", function () { t.estado = "pendiente"; guardar(); renderTodo(); });
    return el;
  }

  function avanzarTarea(t) {
    if (t.estado === "pendiente") { t.estado = "curso"; suave(); mensaje("En marcha", "Va camino a terminarse.", ""); }
    else if (t.estado === "curso") {
      t.estado = "hecho"; S.hechas++; suenaOk();
      if (S.ajustes.notionToken && S.ajustes.notionDb) enviarANotion(t, true);
      var abiertas = S.tareas.filter(function (x) { return x.estado !== "hecho"; }).length;
      if (S.hechas % 3 === 0) mensaje("Vas sumando", aleatorio(CAT.hitos || ["Buen ritmo."]), "ok");
      else mensaje("Tarea cumplida", abiertas ? "Quedan " + abiertas + " en tu sistema." : "¡Tablero limpio!", "ok");
    }
    guardar(); renderTodo();
  }

  /* ---------------- PROSPECTOS ---------------- */
  function renderFuentes() {
    var cont = $("#fuentes"); if (!cont) return;
    var fuentes = ["todas"].concat(CAT.fuentes || []);
    cont.innerHTML = "";
    fuentes.forEach(function (f) {
      var b = document.createElement("button");
      b.className = "fuente" + (fuenteActiva === f ? " on" : "");
      b.textContent = f === "todas" ? "Todas" : f;
      b.addEventListener("click", function () { fuenteActiva = f; renderProspectos(); });
      cont.appendChild(b);
    });
  }

  function renderProspectos() {
    renderFuentes();
    $$("#tabsProspectos .tab-obj").forEach(function (b) {
      b.classList.toggle("on", b.dataset.modo === modoProspecto);
    });
    var cont = $("#listaProspectos"); if (!cont) return;
    cont.innerHTML = "";
    if (G.conectado() && S.enviosGmail && S.enviosGmail.total) {
      var av = document.createElement("div");
      av.className = "vacio2";
      av.innerHTML = "Gmail · <b>" + S.enviosGmail.total + " envíos</b> coinciden con tu búsqueda de postulaciones" +
        (S.enviosGmail.fecha ? " (" + esc(fmtFecha(S.enviosGmail.fecha)) + ")" : "") + ".";
      cont.appendChild(av);
    }
    var lista = S.prospectos.filter(function (p) {
      return p.modo === modoProspecto && (fuenteActiva === "todas" || p.fuente === fuenteActiva);
    });
    if (!lista.length) {
      var vac = document.createElement("div");
      vac.className = "vacio2";
      vac.innerHTML = 'No hay nada en este filtro. Pulsa <b>Buscar ofertas</b> para traer nuevas de Bumeran, LinkedIn y ZonaJobs.';
      cont.appendChild(vac);
      return;
    }
    lista.forEach(function (p) {
      var fila = document.createElement("article");
      fila.className = "fila subir";
      var detalle = p.modo === "trabajo"
        ? esc(p.puesto) + " · " + esc(p.lugar) + (p.rango ? " · " + esc(p.rango) : "") + " · vía " + esc(p.fuente)
        : esc(p.contacto + " · " + p.cargo) + " · " + esc(p.empresa) + " · " + esc(p.lugar);
      fila.innerHTML =
        '<div><div class="emp">' + esc(p.modo === "trabajo" ? p.empresa : p.empresa) + "</div>" +
        '<div class="det">' + detalle + "</div></div>" +
        '<div class="fin"><span class="estado ' + esc(p.estado) + '">' + esc(estadoNombre(p.estado)) + "</span>" +
        '<button class="btn btn-mini ok" data-correo>Generar correo</button>' +
        (p.estado === "respuesta" ? '<button class="btn btn-mini suave" data-entrevista>Entrevista</button>' : "") +
        "</div>";
      fila.querySelector("[data-correo]").addEventListener("click", function () { modalCorreo(p); });
      var ent = fila.querySelector("[data-entrevista]");
      if (ent) ent.addEventListener("click", function () { p.estado = "entrevista"; guardar(); suenaOk(); mensaje("¡Entrevista!", "Prepara tus respuestas: ¿por qué tú? y ¿qué buscas?", "ok"); renderTodo(); });
      cont.appendChild(fila);
    });
  }
  function estadoNombre(e) {
    return { nuevo: "Nuevo", contactado: "Contactado", respuesta: "Respuesta", entrevista: "Entrevista" }[e] || e;
  }

  function buscarOfertas() {
    var pool = (CAT.ofertas || []).filter(function (o) {
      return !S.prospectos.some(function (p) { return p.empresa === o.empresa && p.puesto === o.puesto; });
    });
    if (!pool.length) {
      mensaje("Sin resultados nuevos", "Ya revisaste todas las ofertas cargadas. Vuelve mañana o cambia el filtro.", "suave");
      return;
    }
    var nuevas = pool.slice(0, 3).map(function (o) { var n = ofertaANegocio(o, "trabajo"); S.prospectos.push(n); return n; });
    guardar(); suenaOk();
    mensaje("Ofertas nuevas", nuevas.length + " resultados en " + Array.from(new Set(nuevas.map(function (n) { return n.fuente; }))).join(", ") + ".", "ok");
    modoProspecto = "trabajo";
    renderTodo();
  }

  /* ---------------- RED ---------------- */
  function renderRed() {
    var hoyISO = iso(hoy());
    if (S.diaRutina !== hoyISO) { generarRutina(); S.diaRutina = hoyISO; guardar(); }

    var cont = $("#listaContactos"); if (!cont) return;
    if (!S.contactos.length) {
      cont.innerHTML = '<div class="vacio2">Aún no cargas contactos. Empieza con 5 personas: familia, ex compañeros y alguien que admires.</div>';
    } else {
      cont.innerHTML = "";
      S.contactos.forEach(function (c) {
        var el = document.createElement("div");
        el.className = "contacto";
        var ini = c.nombre.split(" ").map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
        var color = { familia: "#FFC96B", comunidad: "#9FBEFF", cliente: "#8BE9C1", referido: "#E0A8FF" }[c.tipo] || "#8BE9C1";
        el.innerHTML = '<div class="ini" style="background:' + color + '">' + esc(ini) + "</div>" +
          '<div style="flex:1"><div class="n">' + esc(c.nombre) + "</div>" +
          '<div class="r">' + esc(c.rol || "Contacto") + (c.empresa ? " · " + esc(c.empresa) : "") +
          (c.cumple ? " · cumple " + esc(fmtFecha("2000-" + c.cumple)) : "") + "</div></div>";
        var b = document.createElement("button");
        b.className = "btn btn-mini suave"; b.textContent = "Escribir";
        b.addEventListener("click", function () { modalMensajeContacto(c); });
        el.appendChild(b);
        cont.appendChild(el);
      });
    }

    var items = S.rutina.filter(function (r) { return r.fecha === hoyISO; });
    var hechas = items.filter(function (r) { return r.hecha; }).length;
    var limite = (CAT.ui && CAT.ui.bloques && CAT.ui.bloques.metaRutina) || "Límite saludable: 3 contactos por día";
    $("#metaRutina").textContent = hechas + " de " + items.length + " completadas hoy · " + limite;

    var rn = $("#rutinaNetworking");
    rn.innerHTML = items.length ? "" : '<div class="vacio2">Tu rutina de red se genera cada mañana.</div>';
    items.forEach(function (r) {
      var el = document.createElement("div");
      el.className = "item";
      el.innerHTML = '<div class="cuerpo"><div class="t">' + esc(r.texto) + '</div><div class="d">' + esc(r.detalles || "") + "</div></div>";
      var b = document.createElement("button");
      b.className = "btn btn-mini " + (r.hecha ? "ok" : "suave");
      b.textContent = r.hecha ? "Hecho ✓" : "Hacerlo";
      b.addEventListener("click", function () { r.hecha = !r.hecha; guardar(); suenaOk(); renderTodo(); });
      el.appendChild(b);
      rn.appendChild(el);
    });

    var sug = $("#sugerenciasMensaje");
    if (sug) {
      var habilidad = (S.perfil.habilidades.habilidades || [])[0] || "tu oficio";
      var lista = [
        "Compartí algo que sabes de " + habilidad + " sin pedir nada a cambio.",
        "Felicitá por un logro a alguien que admiras.",
        "Preguntá cómo está alguien que no ves hace tiempo.",
        "Recomendá a alguien que hace bien su trabajo.",
        "Contá una experiencia que te enseñó algo de " + habilidad + "."
      ];
      sug.innerHTML = "";
      lista.forEach(function (s, i) {
        var el = document.createElement("div");
        el.className = "item";
        el.innerHTML = '<div class="cuerpo"><div class="t">' + esc(s) + '</div><div class="d">' + (i === 0 ? "Sugerido para hoy" : "Para otro día") + "</div></div>";
        sug.appendChild(el);
      });
    }
  }

  function generarRutina() {
    var arr = [];
    var hoyISO = iso(hoy());
    var cumple = S.contactos.filter(function (c) {
      if (!c.cumple) return false;
      var f = hoyISO.slice(0, 4) + "-" + c.cumple;
      var d = Math.round((new Date(f + "T12:00:00") - hoy()) / 86400000);
      return d >= 0 && d <= 7;
    })[0];
    if (cumple) arr.push({ id: uid(), fecha: hoyISO, texto: "Felicitá a " + cumple.nombre, detalles: "Cumple en los próximos días.", hecha: false });

    var sinContacto = S.contactos.filter(function (c) { return c.tipo !== "familia"; });
    var elegido = sinContacto[Math.floor(Math.random() * Math.max(1, sinContacto.length))];
    if (elegido) arr.push({ id: uid(), fecha: hoyISO, texto: "Escribile a " + elegido.nombre, detalles: "Un mensaje corto, sin pedir nada.", hecha: false });

    arr.push({ id: uid(), fecha: hoyISO, texto: "Compartí algo útil hoy", detalles: "Una publicación o tip de lo que sabes.", hecha: false });

    S.rutina = S.rutina.filter(function (r) { return r.fecha !== hoyISO; }).concat(arr.slice(0, 3));
  }

  /* ---------------- VIDA ---------------- */
  function renderVida() {
    var cont = $("#areasVida"); if (!cont) return;
    var areas = [
      ["mental", "Salud mental"], ["fisica", "Salud física"],
      ["espiritual", "Salud espiritual"], ["familia", "Familia"]
    ];
    cont.innerHTML = '<div class="cuadricula"></div>';
    var grid = cont.firstChild;
    areas.forEach(function (a) {
      var bloque = document.createElement("div");
      bloque.className = "bloque vidrio";
      var hs = S.habitos.filter(function (h) { return h.area === a[0]; });
      var ok = hs.filter(function (h) { return h.hecha; }).length;
      bloque.innerHTML = '<div class="area">' + esc(a[1]) + " · " + ok + "/" + hs.length + "</div>";
      if (!hs.length) bloque.innerHTML += '<div class="vacio2">Sin rituales cargados.</div>';
      hs.forEach(function (h) {
        var el = document.createElement("div");
        el.className = "hab vidrio" + (h.hecha ? " ok" : "");
        el.tabIndex = 0;
        el.innerHTML = '<div class="marca2">✓</div><div class="t">' + esc(h.titulo) + "</div>";
        var accion = function () {
          h.hecha = !h.hecha; guardar();
          if (h.hecha) { suenaOk(); mensaje("Ritual cumplido", "Tu salud sostiene todo lo demás.", "ok"); }
          renderTodo();
        };
        el.addEventListener("click", accion);
        el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); accion(); } });
        bloque.appendChild(el);
      });
      grid.appendChild(bloque);
    });
  }

  /* ---------------- CALENDARIO ---------------- */
  function renderCalendario() {
    var mes = $("#eventosMes");
    if (mes) {
      var todos = S.eventos.slice().sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
      var este = todos.filter(function (e) { return e.fecha.slice(0, 7) === iso(hoy()).slice(0, 7); });
      var otros = todos.filter(function (e) { return e.fecha.slice(0, 7) !== iso(hoy()).slice(0, 7); });
      var lista = (este.length ? este : todos).slice(0, 6);
      mes.innerHTML = "";
      if (!este.length && otros.length) {
        mes.innerHTML = '<div class="vacio2">Este mes no hay fechas. Estas son las próximas:</div>';
      }
      lista.forEach(function (e) {
        var d = diasDesde(e.fecha);
        var el = document.createElement("div");
        el.className = "item";
        el.innerHTML = '<div class="cuerpo"><div class="t">' + esc(e.titulo) + "</div>" +
          '<div class="d">' + esc(tipoEvento(e.tipo)) + "</div></div>" +
          '<span class="fecha">' + (d === 0 ? "HOY" : d === 1 ? "MAÑANA" : esc(fmtFecha(e.fecha))) + "</span>";
        mes.appendChild(el);
      });
    }

    var cum = $("#cumpleanosRed");
    if (cum) {
      var conFecha = S.contactos.filter(function (c) { return c.cumple; })
        .sort(function (a, b) { return a.cumple < b.cumple ? -1 : 1; });
      if (!conFecha.length) {
        cum.innerHTML = '<div class="vacio2">Carga el cumpleaños de tus contactos y el sistema te avisará a tiempo.</div>';
      } else {
        cum.innerHTML = "";
        conFecha.forEach(function (c) {
          var el = document.createElement("div");
          el.className = "item";
          el.innerHTML = '<div class="cuerpo"><div class="t">' + esc(c.nombre) + "</div>" +
            '<div class="d">' + esc(c.rol || "") + "</div></div>" +
            '<span class="fecha">' + esc(fmtFecha("2000-" + c.cumple)) + "</span>";
          cum.appendChild(el);
        });
      }
    }
  }

  /* ---------------- AJUSTES ---------------- */
  function renderAjustes() {
    $("#inpNombre").value = S.perfil.nombre || "";
    $("#inpPuesto").value = S.perfil.puesto || "";
    $("#inpSalario").value = S.perfil.salario || "";
    $("#inpToken").value = S.ajustes.notionToken || "";
    $("#inpDb").value = S.ajustes.notionDb || "";
    var conectado = !!(S.ajustes.notionToken && S.ajustes.notionDb);
    var et = $("#estadoNotion");
    et.classList.toggle("on", conectado);
    et.querySelector("span").textContent = conectado ? "Notion conectado" : "Notion sin conectar";
    if ($("#inpNotionCada")) $("#inpNotionCada").value = S.ajustes.notionCada || notionCada();
    if ($("#inpGoogleId")) $("#inpGoogleId").value = S.ajustes.googleClientId || "";
    if ($("#inpGmailQuery")) $("#inpGmailQuery").value = S.ajustes.gmailQuery || "";
    if ($("#avisoGoogle")) {
      var gCon = G.conectado();
      $("#avisoGoogle").textContent = gCon
        ? "Conectado" + (S.google.correo ? ": " + S.google.correo : "") +
          (S.calendarioGoogle && S.calendarioGoogle.length ? " · " + S.calendarioGoogle.length + " encuentros próximos" : "") +
          (S.enviosGmail.total ? " · " + S.enviosGmail.total + " envíos en Gmail" : "")
        : (G.clientId()
          ? "Conector listo: pulsa «Conectar Google» para traer Calendar y Gmail."
          : "Conector listo pero apagado: pega tu client ID de Google Cloud y pulsa Conectar.");
    }
    if ($("#btnDesconectarGoogle")) $("#btnDesconectarGoogle").hidden = !G.conectado();
    $("#chipMensajes").classList.toggle("on", S.ajustes.mensajes);
    $("#chipMensajes").textContent = S.ajustes.mensajes ? "Mensajes activados" : "Mensajes pausados";
    $("#chipSonido").classList.toggle("on", S.ajustes.sonido);
    $("#chipSonido").textContent = S.ajustes.sonido ? "Sonido activado" : "Sonido pausado";
    $("#btnSonido").classList.toggle("on", S.ajustes.sonido);
    $("#btnSonido").setAttribute("aria-pressed", String(S.ajustes.sonido));
    var n = S.perfil.nombre || "N";
    $("#avatarRail").textContent = n[0].toUpperCase();
    $("#nombreRail").textContent = S.perfil.puesto || "Tu sistema";
  }

  /* ---------------- NOTION (en vivo) ---------------- */
  var ultimaSync = 0;
  var timerNotion = null;
  var errorNotion = "";

  function servidorLocal() {
    return location.protocol === "http:" && ["8750", "8749", "8748", "8747"].indexOf(location.port) > -1;
  }
  function cabecerasNotion() {
    return {
      "Authorization": "Bearer " + S.ajustes.notionToken,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    };
  }
  async function notionDirecto(ruta, opciones) {
    var r = await fetch("https://api.notion.com/v1" + ruta, opciones);
    var txt = await r.text();
    var datos = {};
    try { datos = JSON.parse(txt); } catch (e) {}
    if (!r.ok) throw new Error((datos && datos.message) || ("HTTP " + r.status));
    return datos;
  }
  /* el proxy (servidor local o función serverless /api/notion) devuelve la respuesta de Notion tal cual */
  async function notionProxy(ruta, opciones) {
    var r = await fetch("/api/notion", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        token: S.ajustes.notionToken,
        metodo: (opciones && opciones.method) || "GET",
        ruta: ruta,
        cuerpo: (opciones && opciones.body) ? JSON.parse(opciones.body) : null
      })
    });
    var txt = await r.text();
    var datos = {};
    try { datos = JSON.parse(txt); } catch (e) {}
    if (!r.ok) throw new Error((datos && datos.message) || ("HTTP " + r.status));
    if (datos && typeof datos.status === "number" && datos.status >= 400) {
      throw new Error(datos.message || ("HTTP " + datos.status));
    }
    return datos;
  }
  async function notion(ruta, opciones) {
    if (servidorLocal()) {
      try { return await notionProxy(ruta, opciones); }
      catch (e) { return await notionDirecto(ruta, opciones); }
    }
    // alojado (Vercel u otro): primero directo y, si el navegador lo bloquea, proxy /api/notion
    try { return await notionDirecto(ruta, opciones); }
    catch (e) { return await notionProxy(ruta, opciones); }
  }

  function propiedadesBase(base) {
    var props = base.properties || {};
    var titulo = Object.keys(props).filter(function (k) { return props[k].type === "title"; })[0] || "Name";
    var estado = Object.keys(props).filter(function (k) {
      return props[k].type === "status" || props[k].type === "select";
    })[0] || "";
    var fecha = Object.keys(props).filter(function (k) { return props[k].type === "date"; })[0] || "";
    return { titulo: titulo, estado: estado, fecha: fecha };
  }

  async function probarNotion() {
    var token = ($("#inpToken").value || "").trim();
    var db = ($("#inpDb").value || "").trim();
    if (!token || !db) { mensaje("Faltan datos", "Pega tu token de integración y el ID de tu base.", "suave"); return false; }
    S.ajustes.notionToken = token; S.ajustes.notionDb = db; guardar();
    try {
      await notion("/users/me", { headers: cabecerasNotion() });
      var base = await notion("/databases/" + db, { headers: cabecerasNotion() });
      var p = propiedadesBase(base);
      S.ajustes.notionTitulo = p.titulo;
      S.ajustes.notionEstado = p.estado; guardar();
      var nombreBase = (base.title || []).map(function (t) { return t.plain_text; }).join("") || "Tareas";
      $("#avisoNotion").textContent = "Conectado con «" + nombreBase + "». Leyendo en vivo cada " + notionCada() + " s." +
        (p.estado ? " Columna de estado: " + p.estado + "." : " (Sin columna de estado: no podrás marcar hecha desde aquí.)");
      mensaje("Notion conectado", "Tu base «" + nombreBase + "» ya se lee en vivo.", "ok"); suenaOk();
      iniciarVivo();
      renderAjustes();
      sincronizarNotion(true);
      return true;
    } catch (e) {
      errorNotion = e.message;
      $("#avisoNotion").textContent = "No pude conectar: " + e.message;
      mensaje("Revisa los datos", e.message, "suave");
      pintarEstadoNotion();
      renderAjustes();
      return false;
    }
  }

  function notionCada() {
    return Math.max(5, S.ajustes.notionCada || (CAT.integraciones && CAT.integraciones.notionCada) || 15);
  }

  async function buscarBaseTareas() {
    var token = ($("#inpToken").value || "").trim();
    if (!token) { mensaje("Falta el token", "Pega tu integration token (secret_…) antes de buscar.", "suave"); return; }
    S.ajustes.notionToken = token; guardar();
    try {
      var r = await notion("/search", {
        method: "POST",
        headers: cabecerasNotion(),
        body: JSON.stringify({ filter: { property: "object", value: "database" }, page_size: 20 })
      });
      var bases = (r.results || []).map(function (db) {
        return {
          id: db.id,
          titulo: (db.title || []).map(function (t) { return t.plain_text; }).join("") || "(sin nombre)"
        };
      });
      if (!bases.length) {
        mensaje("No encontré bases", "Comparte tu carpeta «Tareas» con la integración y vuelve a probar.", "suave");
        return;
      }
      abrirModal(
        '<div class="head"><h3>Elige tu base de tareas</h3><button class="cerrar" data-cerrar>Cerrar</button></div>' +
        '<p class="sub2">Bases visibles para tu integración en Notion.</p>' +
        bases.map(function (b) {
          return '<div class="item"><div class="cuerpo"><div class="t">' + esc(b.titulo) + "</div>" +
            '<div class="d">' + esc(b.id) + "</div></div>" +
            '<button class="btn btn-mini ok" data-elegir="' + esc(b.id) + '">Usar</button></div>';
        }).join("")
      );
      $$("#modal [data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarModal); });
      $$("#modal [data-elegir]").forEach(function (b) {
        b.addEventListener("click", function () {
          $("#inpDb").value = b.dataset.elegir;
          cerrarModal();
          probarNotion();
        });
      });
    } catch (e) {
      mensaje("No pude buscar bases", e.message, "suave");
    }
  }

  async function sincronizarNotion(muestra) {
    if (!S.ajustes.notionToken || !S.ajustes.notionDb) return;
    try {
      var r = await notion("/databases/" + S.ajustes.notionDb + "/query", {
        method: "POST",
        headers: cabecerasNotion(),
        body: JSON.stringify({ page_size: 25, sorts: [{ timestamp: "last_edited_time", direction: "descending" }] })
      });
      var tit = S.ajustes.notionTitulo || "Name";
      var est = S.ajustes.notionEstado || "";
      S.notionFilas = (r.results || []).map(function (pag) {
        var props = pag.properties || {};
        var texto = ((props[tit] && props[tit].title) || []).map(function (x) { return x.plain_text; }).join("");
        var estado = "";
        if (est && props[est]) {
          var pr = props[est];
          estado = (pr.status && pr.status.name) || (pr.select && pr.select.name) || "";
        }
        return {
          id: pag.id, titulo: texto || "(sin título)", estado: estado, url: pag.url || "",
          hecha: /listo|hecho|done|terminad|completad/i.test(estado)
        };
      });
      ultimaSync = Date.now();
      errorNotion = "";
      guardar();
      if (vistaActual === "metas") renderNotionVivo();
      pintarEstadoNotion();
      if (muestra) mensaje("Notion al día", S.notionFilas.length + " tareas en tu base.", "ok");
    } catch (e) {
      errorNotion = e.message;
      pintarEstadoNotion();
      if (muestra) mensaje("Notion no respondió", e.message, "suave");
    }
  }

  function iniciarVivo() {
    if (timerNotion) { clearInterval(timerNotion); timerNotion = null; }
    if (!S.ajustes.notionToken || !S.ajustes.notionDb) return;
    sincronizarNotion();
    timerNotion = setInterval(function () {
      if (!document.hidden) sincronizarNotion();
    }, notionCada() * 1000);
  }

  function pintarEstadoNotion() {
    var et = $("#estadoNotion"); if (!et) return;
    var conectado = !!(S.ajustes.notionToken && S.ajustes.notionDb);
    et.classList.toggle("on", conectado && !errorNotion);
    var span = et.querySelector("span");
    if (errorNotion) { span.textContent = "Notion: " + errorNotion.slice(0, 26); return; }
    if (conectado && ultimaSync) {
      var seg = Math.max(0, Math.round((Date.now() - ultimaSync) / 1000));
      span.textContent = "Notion en vivo · hace " + (seg < 60 ? seg + "s" : Math.round(seg / 60) + " min");
    } else {
      span.textContent = conectado ? "Notion conectado" : "Notion sin conectar";
    }
  }

  function alternarFilaNotion(fila) {
    if (!S.ajustes.notionEstado) {
      mensaje("Sin columna de estado", "Añade una propiedad «Estado» (select o status) a tu base para marcar desde aquí.", "suave");
      return;
    }
    var nuevo = fila.hecha ? "Pendiente" : "Hecho";
    var propiedades = {};
    var t = S.ajustes.notionTitulo, e = S.ajustes.notionEstado;
    if (t) propiedades[t] = { title: [{ text: { content: fila.titulo } }] };
    var tipo = "select";
    propiedades[e] = {};
    propiedades[e][tipo] = { name: nuevo };
    notion("/pages/" + fila.id, {
      method: "PATCH", headers: cabecerasNotion(), body: JSON.stringify({ properties: propiedades })
    }).then(function () {
      fila.hecha = !fila.hecha; fila.estado = nuevo; guardar(); suenaOk();
      renderNotionVivo();
    }).catch(function (err) {
      // el tipo real podría ser "status": se reintenta una vez con status
      var alt = { properties: {} };
      alt.properties[e] = { status: { name: nuevo } };
      if (t) alt.properties[t] = propiedades[t];
      return notion("/pages/" + fila.id, { method: "PATCH", headers: cabecerasNotion(), body: JSON.stringify(alt) })
        .then(function () { fila.hecha = !fila.hecha; fila.estado = nuevo; guardar(); suenaOk(); renderNotionVivo(); })
        .catch(function (e2) { mensaje("Notion no marcó", e2.message, "suave"); });
    });
  }

  async function enviarANotion(t, terminada) {
    if (!S.ajustes.notionToken || !S.ajustes.notionDb) return;
    try {
      var propiedades = {};
      var tituloProp = S.ajustes.notionTitulo || "Name";
      propiedades[tituloProp] = { title: [{ text: { content: t.titulo } }] };
      var estadoProp = S.ajustes.notionEstado;
      if (estadoProp) propiedades[estadoProp] = { select: { name: terminada ? "Hecho" : "Pendiente" } };

      // si la tarea ya existe en Notion, solo se actualiza
      if (t.notionId) {
        await notion("/pages/" + t.notionId, {
          method: "PATCH", headers: cabecerasNotion(),
          body: JSON.stringify({ properties: propiedades })
        });
        sincronizarNotion();
        return;
      }

      var pagina = await notion("/pages", {
        method: "POST",
        headers: cabecerasNotion(),
        body: JSON.stringify({
          parent: { database_id: S.ajustes.notionDb },
          properties: propiedades,
          children: [{
            object: "block", type: "paragraph",
            paragraph: { rich_text: [{ text: { content: (terminada ? "✔ Completada · " : "· ") + t.origen + " · Norte" } }] }
          }]
        })
      });
      if (pagina && pagina.id) { t.notionId = pagina.id; guardar(); }
      mensaje("Enviado a Notion", t.titulo, "ok");
      sincronizarNotion();
    } catch (e) {
      mensaje("Notion no respondió", e.message, "suave");
    }
  }

  /* ---------------- GOOGLE (Calendar + Gmail) · listo pero apagado ---------------- */
  var G = {
    cargado: false,
    clientId: function () {
      return (S.ajustes.googleClientId ||
        (CAT.integraciones && CAT.integraciones.google && CAT.integraciones.google.clientId) || "").trim();
    },
    query: function () {
      return (S.ajustes.gmailQuery ||
        (CAT.integraciones && CAT.integraciones.google && CAT.integraciones.google.queryGmail) || "").trim();
    },
    calendarioId: function () {
      return (CAT.integraciones && CAT.integraciones.google && CAT.integraciones.google.calendarioId) || "primary";
    },
    conectado: function () { return !!(S.google && S.google.token && S.google.expira > Date.now()); },
    cargar: function () {
      return new Promise(function (ok, mal) {
        if (G.cargado) return ok();
        var s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.onload = function () { G.cargado = true; ok(); };
        s.onerror = function () { mal(new Error("No pude cargar Google. Revisa tu conexión.")); };
        document.head.appendChild(s);
      });
    },
    conectar: async function () {
      var id = G.clientId();
      if (!id) throw new Error("Pega primero tu client ID de Google Cloud (tipo xxxx.apps.googleusercontent.com).");
      await G.cargar();
      return new Promise(function (ok, mal) {
        try {
          var cli = window.google.accounts.oauth2.initTokenClient({
            client_id: id,
            scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly",
            callback: function (resp) {
              if (resp.error) return mal(new Error(resp.error_description || resp.error));
              S.google = { token: resp.access_token, expira: Date.now() + ((resp.expires_in || 3600) * 1000), correo: "" };
              guardar(); ok(resp.access_token);
            }
          });
          cli.requestAccessToken({ prompt: "consent" });
        } catch (e) { mal(e); }
      });
    },
    pedir: async function (url) {
      if (!G.conectado()) throw new Error("Google sin conectar.");
      var r = await fetch(url, { headers: { "Authorization": "Bearer " + S.google.token } });
      if (r.status === 401) { S.google.expira = 0; guardar(); throw new Error("La sesión de Google expiró: vuelve a conectar."); }
      var txt = await r.text(); var d = {};
      try { d = JSON.parse(txt); } catch (e) {}
      if (!r.ok) throw new Error((d && d.error && d.error.message) || ("HTTP " + r.status));
      return d;
    },
    calendario: async function () {
      var fin = new Date(Date.now() + 14 * 86400000).toISOString();
      var d = await G.pedir("https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(G.calendarioId()) +
        "/events?singleEvents=true&orderBy=startTime&timeMin=" + new Date().toISOString() +
        "&timeMax=" + fin + "&maxResults=10");
      S.calendarioGoogle = (d.items || []).filter(function (e) { return !e.status || e.status !== "cancelled"; }).map(function (e) {
        var ini = (e.start && (e.start.dateTime || e.start.date)) || "";
        return { fecha: ini.slice(0, 10), titulo: e.summary || "(sin título)", hora: ini.slice(11, 16), url: e.htmlLink || "" };
      });
      guardar();
      return S.calendarioGoogle;
    },
    gmail: async function () {
      var q = encodeURIComponent(G.query() || "in:sent newer_than:30d");
      var d = await G.pedir("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=" + q + "&maxResults=1");
      S.enviosGmail = { total: d.resultSizeEstimate || 0, fecha: iso(hoy()) };
      guardar();
      return S.enviosGmail;
    },
    refrescar: async function () {
      var errores = [];
      try { await G.calendario(); } catch (e) { errores.push(e.message); }
      try { await G.gmail(); } catch (e) { errores.push(e.message); }
      if (errores.length) mensaje("Google", errores[0], "suave");
      renderTodo();
    },
    desconectar: function () {
      S.google = { token: "", expira: 0, correo: "" };
      S.calendarioGoogle = []; S.enviosGmail = { total: 0, fecha: "" };
      guardar(); renderTodo();
    }
  };
  function iniciarGoogle() {
    if (!G.conectado()) return;
    G.refrescar();
    setInterval(function () { if (!document.hidden && G.conectado()) G.refrescar(); }, 10 * 60 * 1000);
  }

  /* ---------------- MODALES ---------------- */
  function abrirModal(html) {
    $("#modal").innerHTML = html;
    $("#venja").classList.add("on");
    var primero = $("#modal button, #modal input");
    if (primero) primero.focus();
  }
  function cerrarModal() { $("#venja").classList.remove("on"); $("#modal").innerHTML = ""; }

  function detalleObjetivo(o) {
    var p = progreso(o.id);
    var ts = S.tareas.filter(function (t) { return t.objId === o.id; });
    var abiertas = ts.filter(function (t) { return t.estado !== "hecho"; });
    var val = o.tipo === "proyecto" ? validacionHTML() : "";
    abrirModal(
      '<div class="head"><div><span class="tipo ' + esc(o.tipo) + '">' + esc(tipoNombre(o.tipo)) + "</span>" +
      "<h3 style='margin-top:12px'>" + esc(o.titulo) + "</h3></div>" +
      '<button class="cerrar" data-cerrar>Cerrar</button></div>' +
      '<p style="color:var(--tinta-2)">' + esc(o.meta || "") + "</p>" +
      '<div class="barra" style="margin:18px 0 8px"><i style="width:' + p.pct + '%"></i></div>' +
      '<p style="color:var(--suave);font-size:.95rem">' + p.ok + " de " + p.total + " tareas cumplidas · " + p.pct + "%</p>" +
      (abiertas.length
        ? '<div class="area" style="margin-top:22px">Próximos pasos</div>' +
          abiertas.slice(0, 4).map(function (t) {
            return '<div class="item"><div class="cuerpo"><div class="t">' + esc(t.titulo) + "</div>" +
              '<div class="d">' + esc(fmtFecha(t.vence)) + " · prioridad " + esc(t.prioridad) + "</div></div></div>";
          }).join("")
        : '<div class="vacio2" style="margin-top:20px">Sin pendientes. ¿Añades el siguiente paso?</div>') +
      val +
      '<div class="acciones"><button class="btn btn-medio" data-tablero>Ver tablero</button>' +
      '<button class="btn btn-suave" data-cerrar>Cerrar</button></div>'
    );
    $$("#modal [data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarModal); });
    var tb = $("#modal [data-tablero]");
    if (tb) tb.addEventListener("click", function () { tableroActivo = o.id; cerrarModal(); irA("objetivos"); });
  }

  function validacionHTML() {
    return '<div class="area" style="margin-top:24px">Modelo de validación (lo que la IA arma para tu proyecto)</div>' +
      '<div class="pasos-val">' + (CAT.validacion || []).map(function (v, i) {
        return '<div class="paso-val"><div class="num">' + (i + 1) + '</div><div><div class="q">' + esc(v.paso) + " · " + esc(v.pregunta) +
          '</div><div class="e">Entrega: ' + esc(v.entrega) + "</div></div></div>";
      }).join("") + "</div>";
  }

  function modalNuevaTarea() {
    if (!S.objetivos.length) { mensaje("Primero tu plan", "Completa el cuestionario para tener objetivos.", "suave"); return; }
    abrirModal(
      '<div class="head"><h3>Nueva tarea</h3><button class="cerrar" data-cerrar>Cerrar</button></div>' +
      '<div class="campo2"><label for="ntTitulo">Qué hay que hacer</label><input id="ntTitulo" placeholder="Ej: Enviar 3 postulaciones"></div>' +
      '<div class="campo2"><label for="ntObj">En qué objetivo</label><select id="ntObj">' +
      S.objetivos.map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.titulo) + "</option>"; }).join("") +
      "</select></div>" +
      '<div class="campo2"><label for="ntPrio">Prioridad</label><select id="ntPrio"><option value="alta">Alta</option><option value="media" selected>Media</option><option value="baja">Baja</option></select></div>' +
      '<div class="campo2"><label for="ntFecha">Para cuándo</label><input id="ntFecha" type="date" value="' + sumar(2) + '"></div>' +
      '<div class="acciones"><button class="btn btn-medio" id="ntGuardar">Añadir tarea</button>' +
      '<button class="btn btn-suave" data-cerrar>Cancelar</button></div>'
    );
    $$("#modal [data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarModal); });
    $("#ntGuardar").addEventListener("click", function () {
      var t = ($("#ntTitulo").value || "").trim();
      if (!t) { mensaje("Falta el título", "Escribe qué hay que hacer.", "suave"); return; }
      var obj = S.objetivos.filter(function (o) { return o.id === $("#ntObj").value; })[0];
      S.tareas.push({ id: uid(), objId: obj.id, titulo: t, prioridad: $("#ntPrio").value, vence: $("#ntFecha").value || sumar(1), estado: "pendiente", origen: obj.titulo });
      guardar(); cerrarModal(); suave(); mensaje("Tarea añadida", "Aparece en tu tablero y en la tarea del día.", "ok");
      renderTodo();
    });
  }

  function modalCorreo(p) {
    var nombre = S.perfil.nombre || "Tu nombre";
    var habilidad = (S.perfil.habilidades.habilidades || [])[0] || "mi experiencia";
    var esTrabajo = p.modo === "trabajo";
    var asunto = (esTrabajo ? CAT.correo.asuntoTrabajo : CAT.correo.asuntoCliente)
      .replace("{{puesto}}", p.puesto).replace("{{empresa}}", p.empresa).replace("{{nombre}}", nombre);
    var cuerpo = (esTrabajo ? CAT.correo.cuerpoTrabajo : CAT.correo.cuerpoCliente).map(function (l) {
      return l.replace("{{nombre}}", nombre)
        .replace("{{puesto}}", p.puesto)
        .replace("{{empresa}}", p.empresa)
        .replace("{{rubro}}", p.rubro || p.puesto)
        .replace("{{fuente}}", p.fuente)
        .replace("{{habilidad}}", habilidad)
        .replace("{{contacto}}", p.contacto || "equipo");
    }).join("\n");

    abrirModal(
      '<div class="head"><div><span class="tipo ' + (esTrabajo ? "trabajo" : "proyecto") + '">Correo generado</span>' +
      "<h3 style='margin-top:12px'>" + esc(esTrabajo ? "Postular" : "Proponer") + " · " + esc(p.empresa) + "</h3></div>" +
      '<button class="cerrar" data-cerrar>Cerrar</button></div>' +
      '<div class="campo2"><label>Asunto</label><input id="mcAsunto" value="' + esc(asunto) + '"></div>' +
      '<div class="campo2"><label>Cuerpo</label><div class="mail-prev" id="mcCuerpo">' + esc(cuerpo) + "</div></div>" +
      '<div class="cv"><span class="chipcv" id="mcCV">CV adjunto</span><span id="mcEstado">Listo para enviar</span></div>' +
      '<div class="acciones"><button class="btn btn-medio" id="mcEnviar">Enviar</button>' +
      '<button class="btn btn-suave" id="mcEditar">Editar</button>' +
      (esTrabajo ? '<button class="btn btn-suave" id="mcBuscar">Buscar otra</button>' : "") + "</div>"
    );
    $$("#modal [data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarModal); });
    $("#mcEnviar").addEventListener("click", function () {
      p.correo = $("#mcAsunto").value + " — " + cuerpo;
      p.estado = "contactado";
      guardar(); cerrarModal(); suenaOk();
      mensaje("Correo enviado", "Seguimiento automático en 4 días si no responden.", "ok");
      var t = S.tareas.filter(function (x) { return x.estado !== "hecho"; })[0];
      renderTodo();
    });
    $("#mcEditar").addEventListener("click", function () {
      var c = $("#mcCuerpo");
      c.contentEditable = "true"; c.style.outline = "1px solid var(--acento)";
      c.focus();
      $("#mcEstado").textContent = "Editando · pulsa Enviar al terminar";
    });
    var b = $("#mcBuscar");
    if (b) b.addEventListener("click", function () { cerrarModal(); buscarOfertas(); });
  }

  function modalMensajeContacto(c) {
    var texto = "Hola " + c.nombre.split(" ")[0] + ", ¿cómo estás? Quería preguntarte por cómo va todo por ahí. " +
      "Hace rato que no hablamos y me interesaba saber de ti.";
    abrirModal(
      '<div class="head"><div><span class="tipo comunidad">Red</span><h3 style="margin-top:12px">Mensaje para ' + esc(c.nombre) + "</h3></div>" +
      '<button class="cerrar" data-cerrar>Cerrar</button></div>' +
      '<div class="campo2"><label>Copia y pega donde quieras</label><div class="mail-prev" id="mmTexto">' + esc(texto) + "</div></div>" +
      '<p class="aviso">Un mensaje corto, sin pedir nada. Esa es la clave de una red que dura.</p>' +
      '<div class="acciones"><button class="btn btn-medio" id="mmHecho">Marcar como hecho</button>' +
      '<button class="btn btn-suave" data-cerrar>Cerrar</button></div>'
    );
    $$("#modal [data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarModal); });
    $("#mmHecho").addEventListener("click", function () {
      var r = S.rutina.filter(function (x) { return x.fecha === iso(hoy()) && x.texto.indexOf(c.nombre) > -1; })[0];
      if (r) r.hecha = true;
      guardar(); cerrarModal(); suenaOk(); mensaje("Contacto hecho", "La red se construye así, de a poco.", "ok");
      renderTodo();
    });
  }

  function modalNuevoContacto() {
    abrirModal(
      '<div class="head"><h3>Añadir contacto</h3><button class="cerrar" data-cerrar>Cerrar</button></div>' +
      '<div class="campo2"><label for="ncNombre">Nombre</label><input id="ncNombre" placeholder="Nombre y apellido"></div>' +
      '<div class="campo2"><label for="ncRol">Rol o vínculo</label><input id="ncRol" placeholder="Ej: ex compañero, cliente, vecino"></div>' +
      '<div class="campo2"><label for="ncEmpresa">Empresa (opcional)</label><input id="ncEmpresa"></div>' +
      '<div class="campo2"><label for="ncCumple">Cumpleaños (mes-día)</label><input id="ncCumple" placeholder="05-12" maxlength="5"></div>' +
      '<div class="campo2"><label for="ncTipo">Categoría</label><select id="ncTipo">' +
      '<option value="comunidad">Comunidad</option><option value="cliente">Cliente / potencial</option>' +
      '<option value="referido">Referido</option><option value="familia">Familia</option></select></div>' +
      '<div class="acciones"><button class="btn btn-medio" id="ncGuardar">Guardar contacto</button>' +
      '<button class="btn btn-suave" data-cerrar>Cancelar</button></div>'
    );
    $$("#modal [data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarModal); });
    $("#ncGuardar").addEventListener("click", function () {
      var n = ($("#ncNombre").value || "").trim();
      if (!n) { mensaje("Falta el nombre", "Escribe cómo se llama.", "suave"); return; }
      var cum = ($("#ncCumple").value || "").trim();
      if (cum && !/^\d{2}-\d{2}$/.test(cum)) { mensaje("Formato de fecha", "Usa mes-día, por ejemplo 05-12.", "suave"); return; }
      S.contactos.push({ id: uid(), nombre: n, rol: ($("#ncRol").value || "").trim(), empresa: ($("#ncEmpresa").value || "").trim(), cumple: cum, tipo: $("#ncTipo").value });
      guardar(); cerrarModal(); suave(); mensaje("Contacto añadido", "El sistema ya lo tendrá en cuenta en tu rutina.", "ok");
      renderTodo();
    });
  }

  function modalNuevoEvento() {
    abrirModal(
      '<div class="head"><h3>Recordar fecha</h3><button class="cerrar" data-cerrar>Cerrar</button></div>' +
      '<div class="campo2"><label for="evTitulo">Qué fecha</label><input id="evTitulo" placeholder="Ej: aniversario de mi hermana"></div>' +
      '<div class="campo2"><label for="evFecha">Día</label><input id="evFecha" type="date" value="' + sumar(7) + '"></div>' +
      '<div class="acciones"><button class="btn btn-medio" id="evGuardar">Guardar fecha</button>' +
      '<button class="btn btn-suave" data-cerrar>Cancelar</button></div>'
    );
    $$("#modal [data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarModal); });
    $("#evGuardar").addEventListener("click", function () {
      var t = ($("#evTitulo").value || "").trim();
      if (!t) { mensaje("Falta el título", "Escribe qué fecha recordar.", "suave"); return; }
      S.eventos.push({ fecha: $("#evFecha").value || sumar(7), titulo: t, tipo: "social", origen: "propio" });
      guardar(); cerrarModal(); suave(); mensaje("Fecha guardada", "Te lo recordaremos a tiempo.", "ok");
      renderTodo();
    });
  }

  function modalResumenTarea(id) {
    var t = S.tareas.filter(function (x) { return x.id === id; })[0];
    if (t) { t.estado = "hecho"; S.hechas++; guardar(); suenaOk(); mensaje("Tarea cumplida", "Buena base para lo que viene.", "ok"); }
    renderTodo();
  }

  /* ---------------- render global ---------------- */
  /* ============================================================
     METAS NUMÉRICAS · redes sociales y conseguir trabajo
     ============================================================ */
  function barraHTML(pct) {
    return '<div class="barra"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>';
  }
  function fmtBytes(b) {
    if (!b) return "";
    if (b < 1024) return b + " B";
    if (b < 1048576) return Math.round(b / 1024) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  }
  function metaDe(r) { return Math.max(0, parseInt(r.meta, 10) || 0); }

  function renderMetas() { renderRedes(); renderAreasTrabajo(); renderNotionVivo(); }

  function renderRedes() {
    var cont = $("#listaRedes"); if (!cont) return;
    cont.innerHTML = "";
    if (!S.redes.length) {
      cont.innerHTML = '<div class="vacio2">Todavía sin objetivos sociales. Pulsa «+ Añadir objetivo social».</div>';
      return;
    }
    S.redes.forEach(function (r, i) {
      var meta = metaDe(r);
      var hechos = Math.max(0, r.hechos || 0);
      var d = document.createElement("div");
      d.className = "meta-carta";
      var tieneEnlace = /^https?:\/\//i.test(r.cuenta || "");
      d.innerHTML =
        '<div class="info"><div class="n">' + esc(r.nombre) + "</div>" +
        '<div class="cuenta"><input data-cuenta value="' + esc(r.cuenta || "") + '" placeholder="Enlace de la cuenta…">' +
        (tieneEnlace ? ' <a href="' + esc(r.cuenta) + '" target="_blank" rel="noopener">Abrir ↗</a>' : "") + "</div>" +
        barraHTML(meta ? Math.round(hechos / meta * 100) : 0) +
        '<div class="tam" style="font-size:.78rem;color:var(--suave);margin-top:5px">' +
        (r.ultimo ? "Último registro: " + esc(r.ultimo) : "Sin publicaciones registradas todavía") + "</div></div>" +
        '<div class="casilla"><label>Meta</label><input type="number" min="0" value="' + meta + '" aria-label="Meta de contenidos"></div>' +
        '<div class="contador">' +
        '<button class="btn btn-mini suave" data-menos aria-label="Restar uno">−1</button>' +
        '<div class="num">' + hechos + "<small>de " + meta + "</small></div>" +
        '<button class="btn btn-mini ok" data-mas aria-label="Sumar uno publicado">+1</button></div>' +
        '<button class="btn btn-mini suave" data-quitar title="Quitar objetivo">✕</button>';
      var inpCuenta = d.querySelector("[data-cuenta]");
      inpCuenta.addEventListener("change", function () {
        r.cuenta = inpCuenta.value.trim(); guardar(); renderRedes();
        if (r.cuenta) mensaje("Enlace guardado", r.nombre + ": " + r.cuenta, "ok");
      });
      var inpMeta = d.querySelector(".casilla input");
      inpMeta.addEventListener("change", function () {
        r.meta = metaDe({ meta: inpMeta.value }); guardar(); renderRedes();
      });
      d.querySelector("[data-mas]").addEventListener("click", function () {
        r.hechos = (r.hechos || 0) + 1; r.ultimo = fmtFecha(iso(hoy())); guardar(); suenaOk(); renderRedes();
        if (meta && r.hechos === meta) mensaje("¡Meta cumplida!", r.nombre + ": " + meta + " contenidos publicados.", "ok");
        else mensaje("Publicado +1", r.nombre + " · " + r.hechos + " de " + meta, "");
      });
      d.querySelector("[data-menos]").addEventListener("click", function () {
        r.hechos = Math.max(0, (r.hechos || 0) - 1); guardar(); renderRedes();
      });
      d.querySelector("[data-quitar]").addEventListener("click", function () {
        if (!confirm("¿Quitar el objetivo «" + r.nombre + "»?")) return;
        S.redes.splice(i, 1); guardar(); renderRedes();
        mensaje("Objetivo quitado", "", "");
      });
      cont.appendChild(d);
    });
  }

  function renderAreasTrabajo() {
    var cont = $("#listaAreasTrabajo"); if (!cont) return;
    cont.innerHTML = "";
    if (!S.areasTrabajo.length) {
      cont.innerHTML = '<div class="vacio2">Sin áreas todavía. Pulsa «+ Añadir área».</div>';
      return;
    }
    S.areasTrabajo.forEach(function (a, ia) {
      var meta = metaDe(a);
      var hechos = Math.max(0, a.hechos || 0);
      if (!Array.isArray(a.subtareas)) a.subtareas = [];
      var hechas = a.subtareas.filter(function (s) { return s.hecha; }).length;
      var d = document.createElement("div");
      d.className = "area-trabajo" + (ia === 0 ? " primera" : "");
      d.innerHTML =
        '<div class="cab">' +
        '<div style="flex:1;min-width:190px"><div class="n">' + esc(a.nombre) + "</div>" +
        '<div class="tam" style="font-size:.85rem;color:var(--suave)">' + hechas + " de " + a.subtareas.length + " subtareas</div>" +
        barraHTML(meta ? Math.round(hechos / meta * 100) : 0) + "</div>" +
        '<div class="casilla"><label>Meta</label><input type="number" min="0" value="' + meta + '" aria-label="Meta numérica del área"></div>' +
        '<div class="contador">' +
        '<button class="btn btn-mini suave" data-menos aria-label="Restar uno">−1</button>' +
        '<div class="num">' + hechos + "<small>de " + meta + "</small></div>" +
        '<button class="btn btn-mini ok" data-mas aria-label="Sumar avance">+1</button></div>' +
        '<button class="btn btn-mini suave" data-quitar-area title="Eliminar área">✕</button></div>' +
        '<div class="subtareas"></div>' +
        '<div class="fila-anadir"><input placeholder="Añadir subtarea a «' + esc(a.nombre) + '»…" aria-label="Nueva subtarea">' +
        '<button class="btn btn-mini ok" data-add>Añadir</button></div>';

      var lista = d.querySelector(".subtareas");
      a.subtareas.forEach(function (s, is) {
        var el = document.createElement("div");
        el.className = "subtarea" + (s.hecha ? " ok" : "");
        el.innerHTML =
          '<button class="btn btn-mini ' + (s.hecha ? "ok" : "suave") + '" data-check aria-pressed="' + (s.hecha ? "true" : "false") + '">' +
          (s.hecha ? "✓" : "○") + "</button>" +
          '<div class="t">' + esc(s.titulo) + "</div>" +
          '<button class="btn btn-mini quitar" data-quitar-sub title="Quitar subtarea">✕</button>';
        el.querySelector("[data-check]").addEventListener("click", function () {
          s.hecha = !s.hecha; guardar();
          if (s.hecha) { suenaOk(); mensaje("Subtarea hecha", s.titulo, "ok"); }
          renderAreasTrabajo();
        });
        el.querySelector("[data-quitar-sub]").addEventListener("click", function () {
          if (!confirm("¿Quitar la subtarea «" + s.titulo + "»?")) return;
          a.subtareas.splice(is, 1); guardar(); renderAreasTrabajo();
        });
        lista.appendChild(el);
      });

      d.querySelector("[data-mas]").addEventListener("click", function () {
        a.hechos = (a.hechos || 0) + 1; guardar(); suenaOk(); renderAreasTrabajo();
        mensaje(meta && a.hechos === meta ? "¡Meta cumplida!" : "Avance +1",
          a.nombre + " · " + a.hechos + " de " + meta, meta && a.hechos === meta ? "ok" : "");
      });
      d.querySelector("[data-menos]").addEventListener("click", function () {
        a.hechos = Math.max(0, (a.hechos || 0) - 1); guardar(); renderAreasTrabajo();
      });
      d.querySelector("[data-quitar-area]").addEventListener("click", function () {
        if (!confirm("¿Eliminar el área «" + a.nombre + "» con sus " + a.subtareas.length + " subtareas?")) return;
        S.areasTrabajo.splice(ia, 1); guardar(); renderAreasTrabajo();
        mensaje("Área eliminada", "", "");
      });
      var inpMeta = d.querySelector(".casilla input");
      inpMeta.addEventListener("change", function () {
        a.meta = metaDe({ meta: inpMeta.value }); guardar(); renderAreasTrabajo();
      });
      var inpAdd = d.querySelector(".fila-anadir input");
      var anadir = function () {
        var v = inpAdd.value.trim(); if (!v) return;
        a.subtareas.push({ id: uid(), titulo: v, hecha: false }); guardar(); renderAreasTrabajo();
        mensaje("Subtarea añadida", v, "ok");
      };
      d.querySelector("[data-add]").addEventListener("click", anadir);
      inpAdd.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); anadir(); }
      });
      cont.appendChild(d);
    });
  }

  function renderNotionVivo() {
    var cont = $("#notionVivo"); if (!cont) return;
    var sub = $("#subNotionVivo");
    if (!S.ajustes.notionToken || !S.ajustes.notionDb) {
      if (sub) sub.textContent = "Conecta tu base en Ajustes → Conexión con Notion.";
      cont.innerHTML = '<div class="vacio2">Sin conexión con Notion. Ahí verás tu carpeta «Tareas» refrescándose sola.</div>';
      return;
    }
    if (sub) {
      if (errorNotion) {
        sub.innerHTML = '<span class="vivo"><i></i>' + esc(errorNotion) + "</span>";
      } else {
        var seg = ultimaSync ? Math.max(0, Math.round((Date.now() - ultimaSync) / 1000)) : null;
        sub.innerHTML = '<span class="vivo on"><i></i>' +
          (seg === null ? "Conectado" : "Actualizado hace " + seg + " s · cada " + notionCada() + " s") + "</span>";
      }
    }
    if (!S.notionFilas.length) {
      cont.innerHTML = '<div class="vacio2">Todavía sin filas en tu base…</div>';
      if (!errorNotion && Date.now() - ultimaSync > 30000) sincronizarNotion();
      return;
    }
    cont.innerHTML = "";
    S.notionFilas.forEach(function (f) {
      var el = document.createElement("div");
      el.className = "notion-vivo-item";
      el.innerHTML =
        '<button class="btn btn-mini ' + (f.hecha ? "ok" : "suave") + '" data-check aria-pressed="' + (f.hecha ? "true" : "false") + '">' +
        (f.hecha ? "✓" : "○") + "</button>" +
        '<div class="t">' + esc(f.titulo) +
        (f.estado ? ' <span style="color:var(--suave);font-size:.85rem">· ' + esc(f.estado) + "</span>" : "") + "</div>" +
        (f.url ? '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">Notion ↗</a>' : "");
      el.querySelector("[data-check]").addEventListener("click", function () { alternarFilaNotion(f); });
      cont.appendChild(el);
    });
  }

  /* ============================================================
     TABLERO MURAL · post-its, dibujos y cualquier archivo
     ============================================================ */
  function vistaArchivo(o) {
    var nombre = o.nombre || "";
    var url = o.enServidor ? ("tablero-archivos/" + encodeURIComponent(nombre)) : (o.datos || "");
    var esImagen = /^data:image\//.test(url) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(nombre);
    var esAudio = /^data:audio\//.test(url) || /\.(mp3|wav|ogg|m4a)$/i.test(nombre);
    var esVideo = /^data:video\//.test(url) || /\.(mp4|webm|mov)$/i.test(nombre);
    if (esImagen && url) {
      var img = document.createElement("img");
      img.className = "prev"; img.alt = nombre; img.loading = "lazy"; img.src = url;
      return img;
    }
    if (esAudio && url) { var au = document.createElement("audio"); au.controls = true; au.src = url; return au; }
    if (esVideo && url) { var vi = document.createElement("video"); vi.controls = true; vi.src = url; return vi; }
    if (!url) {
      var sin = document.createElement("div");
      sin.className = "tam";
      sin.textContent = "(Solo en la carpeta del servidor: abre Norte con servidor.ps1)";
      return sin;
    }
    var a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener";
    a.style.cssText = "color:var(--acento);font-size:.9rem;display:inline-block;margin-top:6px";
    a.textContent = "Abrir archivo ↗";
    return a;
  }

  function renderTablero() {
    var cont = $("#mural"); if (!cont) return;
    var est = $("#tabEstadoServidor");
    if (est) {
      est.textContent = servidorLocal()
        ? "Los archivos se guardan en la carpeta tablero-archivos/ (servidor local)."
        : "Sin servidor: notas y dibujos se guardan en tu navegador. Para adjuntar archivos, abre Norte con servidor.ps1.";
    }
    var piezas = []
      .concat((S.tablero.notas || []).map(function (n) { return { tipo: "nota", obj: n }; }))
      .concat((S.tablero.dibujos || []).map(function (n) { return { tipo: "dibujo", obj: n }; }))
      .concat((S.tablero.archivos || []).map(function (n) { return { tipo: "archivo", obj: n }; }));
    cont.innerHTML = "";
    if (!piezas.length) {
      cont.innerHTML = '<div class="vacio2">Tu tablero está vacío. A la izquierda puedes <b>sumar</b> una nota, un dibujo o cualquier archivo: audio, imagen, gráfico, PDF…</div>';
      return;
    }
    piezas.forEach(function (p) {
      var o = p.obj;
      var d = document.createElement("div");
      d.className = "tarjeta-mural" + (p.tipo === "nota" ? (" postit " + (o.color || "")) : (p.tipo === "dibujo" ? " dibujo" : ""));
      var btn = document.createElement("button");
      btn.className = "quitar"; btn.type = "button";
      btn.textContent = "✕"; btn.title = "Quitar del tablero"; btn.setAttribute("aria-label", "Quitar del tablero");
      btn.addEventListener("click", function () { quitarDelTablero(p.tipo, o.id); });
      d.appendChild(btn);

      if (p.tipo === "nota") {
        var ta = document.createElement("textarea");
        ta.placeholder = "Escribe tu idea aquí…";
        ta.value = o.texto || "";
        ta.setAttribute("aria-label", "Nota");
        ta.addEventListener("input", function () { o.texto = ta.value; guardar(); });
        d.appendChild(ta);
        var cols = document.createElement("div");
        [["", "Amarillo"], ["azul", "Azul"], ["verde", "Verde"]].forEach(function (c) {
          var b = document.createElement("button");
          b.className = "btn btn-mini " + ((o.color || "") === c[0] ? "ok" : "suave");
          b.textContent = c[1];
          b.style.marginRight = "6px";
          b.addEventListener("click", function () { o.color = c[0]; guardar(); renderTablero(); });
          cols.appendChild(b);
        });
        d.appendChild(cols);
        var pie = document.createElement("div");
        pie.className = "pie-nota";
        pie.textContent = "Nota · " + fmtFecha(o.fecha);
        d.appendChild(pie);
      } else if (p.tipo === "dibujo") {
        var img = document.createElement("img");
        img.alt = o.nombre || "Dibujo";
        img.src = o.datos || "";
        d.appendChild(img);
        var nd = document.createElement("div");
        nd.className = "nombre";
        nd.textContent = (o.nombre || "Dibujo") + (o.enServidor ? " · en carpeta" : " · en tu navegador");
        d.appendChild(nd);
      } else {
        var v = vistaArchivo(o);
        if (v) d.appendChild(v);
        var nf = document.createElement("div");
        nf.className = "nombre";
        nf.innerHTML = esc(o.nombre || "") +
          '<div class="tam">' + esc(fmtBytes(o.bytes) || "") + (o.enServidor ? " · en carpeta tablero-archivos" : "") + "</div>";
        d.appendChild(nf);
      }
      cont.appendChild(d);
    });
  }

  function quitarDelTablero(tipo, id) {
    var clave = tipo === "nota" ? "notas" : (tipo === "dibujo" ? "dibujos" : "archivos");
    var arr = S.tablero[clave] || [];
    var i = -1;
    arr.forEach(function (o, k) { if (o.id === id) i = k; });
    if (i < 0) return;
    var o = arr[i];
    if (!confirm("¿Quitar del tablero: " + (o.nombre || (o.texto || "").slice(0, 40) || "esto") + "?")) return;
    arr.splice(i, 1);
    guardar(); renderTablero();
    if (o.enServidor && servidorLocal()) {
      fetch("/api/borrar-archivo", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ nombre: o.nombre })
      }).catch(function () {});
    }
    mensaje("Quitado del tablero", "Puedes volver a sumarlo cuando quieras.", "");
  }

  function subirAlServidor(nombre, datos) {
    return fetch("/api/subir", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ nombre: nombre, datos: datos })
    }).then(function (r) {
      return r.text().then(function (txt) {
        var d = {};
        try { d = JSON.parse(txt); } catch (e) {}
        if (!r.ok || d.ok === false) throw new Error(d.error || ("HTTP " + r.status));
        return d;
      });
    });
  }

  function refrescarArchivosServidor() {
    if (!servidorLocal()) return Promise.resolve();
    return fetch("/api/tablero").then(function (r) { return r.json(); }).then(function (lista) {
      if (!Array.isArray(lista)) return;
      S.tablero.archivos = (S.tablero.archivos || []).filter(function (a) { return !a.enServidor; });
      lista.forEach(function (f) {
        S.tablero.archivos.push({ id: "srv-" + f.nombre, nombre: f.nombre, bytes: f.bytes, fecha: f.fecha, enServidor: true });
      });
      guardar(); renderTablero();
    }).catch(function () {});
  }

  function anadirNotaTablero() {
    S.tablero.notas.unshift({ id: uid(), texto: "", color: "", fecha: iso(hoy()) });
    guardar(); renderTablero();
    var primer = $("#mural textarea");
    if (primer) primer.focus();
    mensaje("Nota añadida", "Escribe tu idea; se guarda sola.", "ok");
  }

  function subirArchivosTablero(files) {
    var lista = Array.prototype.slice.call(files || []);
    if (!lista.length) return;
    lista.forEach(function (f) {
      var lector = new FileReader();
      lector.onload = function () {
        var datos = lector.result;
        if (servidorLocal()) {
          subirAlServidor(f.name, datos).then(function (d) {
            S.tablero.archivos.unshift({
              id: uid(), nombre: (d && d.nombre) || f.name, bytes: f.size,
              fecha: iso(hoy()), enServidor: true
            });
            guardar(); renderTablero(); suenaOk();
            mensaje("Archivo en el tablero", f.name, "ok");
          }).catch(function (e) {
            mensaje("No pude subir el archivo", e.message, "suave");
          });
        } else {
          if (f.size > 2500000) {
            mensaje("Archivo grande", "Sin servidor local guarda hasta 2,5 MB. Abre Norte con servidor.ps1 para más.", "suave");
            return;
          }
          S.tablero.archivos.unshift({ id: uid(), nombre: f.name, bytes: f.size, fecha: iso(hoy()), datos: datos });
          guardar(); renderTablero(); suenaOk();
          mensaje("Archivo guardado en el navegador", f.name, "ok");
        }
      };
      lector.readAsDataURL(f);
    });
  }

  function modalDibujo() {
    abrirModal(
      '<div class="head"><h3>Dibuja tu meta</h3><button class="cerrar" data-cerrar>Cerrar</button></div>' +
      '<p class="sub2">Dibujá libremente: figuras, flechas, palabras. Se guarda en tu tablero como imagen.</p>' +
      '<canvas class="lienzo" id="lienzo" width="700" height="340"></canvas>' +
      '<div class="acciones" style="margin-top:14px">' +
      '<button class="btn btn-suave" id="dibBorrar">Borrar todo</button>' +
      '<button class="btn btn-medio" id="dibGuardar">Guardar en el tablero</button></div>'
    );
    $$("#modal [data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarModal); });
    var c = $("#lienzo"), ctx = c.getContext("2d");
    if (!ctx) { cerrarModal(); return; }
    ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#2E7D64"; ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, c.width, c.height);
    var pintando = false, prev = null;
    function pos(e) {
      var r = c.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * c.width, y: (e.clientY - r.top) / r.height * c.height };
    }
    c.addEventListener("pointerdown", function (e) {
      pintando = true; prev = pos(e);
      try { c.setPointerCapture(e.pointerId); } catch (err) {}
    });
    c.addEventListener("pointermove", function (e) {
      if (!pintando) return;
      var p = pos(e);
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      prev = p;
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
      c.addEventListener(ev, function () { pintando = false; });
    });
    $("#dibBorrar").addEventListener("click", function () {
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, c.width, c.height);
    });
    $("#dibGuardar").addEventListener("click", function () {
      guardarDibujo(c.toDataURL("image/png"));
    });
  }

  function guardarDibujo(datos) {
    var nombre = "dibujo-" + iso(hoy()) + "-" + uid() + ".png";
    var pie = { id: uid(), nombre: nombre, datos: datos, fecha: iso(hoy()) };
    if (servidorLocal()) {
      subirAlServidor(nombre, datos).then(function (d) {
        pie.nombre = (d && d.nombre) || nombre;
        pie.enServidor = true;
        S.tablero.dibujos.unshift(pie);
        guardar(); cerrarModal(); renderTablero(); suenaOk();
        mensaje("Dibujo guardado", "Está en tu tablero y en la carpeta del servidor.", "ok");
      }).catch(function (e) {
        // sin servidor de archivos: se queda solo en el navegador
        S.tablero.dibujos.unshift(pie);
        guardar(); cerrarModal(); renderTablero();
        mensaje("Dibujo guardado", "No pude subirlo (" + e.message + "); queda en tu navegador.", "suave");
      });
      return;
    }
    if (datos.length > 1500000) {
      mensaje("Dibujo muy grande", "Con servidor local no hay límite; sin él guarda hasta 1,5 MB.", "suave");
      return;
    }
    S.tablero.dibujos.unshift(pie);
    guardar(); cerrarModal(); renderTablero(); suenaOk();
    mensaje("Dibujo guardado", "Ya está en tu tablero.", "ok");
  }

  function renderTodo() {
    renderHoy(); renderObjetivos(); renderMetas(); renderTablero();
    renderProspectos(); renderRed(); renderVida(); renderCalendario(); renderAjustes();
  }

  /* ---------------- navegación ---------------- */
  function abrirRail() { $("#rail").classList.add("on"); var s = $("#scrimRail"); s.hidden = false; s.classList.add("on"); $("#btnMenu").setAttribute("aria-expanded", "true"); }
  function cerrarRail() { $("#rail").classList.remove("on"); var s = $("#scrimRail"); s.classList.remove("on"); s.hidden = true; $("#btnMenu").setAttribute("aria-expanded", "false"); }

  /* ============================================================
     ARRANQUE
     ============================================================ */
  function iniciarOnboarding() {
    chips("#chipsPuestos", CAT.puestos || [], "puesto", true);
    chips("#chipsSalarios", CAT.salarios || [], "salario", false);
    chips("#chipsModalidades", CAT.modalidades || [], "modalidad", false);
    chips("#chipsProyectos", CAT.proyectosSugeridos || [], "proyectos", false);
    // restaurar selección guardada (puesto = array multi-select; resto = string)
    [["#chipsPuestos", "puesto"], ["#chipsSalarios", "salario"], ["#chipsModalidades", "modalidad"]].forEach(function (d) {
      var guardado = S.perfil[d[1]];
      var marcas = Array.isArray(guardado) ? guardado : (guardado ? [guardado] : []);
      if (!marcas.length) return;
      $$(".chip", $(d[0])).forEach(function (b) {
        if (marcas.indexOf(b.textContent) > -1) b.classList.add("on");
      });
    });
    pintarPerfil();
    pintarProyectosMios();
    $("#q1Texto").value = S.perfil.texto1 || "";
    $("#q3Texto").value = S.perfil.texto3 || "";
    $("#avisoProyectos").hidden = S.perfil.proyectos.length > 0;

    $$("[data-siguiente]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (pasoActual === 1) {
          S.perfil.texto1 = $("#q1Texto").value.trim();
          var tienePuesto = (Array.isArray(S.perfil.puesto) && S.perfil.puesto.length) ||
            (typeof S.perfil.puesto === "string" && S.perfil.puesto) || S.perfil.texto1;
          if (!tienePuesto) {
            mensaje("Marca algo", "Elige al menos un puesto o escríbelo con tus palabras.", "suave");
            guardar(); return;
          }
          guardar();
        }
        mostrarPaso(pasoActual + 1); inicio();
      });
    });
    $$("[data-volver]").forEach(function (b) {
      b.addEventListener("click", function () { mostrarPaso(Math.max(0, pasoActual - 1)); });
    });
    $("#btnEmpezar").addEventListener("click", function () { mostrarPaso(1); inicio(); });
    $("#btnAddProyecto").addEventListener("click", function () { agregarProyecto($("#proyectoInput").value); });
    $("#proyectoInput").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); agregarProyecto($("#proyectoInput").value); } });
    $("#q1Texto").addEventListener("input", function () {
      S.perfil.texto1 = this.value; guardar();
    });
    $("#q3Texto").addEventListener("input", function () { S.perfil.texto3 = this.value; guardar(); });

    $("#btnConstruir").addEventListener("click", function () {
      S.perfil.texto1 = $("#q1Texto").value;
      S.perfil.texto3 = $("#q3Texto").value;
      mostrarPaso(4);
      construirPlan();
      animarConstruccion();
    });
    $("#btnEntrar").addEventListener("click", function () {
      $("#onboarding").hidden = true;
      $("#app").hidden = false;
      $("#barraMovil").hidden = false;
      irA("hoy"); suenaOk();
      mensaje("Bienvenido a tu sistema", "Cada día verás una sola tarea. Sólo eso.", "ok");
      temporizadorMensajes();
    });
  }

  function animarConstruccion() {
    var pasos = (CAT.ui && CAT.ui.construyendo && CAT.ui.construyendo.pasos) || [
      "Leyendo tu perfil y tus habilidades…",
      "Conectando tu meta de trabajo e ingresos…",
      "Armando un plan de validación por proyecto…",
      "Precargando fechas sociales y comunidad…",
      "Cruzando todo para decidir tu tarea de hoy…"
    ];
    var cont = $("#procesoConstruir"); cont.innerHTML = "";
    $("#tituloConstruyendo").textContent = pasos[0];
    pasos.forEach(function (p, i) {
      setTimeout(function () {
        $("#tituloConstruyendo").textContent = p;
        var el = document.createElement("div");
        el.className = "item subir";
        el.innerHTML = '<div class="cuerpo"><div class="t">✓ ' + esc(p) + "</div></div>";
        cont.appendChild(el);
        tono(520 + i * 60, 0, 0.18, 0.07);
        if (i === pasos.length - 1) setTimeout(mostrarResumen, 700);
      }, reduce ? 20 * i : 620 * i);
    });
  }

  function mostrarResumen() {
    var cont = $("#resumenPlan");
    cont.innerHTML = "";
    S.objetivos.forEach(function (o) {
      var p = progreso(o.id);
      var el = document.createElement("div");
      el.className = "item";
      el.innerHTML = '<span class="tipo ' + esc(o.tipo) + '">' + esc(tipoNombre(o.tipo)) + "</span>" +
        '<div class="cuerpo"><div class="t">' + esc(o.titulo) + "</div>" +
        '<div class="d">' + esc(o.meta || "") + " · " + p.total + " tareas</div></div>";
      cont.appendChild(el);
    });
    var el = document.createElement("div");
    el.className = "item";
    el.innerHTML = '<span class="tipo vida">Red</span><div class="cuerpo"><div class="t">' +
      S.contactos.length + " contactos · " + (CAT.eventosFijos || []).length + " fechas precargadas</div>" +
      '<div class="d">Cumpleaños, feriados y rutina de 3 acciones diarias</div></div>';
    cont.appendChild(el);
    mostrarPaso(5);
    suenaOk();
  }

  function temporizadorMensajes() {
    setInterval(function () {
      if (!S.ajustes.mensajes || document.hidden) return;
      mensaje("Para ti", aleatorio(CAT.mensajes || ["Sigue así."]), "suave");
    }, 8 * 60 * 1000);
  }

  function eventos() {
    $("#btnMenu").addEventListener("click", function () {
      if ($("#rail").classList.contains("on")) cerrarRail(); else abrirRail();
    });
    $("#scrimRail").addEventListener("click", cerrarRail);
    $$("#nav button, #barraMovil button").forEach(function (b) {
      b.addEventListener("click", function () { irA(b.dataset.vista); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { cerrarModal(); cerrarRail(); }
    });
    $("#venja").addEventListener("click", function (e) { if (e.target === $("#venja")) cerrarModal(); });

    $("#btnSonido").addEventListener("click", function () {
      S.ajustes.sonido = !S.ajustes.sonido; guardar(); renderAjustes();
      if (S.ajustes.sonido) suave();
      mensaje(S.ajustes.sonido ? "Sonido activado" : "Sonido pausado", "Puedes cambiarlo cuando quieras.", "");
    });
    $("#chipSonido").addEventListener("click", function () { $("#btnSonido").click(); });
    $("#chipMensajes").addEventListener("click", function () {
      S.ajustes.mensajes = !S.ajustes.mensajes; guardar(); renderAjustes();
      if (S.ajustes.mensajes) mensaje("Mensajes activados", "Te acompañarán cada tanto, sin molestar.", "ok");
    });

    $("#btnHoyHecha").addEventListener("click", function () { if (this.dataset.id) modalResumenTarea(this.dataset.id); });
    $("#btnHoyOtra").addEventListener("click", function () { rotacion++; renderHoy(); suave(); });
    $("#btnNuevaTarea").addEventListener("click", modalNuevaTarea);
    $("#btnBuscarOfertas").addEventListener("click", buscarOfertas);
    $("#btnNuevoContacto").addEventListener("click", modalNuevoContacto);
    $("#btnNuevoEvento").addEventListener("click", modalNuevoEvento);

    $$("#tabsProspectos .tab-obj").forEach(function (b) {
      b.addEventListener("click", function () { modoProspecto = b.dataset.modo; fuenteActiva = "todas"; renderProspectos(); });
    });

    $("#btnGuardarPerfil").addEventListener("click", function () {
      S.perfil.nombre = $("#inpNombre").value.trim();
      S.perfil.puesto = $("#inpPuesto").value.trim();
      S.perfil.salario = $("#inpSalario").value.trim();
      guardar(); renderTodo(); suave();
      mensaje("Perfil guardado", "Tu sistema se recalcula con esto.", "ok");
    });
    $("#btnConectarNotion").addEventListener("click", probarNotion);
    $("#btnProbarNotion").addEventListener("click", probarNotion);
    if ($("#btnBuscarBase")) $("#btnBuscarBase").addEventListener("click", buscarBaseTareas);
    if ($("#inpNotionCada")) $("#inpNotionCada").addEventListener("change", function () {
      S.ajustes.notionCada = Math.max(5, parseInt(this.value, 10) || 0); guardar();
      iniciarVivo(); renderTodo();
      mensaje("Refresco ajustado", "La base se lee cada " + notionCada() + " segundos.", "ok");
    });
    if ($("#inpGoogleId")) $("#inpGoogleId").addEventListener("change", function () {
      S.ajustes.googleClientId = this.value.trim(); guardar(); renderAjustes();
    });
    if ($("#inpGmailQuery")) $("#inpGmailQuery").addEventListener("change", function () {
      S.ajustes.gmailQuery = this.value.trim(); guardar();
      if (G.conectado()) G.gmail().then(function () { renderTodo(); });
    });
    if ($("#btnConectarGoogle")) $("#btnConectarGoogle").addEventListener("click", function () {
      S.ajustes.googleClientId = ($("#inpGoogleId").value || "").trim(); guardar();
      G.conectar().then(function () {
        mensaje("Google conectado", "Trayendo tus encuentros y envíos…", "ok"); suenaOk();
        renderTodo(); G.refrescar();
      }).catch(function (e) {
        mensaje("No pude conectar Google", e.message, "suave");
        renderAjustes();
      });
    });
    if ($("#btnDesconectarGoogle")) $("#btnDesconectarGoogle").addEventListener("click", function () {
      G.desconectar(); mensaje("Google desconectado", "Tus datos locales siguen intactos.", "");
      renderAjustes();
    });

    // --- Metas numéricas ---
    if ($("#btnNuevaRed")) $("#btnNuevaRed").addEventListener("click", function () {
      var n = prompt("Nombre del objetivo social (ej: Instagram):");
      if (!n || !n.trim()) return;
      S.redes.push({ id: uid(), nombre: n.trim(), cuenta: "", meta: 30, hechos: 0, ultimo: "" });
      guardar(); renderRedes();
      mensaje("Objetivo añadido", "Fija su enlace y su meta numérica.", "ok");
    });
    if ($("#btnNuevaArea")) $("#btnNuevaArea").addEventListener("click", function () {
      var n = prompt("Nombre del área (ej: Portafolios, Mentorías):");
      if (!n || !n.trim()) return;
      S.areasTrabajo.push({ id: uid(), nombre: n.trim(), meta: 10, hechos: 0, subtareas: [] });
      guardar(); renderAreasTrabajo();
      mensaje("Área añadida", "Suma casilleros de subtareas y su meta.", "ok");
    });

    // --- Tablero mural ---
    if ($("#tabNota")) $("#tabNota").addEventListener("click", anadirNotaTablero);
    if ($("#tabDibujo")) $("#tabDibujo").addEventListener("click", modalDibujo);
    if ($("#tabArchivo")) $("#tabArchivo").addEventListener("change", function () {
      subirArchivosTablero(this.files);
      this.value = "";
    });

    $("#btnExportar").addEventListener("click", function () {
      try {
        var blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = "norte-sistema.json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        mensaje("JSON exportado", "Guarda ese archivo: es todo tu sistema.", "ok");
      } catch (e) { mensaje("No pude exportar", e.message, "suave"); }
    });
    $("#inpImportar").addEventListener("change", function () {
      var f = this.files && this.files[0]; if (!f) return;
      var lector = new FileReader();
      lector.onload = function () {
        try {
          var obj = JSON.parse(lector.result);
          if (!obj || !obj.objetivos) throw new Error("No parece un archivo de Norte");
          S = parchear(obj); sembrarMetas(); guardar(); renderTodo(); suenaOk();
          mensaje("Sistema importado", "Ya estás de vuelta con tus datos.", "ok");
        } catch (e) { mensaje("Archivo no válido", e.message, "suave"); }
      };
      lector.readAsText(f);
      this.value = "";
    });
    $("#btnReiniciar").addEventListener("click", function () {
      localStorage.removeItem(CLAVE);
      location.reload();
    });
  }

  /* ---------------- arranque ---------------- */
  function arrancar() {
    var existia = cargar();
    if (!existia) S = estadoVacio();
    parchear(S);
    sembrarMetas();
    refrescarEventos();
    pintarUI();
    eventos();
    iniciarOnboarding();
    $("#fechaHoy").textContent = fechaLarga();
    pintarEstadoNotion();
    setInterval(function () { if (!document.hidden) pintarEstadoNotion(); }, 10000);
    iniciarVivo();
    iniciarGoogle();

    if (S.vistoOnboarding && S.objetivos.length) {
      $("#onboarding").hidden = true;
      $("#app").hidden = false;
      $("#barraMovil").hidden = false;
      if (S.diaRutina !== iso(hoy())) generarRutina();
      renderTodo();
      temporizadorMensajes();
      setTimeout(function () { mensaje("Buen día", "Tu sistema ya calculó por dónde empezar.", "ok"); }, 1400);
    } else {
      renderTodo();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();

  // API mínima para pruebas automatizadas
  window.__norte = {
    estado: function () { return S; },
    guardar: guardar,
    irA: irA,
    construirPlan: construirPlan,
    tareaDelDia: tareaDelDia,
    avanzarTarea: avanzarTarea,
    abrirModal: abrirModal,
    cerrarModal: cerrarModal,
    pintarUI: pintarUI,
    eventos: proximosEventos,
    // v2 · metas numéricas, tablero e integraciones
    sembrarMetas: sembrarMetas,
    parchear: parchear,
    estadoVacio: estadoVacio,
    renderMetas: renderMetas,
    renderRedes: renderRedes,
    renderAreasTrabajo: renderAreasTrabajo,
    renderNotionVivo: renderNotionVivo,
    renderTablero: renderTablero,
    anadirNotaTablero: anadirNotaTablero,
    quitarDelTablero: quitarDelTablero,
    subirArchivosTablero: subirArchivosTablero,
    subirAlServidor: subirAlServidor,
    sincronizarNotion: sincronizarNotion,
    notionCada: notionCada,
    servidorLocal: servidorLocal,
    google: function () { return G; },
    pintarEstadoNotion: pintarEstadoNotion
  };
})();
