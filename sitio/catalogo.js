// ============================================================
// NORTE · sistema de enfoque  ·  catálogo precargado
// Datos de partida que trae la app para todo usuario nuevo.
// Se puede editar a mano o desde admin.html; la app lo lee
// como window.CATALOGO.
// ============================================================
window.CATALOGO = {

  // ============================================================
  // UI · textos de la interfaz (marca, menú, botones, preguntas)
  // Todo esto lo edita admin.html; index.html lo pinta solo.
  // ============================================================
  ui: {
    marca: { nombre: "Norte", sub: "Sistema de enfoque", pie: "Norte · prototipo" },
    inicio: {
      titulo1: "Cada día se abre sin saber por dónde tirar.",
      titulo2: "Hoy eso cambia.",
      lede: "Define lo que quieres y el sistema te devuelve una sola tarea para avanzar: trabajo, ingresos, proyectos, familia y comunidad, todo cruzado.",
      aviso: "3 preguntas · 2 minutos · después el sistema arma tu plan.",
      btn: "Empezar"
    },
    acciones: { volver: "← Volver", siguiente: "Siguiente", construir: "Construir mi plan" },
    pasos: [
      {
        titulo: "¿En qué puesto o cargo te gustaría trabajar?",
        sub: "Marca todo lo que encaje contigo, y luego cuánto te gustaría ganar.",
        etPuestos: "Puestos",
        etSalario: "Cuánto te gustaría ganar (mensual)",
        etModalidad: "Modalidad",
        etTexto: "O escríbelo con tus palabras",
        phTexto: "Ej: algo remoto, donde pueda usar mi diseño y me paguen a tiempo…"
      },
      {
        titulo: "¿Qué proyectos propios tienes en mente o en marcha?",
        sub: "Hasta 5. Pueden ser ideas; el sistema las convierte en un plan validable.",
        etSugerencias: "Sugerencias",
        etTus: "Tus proyectos",
        btnAnadir: "Añadir",
        phProyecto: "Escribe un proyecto propio…",
        aviso: "Aún no eliges proyectos. Puedes continuar igual: el sistema trabaja con lo que tengas."
      },
      {
        titulo: "¿Quién eres cuando trabajas?",
        sub: "Marca lo que te representa. Esto define a qué puertas toca el sistema.",
        etTexto: "Hobbies, logros, experiencias y conocimientos con tus palabras",
        phTexto: "Ej: armó la fiesta de la cuadra, sé vender por WhatsApp, organicé el viaje de egresados…",
        grupos: [
          { id: "hobbies", label: "Hobbies" },
          { id: "logros", label: "Logros" },
          { id: "habilidades", label: "Habilidades" },
          { id: "estilo", label: "Estilo (personalidad)" },
          { id: "experiencias", label: "Experiencias" },
          { id: "conocimientos", label: "Conocimientos" }
        ]
      }
    ],
    construyendo: {
      marca: "Armando tu sistema",
      sub: "Un momento",
      titulo: "Cruzando tus objetivos con tu perfil…",
      pasos: [
        "Leyendo tu perfil y tus habilidades…",
        "Conectando tu meta de trabajo e ingresos…",
        "Armando un plan de validación por proyecto…",
        "Precargando fechas sociales y comunidad…",
        "Cruzando todo para decidir tu tarea de hoy…"
      ]
    },
    listo: {
      titulo: "Tu plan está listo.",
      sub: "Con esto queda armado tu sistema. Puedes cambiarlo cuando quieras desde Ajustes.",
      btn: "Entrar a mi sistema"
    },
    menu: {
      grupos: { enfoque: "Enfoque", vida: "Vida", sistema: "Sistema" },
      items: {
        hoy: "Hoy", objetivos: "Objetivos", metas: "Metas", prospectos: "Buscar trabajo",
        red: "Red", vida: "Vida esencial", calendario: "Calendario",
        tablero: "Tablero", ajustes: "Ajustes"
      },
      movil: {
        hoy: "Hoy", objetivos: "Metas", metas: "Metas+", prospectos: "Buscar",
        red: "Red", vida: "Vida", calendario: "Fechas", ajustes: "Ajustes"
      }
    },
    topbar: { menu: "Menú", sonido: "♪ Sonido" },
    enc: {
      hoy: { k: "Resumen", h2: "Cada objetivo, en una mirada", p: "Entra al detalle con un clic. Todo lo que hagas aquí se refleja en tus tableros." },
      objetivos: { k: "Ejecución", h2: "Tus tableros", p: "Un tablero por objetivo o proyecto. Avanza tareas con un botón: nada más." },
      metas: { k: "Metas numéricas", h2: "Redes sociales y conseguir trabajo", p: "Cada área tiene su casillero de meta y sus subtareas. Suma con un clic lo que publicas o envías." },
      prospectos: { k: "Ingresos", h2: "Buscar trabajo y clientes", p: "El mismo proceso para postular a un empleo o vender un proyecto: oferta → correo → seguimiento." },
      red: { k: "Comunidad", h2: "Tu red de contacto", p: "Carga a quienes forman tu comunidad. El sistema te sugiere un mensaje al día, sin saturar." },
      vida: { k: "Salud y familia", h2: "Vida esencial", p: "Salud mental, física y espiritual, y tiempo con tu familia. Rituales chicos que sostienen todo lo demás." },
      calendario: { k: "Social", h2: "Fechas que importan", p: "Precargado para todo usuario: feriados, día de la madre, el padre, los amigos… y los cumpleaños de tu red." },
      tablero: { k: "Mural", h2: "Tu tablero de ideas", p: "Pega post-its, dibuja tus metas y guarda audio, imágenes, gráficos o lo que sea. Sumar y quitar a un lado." },
      ajustes: { k: "Sistema", h2: "Ajustes", p: "Tu perfil, tus conexiones (Notion y Google), sonido y tus datos." }
    },
    botones: {
      nuevaTarea: "+ Nueva tarea", buscarOfertas: "Buscar ofertas", nuevoContacto: "+ Añadir contacto",
      nuevoEvento: "+ Recordar fecha", hoyHecha: "Marcar hecha", hoyOtra: "Otra tarea",
      guardarPerfil: "Guardar perfil", conectar: "Conectar", probar: "Probar",
      exportar: "Exportar JSON", importar: "Importar JSON", reiniciar: "Reiniciar mi sistema",
      chipMensajes: "Mensajes activados", chipSonido: "Sonido activado",
      nuevaRed: "+ Añadir objetivo social", nuevaArea: "+ Añadir área", nuevaSubtarea: "Añadir",
      subirArchivo: "Subir archivo", nuevaNota: "+ Nota", nuevoDibujo: "+ Dibujo",
      conectarGoogle: "Conectar Google", buscarBase: "Buscar base «Tareas»", googleEstado: "Google sin conectar",
      mas1: "+1", menos1: "−1"
    },
    bloques: {
      metaTarea: "Tu única tarea de hoy",
      red: { t: "Red del día", d: "Máximo 3 acciones: contactar, felicitar o compartir. Sin saturar." },
      evento: { t: "Próximo encuentro", d: "Cumpleaños, feriados y fechas que no deberías perder." },
      rutina: { t: "Rutina de contacto", d: "Máximo 3 acciones: contactar, felicitar o compartir. Sin saturar." },
      comun: { t: "Redes en comunidad", d: "Mensajes y charlas sugeridas según tu perfil, una por día." },
      metaRutina: "Límite saludable: 3 contactos por día",
      redes: { t: "Objetivos en redes sociales", d: "Enlace de tu cuenta, meta de contenidos a publicar y avance con un clic." },
      trabajo: { t: "Conseguir trabajo", d: "Áreas con meta numérica y sus subtareas: prospectos, entrevistas y acercamientos." },
      notionVivo: { t: "Base «Tareas» · en vivo", d: "Se actualiza sola cada pocos segundos desde tu Notion." },
      googleVivo: { t: "Google (Calendar y Gmail)", d: "Conecta tu cuenta para traer tus próximos encuentros y contar postulaciones enviadas." }
    },
    tabs: { trabajo: "Ofertas de trabajo", cliente: "Clientes potenciales" },
    areas: {
      mes: "Este mes", cumple: "Cumpleaños de tu red", perfil: "Tu perfil",
      notion: "Conexión con Notion", datos: "Tus datos", acompanar: "Acompañamiento"
    },
    saludo: { manana: "Buenos días", tarde: "Buenas tardes", noche: "Buenas noches" },
    hoy: { titulo: "Hoy decides hacia dónde tiras.", limpio: "Tu sistema está listo." },
    tipo: { trabajo: "Trabajo", proyecto: "Proyecto", comunidad: "Comunidad", vida: "Vida esencial" }
  },

  // ---------- Q1 · trabajo e ingresos ----------
  puestos: [
    "Diseñador/a UX-UI", "Diseñador/a gráfico", "Desarrollador/a web",
    "Community manager", "Marketing digital", "Ventas / comercial",
    "Atención al cliente", "Administración / contabilidad",
    "Logística / operaciones", "Recursos humanos", "Data / analítica",
    "Fotografía / video", "Docencia", "Otro (escribir)"
  ],
  salarios: [
    "Hasta 400 USD", "400 – 700 USD", "700 – 1.000 USD",
    "1.000 – 1.500 USD", "1.500 – 2.500 USD", "Más de 2.500 USD",
    "Por definir"
  ],
  modalidades: ["Presencial", "Híbrido", "Remoto", "Freelance / por proyecto"],
  fuentes: ["Bumeran", "LinkedIn", "ZonaJobs", "Computrabajo", "InfoJobs", "Referido directo"],

  // ---------- Q2 · proyectos (hasta 5) ----------
  proyectosSugeridos: [
    "Tienda online", "Marca de ropa", "Servicio de diseño",
    "Consultoría / agencia", "Curso o mentoría", "App o herramienta",
    "Contenido / comunidad", "Comida / reparto", "Artesanías",
    "Fotografía / eventos", "Inversión / ahorro", "Otro (escribir)"
  ],

  // ---------- Q3 · perfil ----------
  habilidades: {
    hobbies: [
      "Deporte", "Música", "Lectura", "Videojuegos", "Cocina",
      "Dibujo / pintura", "Fotografía", "Viajes", "Baile", "Naturaleza",
      "Escritura", "Tecnología"
    ],
    logros: [
      "Terminé una carrera", "Tengo certificación", "Gané un premio",
      "Hablé en público", "Armé mi propio negocio", "Ahorro propio",
      "Capacité a otros", "Bajé / logré una meta física", "Proyecto familiar logrado"
    ],
    habilidades: [
      "Organización", "Comunicación", "Venta", "Diseño", "Programación",
      "Análisis de datos", "Idiomas", "Negociación", "Enseñanza",
      "Trabajo en equipo", "Resolver problemas", "Detalles finos"
    ],
    estilo: [
      "Analítico/a", "Creativo/a", "Protector/a", "Líder", "Colaborador/a",
      "Independiente", "Metódico/a", "Espontáneo/a", "Empático/a", "Competitivo/a"
    ],
    experiencias: [
      "Atención al cliente", "Administración", "Ventas", "Logística",
      "Eventos", "Docencia", "Salud", "Hostelería", "Construcción",
      "Campo / agricultura", "Trabajo remoto", "Voluntariado"
    ],
    conocimientos: [
      "Excel / ofimática", "Redes sociales", "Contabilidad básica",
      "Diseño (Figma/Canva)", "Edición de video", "Copywriting",
      "SEO", "Atención virtual", "Ventas B2B", "Cocina profesional",
      "Mecánica básica", "Reparaciones del hogar"
    ]
  },

  // ---------- Calendario social precargado (para todo usuario) ----------
  eventosFijos: [
    { mmdd: "01-01", titulo: "Año nuevo", tipo: "feriado" },
    { mmdd: "02-14", titulo: "Día de los enamorados", tipo: "social" },
    { mmdd: "03-08", titulo: "Día internacional de la mujer", tipo: "social" },
    { mmdd: "04-07", titulo: "Día mundial de la salud", tipo: "salud" },
    { mmdd: "05-15", titulo: "Día de la familia", tipo: "social" },
    { mmdd: "10-31", titulo: "Halloween", tipo: "social" },
    { mmdd: "11-02", titulo: "Día de los difuntos", tipo: "social" },
    { mmdd: "12-25", titulo: "Navidad", tipo: "social" },
    { mmdd: "12-31", titulo: "Fin de año", tipo: "social" }
  ],
  // se calculan cada año
  eventosMoviles: [
    { clave: "madre", titulo: "Día de la madre", tipo: "social" },
    { clave: "padre", titulo: "Día del padre", tipo: "social" },
    { clave: "amigo", titulo: "Día del amigo", tipo: "social" }
  ],

  // ---------- Rutinas de vida esencial ----------
  habitosBase: [
    { area: "mental", titulo: "10 minutos de calma (respirar o escribir)" },
    { area: "mental", titulo: "Sin redes 30 min antes de dormir" },
    { area: "fisica", titulo: "Caminar o moverte 30 min" },
    { area: "fisica", titulo: "Agua y comida real" },
    { area: "espiritual", titulo: "5 minutos de gratitud o fe" },
    { area: "espiritual", titulo: "Leer algo que te eleve" },
    { area: "familia", titulo: "Hablar con alguien de tu casa" },
    { area: "familia", titulo: "Un detalle con tu familia" }
  ],

  // ---------- Tareas base por objetivo ----------
  planes: {
    trabajo: [
      { titulo: "Actualizar CV con tus logros reales", prioridad: "alta", dias: 1 },
      { titulo: "Completar perfil de LinkedIn con palabras clave", prioridad: "alta", dias: 2 },
      { titulo: "Buscar 10 ofertas de {{puesto}} en Bumeran y LinkedIn", prioridad: "alta", dias: 2 },
      { titulo: "Escribir tu carta de presentación (versión corta)", prioridad: "media", dias: 3 },
      { titulo: "Enviar 5 postulaciones con correo personalizado", prioridad: "alta", dias: 5 },
      { titulo: "Preparar respuestas: ¿por qué tú? y ¿qué buscas?", prioridad: "media", dias: 7 },
      { titulo: "Hacer seguimiento a quien no contestó", prioridad: "media", dias: 9 }
    ],
    proyecto: [
      { titulo: "Definir la idea en una frase: para quién y qué resuelve", prioridad: "alta", dias: 1 },
      { titulo: "Escribir tu hipótesis: ¿quién paga y por qué?", prioridad: "alta", dias: 3 },
      { titulo: "Nombrar 5 personas reales a las que le preguntarías", prioridad: "alta", dias: 4 },
      { titulo: "Hacer 5 conversaciones de validación (sin vender)", prioridad: "alta", dias: 8 },
      { titulo: "Armar una oferta mínima con precio", prioridad: "media", dias: 11 },
      { titulo: "Conseguir el primer cliente o pedido", prioridad: "alta", dias: 15 },
      { titulo: "Medir: ¿repiten o recomiendan?", prioridad: "media", dias: 22 }
    ],
    comunidad: [
      { titulo: "Cargar tus 10 contactos clave en la red", prioridad: "alta", dias: 1 },
      { titulo: "Escribir a 3 personas sin pedir nada", prioridad: "media", dias: 2 },
      { titulo: "Felicular a quien cumple años esta semana", prioridad: "media", dias: 3 },
      { titulo: "Compartir algo útil de lo que sabes", prioridad: "media", dias: 5 },
      { titulo: "Pedir una presentación a alguien de confianza", prioridad: "alta", dias: 8 },
      { titulo: "Asistir a una charla o evento", prioridad: "media", dias: 12 }
    ],
    vida: [
      { titulo: "Definir tu rutina mínima de salud (3 hábitos)", prioridad: "alta", dias: 1 },
      { titulo: "Bloquear tu hora de descanso", prioridad: "media", dias: 2 },
      { titulo: "Un plan con tu familia esta semana", prioridad: "media", dias: 5 }
    ]
  },

  // modelo de validación por proyecto (lo que la "IA" entrega)
  validacion: [
    { paso: "Problema", pregunta: "¿Qué le duele hoy a esa persona?", entrega: "3 frases de su boca, no tuyas" },
    { paso: "Solución", pregunta: "¿Cómo lo resolverías de forma simple?", entrega: "1 borrador o foto del producto/servicio" },
    { paso: "Cliente", pregunta: "¿Quién es exactamente y dónde está?", entrega: "1 perfil con nombre, edad y lugar" },
    { paso: "Precio", pregunta: "¿Cuánto y cómo pagarían?", entrega: "1 precio en USD y forma de cobro" },
    { paso: "Prueba", pregunta: "¿Quién compra o dice que sí hoy?", entrega: "1 compromiso real (pago, prepedido o sí)" }
  ],

  // ============================================================
  // ÁREAS CON META NUMÉRICA · plantilla inicial
  // El sistema la copia al primer arranque; después cada usuario
  // edita sus metas y subtareas desde la vista "Metas".
  // ============================================================
  areasMetas: {
    redes: [
      { nombre: "Instagram", cuenta: "https://instagram.com/tu-usuario", meta: 30 },
      { nombre: "TikTok", cuenta: "https://tiktok.com/@tu-usuario", meta: 40 },
      { nombre: "YouTube", cuenta: "", meta: 12 },
      { nombre: "LinkedIn", cuenta: "https://linkedin.com/in/tu-usuario", meta: 24 }
    ],
    trabajo: [
      {
        nombre: "Prospectos y canales", meta: 50,
        subtareas: [
          "Cargar 10 ofertas de Bumeran, LinkedIn y ZonaJobs",
          "Enviar 5 postulaciones con correo personalizado",
          "Anotar a qué canal envié cada una",
          "Hacer seguimiento a quien no contestó"
        ]
      },
      {
        nombre: "Entrevistas", meta: 8,
        subtareas: [
          "Preparar respuestas: ¿por qué tú? y ¿qué buscas?",
          "Tener 3 preguntas propias para el entrevistador",
          "Registrar fecha y persona de cada entrevista",
          "Enviar agradecimiento el mismo día"
        ]
      },
      {
        nombre: "Acercamientos intencionados", meta: 20,
        subtareas: [
          "Nombrar 10 personas que quiero en mi red",
          "Escribirles sin pedir nada la primera vez",
          "Preguntar por algo que les interese a ellos",
          "Proponer un café o llamada de 15 minutos"
        ]
      }
    ]
  },

  // ============================================================
  // INTEGRACIONES · todo apagado hasta configurarlo
  // ============================================================
  integraciones: {
    // segundos entre refrescos de la base de Notion (en vivo)
    notionCada: 15,
    // Google: pega tu client ID de Google Cloud en Ajustes o aquí
    google: {
      clientId: "",
      calendarioId: "primary",
      // búsqueda de Gmail para contar lo que envías (postulaciones)
      queryGmail: "in:sent (postulación OR postulante OR candidatura OR aplicación) newer_than:30d"
    }
  },

  // ---------- Bolsas de trabajo (ofertas simuladas) ----------
  ofertas: [
    { fuente: "LinkedIn", empresa: "Grupo Andina", puesto: "Diseñador/a UX Junior", lugar: "Quito · Híbrido", rango: "900 – 1.200 USD" },
    { fuente: "Bumeran", empresa: "Estudio Nube", puesto: "Community manager", lugar: "Remoto", rango: "500 – 750 USD" },
    { fuente: "ZonaJobs", empresa: "Mercado Norte", puesto: "Ejecutivo/a de ventas", lugar: "Guayaquil · Presencial", rango: "600 + comisión" },
    { fuente: "Computrabajo", empresa: "Café Origen", puesto: "Atención al cliente", lugar: "Cuenca · Híbrido", rango: "450 – 600 USD" },
    { fuente: "LinkedIn", empresa: "Data Sur", puesto: "Analista de datos", lugar: "Remoto", rango: "1.400 – 1.900 USD" },
    { fuente: "Bumeran", empresa: "Agenda Salud", puesto: "Asistente virtual", lugar: "Remoto", rango: "500 – 700 USD" },
    { fuente: "ZonaJobs", empresa: "Textiles Vega", puesto: "Coordinador/a de producción", lugar: "Ambato · Presencial", rango: "700 – 900 USD" },
    { fuente: "InfoJobs", empresa: "Lumen Media", puesto: "Editor/a de video", lugar: "Remoto", rango: "650 – 950 USD" },
    { fuente: "Referido directo", empresa: "Casa Verde", puesto: "Encargado/a de tienda", lugar: "Manta · Presencial", rango: "550 – 700 USD" },
    { fuente: "LinkedIn", empresa: "Ruta 4G", puesto: "Soporte técnico", lugar: "Quito · Híbrido", rango: "800 – 1.000 USD" },
    { fuente: "Bumeran", empresa: "Panadería Lume", puesto: "Diseñador/a de marcas", lugar: "Freelance", rango: "Por proyecto" },
    { fuente: "ZonaJobs", empresa: "Servimax", puesto: "Coordinador/a logístico", lugar: "Guayaquil · Presencial", rango: "750 – 950 USD" }
  ],

  // ---------- Prospectos de clientes (simulados) ----------
  clientes: [
    { empresa: "Café Puerto", rubro: "Café de especialidad", contacto: "Sofía Mena", cargo: "Gerente", ciudad: "Quito" },
    { empresa: "Bodega Rivas", rubro: "Retail de vinos", contacto: "Diego Rivas", cargo: "Fundador", ciudad: "Cuenca" },
    { empresa: "Andes Naturales", rubro: "Alimentos orgánicos", contacto: "Marta Ruiz", cargo: "Marca", ciudad: "Quito" },
    { empresa: "Hotel Sol", rubro: "Hospitalidad", contacto: "Ana Ponce", cargo: "Marketing", ciudad: "Manta" },
    { empresa: "Choco Alto", rubro: "Chocolate artesanal", contacto: "Luis Zambrano", cargo: "Director", ciudad: "Ibarra" },
    { empresa: "Verde Market", rubro: "Supermercados", contacto: "Carla Nieto", cargo: "Compras", ciudad: "Guayaquil" }
  ],

  // ---------- Correo generado ----------
  correo: {
    asuntoTrabajo: "Postulación a {{puesto}} · {{nombre}}",
    cuerpoTrabajo: [
      "Hola {{contacto}}, vi la oferta de {{puesto}} en {{fuente}} y encaja con lo que vengo haciendo: {{habilidad}}.",
      "Adjunto mi CV y te comparto 3 cosas que hice y que podrían servirte desde el primer día.",
      "¿Tendrías 15 minutos esta semana para conversar?",
      "Gracias, {{nombre}}."
    ],
    asuntoCliente: "Una idea rápida para {{empresa}}",
    cuerpoCliente: [
      "Hola {{contacto}}, vengo siguiendo lo de {{empresa}} y tengo una idea concreta para {{rubro}}.",
      "Podría mostrarte en 15 minutos qué haría distinto y cuánto costaría.",
      "¿Te sirve jueves o viernes?",
      "{{nombre}}"
    ]
  },

  // ---------- Motivación (emergentes + hitos) ----------
  mensajes: [
    "No estás perdido: estás construyendo. Hoy cuentas.",
    "Cada tarea marcada es una prueba de que sigues.",
    "Lo que buscas también se está acercando a ti.",
    "No necesitas resolverlo todo: solo el siguiente paso.",
    "Eres más cerca hoy que ayer de eso que buscas.",
    "Tu constancia es tu red de seguridad.",
    "Las etapas difíciles también pasan. Tú no te rindas.",
    "Alguien hoy necesita exactamente lo que tú sabes hacer.",
    "Descansar también es avanzar con cabeza.",
    "Pequeños pasos, grandes cambios. Sigue así."
  ],
  hitos: [
    "¡Primer avance del día! Eso es movimiento real.",
    "El tablero ya se movió. Te estás organizando, eso se nota.",
    "Vas sumando. La constancia es tu mejor habilidad.",
    "Objetivo en marcha. Tu plan se está haciendo carne."
  ]
};
