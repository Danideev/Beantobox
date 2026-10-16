# beantobox

Instantánea del sitio **Norte · Sistema de enfoque** guardada en un solo JSON,
de la forma más liviana posible: todo el sitio (HTML, CSS, JS, servidor y tests)
como texto con su hash SHA-256, para que nada se corrompa al viajar.

| Archivo | Qué es |
|---|---|
| `beantobox.json` | **El sitio completo** · 10 archivos, ~313 KB |
| `restaurar.js` | Restaura los archivos desde el JSON (verifica hashes) |
| `README.md` | Este archivo |

## Restaurar el sitio

```powershell
node restaurar.js            # escribe los archivos en ./sitio/
powershell -ExecutionPolicy Bypass -File sitio\servidor.ps1
```

Abre <http://127.0.0.1:8750/> — el panel de administración está en `/admin.html`.

## Qué incluye

- **Norte**: onboarding de 3 preguntas → plan → metas numéricas (redes con meta
  de contenidos + áreas de "conseguir trabajo" con subtareas) → tablero de ideas
  (post-its, dibujos y archivos) → prospectos → red → vida esencial → calendario.
- **Notion en vivo** (base «Tareas», refresco cada 15 s) y **Google**
  (Calendar + Gmail, conector listo pero apagado).
- **admin.html**: panel para editar todo el contenido sin tocar código.
- **servidor.ps1**: servidor local con guardado, carpeta `tablero-archivos/`
  y proxy de Notion (puerto 8750).
- **tests/**: 158/158 (app) + 85/85 (panel) — requieren jsdom; ajusta la
  constante `BASE` de cada test a la carpeta donde restaures.

> El JSON es la fuente de verdad: si un byte cambia, `restaurar.js` lo detecta
> por hash y avisa.
