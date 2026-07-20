# Demarcación Vial — historial del operario y cierre diferido

Fecha: 2026-07-20
Estado: aprobado (pendiente de confirmar la decisión abierta del final)

## Problema

Hoy `guardarTrabajo` exige la foto ANTES y la foto DESPUÉS en la misma carga, y
la app del operario solo sabe hacer `appendRow`: no puede listar ni editar nada.

En la obra real las dos fotos no ocurren juntas. El ANTES se saca al llegar; el
DESPUÉS, bastante más tarde — a veces en otro turno y a veces lo saca otro
operario del equipo. Con el flujo actual, el operario tiene que esperar parado
a que el trabajo termine para poder cargarlo, o inventar el dato.

## Alcance

1. La carga inicial guarda todos los datos + foto ANTES. El trabajo queda
   **pendiente**.
2. El operario tiene un **historial** de trabajos desde el que puede abrir uno
   pendiente, subir la foto DESPUÉS y corregir cualquier dato cargado antes.
3. Los trabajos quedan **siempre editables**, con rastro interno de quién los
   modificó por última vez.

Fuera de alcance: modo offline / cola de sincronización. Si no hay señal la
carga falla, igual que hoy.

## Decisiones tomadas

| Decisión | Resuelto |
|---|---|
| Qué ve el operario en el historial | Todos los trabajos de la obra, con los propios destacados y arriba |
| Editar un trabajo ya cerrado | Sí, siempre editable |
| Rastro de ediciones | Última edición (quién + cuándo), **no visible para el Municipio** |
| Obligatorio en la carga inicial | Todo lo de hoy salvo la foto DESPUÉS |
| Identificación de la fila | Columna `ID` (UUID), no número de fila |

El ID se eligió sobre el número de fila porque la oficina abre la planilla a
mano: un borrado o un "ordenar por fecha" desplaza las filas y una edición
posterior caería, en silencio, sobre el trabajo equivocado.

## Modelo de datos

Hoja `Trabajos`. Las columnas A–N no se tocan. Se agregan cuatro:

| Col | Campo | Contenido |
|---|---|---|
| O | `ID` | `Utilities.getUuid()` al crear. Inmutable. |
| P | `FECHA DESPUES` | Se sella al subir la foto del después. Vacío = pendiente. |
| Q | `EDITADO POR` | Operario de la última modificación. |
| R | `EDITADO EN` | Fecha/hora de la última modificación. |

El **estado no se persiste**: se deriva de si la columna M (`fotoDespues`) está
vacía. Una columna de estado escrita a mano termina mintiendo; una derivada no
puede desincronizarse.

### Migración

`migrarIds()` — se corre una vez, a mano, desde el editor de Apps Script:

- rellena `ID` en toda fila existente que no lo tenga;
- copia la fecha de carga (col. A) a `FECHA DESPUES`, porque las filas
  existentes ya vienen con ambas fotos, o sea cerradas;
- es idempotente: correrla dos veces no rompe nada.

## Backend (`WebApp.js`)

### `guardarTrabajo(payload)` — modificado

- Deja de exigir `fotoDespues`. Sigue exigiendo `fotoAntes`, GPS y m² > 0.
- Genera el `ID` y lo devuelve al frontend.
- Si el payload trae igual las dos fotos, guarda el trabajo cerrado en un solo
  paso: el flujo viejo sigue siendo válido.

### `listarTrabajosOperario(pin, operario)` — nuevo

- Valida el PIN de **operario**.
- Devuelve todos los trabajos, incluyendo `id`, `operario`, `pendiente` y los
  campos de edición.
- Orden: propios pendientes → resto de pendientes → cerrados por fecha
  descendente.

### `actualizarTrabajo(payload)` — nuevo

- Valida el PIN de operario. Requiere `id` y `operario`.
- Busca la fila por `ID`; si no existe, error explícito (no escribe nada).
- Pisa **solo** los campos presentes en el payload.
- Si viene `fotoDespues`: la sube a Drive con el naming actual
  (`dv_<stamp>_<operario>_despues.jpg`), le aplica el mismo
  `setSharing(ANYONE_WITH_LINK, VIEW)` que necesitan las miniaturas, escribe la
  URL en la col. M y sella `FECHA DESPUES`.
- Siempre escribe `EDITADO POR` / `EDITADO EN`.
- **No recalcula la geocodificación de la calle.** La ubicación registrada es
  la del ANTES, que es donde está el trabajo; el DESPUÉS puede sacarse con el
  celular en cualquier otro lado.

### `listarTrabajos(pin)` — sin cambios de contrato

Sigue devolviendo los mismos 14 campos al Municipio. Las columnas O–R **no
viajan** al navegador de monitoreo, por la misma razón por la que hoy no viaja
el nombre del operario: es información interna.

## Frontend del operario (`demarcacion.html`)

Reutiliza los helpers `driveId()` / `driveThumb()` que ya existen en
`demarcacion-monitoreo.html`.

### Navegación

El login entra a la vista de carga, como hoy. El header suma un botón
**🗂 Historial**. El `‹` encadena: historial → carga → login.

### Vista Historial

Lista de tarjetas con tres chips de filtro: **Pendientes** (por defecto) ·
**Míos** · **Todos**.

Cada tarjeta: miniatura del antes, calle, fecha, tipo de trabajo, m², y chip de
estado — naranja **FALTA DESPUÉS** o gris **COMPLETO**. Los propios llevan
borde izquierdo naranja y van arriba.

Lista vacía: texto explicativo, no una pantalla en blanco.

### Vista Detalle

Se abre tocando una tarjeta.

- Arriba: foto del antes (solo lectura) y la calle/ubicación registrada. **El
  GPS no se vuelve a tomar.**
- Campos de la carga (tipo, pintura, color, m², observaciones) prellenados y
  editables.
- Slot 📷 **Sacar foto después**.
- **Guardar cambios**, deshabilitado hasta que haya un cambio real, para que
  nadie estampe una edición sin querer.
- Si el trabajo ya está completo: se muestra la foto del después, con opción de
  reemplazarla.

### Vista Carga

- Se saca el slot de foto DESPUÉS.
- La validación deja de pedirla.
- El toast final pasa a *"✓ Guardado — falta la foto del después"*.

## Manejo de errores

- `actualizarTrabajo` con un `ID` inexistente → error explícito, sin escritura
  parcial.
- Falla al subir la foto a Drive → no se sella `FECHA DESPUES`; el trabajo
  sigue pendiente y se puede reintentar.
- Sin señal → el `fetch` falla y se muestra el toast de error, como hoy.

## Verificación

Al no haber framework de tests en el proyecto (HTML plano + Apps Script), se
verifica a mano contra la planilla real:

1. `migrarIds()` — todas las filas viejas quedan con ID y con `FECHA DESPUES`.
   Correrla de nuevo no duplica ni pisa nada.
2. Carga inicial sin foto después → fila nueva con ID, `FECHA DESPUES` vacía, y
   la tarjeta aparece como **FALTA DESPUÉS** en el historial.
3. Subir el después desde el detalle → la col. M se llena, `FECHA DESPUES` se
   sella, el chip pasa a **COMPLETO**.
4. Editar m² de un trabajo cerrado → el valor cambia y `EDITADO POR` / `EDITADO
   EN` se actualizan.
5. Operario B abre y cierra un trabajo cargado por el operario A.
6. Monitoreo con el PIN del Municipio → no aparece ningún campo de O a R.
7. La miniatura del después carga en monitoreo sin login de Google (el
   `setSharing` se aplicó).

## Decisión abierta

**¿Los trabajos pendientes se le muestran al Municipio?** Hoy el monitoreo y el
informe PDF listan todo lo que hay en la planilla; con este cambio empiezan a
existir filas sin foto del después.

Default asumido: **el monitoreo los muestra** con la celda de la foto vacía,
pero **el informe PDF solo cuenta los cerrados**, y agrega al pie una línea
"N trabajos en ejecución, no incluidos en este total". El PDF es el documento
que respalda los m² facturados; sumar ahí trabajos sin evidencia de terminación
es lo que no conviene.
