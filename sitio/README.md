# Norte · Sistema de enfoque

Aplicación de una sola pantalla que ayuda a salir del "no sé por dónde tirar":
define tus objetivos con 3 preguntas, el sistema arma tu plan y te devuelve
**una sola tarea al día** para mover tu trabajo, tus ingresos, tus proyectos,
tu red, tu familia y tu salud.

Incluye además:

- **Metas numéricas** · objetivos de redes sociales con enlace de la cuenta y
  casillero de meta (cuántos contenidos publicar), y "conseguir trabajo" dividido
  en áreas con subtareas y meta: prospectos/canales, entrevistas y acercamientos
  intencionados. Cada área suma y quita casilleros con un clic.
- **Tablero de ideas** · mural para post-its, dibujos a mano y cualquier archivo
  (audio, imagen, gráfico, PDF, notas…) con sumar y quitar a un lado. Los archivos
  se guardan en la carpeta `tablero-archivos/`.
- **Notion en vivo** · lee tu base de la carpeta *Tareas* cada pocos segundos y
  escribe de vuelta (marcar hecha, crear tareas).
- **Google (Calendar y Gmail)** · conector listo pero apagado: se enciende cuando
  pegas tu client ID en Ajustes; trae tus próximos encuentros y cuenta lo que
  envías por correo.

Interfaz plana y minimalista, tipografía grande, pocos botones,
fondo nublado con pantallas flotantes semitransparentes, sonidos suaves y
mensajes motivacionales emergentes.

## Cómo abrirlo

Doble clic en `index.html` (no necesita servidor ni instalar nada).

Para usar el **panel de administración** hace falta el servidor local:

```powershell
.\servidor.ps1     # por defecto http://127.0.0.1:8750/
```

| URL | Qué es |
|---|---|
| `http://127.0.0.1:8750/` | La app (Norte) |
| `http://127.0.0.1:8750/admin.html` | **Panel para editar contenidos sin tocar código** |

Puerto configurable editando `$puerto` en la primera línea de `servidor.ps1`
(útil si 8750 está ocupado).

## Despliegue en Vercel

El sitio es **estático** (no necesita build): el repo `Danideev/Beantobox`
trae la carpeta `sitio/` lista para Vercel con su `vercel.json` y una función
serverless `api/notion.js` que hace de proxy de Notion (mismo contrato que
`servidor.ps1`).

1. En vercel.com → **Add New Project** → importa el repo `Beantobox`.
2. En *Configure Project* pon **Root Directory: `sitio`** (o Settings → General
   → Root Directory si no aparece) y deja Framework = Other.
3. **Deploy** → queda en `tu-proyecto.vercel.app`.

En Vercel, al no haber servidor local, la app se degrada con elegancia:

| Función | Sin servidor (Vercel / file://) | Con servidor.ps1 |
|---|---|---|
| Datos, plan y metas | localStorage del navegador | localStorage (mismo) |
| Guardar el catálogo desde admin | Botón **Descargar** (archivo a mano) | `POST /api/guardar` |
| Archivos del tablero | Hasta 2,5 MB en el navegador | Carpeta `tablero-archivos/` |
| Notion en vivo | Directo y, si el navegador bloquea, proxy `/api/notion` | Proxy local |
| Google (Calendar/Gmail) | Igual (client ID en Ajustes) | Igual |

## Archivos

| Archivo | Qué contiene |
|---|---|
| `index.html` | Estructura y vistas (sin contenido fijo) |
| `estilo.css` | Diseño: nubes, vidrio, tipografía grande, mural |
| `catalogo.js` | **Todo el contenido**: textos de interfaz, opciones del cuestionario, planes, áreas y metas, integraciones, ofertas, fechas sociales, mensajes |
| `app.js` | Lógica: onboarding, plan, metas, tablero, prospectos, Notion en vivo, Google |
| `admin.html` + `admin.js` | **Panel de administración** para editar el catálogo |
| `servidor.ps1` | Servidor local: guardar catálogo, archivos del tablero y proxy de Notion |
| `tablero-archivos/` | Carpeta donde caen los archivos del tablero de ideas |
| `README.md` | Este archivo |

## Panel de administración (`admin.html`)

Abre `admin.html` con el servidor corriendo y edita todo desde la interfaz:

- **Marca e inicio** · nombre, pantalla de bienvenida, saludos y títulos del día
- **Preguntas iniciales** · textos de los 3 pasos y todas las opciones cerradas
  (puestos, salarios, modalidad, proyectos sugeridos, grupos de perfil)
- **Menú** · cómo se llama cada sección en escritorio y en la barra móvil
- **Botones** · etiqueta de cada botón de la app (25)
- **Encabezados y bloques** · antetítulo/título/bajada de cada pantalla (9)
- **Planes y validación** · tareas que se generan por objetivo y el modelo de 5 pasos
- **Fechas y hábitos** · calendario social precargado y rituales de vida esencial
- **Mensajes motivacionales** · emergentes, hitos y pasos de construcción
- **Ofertas y clientes** · prospectos, fuentes y plantillas de correo
- **Metas y áreas** · plantilla de objetivos sociales (enlace + meta) y de las
  áreas de "conseguir trabajo" con sus subtareas
- **Integraciones** · refresco de Notion (segundos) y credenciales de Google
- **JSON completo** · edición cruda con validación antes de aplicar

Botones del panel:

- **Guardar** → escribe `catalogo.js` en el servidor (valida el JSON y exige las
  claves `ui` y `planes` antes de tocar nada; si no hay servidor, descarga el archivo).
- **Descargar** → baja `catalogo.js` para subirlo a mano (hosting estático).
- **Descartar** → vuelve al contenido guardado.

> Nota: al guardar desde el panel, `catalogo.js` se reescribe serializado
> (se conservan los datos, no los comentarios manuales del archivo).

## Editar contenido sin tocar código

Todo vive en `catalogo.js`, con dos bloques:

- **`ui`** → textos de la interfaz: marca, menú, botones, encabezados, preguntas
- **el resto** → contenido funcional:

- `puestos`, `salarios`, `modalidades` → preguntas cerradas del paso 1
- `proyectosSugeridos` → sugerencias del paso 2
- `habilidades` → las 6 grupos cerrados del paso 3
- `planes` → tareas que se generan por objetivo (`trabajo`, `proyecto`, `comunidad`, `vida`)
- `validacion` → modelo de validación que se muestra en cada proyecto
- `areasMetas` → plantilla de objetivos sociales y áreas con meta numérica
  (redes: nombre/enlace/meta; trabajo: nombre/meta/subtareas)
- `integraciones` → refresco de Notion y credenciales de Google
- `ofertas` / `clientes` → prospectos simulados de Bumeran, LinkedIn, ZonaJobs…
- `eventosFijos` / `eventosMoviles` → calendario social precargado
- `mensajes` / `hitos` → textos motivacionales
- `correo` → plantillas del correo generado

## Metas numéricas (vista «Metas»)

- **Objetivos en redes sociales**: cada tarjeta tiene el enlace de la cuenta,
  la meta de contenidos y el contador **+1 / −1** con barra de progreso.
  Se editan desde la app o desde el panel (sección *Metas y áreas*).
- **Conseguir trabajo**: áreas con su casillero de meta y sus subtareas
  (añadir, marcar, quitar). El sistema arranca con *Prospectos y canales*,
  *Entrevistas* y *Acercamientos intencionados*; puedes añadir más áreas.
- La plantilla del catálogo se copia al primer arranque; lo que cambies después
  vive en tu navegador (exporta el JSON para llevártelo).

## Tablero de ideas (vista «Tablero»)

- **+ Nota** → post-it que se guarda mientras escribes (3 colores).
- **+ Dibujo** → lienzo para dibujar tu meta; se guarda como imagen.
- **Subir archivo** → audio, video, imagen, PDF, notas… cualquiera.
- Cada tarjeta tiene **✕** a un lado para quitarla.
- Con el servidor corriendo, los archivos caen en `tablero-archivos/`
  (`POST /api/subir`, `GET /api/tablero`, `POST /api/borrar-archivo`).
  Sin servidor, se guardan en el navegador (hasta 2,5 MB por archivo).

## Conectar Notion (real, en vivo)

1. Crea una integración en <https://www.notion.so/my-integrations> y copia el token (`secret_…`).
2. Comparte tu carpeta de **Tareas** con esa integración.
3. En **Ajustes → Conexión con Notion**, pega el token y pulsa
   **Buscar base «Tareas»** (elige la base) o pega su ID a mano.
4. Listo: la vista **Metas** muestra la base refrescándose sola cada 15 s
   (configurable en *Ajustes* o en el panel → *Integraciones*), con marca de
   columna de estado si tu base tiene «Estado» (select o status).

Si el navegador bloquea Notion por CORS, el servidor local hace de proxy
(`POST /api/notion`). Las tareas que marques se crean/actualizan en tu base.
Si no conectas, todo funciona igual: los datos se guardan en tu navegador.

## Google (Calendar y Gmail) · listo pero apagado

1. En <https://console.cloud.google.com/apis/credentials> crea un cliente OAuth
   de tipo **Aplicación web**, con origen `http://127.0.0.1:8750`.
2. En **Ajustes → Google**, pega el *Client ID* y pulsa **Conectar Google**.
3. Traerá tus próximos encuentros (se mezclan en «Próximo encuentro») y contará
   los envíos de Gmail que coincidan con tu búsqueda de postulaciones
   (editable en el panel → *Integraciones*).

Sin credenciales, el conector queda apagado y nada de lo demás se afecta.

## Datos

- El estado se guarda en `localStorage` (`norte.estado.v1`).
- **Ajustes → Exportar JSON** descarga todo tu sistema; **Importar JSON** lo restaura.
- **Reiniciar mi sistema** borra el estado y vuelve al onboarding.

## Tecnología

HTML + CSS + JS puro, sin dependencias ni build. Fuentes de Google Fonts.
Cumple `prefers-reduced-motion`, navegable por teclado y con textos en español.

## Pruebas

Dos suites en jsdom (fuera de la carpeta, en el directorio temporal del entorno):

| Suite | Qué cubre | Resultado |
|---|---|---|
| `norte-test.js` | App: onboarding, plan, tableros, metas numéricas, tablero, prospectos, red, Notion con error y en vivo, Google apagado | 158 OK / 0 FAIL |
| `norte-admin-test.js` | Panel: textos, listas, menú, botones, metas, integraciones, JSON, guardar con y sin servidor | 85 OK / 0 FAIL |
