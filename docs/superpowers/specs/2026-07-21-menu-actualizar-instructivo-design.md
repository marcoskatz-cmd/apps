# Menú inicial, botón de actualizar e instructivo

Fecha: 2026-07-21
Estado: aprobado

## Problema

Tres huecos de usabilidad que aparecieron al poner en uso el cierre diferido:

1. El operario cae directo en el formulario de carga. La segunda foto y el historial se llegan por un ícono 🗂 en el header, que no se descubre solo.
2. El monitoreo del Municipio solo carga los datos al entrar. Para ver algo nuevo hay que recargar la página, y no hay forma de saber de cuándo son los datos que se están mirando.
3. Nadie explicó cómo se usa el sistema. Ni al operario ni al Municipio.

## Decisiones

| Decisión | Resuelto |
|---|---|
| Estructura del menú | Tres opciones + instructivo, cada una con título y línea de aclaración |
| "Cerrar" vs "Ver todos" | Misma pantalla de lista, distinto filtro inicial, **título de header distinto** |
| Dónde vive el instructivo | Adentro de cada app, no en una página aparte ni en un PDF |
| Tono del instructivo | Corto y operativo. Nada de arquitectura. |

**Los títulos no pueden ser ambiguos** — requisito explícito de Marcos. Cada opción declara *qué vas a encontrar adentro*, no qué podés hacer, porque en las dos listas se puede editar.

Se descartó "Carga inicial" / "Historial": "inicial" solo se entiende si ya sabés que hay una segunda carga, e "historial" sugiere cosas terminadas cuando la lista incluye trabajos abiertos.

## 1. Menú inicial (`demarcacion.html`)

Vista nueva `view-menu`, entre el login y el resto. Tarjetas grandes, táctiles.

| Título | Línea de aclaración | Va a |
|---|---|---|
| Cargar un trabajo nuevo | Datos del trabajo y foto del ANTES. El trabajo queda abierto. | `view-carga` |
| Cerrar un trabajo — foto del DESPUÉS | Solo los trabajos que están esperando la foto del después. | `view-historial`, filtro **pendientes** |
| Ver todos los trabajos | Los cargados hasta ahora, terminados y sin terminar. | `view-historial`, filtro **todos** |
| ¿Cómo se usa? | Guía rápida de la app. | `view-ayuda` |

- **El título del header cambia según la vista** y, en el historial, según por dónde se entró: "Cerrar un trabajo" o "Todos los trabajos". Es el mecanismo que evita que las dos listas se confundan.
- Los chips de filtro siguen en el historial: el operario puede cambiar de idea sin volver al menú.
- **Se saca el botón 🗂** del header: ahora se llega por el menú.
- El `‹` encadena: ayuda/carga/historial → menú → login. Desde detalle → historial.
- El GPS se detiene al volver al menú, no solo al login (hoy solo se detiene al salir al login).

## 2. Botón de actualizar (`demarcacion-monitoreo.html`)

- Botón en el header que vuelve a llamar a `listarTrabajos` y redibuja tabla, mapa y KPIs.
- Spinner mientras carga; el botón queda deshabilitado para evitar dobles toques.
- **Hora de la última actualización** visible al lado. Sin eso no hay forma de saber si lo que se está mirando es de hace un minuto o de hace tres horas — que es el problema real cuando alguien deja la pantalla abierta.
- Los filtros puestos se respetan: se re-renderiza, no se resetean.
- Si falla, toast de error y la hora anterior queda como estaba (no se pisa con una hora de una carga que no ocurrió).

## 3. Instructivo

Vista nueva en cada app. Contenido corto y operativo.

### Operario (`view-ayuda` en `demarcacion.html`)

- **Cargar un trabajo nuevo:** esperar que el GPS diga "Ubicación lista", foto del antes, completar datos, guardar. El trabajo queda esperando la foto del después.
- **Cerrar un trabajo:** entrar por "Cerrar un trabajo", elegirlo de la lista, sacar la foto del después, guardar. Se puede corregir cualquier dato en la misma pantalla.
- **Si algo falla:**
  - Sin señal: el guardado falla pero **la foto no se pierde**; reintentar cuando haya señal, sin cerrar la app.
  - El GPS no fija: salir a cielo abierto y esperar; no se puede guardar sin ubicación.
  - Me equivoqué en los m²: abrir el trabajo desde "Ver todos los trabajos" y corregirlo.
  - El trabajo lo cargó otro: se puede cerrar igual, cualquiera del equipo puede.
  - La ubicación es la del momento de la foto del antes; sacar la del después desde otro lado no la cambia.

### Municipio (`view-ayuda` en `demarcacion-monitoreo.html`)

- Qué es "en ejecución": trabajo empezado, sin foto de terminación todavía.
- Los KPI cuentan **solo trabajos terminados**; los que están en ejecución se muestran aparte.
- El **PDF cuenta solo los terminados** y **no aplica los filtros** de la pantalla: es siempre el informe completo. Es la diferencia que más confunde.
- El **CSV sí respeta los filtros**.
- Cómo leer el mapa: color del punto = color de pintura.
- El botón de actualizar y para qué sirve la hora de la última actualización.

## Fuera de alcance

Formulario de carga, vista de detalle, backend, generación del PDF, mapa y filtros. Este cambio es navegación y contenido.

## Verificación

Sin framework de tests (HTML plano). Se verifica en el navegador:

1. Login → aparece el menú, no el formulario.
2. Cada opción abre lo que dice, y el título del header lo confirma.
3. "Cerrar un trabajo" abre en Pendientes; "Ver todos" abre en Todos.
4. El `‹` recorre toda la cadena sin dejar al usuario trabado.
5. Ya no existe el botón 🗂.
6. Monitoreo: el botón de actualizar re-pide datos, la hora cambia, los filtros puestos sobreviven.
7. Los dos instructivos abren y se leen bien en pantalla angosta.
8. Sin errores de consola en ninguna de las dos apps.
