# Demarcación Vial — historial del operario y cierre diferido · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que la foto DESPUÉS se cargue en un segundo momento, desde un historial de trabajos que el operario puede consultar y editar.

**Architecture:** El trabajo se crea con la foto ANTES y queda *pendiente*. Cada fila lleva un `ID` (UUID) que la identifica de forma estable, para que una edición posterior nunca caiga sobre la fila equivocada. El frontend suma dos vistas (Historial y Detalle) contra dos acciones nuevas del endpoint JSON. El Municipio no ve nada de esto.

**Tech Stack:** Google Apps Script (backend, `.gs`/`.js` vía clasp) + HTML/CSS/JS vanilla servido por GitHub Pages. Sin build, sin frameworks.

## Global Constraints

- **Sin dependencias nuevas.** Ni en el backend ni en el frontend. Todo vanilla.
- **Estilo del código existente:** `var`/`const` mezclado como está, comillas simples, funciones `_privadas_()` con guiones bajos en el backend, helper `$ = id => document.getElementById(id)` en el frontend. Seguir el archivo, no imponer estilo nuevo.
- **Todo el texto de UI en español**, con el tono de la app (`✓ Trabajo guardado`, `Faltan las fotos...`).
- **El body de los POST viaja como `text/plain`** a propósito: Apps Script no responde el preflight CORS. No cambiar el `Content-Type`.
- **Las fotos subidas a Drive necesitan `file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)`** o las miniaturas de monitoreo no cargan.
- **`listarTrabajos(pin)` (monitoreo) no debe devolver nunca** el operario ni las columnas O–R.
- Zona horaria en todo formateo de fechas del backend: `America/Argentina/Tucuman`.

## Sobre los tests

El proyecto no tiene framework de tests y no vale la pena montar uno para esto. La verificación es de dos tipos, y ambas son ejecutables **sin intervención humana**:

- **Backend:** funciones `test_*()` en `Tests.js`, disparadas por HTTP a través de una acción `correrTest` del endpoint. Escriben y borran sus propias filas de prueba.
- **Frontend:** verificación en el navegador integrado, contra un `npx serve` local.

Donde el plan diga "correr el test", significa: `curl` contra el endpoint con la acción `correrTest` y el nombre de la función.

**Cada `clasp push` tiene que ir seguido de un `clasp deploy`** o el `/exec` sigue sirviendo el código anterior y el test corre contra la versión vieja:

```bash
npx clasp push && npx clasp deploy -i AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr -d "wip"
```

Un test pasa cuando la respuesta es `{"ok":true,...}`. Falla cuando es `{"ok":false,"error":"FALLA: ..."}`. Los `Logger.log('OK ...')` que aparecen en los tests siguen sirviendo: si la función no tira, `correrTest` devuelve `OK <nombre>`.

### Guarda de seguridad de `correrTest` (no negociable)

El endpoint es público y el PIN de operario está hardcodeado en `demarcacion.html`, o sea que es legible por cualquiera con ver-código-fuente. Una acción de test que borra filas **no puede** ir protegida por ese PIN: sería una forma pública de vaciar la planilla.

`correrTest` se guarda con un token secreto aleatorio guardado en Script Properties bajo `TEST_TOKEN`, que **nunca** aparece en un archivo del frontend ni se commitea. Reglas:

- Solo se pueden invocar funciones cuyo nombre empiece con `test_`. Nunca un nombre arbitrario.
- Comparación del token con `Utilities.computeHmacSha256Signature` o, como mínimo, longitud fija y comparación exacta.
- Si `TEST_TOKEN` no está seteado, la acción tira error y no ejecuta nada.
- **El Task 10 borra `Tests.js`, la acción `correrTest` y la property `TEST_TOKEN`.** El endpoint no queda en producción con una puerta de test abierta.

### Contexto de ejecución (decidido con Marcos, 2026-07-20)

- Se trabaja **directo en `main`**. Cada push a `main` publica en GitHub Pages al instante, así que los commits de frontend salen al aire a medida que se hacen. El backend solo cambia de cara al usuario cuando se corre `clasp deploy`.
- Los tests corren **contra la planilla de producción**. Todo test debe limpiar lo que escribe; usar siempre `TEST_AUTOMATICO` como operario para que las filas de prueba sean reconocibles a ojo.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `WebApp.js` (backend, clasp) | Endpoint JSON, lectura/escritura de la hoja, PDF. Se modifica. |
| `Migracion.js` (backend, clasp) | **Nuevo.** `migrarIds()`, de un solo uso. Separado para poder borrarlo cuando ya no sirva. |
| `Tests.js` (backend, clasp) | **Nuevo.** Tests manuales del backend. |
| `demarcacion.html` | App del operario. Se le suman las vistas Historial y Detalle. |
| `demarcacion-monitoreo.html` | Vista del Municipio. Cambio mínimo (marcar pendientes). |
| `service-worker.js` | Bump de `CACHE` para que el HTML nuevo llegue a los celulares. |
| `CONTEXT.md` | Corregir la sección desactualizada del iframe. |

**Backend local:** clonarlo con clasp antes de empezar (Task 0). El scriptId es `1YyUCjeSIY8ED2qgRLeaqlLdlLKMSo_WZ32Z8vN98XZ9rYy5DxzjeeF7_`.

---

### Task 0: Preparar el entorno

**Files:**
- Create: `C:\Users\Usuario\Proyectos\demarcacion-backend\` (clon de clasp)

- [ ] **Step 1: Clonar el backend**

```bash
mkdir -p /c/Users/Usuario/Proyectos/demarcacion-backend
cd /c/Users/Usuario/Proyectos/demarcacion-backend
npx clasp clone 1YyUCjeSIY8ED2qgRLeaqlLdlLKMSo_WZ32Z8vN98XZ9rYy5DxzjeeF7_
```

Esperado: `Cloned 5 files.` — `appsscript.json`, `Index.html`, `Logo.js`, `Setup.js`, `WebApp.js`.

- [ ] **Step 2: Verificar que el push funciona antes de tocar nada**

```bash
npx clasp push
```

Esperado: `Pushed 5 files.` Si pide login: `npx clasp login`. (Gotcha conocido de clasp v3: si el login se cuelga, correrlo en background y abrir a mano la URL de localhost que imprime.)

- [ ] **Step 3: Agregar la acción `correrTest` al endpoint**

Es lo que permite disparar los tests por HTTP en vez de a mano desde el editor.
Crear `TestRunner.js`:

```javascript
/**
 * Dispara una función de test por HTTP. Existe solo durante el desarrollo:
 * el Task 10 borra este archivo, la acción del switch y la property TEST_TOKEN.
 *
 * Va guardado por TEST_TOKEN y NO por el PIN de operario: el PIN está
 * hardcodeado en demarcacion.html, o sea que es público, y estas funciones
 * borran filas de la planilla de producción.
 */
function correrTest(token, nombre) {
  const esperado = PropertiesService.getScriptProperties().getProperty('TEST_TOKEN');
  if (!esperado) throw new Error('TEST_TOKEN no está seteado.');
  if (String(token || '').length !== String(esperado).length) throw new Error('No autorizado.');
  if (String(token) !== String(esperado)) throw new Error('No autorizado.');
  // Solo funciones de test, nunca un nombre arbitrario del scope global.
  if (!/^test_[A-Za-z0-9_]+$/.test(String(nombre || ''))) throw new Error('Nombre de test inválido.');
  const fn = this[nombre];
  if (typeof fn !== 'function') throw new Error('No existe el test: ' + nombre);
  return { resultado: String(fn() || 'OK ' + nombre) };
}

/** Setea el token una vez. Se corre a mano desde el editor, sola vez. */
function setearTestToken() {
  const t = Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('TEST_TOKEN', t);
  Logger.log('TEST_TOKEN = ' + t);
}
```

En el `switch` de `_despachar_` en `WebApp.js`, agregar:

```javascript
    case 'correrTest':
      return correrTest(req.token, req.test);
```

- [ ] **Step 4: Setear el token y armar el script de disparo**

`setearTestToken` es la **única** función que hay que correr desde el editor de Apps Script, una sola vez, en todo el plan. Pusheá y corrrela:

```bash
npx clasp push
npx clasp deploy -i AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr -d "test runner"
```

Editor de Apps Script → `setearTestToken` → Ejecutar → copiar el token del registro.

Crear `correr-test.sh` en la raíz del backend (**agregarlo a `.gitignore`**, contiene el token):

```bash
#!/usr/bin/env bash
# Dispara un test del backend por HTTP. NO commitear: contiene el token.
TOKEN="<pegar acá el token que imprimió setearTestToken>"
EXEC="https://script.google.com/macros/s/AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr/exec"
curl -s -L -X POST "$EXEC" -H 'Content-Type: text/plain' \
  -d "{\"accion\":\"correrTest\",\"token\":\"$TOKEN\",\"test\":\"$1\"}"
echo
```

```bash
chmod +x correr-test.sh
echo 'correr-test.sh' >> .gitignore
```

- [ ] **Step 5: Verificar el runner y anotar el estado de la planilla**

Agregar a `TestRunner.js`:

```javascript
function test_estadoPlanilla() {
  const sh = _sheet_('Trabajos');
  return 'Filas de datos: ' + Math.max(0, sh.getLastRow() - 1) + ' · Columnas: ' + sh.getLastColumn();
}
```

```bash
npx clasp push && npx clasp deploy -i AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr -d "test estado"
./correr-test.sh test_estadoPlanilla
```

Esperado: `{"ok":true,"data":{"resultado":"Filas de datos: N · Columnas: 14"}}`. **Anotar esa N** — sirve para verificar la migración del Task 1.

Verificar además que la guarda anda:

```bash
curl -s -L -X POST "https://script.google.com/macros/s/AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr/exec" \
  -H 'Content-Type: text/plain' -d '{"accion":"correrTest","token":"mal","test":"test_estadoPlanilla"}'
```

Esperado: `{"ok":false,"error":"No autorizado."}`

---

### Task 1: Columna ID y migración

**Files:**
- Create: `Migracion.js`
- Modify: `WebApp.js` (encabezados)

**Interfaces:**
- Produces: constantes de columna `COL` (usadas por todas las tareas siguientes); `migrarIds()`.

- [ ] **Step 1: Agregar las constantes de columna al inicio de `WebApp.js`**

Insertar justo después del comentario de cabecera del archivo (antes de `function _props_()`):

```javascript
// ─── Columnas de la hoja "Trabajos" (1-based) ────────────────────────
// A–N son las originales. O–R se agregaron para el cierre diferido:
// un trabajo se crea con la foto ANTES y se completa más tarde.
const COL = {
  FECHA: 1, OPERARIO: 2, TIPO_TRABAJO: 3, TIPO_PINTURA: 4, COLOR: 5,
  M2: 6, LAT: 7, LON: 8, MAPS: 9, CALLE: 10, ACCURACY: 11,
  FOTO_ANTES: 12, FOTO_DESPUES: 13, OBS: 14,
  ID: 15, FECHA_DESPUES: 16, EDITADO_POR: 17, EDITADO_EN: 18
};
const TOTAL_COLS = 18;
```

- [ ] **Step 2: Crear `Migracion.js`**

```javascript
/**
 * Migración de un solo uso: agrega ID a las filas que ya existían.
 * Se corre a mano desde el editor. Es idempotente.
 * Se puede borrar este archivo cuando la migración esté hecha y verificada.
 */
function migrarIds() {
  const sh = _sheet_('Trabajos');
  const last = sh.getLastRow();

  // Encabezados de las columnas nuevas.
  sh.getRange(1, COL.ID, 1, 4)
    .setValues([['ID', 'FECHA DESPUES', 'EDITADO POR', 'EDITADO EN']]);

  if (last < 2) { Logger.log('Sin filas de datos. Solo se escribieron encabezados.'); return; }

  const n = last - 1;
  const ids = sh.getRange(2, COL.ID, n, 1).getValues();
  const fechas = sh.getRange(2, COL.FECHA, n, 1).getValues();
  const fechasDespues = sh.getRange(2, COL.FECHA_DESPUES, n, 1).getValues();

  let tocadas = 0;
  for (let i = 0; i < n; i++) {
    if (!String(ids[i][0]).trim()) { ids[i][0] = Utilities.getUuid(); tocadas++; }
    // Las filas viejas ya vienen con las dos fotos, o sea cerradas:
    // se les sella la fecha del después con su propia fecha de carga.
    if (!fechasDespues[i][0] && fechas[i][0]) fechasDespues[i][0] = fechas[i][0];
  }

  sh.getRange(2, COL.ID, n, 1).setValues(ids);
  sh.getRange(2, COL.FECHA_DESPUES, n, 1).setValues(fechasDespues);
  sh.getRange(2, COL.FECHA_DESPUES, n, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');

  Logger.log('Migración lista. Filas: ' + n + '. IDs nuevos: ' + tocadas + '.');
}
```

- [ ] **Step 3: Pushear y correr la migración**

Agregar al final de `Migracion.js` el wrapper que permite dispararla por HTTP:

```javascript
/** Wrapper para correrTest. Devuelve el resumen en vez de solo loguearlo. */
function test_migrarIds() {
  return migrarIds();
}
```

Y cambiar el final de `migrarIds()` para que **devuelva** el resumen además de loguearlo:

```javascript
  const resumen = 'Migración lista. Filas: ' + n + '. IDs nuevos: ' + tocadas + '.';
  Logger.log(resumen);
  return resumen;
}
```

(El `return` temprano del caso "sin filas" también pasa a `return 'Sin filas de datos. Solo se escribieron encabezados.';`.)

```bash
npx clasp push && npx clasp deploy -i AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr -d "migracion"
```

Correr: `./correr-test.sh test_migrarIds`
Esperado: `"Migración lista. Filas: N. IDs nuevos: N."` — con la N anotada en el Task 0 Step 5.

- [ ] **Step 4: Verificar la idempotencia**

Correr `./correr-test.sh test_migrarIds` **una segunda vez**.
Esperado: `IDs nuevos: 0`. Abrir la planilla: ninguna columna se duplicó y los IDs son los mismos.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/Usuario/Proyectos/demarcacion-backend
git init -q 2>/dev/null; git add WebApp.js Migracion.js
git commit -m "feat: columna ID y migracion de filas existentes"
```

(Si el backend no está bajo git, saltear este paso — el push a Apps Script ya lo versiona.)

---

### Task 2: `guardarTrabajo` sin foto después

**Files:**
- Modify: `WebApp.js:126-173` (función `guardarTrabajo`)
- Create: `Tests.js`

**Interfaces:**
- Consumes: `COL`, `TOTAL_COLS` (Task 1).
- Produces: `guardarTrabajo(payload)` devuelve ahora `{ ok: true, id: <uuid> }`.

- [ ] **Step 1: Escribir el test que falla**

Crear `Tests.js`:

```javascript
/**
 * Tests manuales del backend. Se corren desde el editor de Apps Script.
 * Cada uno limpia lo que escribe.
 */
function _borrarPorId_(id) {
  const sh = _sheet_('Trabajos');
  const last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2, COL.ID, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(id)) sh.deleteRow(i + 2);
  }
}

function _payloadDemo_() {
  // 1x1 px JPEG, suficiente para ejercitar la subida a Drive.
  const px = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';
  return {
    pin: PropertiesService.getScriptProperties().getProperty('OPERARIO_PIN'),
    operario: 'TEST_AUTOMATICO',
    tipoTrabajo: 'Senda peatonal', tipoPintura: 'Acrílica', color: 'Blanco',
    m2: 5, lat: -26.8241, lon: -65.2226, accuracy: 8,
    obs: 'fila de prueba', fotoAntes: px
  };
}

function test_guardarSinFotoDespues() {
  const res = guardarTrabajo(_payloadDemo_());
  if (!res.id) throw new Error('FALLA: guardarTrabajo no devolvió un id');

  const sh = _sheet_('Trabajos');
  const fila = sh.getLastRow();
  const v = sh.getRange(fila, 1, 1, TOTAL_COLS).getValues()[0];

  if (String(v[COL.ID - 1]) !== String(res.id)) throw new Error('FALLA: el ID no quedó escrito');
  if (v[COL.FOTO_DESPUES - 1]) throw new Error('FALLA: se escribió una foto después que no existe');
  if (v[COL.FECHA_DESPUES - 1]) throw new Error('FALLA: se selló FECHA DESPUES en un trabajo pendiente');
  if (!v[COL.FOTO_ANTES - 1]) throw new Error('FALLA: falta la foto antes');

  _borrarPorId_(res.id);
  Logger.log('OK test_guardarSinFotoDespues');
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
npx clasp push
```

Correr: `./correr-test.sh test_guardarSinFotoDespues`
Esperado: falla con `Faltan la foto antes y/o después.` — es la validación vieja, que es justo la que hay que sacar.

- [ ] **Step 3: Modificar `guardarTrabajo`**

En `WebApp.js`, reemplazar la validación de fotos y el `appendRow`. La función queda así:

```javascript
function guardarTrabajo(payload) {
  _checkPin_(payload && payload.pin, 'operario');
  if (!payload.operario) throw new Error('Falta identificar el operario.');
  // La foto DESPUÉS ya no es obligatoria: se saca más tarde, desde el historial.
  if (!payload.fotoAntes) throw new Error('Falta la foto antes.');
  if (payload.lat == null || payload.lon == null) throw new Error('Falta la ubicación GPS.');
  const m2 = Number(payload.m2);
  if (!(m2 > 0)) throw new Error('Los m² deben ser un número mayor a 0.');

  const sh = _sheet_('Trabajos');
  const urlAntes = _subirFoto_(payload.fotoAntes, payload.operario, 'antes');
  // Si el operario igual sacó las dos fotos de una, el trabajo nace cerrado.
  const urlDespues = payload.fotoDespues ? _subirFoto_(payload.fotoDespues, payload.operario, 'despues') : '';

  const maps = 'https://maps.google.com/?q=' + payload.lat + ',' + payload.lon;
  const calle = _geocodificar_(payload.lat, payload.lon);
  const obs = (payload.obs || '').toString().trim().slice(0, 1000);
  const id = Utilities.getUuid();
  const ahora = new Date();

  sh.appendRow([
    ahora,
    payload.operario,
    payload.tipoTrabajo || '',
    payload.tipoPintura || '',
    payload.color || '',
    m2,
    payload.lat,
    payload.lon,
    maps,
    calle,
    payload.accuracy != null ? Math.round(payload.accuracy) : '',
    urlAntes,
    urlDespues,
    obs,
    id,
    urlDespues ? ahora : '',
    '',
    ''
  ]);
  const fila = sh.getLastRow();
  sh.getRange(fila, COL.FECHA).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sh.getRange(fila, COL.FECHA_DESPUES).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  return { ok: true, id: id };
}
```

- [ ] **Step 4: Extraer el helper de subida de fotos**

La subida estaba embebida como closure dentro de `guardarTrabajo`; `actualizarTrabajo` (Task 4) también la necesita. Agregar esta función a `WebApp.js`, justo antes de `guardarTrabajo`, y borrar el closure `guardarFoto` viejo:

```javascript
/**
 * Sube una foto (data URL) a la carpeta de Drive y devuelve su URL.
 * El setSharing es necesario para que las miniaturas
 * (drive.google.com/thumbnail?id=) carguen en monitoreo sin login de Google.
 */
function _subirFoto_(dataUrl, operario, sufijo) {
  const stamp = Utilities.formatDate(new Date(), 'America/Argentina/Tucuman', 'yyyyMMdd_HHmmss');
  const opSafe = String(operario).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'op';
  const bytes = Utilities.base64Decode(String(dataUrl).split(',')[1]);
  const blob = Utilities.newBlob(bytes, 'image/jpeg', 'dv_' + stamp + '_' + opSafe + '_' + sufijo + '.jpg');
  const file = _fotos_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

```bash
npx clasp push
```

Correr: `./correr-test.sh test_guardarSinFotoDespues`
Esperado: `OK test_guardarSinFotoDespues`. La planilla no quedó con la fila de prueba (el test la borra).

- [ ] **Step 6: Verificar que el camino viejo sigue andando**

Agregar a `Tests.js` y ejecutar:

```javascript
function test_guardarConAmbasFotos() {
  const p = _payloadDemo_();
  p.fotoDespues = p.fotoAntes;
  const res = guardarTrabajo(p);
  const sh = _sheet_('Trabajos');
  const v = sh.getRange(sh.getLastRow(), 1, 1, TOTAL_COLS).getValues()[0];
  if (!v[COL.FOTO_DESPUES - 1]) throw new Error('FALLA: no se guardó la foto después');
  if (!v[COL.FECHA_DESPUES - 1]) throw new Error('FALLA: no se selló FECHA DESPUES');
  _borrarPorId_(res.id);
  Logger.log('OK test_guardarConAmbasFotos');
}
```

Esperado: `OK test_guardarConAmbasFotos`.

- [ ] **Step 7: Commit**

```bash
git add WebApp.js Tests.js && git commit -m "feat: guardarTrabajo acepta trabajos sin foto despues"
```

---

### Task 3: `listarTrabajosOperario`

**Files:**
- Modify: `WebApp.js` (`_despachar_` + función nueva)
- Modify: `Tests.js`

**Interfaces:**
- Consumes: `COL`, `TOTAL_COLS`.
- Produces: acción `listarTrabajosOperario`. Devuelve un array de objetos con: `id`, `fecha`, `operario`, `tipoTrabajo`, `tipoPintura`, `color`, `m2`, `lat`, `lon`, `maps`, `calle`, `accuracy`, `fotoAntes`, `fotoDespues`, `obs`, `pendiente` (boolean), `fechaDespues`, `editadoPor`, `editadoEn`.

- [ ] **Step 1: Escribir el test que falla**

Agregar a `Tests.js`:

```javascript
function test_listarTrabajosOperario() {
  const pin = PropertiesService.getScriptProperties().getProperty('OPERARIO_PIN');
  const a = guardarTrabajo(_payloadDemo_());                    // pendiente, de TEST_AUTOMATICO
  const pb = _payloadDemo_(); pb.operario = 'OTRO_OPERARIO';
  const b = guardarTrabajo(pb);                                 // pendiente, de otro

  const lista = listarTrabajosOperario(pin, 'TEST_AUTOMATICO');
  const mio = lista.filter(t => t.id === a.id)[0];
  const ajeno = lista.filter(t => t.id === b.id)[0];

  if (!mio) throw new Error('FALLA: no aparece el trabajo propio');
  if (!ajeno) throw new Error('FALLA: no aparece el trabajo de otro operario');
  if (mio.pendiente !== true) throw new Error('FALLA: pendiente debería ser true');
  if (!mio.operario) throw new Error('FALLA: falta el operario');
  // Los propios pendientes van antes que los ajenos pendientes.
  if (lista.indexOf(mio) > lista.indexOf(ajeno)) throw new Error('FALLA: el propio no quedó arriba');

  _borrarPorId_(a.id); _borrarPorId_(b.id);
  Logger.log('OK test_listarTrabajosOperario');
}
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
npx clasp push
```

Correr: `./correr-test.sh test_listarTrabajosOperario`
Esperado: falla con `listarTrabajosOperario is not defined`.

- [ ] **Step 3: Implementar**

Agregar a `WebApp.js`, después de `listarTrabajos`:

```javascript
/**
 * Alimenta el historial de la app del operario.
 * A diferencia de listarTrabajos (monitoreo), acá SÍ viajan el operario y los
 * campos de edición: son datos internos y el operario es parte de la empresa.
 * Orden: propios pendientes → resto de pendientes → cerrados por fecha desc.
 */
function listarTrabajosOperario(pin, operario) {
  _checkPin_(pin, 'operario');
  const sh = _sheet_('Trabajos');
  const last = sh.getLastRow();
  if (last < 2) return [];
  const yo = String(operario || '').trim();
  const iso = d => (d instanceof Date ? d.toISOString() : (d ? String(d) : null));

  const filas = sh.getRange(2, 1, last - 1, TOTAL_COLS).getValues().map(r => ({
    id:          String(r[COL.ID - 1] || ''),
    fecha:       iso(r[COL.FECHA - 1]),
    operario:    r[COL.OPERARIO - 1] || '',
    tipoTrabajo: r[COL.TIPO_TRABAJO - 1] || '',
    tipoPintura: r[COL.TIPO_PINTURA - 1] || '',
    color:       r[COL.COLOR - 1] || '',
    m2:          Number(r[COL.M2 - 1]) || 0,
    lat:         r[COL.LAT - 1],
    lon:         r[COL.LON - 1],
    maps:        r[COL.MAPS - 1],
    calle:       r[COL.CALLE - 1] || '',
    accuracy:    r[COL.ACCURACY - 1],
    fotoAntes:   r[COL.FOTO_ANTES - 1] || '',
    fotoDespues: r[COL.FOTO_DESPUES - 1] || '',
    obs:         r[COL.OBS - 1] || '',
    pendiente:   !r[COL.FOTO_DESPUES - 1],
    fechaDespues: iso(r[COL.FECHA_DESPUES - 1]),
    editadoPor:  r[COL.EDITADO_POR - 1] || '',
    editadoEn:   iso(r[COL.EDITADO_EN - 1])
  })).filter(t => t.id);

  // 0 = pendiente propio, 1 = pendiente ajeno, 2 = cerrado.
  const rango = t => (!t.pendiente ? 2 : (String(t.operario).trim() === yo ? 0 : 1));
  return filas.sort((a, b) => {
    const d = rango(a) - rango(b);
    if (d !== 0) return d;
    return String(b.fecha || '').localeCompare(String(a.fecha || ''));
  });
}
```

- [ ] **Step 4: Registrar la acción en `_despachar_`**

En el `switch` de `_despachar_`, agregar antes de `case 'listarTrabajos':`

```javascript
    case 'listarTrabajosOperario':
      return listarTrabajosOperario(req.pin, req.operario);
```

- [ ] **Step 5: Correr y verificar que pasa**

```bash
npx clasp push
```

Correr: `./correr-test.sh test_listarTrabajosOperario`
Esperado: `OK test_listarTrabajosOperario`.

- [ ] **Step 6: Verificar que el Municipio no ve de más**

Agregar a `Tests.js` y ejecutar:

```javascript
function test_monitoreoNoVeCamposInternos() {
  const res = guardarTrabajo(_payloadDemo_());
  const pinMon = PropertiesService.getScriptProperties().getProperty('MONITOREO_PIN');
  const lista = listarTrabajos(pinMon);
  const prohibidos = ['operario', 'id', 'editadoPor', 'editadoEn', 'fechaDespues', 'pendiente'];
  lista.forEach(t => prohibidos.forEach(k => {
    if (k in t) throw new Error('FALLA: monitoreo expone "' + k + '"');
  }));
  _borrarPorId_(res.id);
  Logger.log('OK test_monitoreoNoVeCamposInternos');
}
```

Esperado: `OK test_monitoreoNoVeCamposInternos`.

- [ ] **Step 7: Commit**

```bash
git add WebApp.js Tests.js && git commit -m "feat: listarTrabajosOperario para el historial"
```

---

### Task 4: `actualizarTrabajo`

**Files:**
- Modify: `WebApp.js` (`_despachar_` + función nueva)
- Modify: `Tests.js`

**Interfaces:**
- Consumes: `COL`, `_subirFoto_` (Task 2).
- Produces: acción `actualizarTrabajo`. Payload: `{ pin, operario, id, tipoTrabajo?, tipoPintura?, color?, m2?, obs?, fotoDespues? }`. Devuelve `{ ok: true, fotoDespues: <url|''> }`.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `Tests.js`:

```javascript
function test_actualizarSubeFotoDespues() {
  const pin = PropertiesService.getScriptProperties().getProperty('OPERARIO_PIN');
  const res = guardarTrabajo(_payloadDemo_());
  const px = _payloadDemo_().fotoAntes;

  actualizarTrabajo({ pin: pin, operario: 'CERRADOR', id: res.id, fotoDespues: px, m2: 9 });

  const t = listarTrabajosOperario(pin, 'X').filter(x => x.id === res.id)[0];
  if (t.pendiente) throw new Error('FALLA: sigue pendiente');
  if (!t.fotoDespues) throw new Error('FALLA: no se guardó la foto después');
  if (!t.fechaDespues) throw new Error('FALLA: no se selló la fecha del después');
  if (t.m2 !== 9) throw new Error('FALLA: no se actualizaron los m²');
  if (t.editadoPor !== 'CERRADOR') throw new Error('FALLA: no se registró quién editó');
  if (t.tipoTrabajo !== 'Senda peatonal') throw new Error('FALLA: pisó un campo que no vino en el payload');

  _borrarPorId_(res.id);
  Logger.log('OK test_actualizarSubeFotoDespues');
}

function test_actualizarConIdInexistente() {
  const pin = PropertiesService.getScriptProperties().getProperty('OPERARIO_PIN');
  const sh = _sheet_('Trabajos');
  const antes = sh.getLastRow();
  try {
    actualizarTrabajo({ pin: pin, operario: 'X', id: 'no-existe-este-id', m2: 3 });
    throw new Error('FALLA: no lanzó error con un ID inexistente');
  } catch (err) {
    if (String(err.message).indexOf('FALLA') === 0) throw err;
  }
  if (sh.getLastRow() !== antes) throw new Error('FALLA: escribió algo igual');
  Logger.log('OK test_actualizarConIdInexistente');
}
```

- [ ] **Step 2: Correr y verificar que fallan**

```bash
npx clasp push
```

Correr: `./correr-test.sh test_actualizarSubeFotoDespues`
Esperado: falla con `actualizarTrabajo is not defined`.

- [ ] **Step 3: Implementar**

Agregar a `WebApp.js`, después de `guardarTrabajo`:

```javascript
/**
 * Completa o corrige un trabajo ya cargado. Busca la fila por ID, nunca por
 * número de fila: la planilla la abre gente de oficina y un ordenar/borrar
 * desplaza las filas, con lo que una edición caería sobre otro trabajo.
 * Solo pisa los campos que vengan en el payload.
 * NO recalcula la calle: la ubicación registrada es la del ANTES, que es donde
 * está el trabajo — el DESPUÉS puede sacarse desde cualquier lado.
 */
function actualizarTrabajo(payload) {
  _checkPin_(payload && payload.pin, 'operario');
  if (!payload.operario) throw new Error('Falta identificar el operario.');
  const id = String(payload.id || '').trim();
  if (!id) throw new Error('Falta el ID del trabajo.');

  const sh = _sheet_('Trabajos');
  const last = sh.getLastRow();
  if (last < 2) throw new Error('No hay trabajos cargados.');
  const ids = sh.getRange(2, COL.ID, last - 1, 1).getValues();
  let fila = 0;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) { fila = i + 2; break; }
  }
  if (!fila) throw new Error('No se encontró el trabajo (puede haberse borrado de la planilla).');

  if (payload.m2 != null && payload.m2 !== '') {
    const m2 = Number(payload.m2);
    if (!(m2 > 0)) throw new Error('Los m² deben ser un número mayor a 0.');
    sh.getRange(fila, COL.M2).setValue(m2);
  }
  if (payload.tipoTrabajo) sh.getRange(fila, COL.TIPO_TRABAJO).setValue(payload.tipoTrabajo);
  if (payload.tipoPintura) sh.getRange(fila, COL.TIPO_PINTURA).setValue(payload.tipoPintura);
  if (payload.color) sh.getRange(fila, COL.COLOR).setValue(payload.color);
  if (payload.obs != null) sh.getRange(fila, COL.OBS).setValue(String(payload.obs).trim().slice(0, 1000));

  let urlDespues = String(sh.getRange(fila, COL.FOTO_DESPUES).getValue() || '');
  if (payload.fotoDespues) {
    // Si la subida falla, se corta acá: la fila queda pendiente y se reintenta.
    urlDespues = _subirFoto_(payload.fotoDespues, payload.operario, 'despues');
    sh.getRange(fila, COL.FOTO_DESPUES).setValue(urlDespues);
    sh.getRange(fila, COL.FECHA_DESPUES).setValue(new Date());
    sh.getRange(fila, COL.FECHA_DESPUES).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }

  sh.getRange(fila, COL.EDITADO_POR).setValue(payload.operario);
  sh.getRange(fila, COL.EDITADO_EN).setValue(new Date());
  sh.getRange(fila, COL.EDITADO_EN).setNumberFormat('yyyy-mm-dd hh:mm:ss');

  return { ok: true, fotoDespues: urlDespues };
}
```

- [ ] **Step 4: Registrar la acción en `_despachar_`**

En el `switch`, agregar después de `case 'guardarTrabajo':`

```javascript
    case 'actualizarTrabajo':
      return actualizarTrabajo(req.payload);
```

- [ ] **Step 5: Correr los dos tests y verificar que pasan**

```bash
npx clasp push
```

Correr: `./correr-test.sh test_actualizarSubeFotoDespues` Esperado: `OK test_actualizarSubeFotoDespues`.
Correr: `./correr-test.sh test_actualizarConIdInexistente` Esperado: `OK test_actualizarConIdInexistente`.

- [ ] **Step 6: Desplegar la versión nueva del endpoint**

El frontend habla contra el `/exec`, que sirve la **última versión desplegada**, no el código pusheado. Sin este paso, el frontend no ve nada de lo anterior.

```bash
npx clasp deploy -i AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr -d "historial y cierre diferido"
```

Esperado: confirma el deployment. Verificar desde una terminal:

```bash
curl -s -X POST 'https://script.google.com/macros/s/AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr/exec' \
  -H 'Content-Type: text/plain' -L \
  -d '{"accion":"listarTrabajosOperario","pin":"1234","operario":"X"}'
```

Esperado: un JSON `{"ok":true,"data":[...]}`. Si dice `Acción desconocida`, el deploy no tomó.

- [ ] **Step 7: Commit**

```bash
git add WebApp.js Tests.js && git commit -m "feat: actualizarTrabajo para completar y corregir trabajos"
```

---

### Task 5: Carga inicial sin foto después

**Files:**
- Modify: `C:\Users\Usuario\apps\demarcacion.html:78-83` (slot de foto después), `:231-251` (`guardar`), `:257-260` (listeners)

**Interfaces:**
- Consumes: `guardarTrabajo` sin `fotoDespues` (Task 2).

- [ ] **Step 1: Sacar el slot de foto DESPUÉS del formulario de carga**

Borrar este bloque completo (líneas 78–83):

```html
      <div class="foto-slot">
        <label class="tit">Foto DESPUÉS</label>
        <input id="file-despues" type="file" accept="image/*" capture="environment" style="display:none;">
        <button class="btn-secondary" id="btn-foto-despues">📷 Sacar foto después</button>
        <img id="prev-despues" class="preview" alt="despues">
      </div>
```

- [ ] **Step 2: Ajustar la validación y el reset de `guardar()`**

Reemplazar la función `guardar()` completa por:

```javascript
  async function guardar() {
    if (!estado.fotos.antes) { toast('Falta la foto del antes'); return; }
    if (estado.lat == null) { toast('Esperá la ubicación GPS'); return; }
    const m2 = parseFloat($('m2').value);
    if (!(m2 > 0)) { toast('Cargá los m² (mayor a 0)'); return; }
    const btn = $('btn-guardar'); btn.disabled = true; btn.innerHTML = '<span class="spinner white"></span>Guardando...';
    try {
      await api('guardarTrabajo', { payload: {
        pin: estado.pin, operario: $('operario-select').value,
        tipoTrabajo: $('tipo-trabajo').value, tipoPintura: $('tipo-pintura').value, color: $('color').value,
        m2: m2, lat: estado.lat, lon: estado.lon, accuracy: estado.accuracy,
        obs: $('obs').value.trim(), fotoAntes: estado.fotos.antes
      }});
      toast('✓ Guardado — falta la foto del después', 4000);
      estado.fotos.antes = null;
      $('prev-antes').classList.remove('show'); $('prev-antes').src = '';
      $('m2').value=''; $('obs').value=''; $('file-antes').value='';
    } catch (err) {
      toast('Error: ' + (err.message || err), 4000);
    } finally { btn.disabled = false; btn.textContent = 'Guardar trabajo'; }
  }
```

- [ ] **Step 3: Sacar los listeners y el estado que ya no existen**

Borrar estas dos líneas del final del script:

```javascript
  $('btn-foto-despues').addEventListener('click', () => $('file-despues').click());
  $('file-despues').addEventListener('change', e => onFoto(e, 'despues'));
```

Y cambiar la declaración de `estado` para que `fotos` tenga solo `antes`:

```javascript
  const estado = { pin:null, operario:null, lat:null, lon:null, accuracy:null, fotos:{ antes:null } };
```

(`estado.operario` se usa desde el Task 6.)

- [ ] **Step 4: Guardar el operario al hacer login**

En `login()`, después de `estado.pin = pin;` agregar:

```javascript
      estado.operario = $('operario-select').value;
```

- [ ] **Step 5: Verificar en el navegador**

Abrir `demarcacion.html` con un servidor local (no `file://`, o el `fetch` falla por CORS):

```bash
cd /c/Users/Usuario/apps && npx serve -l 5000
```

Ir a `http://localhost:5000/demarcacion.html`, entrar con el PIN `1234`, sacar una foto (o elegir una imagen), cargar m² y guardar.

Esperado:
- La pantalla ya no muestra el slot "Foto DESPUÉS".
- El toast dice `✓ Guardado — falta la foto del después`.
- En la planilla aparece una fila con ID, sin foto después y sin FECHA DESPUES.
- La consola del navegador no tiene errores.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/Usuario/apps
git add demarcacion.html
git commit -m "feat: la carga inicial ya no pide la foto del despues"
```

---

### Task 6: Vista Historial

**Files:**
- Modify: `C:\Users\Usuario\apps\demarcacion.html` (CSS, HTML de la vista, JS)

**Interfaces:**
- Consumes: `listarTrabajosOperario` (Task 3), `estado.operario` (Task 5).
- Produces: `cargarHistorial()`, `renderHistorial()`, `driveId()`, `driveThumb()`, `estado.trabajos`, `estado.filtro`.

- [ ] **Step 1: Agregar el CSS**

Antes del `</style>`, agregar:

```css
  .chips { display:flex; gap:8px; margin-bottom:12px; }
  .chip { flex:1; padding:9px 4px; border-radius:20px; border:1px solid #cdd5df; background:#fff; font-size:13px; cursor:pointer; text-align:center; }
  .chip.on { background:#1f3a5f; color:#fff; border-color:#1f3a5f; }
  .item { display:flex; gap:10px; background:#fff; border-radius:12px; padding:10px; margin-bottom:10px; box-shadow:0 1px 3px rgba(0,0,0,.04); cursor:pointer; border-left:4px solid transparent; }
  .item.mio { border-left-color:#e85d2c; }
  .item img { width:64px; height:64px; object-fit:cover; border-radius:8px; background:#edf2f7; flex-shrink:0; }
  .item .info { flex:1; min-width:0; }
  .item .calle { font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #det-calle { font-weight:600; font-size:15px; }
  .item .meta { font-size:12px; color:#4a5568; margin-top:2px; }
  .estado { display:inline-block; font-size:11px; font-weight:600; padding:2px 8px; border-radius:10px; margin-top:4px; }
  .estado.pend { background:#fdece4; color:#c54c1f; }
  .estado.ok { background:#edf2f7; color:#4a5568; }
  .empty { text-align:center; color:#718096; font-size:14px; padding:30px 10px; }
  .btn-hist { background:none; border:0; color:#fff; font-size:20px; padding:4px 8px; cursor:pointer; border-radius:8px; }
  .btn-hist:active { background:rgba(255,255,255,.1); }
```

- [ ] **Step 2: Agregar el botón al header**

En el `<header>`, después del `<h1 id="titulo">`, agregar:

```html
  <button id="btn-hist" class="btn-hist" style="display:none;" title="Historial">🗂</button>
```

- [ ] **Step 3: Agregar la vista al HTML**

Después de `</section>` de `view-carga` y antes de `</main>`:

```html
  <section id="view-historial" class="view">
    <div class="chips">
      <button class="chip on" data-filtro="pendientes">Pendientes</button>
      <button class="chip" data-filtro="mios">Míos</button>
      <button class="chip" data-filtro="todos">Todos</button>
    </div>
    <div id="lista-hist"><p class="empty"><span class="spinner"></span>Cargando...</p></div>
  </section>
```

- [ ] **Step 4: Agregar el JS**

Antes de los listeners del final, agregar:

```javascript
  // ─── Historial ─────────────────────────────────────────
  function driveId(url) { const m = String(url).match(/[-\w]{25,}/); return m ? m[0] : ''; }
  function driveThumb(url, w) { const id = driveId(url); return id ? ('https://drive.google.com/thumbnail?id=' + id + '&sz=w' + (w||200)) : ''; }

  async function cargarHistorial() {
    $('lista-hist').innerHTML = '<p class="empty"><span class="spinner"></span>Cargando...</p>';
    try {
      estado.trabajos = await api('listarTrabajosOperario', { pin: estado.pin, operario: estado.operario });
      renderHistorial();
    } catch (err) {
      $('lista-hist').innerHTML = '<p class="empty">Error al cargar: ' + esc(err.message || err) + '</p>';
    }
  }

  function renderHistorial() {
    const f = estado.filtro;
    const rows = (estado.trabajos || []).filter(t =>
      f === 'pendientes' ? t.pendiente :
      f === 'mios' ? String(t.operario).trim() === String(estado.operario).trim() : true);

    if (!rows.length) {
      const msg = f === 'pendientes' ? 'No hay trabajos esperando la foto del después.'
                : f === 'mios' ? 'Todavía no cargaste ningún trabajo.'
                : 'No hay trabajos cargados.';
      $('lista-hist').innerHTML = '<p class="empty">' + msg + '</p>';
      return;
    }

    const fmt = iso => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); };
    $('lista-hist').innerHTML = rows.map(t => {
      const mio = String(t.operario).trim() === String(estado.operario).trim();
      const thumb = driveThumb(t.fotoAntes, 120);
      return '<div class="item' + (mio ? ' mio' : '') + '" data-id="' + esc(t.id) + '">'
        + (thumb ? '<img src="' + thumb + '" onerror="this.style.visibility=\'hidden\'" alt="">' : '<img alt="">')
        + '<div class="info">'
        + '<div class="calle">' + esc(t.calle || (t.lat + ', ' + t.lon)) + '</div>'
        + '<div class="meta">' + fmt(t.fecha) + ' · ' + esc(t.tipoTrabajo) + ' · ' + t.m2 + ' m²</div>'
        + '<div class="meta">' + esc(t.operario) + '</div>'
        + '<span class="estado ' + (t.pendiente ? 'pend">FALTA DESPUÉS' : 'ok">COMPLETO') + '</span>'
        + '</div></div>';
    }).join('');
  }
```

- [ ] **Step 5: Conectar navegación y filtros**

Actualizar `mostrar()` y `volver()`, y agregar los listeners:

```javascript
  function mostrar(vista) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $('view-' + vista).classList.add('active');
    $('btn-back').style.display = (vista === 'login') ? 'none' : 'block';
    $('btn-hist').style.display = (vista === 'carga') ? 'block' : 'none';
  }
  function volver() {
    const actual = document.querySelector('.view.active').id;
    if (actual === 'view-historial') { mostrar('carga'); return; }
    detenerGps(); mostrar('login');
  }
```

Y al final, junto a los otros listeners:

```javascript
  $('btn-hist').addEventListener('click', () => { estado.filtro = 'pendientes'; mostrar('historial'); cargarHistorial(); });
  document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    estado.filtro = c.dataset.filtro;
    renderHistorial();
  }));
```

Y agregar `trabajos:[], filtro:'pendientes'` al objeto `estado`:

```javascript
  const estado = { pin:null, operario:null, lat:null, lon:null, accuracy:null, fotos:{ antes:null }, trabajos:[], filtro:'pendientes' };
```

- [ ] **Step 6: Verificar en el navegador**

Con `npx serve -l 5000` corriendo, en `http://localhost:5000/demarcacion.html`:

1. Entrar con el PIN y tocar 🗂. Esperado: aparece la lista, filtro "Pendientes" activo.
2. El trabajo cargado en el Task 5 aparece con chip naranja **FALTA DESPUÉS** y borde izquierdo naranja (es propio).
3. Tocar "Míos" y "Todos": la lista cambia sin volver a pedir datos al servidor.
4. Tocar "Pendientes" con todo cerrado: se ve `No hay trabajos esperando la foto del después.`
5. El `‹` vuelve a la carga, no al login.
6. Consola sin errores; las miniaturas cargan.

- [ ] **Step 7: Commit**

```bash
git add demarcacion.html && git commit -m "feat: vista de historial en la app del operario"
```

---

### Task 7: Vista Detalle y edición

**Files:**
- Modify: `C:\Users\Usuario\apps\demarcacion.html`

**Interfaces:**
- Consumes: `actualizarTrabajo` (Task 4), `estado.trabajos`, `driveThumb` (Task 6).
- Produces: `abrirDetalle(id)`, `guardarCambios()`, `estado.detalle`.

- [ ] **Step 1: Agregar la vista al HTML**

Después de `</section>` de `view-historial`:

```html
  <section id="view-detalle" class="view">
    <div class="card">
      <div id="det-calle" class="calle"></div>
      <div id="det-meta" class="gps-accuracy"></div>
      <img id="det-antes" class="preview show" alt="antes">
    </div>

    <div class="card">
      <div class="foto-slot">
        <label class="tit">Foto DESPUÉS</label>
        <input id="file-det-despues" type="file" accept="image/*" capture="environment" style="display:none;">
        <button class="btn-secondary" id="btn-det-despues">📷 Sacar foto después</button>
        <img id="det-despues" class="preview" alt="despues">
      </div>
    </div>

    <div class="card">
      <div class="input-row">
        <label for="det-tipo-trabajo">Tipo de trabajo</label>
        <select id="det-tipo-trabajo">
          <option>Línea longitudinal</option><option>Senda peatonal</option>
          <option>Flecha</option><option>Cordón</option><option>Leyenda</option><option>Otro</option>
        </select>
      </div>
      <div class="input-row">
        <label for="det-tipo-pintura">Tipo de pintura</label>
        <select id="det-tipo-pintura"><option>Termoplástica 3mm</option><option>Acrílica</option></select>
      </div>
      <div class="input-row">
        <label for="det-color">Color</label>
        <select id="det-color"><option>Blanco</option><option>Amarillo</option></select>
      </div>
      <div class="input-row">
        <label for="det-m2">Metros cuadrados (m²)</label>
        <input id="det-m2" type="number" inputmode="decimal" min="0" step="0.1">
      </div>
      <div class="input-row" style="margin:0;">
        <label for="det-obs">Observaciones (opcional)</label>
        <textarea id="det-obs" rows="2"></textarea>
      </div>
    </div>

    <button class="btn-primary" id="btn-det-guardar" disabled>Guardar cambios</button>
  </section>
```

- [ ] **Step 2: Agregar el JS del detalle**

```javascript
  // ─── Detalle / edición ─────────────────────────────────
  function abrirDetalle(id) {
    const t = (estado.trabajos || []).filter(x => x.id === id)[0];
    if (!t) { toast('No se encontró el trabajo'); return; }
    estado.detalle = { id: id, fotoDespues: null };

    $('det-calle').textContent = t.calle || (t.lat + ', ' + t.lon);
    const fmt = iso => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}); };
    let meta = 'Cargado por ' + t.operario + ' · ' + fmt(t.fecha);
    if (t.editadoPor) meta += ' · editado por ' + t.editadoPor + ' el ' + fmt(t.editadoEn);
    $('det-meta').textContent = meta;
    $('det-antes').src = driveThumb(t.fotoAntes, 800);

    const dsp = $('det-despues');
    if (t.fotoDespues) { dsp.src = driveThumb(t.fotoDespues, 800); dsp.classList.add('show'); }
    else { dsp.src = ''; dsp.classList.remove('show'); }
    $('btn-det-despues').textContent = t.fotoDespues ? '📷 Reemplazar foto después' : '📷 Sacar foto después';

    $('det-tipo-trabajo').value = t.tipoTrabajo;
    $('det-tipo-pintura').value = t.tipoPintura;
    $('det-color').value = t.color;
    $('det-m2').value = t.m2;
    $('det-obs').value = t.obs;
    $('file-det-despues').value = '';
    $('btn-det-guardar').disabled = true;

    mostrar('detalle');
  }

  // El botón se habilita solo cuando hay un cambio real, para que nadie
  // estampe una edición (y su rastro) sin querer.
  function marcarCambio() { $('btn-det-guardar').disabled = false; }

  async function guardarCambios() {
    const d = estado.detalle; if (!d) return;
    const m2 = parseFloat($('det-m2').value);
    if (!(m2 > 0)) { toast('Cargá los m² (mayor a 0)'); return; }
    const btn = $('btn-det-guardar'); btn.disabled = true; btn.innerHTML = '<span class="spinner white"></span>Guardando...';
    try {
      const payload = {
        pin: estado.pin, operario: estado.operario, id: d.id,
        tipoTrabajo: $('det-tipo-trabajo').value, tipoPintura: $('det-tipo-pintura').value,
        color: $('det-color').value, m2: m2, obs: $('det-obs').value.trim()
      };
      if (d.fotoDespues) payload.fotoDespues = d.fotoDespues;
      await api('actualizarTrabajo', { payload: payload });
      toast('✓ Cambios guardados');
      mostrar('historial');
      await cargarHistorial();
    } catch (err) {
      toast('Error: ' + (err.message || err), 4000);
      btn.disabled = false;
    } finally { btn.textContent = 'Guardar cambios'; }
  }
```

- [ ] **Step 3: Adaptar `onFoto` para el detalle**

`onFoto` escribe en `estado.fotos[cual]`, que ya no sirve para el detalle. Reemplazarla por:

```javascript
  function onFoto(e, cual) {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => comprimir(ev.target.result).then(d => {
      if (cual === 'det-despues') {
        estado.detalle.fotoDespues = d;
        marcarCambio();
      } else {
        estado.fotos[cual] = d;
      }
      const p = $('prev-' + cual) || $(cual);
      p.src = d; p.classList.add('show');
    }).catch(() => toast('No se pudo procesar la foto'));
    reader.readAsDataURL(f);
  }
```

- [ ] **Step 4: Conectar listeners y navegación**

Agregar al final:

```javascript
  $('lista-hist').addEventListener('click', e => {
    const it = e.target.closest('.item'); if (it) abrirDetalle(it.dataset.id);
  });
  $('btn-det-despues').addEventListener('click', () => $('file-det-despues').click());
  $('file-det-despues').addEventListener('change', e => onFoto(e, 'det-despues'));
  $('btn-det-guardar').addEventListener('click', guardarCambios);
  ['det-tipo-trabajo','det-tipo-pintura','det-color','det-m2','det-obs']
    .forEach(id => $(id).addEventListener('input', marcarCambio));
```

Y extender `volver()` para que el detalle vuelva al historial:

```javascript
  function volver() {
    const actual = document.querySelector('.view.active').id;
    if (actual === 'view-detalle') { mostrar('historial'); return; }
    if (actual === 'view-historial') { mostrar('carga'); return; }
    detenerGps(); mostrar('login');
  }
```

- [ ] **Step 5: Verificar en el navegador**

En `http://localhost:5000/demarcacion.html`:

1. Historial → tocar un trabajo pendiente. Esperado: se abre el detalle con la foto del antes y los campos prellenados con lo que se cargó.
2. **Guardar cambios** arranca deshabilitado.
3. Cambiar los m² → el botón se habilita.
4. Sacar/elegir la foto del después → aparece la vista previa y el botón se habilita.
5. Guardar → toast `✓ Cambios guardados`, vuelve al historial, y el trabajo **desaparece** del filtro "Pendientes".
6. Filtro "Todos" → el mismo trabajo ahora tiene chip gris **COMPLETO**.
7. Reabrirlo → el detalle muestra la foto del después y el botón dice "Reemplazar foto después"; el meta dice "editado por ... el ...".
8. En la planilla: `FOTO DESPUES`, `FECHA DESPUES`, `EDITADO POR` y `EDITADO EN` completos, y los m² nuevos.
9. Consola sin errores.

- [ ] **Step 6: Commit**

```bash
git add demarcacion.html && git commit -m "feat: detalle editable y carga diferida de la foto despues"
```

---

### Task 8: Monitoreo e informe PDF

**Files:**
- Modify: `C:\Users\Usuario\apps\demarcacion-monitoreo.html:229` (celda de foto después)
- Modify: `WebApp.js` (`generarInformePdf`)
- Modify: `Tests.js`

**Interfaces:**
- Consumes: `listarTrabajos` (sin cambios de contrato).

Decisión del spec: el monitoreo **sí** muestra los pendientes; el PDF **solo cuenta los cerrados** y aclara cuántos quedaron afuera. El PDF respalda los m² que se facturan.

- [ ] **Step 1: Marcar los pendientes en la tabla de monitoreo**

En `demarcacion-monitoreo.html`, reemplazar la celda de la foto después (línea 229):

```javascript
      + '<td>' + (t.fotoDespues
          ? '<img class="thumb" data-full="' + esc(t.fotoDespues) + '" src="' + driveThumb(t.fotoDespues) + '" onerror="this.style.display=\'none\'">'
          : '<span style="font-size:11px;color:#c54c1f;">en ejecución</span>') + '</td>'
```

- [ ] **Step 2: Escribir el test del PDF**

Agregar a `Tests.js`:

```javascript
function test_pdfExcluyePendientes() {
  const pinMon = PropertiesService.getScriptProperties().getProperty('MONITOREO_PIN');
  const p = _payloadDemo_(); p.m2 = 777;              // valor reconocible
  const pend = guardarTrabajo(p);                      // pendiente: NO debe sumar

  const res = generarInformePdf(pinMon);
  const texto = Utilities.newBlob(Utilities.base64Decode(res.base64)).getDataAsString('ISO-8859-1');
  if (texto.indexOf('777') >= 0) throw new Error('FALLA: el PDF incluyó un trabajo pendiente');

  _borrarPorId_(pend.id);
  Logger.log('OK test_pdfExcluyePendientes');
}
```

Nota: leer texto de un PDF así es tosco pero alcanza — el número `777` aparecería literal en el stream si el trabajo se hubiera incluido. Si el resultado es ambiguo, verificar a ojo descargando el PDF desde la vista de monitoreo.

- [ ] **Step 3: Correr y verificar que falla**

```bash
npx clasp push
```

Correr: `./correr-test.sh test_pdfExcluyePendientes`
Esperado: falla con `FALLA: el PDF incluyó un trabajo pendiente`.

- [ ] **Step 4: Modificar `generarInformePdf`**

En `WebApp.js`, dentro de `generarInformePdf`, reemplazar **la primera línea** —
`const trabajos = listarTrabajos(pin);` — por estas cuatro. El resto de la
función (`obra`, `hoy`, los totales) queda igual y sigue operando sobre
`trabajos`, que ahora son solo los cerrados:

```javascript
  const todos = listarTrabajos(pin);
  // Solo los cerrados entran al informe: es el documento que respalda los m²
  // facturados, y un trabajo sin foto del después no tiene evidencia de haber
  // terminado. Los pendientes se declaran al pie.
  const trabajos = todos.filter(t => t.fotoDespues);
  const pendientes = todos.length - trabajos.length;
```

Y agregar la línea al pie, justo antes del `'</body></html>'` de la plantilla:

```javascript
    + (pendientes
        ? '<p style="margin-top:10px;font-size:10px;color:#4a5568;">' + pendientes +
          (pendientes === 1 ? ' trabajo en ejecución, no incluido' : ' trabajos en ejecución, no incluidos') +
          ' en este total.</p>'
        : '')
```

- [ ] **Step 5: Correr y verificar que pasa**

```bash
npx clasp push
```

Correr: `./correr-test.sh test_pdfExcluyePendientes` Esperado: `OK test_pdfExcluyePendientes`.

- [ ] **Step 6: Redesplegar y verificar a ojo**

```bash
npx clasp deploy -i AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr -d "informe sin pendientes"
```

Abrir `http://localhost:5000/demarcacion-monitoreo.html`, entrar con el PIN `muni2026`.

Esperado:
- Los trabajos pendientes aparecen en la tabla con "en ejecución" en la columna Después.
- Descargar el PDF: los totales no incluyen los pendientes, y al pie figura la línea "N trabajos en ejecución, no incluidos en este total."

- [ ] **Step 7: Commit**

```bash
cd /c/Users/Usuario/apps && git add demarcacion-monitoreo.html
git commit -m "feat: el informe PDF excluye los trabajos en ejecucion"
cd /c/Users/Usuario/Proyectos/demarcacion-backend && git add WebApp.js Tests.js
git commit -m "feat: el informe PDF excluye los trabajos en ejecucion"
```

---

### Task 9: Cache, documentación y publicación

**Files:**
- Modify: `C:\Users\Usuario\apps\service-worker.js:2`
- Modify: `C:\Users\Usuario\apps\CONTEXT.md:32-45`

- [ ] **Step 1: Bumpear el cache del service worker**

`demarcacion.html` está en el array `ASSETS`, así que los celulares que ya tienen la PWA instalada seguirían sirviendo la versión vieja desde cache. En `service-worker.js`:

```javascript
const CACHE = 'apps-ingeco-v12';
```

- [ ] **Step 2: Corregir `CONTEXT.md`**

La sección de Demarcación Vial describe un wrapper con `<iframe>` que ya no existe. Reemplazar el bloque de líneas 32–45 por:

```markdown
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
```

- [ ] **Step 3: Publicar**

```bash
cd /c/Users/Usuario/apps
git add service-worker.js CONTEXT.md
git commit -m "chore: bump de cache y CONTEXT.md al dia"
git push origin main
```

**Gotcha conocido:** `git push` se cuelga bajo Bash en esta máquina. Si pasa, correrlo desde PowerShell.

- [ ] **Step 4: Verificación final en producción**

Esperar ~1 minuto a que GitHub Pages redeploye. Desde un **celular** (no el escritorio — el flujo real es con cámara y GPS), entrar a `https://marcoskatz-cmd.github.io/apps/demarcacion.html`:

1. Cargar un trabajo real con foto del antes. Esperado: `✓ Guardado — falta la foto del después`.
2. 🗂 Historial → el trabajo aparece como **FALTA DESPUÉS**.
3. Abrirlo, sacar la foto del después, guardar. Esperado: pasa a **COMPLETO**.
4. Entrar con **otro operario** y confirmar que ve el trabajo del primero y puede cerrarlo.
5. Monitoreo con el PIN del Municipio: las dos fotos se ven, y no hay ni rastro de operario ni de campos de edición (verificar en la consola: `estado.trabajos[0]`).
6. Borrar de la planilla las filas de prueba que hayan quedado.

---

### Task 10: Cerrar la puerta de test

**Files:**
- Delete: `TestRunner.js`, `Tests.js`, `Migracion.js`, `correr-test.sh` (backend)
- Modify: `WebApp.js` (sacar el `case 'correrTest'`)

Sin este task, el endpoint queda en producción con una acción capaz de ejecutar
funciones que borran filas. No es opcional y no se puede dejar "para después".

- [ ] **Step 1: Borrar los archivos de desarrollo**

```bash
cd /c/Users/Usuario/Proyectos/demarcacion-backend
rm TestRunner.js Tests.js Migracion.js correr-test.sh
```

`Migracion.js` se va también: ya corrió, es de un solo uso, y dejarlo permite
re-ejecutar una escritura masiva sobre la planilla por accidente.

- [ ] **Step 2: Sacar la acción del switch**

En `_despachar_` de `WebApp.js`, borrar:

```javascript
    case 'correrTest':
      return correrTest(req.token, req.test);
```

- [ ] **Step 3: Borrar la property**

Editor de Apps Script → Configuración del proyecto → Propiedades del script →
borrar `TEST_TOKEN`.

- [ ] **Step 4: Pushear, desplegar y verificar que la puerta cerró**

```bash
npx clasp push && npx clasp deploy -i AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr -d "cierre de test runner"

curl -s -L -X POST "https://script.google.com/macros/s/AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr/exec" \
  -H 'Content-Type: text/plain' -d '{"accion":"correrTest","token":"x","test":"test_estadoPlanilla"}'
```

Esperado: `{"ok":false,"error":"Acción desconocida: correrTest"}`.

- [ ] **Step 5: Verificar que la app real sigue andando**

```bash
curl -s -L -X POST "https://script.google.com/macros/s/AKfycbwVdS-WH5_c3Uj7CnqxFPMeJSTiU_iN71l_v1keqdlljs-YGCOfoX4atqkt6Lr5blFr/exec" \
  -H 'Content-Type: text/plain' -d '{"accion":"listarTrabajosOperario","pin":"1234","operario":"X"}'
```

Esperado: `{"ok":true,"data":[...]}`. Si esto falla, el deploy rompió algo.

- [ ] **Step 6: Limpiar las filas de prueba de la planilla**

Abrir la planilla, filtrar la columna OPERARIO por `TEST_AUTOMATICO` y `OTRO_OPERARIO`
y borrar esas filas. Los tests limpian lo suyo, pero uno que falle a la mitad
puede dejar una colgada.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: sacar el test runner del endpoint de produccion"
```

---

## Notas para quien ejecute

- **El `/exec` sirve la última versión *desplegada*, no la pusheada.** Después de cada `clasp push` que el frontend necesite ver, hay que correr `clasp deploy -i <deploymentId>`. Es el error más fácil de cometer acá: el test del editor pasa y el frontend sigue viendo el código viejo.
- **`_borrarPorId_` borra filas de la planilla de producción.** Los tests están escritos para limpiar lo que escriben, pero si uno falla a la mitad puede dejar una fila `TEST_AUTOMATICO` colgada. Revisar la planilla al terminar.
- El `Index.html` del proyecto Apps Script es la UI vieja de HtmlService, que ya no se usa. **No hace falta tocarlo**, pero tampoco lo borres en esta tanda: no es parte de este trabajo.
