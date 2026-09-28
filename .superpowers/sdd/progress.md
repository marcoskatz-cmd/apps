# Progreso — historial y cierre diferido

Plan: docs/superpowers/plans/2026-07-20-demarcacion-historial-cierre-diferido.md
Rama: main (decidido con Marcos)
Tests: por HTTP via correrTest, contra planilla de PRODUCCION

Task 0: parcial — clon del backend en C:/Users/Usuario/Proyectos/demarcacion-backend,
  TestRunner.js creado, case correrTest en WebApp.js, push OK, deploy @5.
  BLOQUEADO en Step 4: falta que Marcos corra setearTestToken en el editor y pase el token.
Task 0: COMPLETO — backend clonado + git init (de141a1), TestRunner con guarda por TEST_TOKEN
  verificada (token malo y nombre no-test rechazados), correr-test.sh andando, deploy @6.
  Planilla en produccion: 3 filas de datos, 14 columnas (antes de migrar).
  Gotcha: curl NO debe usar -X POST explicito (fuerza POST en el redirect -> 411).
Task 1: COMPLETO (de141a1..a23b612, review limpio). Migracion corrida en prod: 3 filas, 14->18 cols,
  idempotencia OK. Verificado aparte: las 3 filas viejas tenian foto despues (supuesto de la migracion
  se cumplio) y no hay colision de COL/TOTAL_COLS con otros archivos.
  Minor abierto p/ review final: migrarIds sella FECHA_DESPUES sin chequear FOTO_DESPUES (sin efecto
  practico aca; el archivo se borra en Task 10).
Task 2: COMPLETO (b1ba35e..4273650, review + fix verificado). guardarTrabajo acepta solo foto ANTES,
  _subirFoto_ extraido como helper. Fix aplicado: tests con try/finally para que la fila de prueba
  se borre aunque falle una asercion (verificado rompiendo una asercion a proposito).
  PATRON para tests siguientes: siempre try/finally con _borrarPorId_.
Task 3: COMPLETO (4273650..bcbe46a, review limpio). listarTrabajosOperario con orden
  propios-pendientes -> pendientes-ajenos -> cerrados por fecha desc; filas sin ID se descartan.
  Test confirma que monitoreo NO expone operario/id/editadoPor/editadoEn/fechaDespues/pendiente.
  Minors abiertos p/ review final: (a) comparacion de operario es case-sensitive (sin efecto: el nombre
  sale del mismo select poblado por listarOperarios); (b) helper iso() duplicado con listarTrabajos.
Task 4: COMPLETO (bcbe46a..33dcfb1, review + fix + re-review aprobados). actualizarTrabajo busca por ID,
  pisa solo campos presentes, no recalcula calle. Fix: foto se sube ANTES de escribir (evita edicion
  fantasma sin rastro si Drive falla) + LockService alrededor de buscar-fila+escribir. Verificado por
  curl que la accion esta desplegada.
  Minor abierto p/ review final: si se manda un ID inexistente CON foto, la foto queda huerfana en Drive
  (el frontend solo manda IDs que recibio del listado, asi que no pasa en la practica).
  Backend listo. Empieza el frontend en C:/Users/Usuario/apps.
Task 5: COMPLETO (9a99264..0c47395, review limpio). Carga inicial ya no pide foto DESPUES;
  estado.operario se setea en login. Commit hecho SIN push (main publica en vivo).
Task 6: COMPLETO (0c47395..e91f36c, review + fix). Vista historial con 3 chips (Pendientes/Mios/Todos),
  tarjetas con data-id, propios con borde naranja. Filtros no re-piden datos al server. Fix: esc(t.m2).
  Nota: el subagente no pudo sacar screenshot de pixeles (timeout de la herramienta); verificado por
  read_page. Sacar captura propia en la verificacion final.
Task 7: COMPLETO (e91f36c..113d36a, review + 2 fixes + re-review). Vista detalle con campos
  prellenados, foto despues, boton deshabilitado hasta cambio real.
  Fixes: setSelect (un valor fuera de la lista ya no pisa la celda con vacio), carrera en onFoto
  (foto de un trabajo cayendo en otro), undefined->"", coma decimal, String(id), onerror en imgs,
  y limpieza de opciones inyectadas entre trabajos.
  PENDIENTE: borrar de la planilla la fila de prueba con operario TEST_TASK7 (la deja el Task 10).
  NO probado: capa de click de pixeles reales (el browser embebido no inyecta input). Verificar en celular.
Task 8: COMPLETO (113a36a..f2bd8aa frontend, 33dcfb1..4e06aef backend; review + fix + mutacion).
  Monitoreo marca "en ejecucion"; el PDF excluye pendientes de los totales con pie aclaratorio.
  Fix: generarInformePdf ahora USA _totalesInformePdf_ (fuente unica) en vez de recalcular -> el test
  valida el calculo real. Probado rompiendo el filtro a proposito: el test falla y luego pasa al revertir.
Task 9: COMPLETO (f2bd8aa..0bb2585). Cache v11->v12, CONTEXT.md corregido (ya no dice iframe) +
  tabla de apps partida por rol. SIN PUSH.
Task 10: COMPLETO (4e06aef..7243658). correrTest/Tests/TestRunner/Migracion borrados y desplegados (@27).
  Verificado: correrTest devuelve "Accion desconocida"; config/listarOperarios/listarTrabajosOperario/
  listarTrabajos siguen ok:true.
REVIEW FINAL: NO LISTO PARA PUBLICAR. Bloqueantes:
  C1 PINs (1234 / muni2026) publicados en CONTEXT.md:36 de un repo PUBLICO. actualizarTrabajo convierte
     la API de append-only a read-write -> ahora se pueden pisar filas facturables. HAY QUE ROTARLOS.
  I2 KPIs del monitoreo suman pendientes; el PDF no -> la pantalla y el PDF dan numeros distintos.
  I3 La decision del PDF (excluir pendientes) sigue sin confirmacion explicita de Marcos.
  I4 El detalle manda siempre los 5 campos desde un snapshot que puede estar viejo -> last-write-wins.
  I6 Index.html (UI legacy de HtmlService, flujo de 2 fotos) sigue servido por doGet.
PENDIENTE MANUAL: borrar property TEST_TOKEN; borrar filas de la planilla (fila 5 TEST_TASK7 + filas 2-4
  marcadas "EJEMPLO - BORRAR").
FIXES POST-REVIEW FINAL (0bb2585..8ea50da, revisados):
  I2 KPIs del monitoreo ahora cuentan solo cerrados (coinciden con el PDF) + KPI aparte "en ejecucion".
  I4 El detalle manda solo los campos tocados -> subir la foto ya no revierte lo que edito otro.
  +change en los selects (input solo podia perder un cambio en silencio) y CAMPO_POR_ID como lista unica.
  +cache v12->v13.
  Verificado que el backend usa "payload.obs != null" -> borrar observaciones funciona.
ESTADO: todo commiteado en main, SIN PUSH. Falta decision de Marcos sobre los PINs.
