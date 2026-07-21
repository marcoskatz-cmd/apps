# Contexto del proyecto — Hub Apps INGECO

> Documento de contexto para retomar el proyecto desde cualquier PC.
> Última actualización: 2026-07-19

## Qué es
Launcher PWA que agrupa las web apps internas de INGECO en un solo ícono
("Apps INGECO"). Evita instalar cada app como PWA separada.

- **Repo**: https://github.com/marcoskatz-cmd/apps
- **URL pública actual**: https://marcoskatz-cmd.github.io/apps/
- **Stack**: HTML + CSS + JS vanilla, sin build. PWA (manifest.json +
  service-worker.js + icon-192/512.png). GitHub Pages redeploya solo al pushear a `main`.

## Apps incluidas (array `APPS` en index.html)
| App | Rol | URL |
|-----|-----|-----|
| PAVIMAX | App operario | https://marcoskatz-cmd.github.io/pavimax/ |
| PAVIMAX | Oficina (cargar pedidos) | https://marcoskatz-cmd.github.io/pavimax/cargar.html |
| INGECOV | Mantenimiento de flota | https://marcoskatz-cmd.github.io/ingecov/ |
| Demarcación Vial | Operarios / Municipio | https://marcoskatz-cmd.github.io/apps/demarcacion.html |
| Compras | Pedidos de compra | https://pedidos-ingeco.vercel.app/ |

### Sumar una app nueva
Editar el array `APPS` en `index.html`:
```js
{ name, role, url, icon: '🚀', color: 'green|blue|orange|purple|cyan|amber' }
```
Bumpear `CACHE = 'apps-ingeco-vN'` en `service-worker.js` cuando cambie index.html.
Luego `git add . && git commit && git push origin main`.

## Demarcación Vial (app de control de obra de demarcación vial)
- Backend: proyecto Apps Script `baches-detector` (reversionado desde la app de
  bacheo). scriptId `1YyUCjeSIY8ED2qgRLeaqlLdlLKMSo_WZ32Z8vN98XZ9rYy5DxzjeeF7_`.
- Login por PIN: OPERARIO_PIN=1234, MONITOREO_PIN=muni2026.
- **`demarcacion.html` y `demarcacion-monitoreo.html` son páginas estáticas**
  que hablan contra un endpoint JSON (`doPost` + `ContentService`) del proyecto
  Apps Script. NO se usa el `/exec` de HtmlService ni un wrapper con `<iframe>`:
  con varias cuentas Google logueadas, Google reescribe la URL a
  `/macros/u/N/...` y devuelve "unable to open the file". ContentService no pasa
  por ese ruteo. Mismo patrón que INGECOV y PAVIMAX.
- El body de los POST va como `text/plain` a propósito: Apps Script no responde
  el preflight CORS.
- Municipio: `demarcacion-monitoreo.html`.
- **Flujo de carga (desde jul-2026):** el trabajo se crea con la foto ANTES y
  queda *pendiente*; la foto DESPUÉS se sube más tarde desde el historial del
  operario, que también permite corregir cualquier dato. Cada fila lleva un
  `ID` (UUID, col. O) que la identifica de forma estable. El informe PDF del
  Municipio solo cuenta los trabajos cerrados.
- Al tocar los HTML hay que bumpear `CACHE` en `service-worker.js`.

## Dominio propio (EN CURSO — pendiente de confirmar acceso a Cloudflare)
Objetivo: sacar el `github.io` de la URL usando el dominio de INGECO.
- Dominio institucional: **ingecosa.com.ar** — web activa en Squarespace
  (institucional, 65 años, Pavimax, obras). **NO tocar la raíz.**
- **El DNS real vive en Cloudflare** (nameservers `jewel`/`ezra.ns.cloudflare.com`),
  NO en Squarespace ni en el registrador. En Squarespace figura Provider="Other"
  (dominio solo conectado). El `www` es CNAME a `ext-cust.squarespace.com`.
- Plan: colgar el hub en el subdominio **`apps.ingecosa.com.ar`** (subdominio para
  no arriesgar la web institucional).
  1. Cloudflare → DNS → Add record: `CNAME`, Name `apps`,
     target `marcoskatz-cmd.github.io`, **Proxy = DNS only (nube gris)**.
  2. Archivo `CNAME` con `apps.ingecosa.com.ar` en este repo.
  3. GitHub repo `apps` → Settings → Pages → Custom domain `apps.ingecosa.com.ar`
     → Enforce HTTPS.
- Pendiente: Marcos debe confirmar acceso a la cuenta de Cloudflare de INGECO.

## Proteger el código (aclaración)
El backend Apps Script (.gs) YA es privado — solo lo ve el desarrollador, la
competencia no puede leerlo. El frontend (Index.html) inevitablemente viaja al
navegador (view-source visible), como en cualquier web. La protección real es:
lógica en el backend + gate por PIN + datos (Sheets/Drive) privados. Todo eso ya
está. No vale la pena obsesionarse con ocultar el HTML.
