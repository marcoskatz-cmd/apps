/**
 * Gastos de viaje — backend (Google Apps Script + planilla).
 * Una sola acción: sync. El cliente manda lo que cambió y recibe todo el viaje.
 * El id del viaje (aleatorio, 22 caracteres) es la clave de acceso: quien tiene el link entra.
 */
const SHEET_ID = '1FgNO-g5-JjBNJJ4w1pfArniqXZ1XwKJyp70ckH5G_7s'; // planilla "Gastos de viaje — datos"
const HOJA_VIAJES = 'Viajes';   // tripId | json | updatedAt
const HOJA_GASTOS = 'Gastos';   // tripId | id | json | updatedAt

/**
 * Ejecutar UNA VEZ desde el editor (botón Ejecutar con "setup" elegido):
 * crea las pestañas y dispara el pedido de permisos de Google.
 */
function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  hoja_(ss, HOJA_VIAJES, ['tripId', 'json', 'updatedAt']);
  hoja_(ss, HOJA_GASTOS, ['tripId', 'id', 'json', 'updatedAt']);
  const sobra = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (sobra && ss.getSheets().length > 1) ss.deleteSheet(sobra);
  Logger.log('Listo: pestañas creadas y permisos autorizados.');
}

function doGet() {
  return json_({ ok: true, app: 'gastos-viaje' });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.action !== 'sync') return json_({ ok: false, error: 'acción desconocida' });
    const t = String(req.t || '');
    if (!/^[A-Za-z0-9_-]{16,40}$/.test(t)) return json_({ ok: false, error: 'viaje inválido' });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const hv = hoja_(ss, HOJA_VIAJES, ['tripId', 'json', 'updatedAt']);
      const hg = hoja_(ss, HOJA_GASTOS, ['tripId', 'id', 'json', 'updatedAt']);

      // Viaje (metadatos: nombre, personas, monedas)
      const vRows = hv.getDataRange().getValues();
      let vIdx = -1;
      for (let i = 1; i < vRows.length; i++) if (vRows[i][0] === t) { vIdx = i; break; }
      let trip = vIdx > 0 ? JSON.parse(vRows[vIdx][1]) : null;
      if (req.trip && (!trip || (req.trip.updatedAt || 0) > (trip.updatedAt || 0))) {
        trip = req.trip;
        const fila = [t, JSON.stringify(trip), trip.updatedAt || 0];
        if (vIdx > 0) hv.getRange(vIdx + 1, 1, 1, 3).setValues([fila]);
        else hv.appendRow(fila);
      }
      if (!trip) return json_({ ok: false, error: 'viaje no encontrado' });

      // Gastos: upsert, gana el updatedAt mayor
      const gRows = hg.getDataRange().getValues();
      const pos = {};
      for (let i = 1; i < gRows.length; i++) if (gRows[i][0] === t) pos[gRows[i][1]] = i;
      const nuevas = [];
      for (const x of (req.expenses || [])) {
        if (!x || !x.id) continue;
        const fila = [t, String(x.id), JSON.stringify(x), x.updatedAt || 0];
        const i = pos[x.id];
        if (i === undefined) { nuevas.push(fila); pos[x.id] = -1; }
        else if (i > 0 && (x.updatedAt || 0) > Number(gRows[i][3] || 0)) {
          hg.getRange(i + 1, 1, 1, 4).setValues([fila]);
          gRows[i] = fila;
        }
      }
      if (nuevas.length) hg.getRange(hg.getLastRow() + 1, 1, nuevas.length, 4).setValues(nuevas);

      const expenses = [];
      for (let i = 1; i < gRows.length; i++) if (gRows[i][0] === t) expenses.push(JSON.parse(gRows[i][2]));
      for (const f of nuevas) expenses.push(JSON.parse(f[2]));
      return json_({ ok: true, trip, expenses });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function hoja_(ss, nombre, encabezado) {
  let h = ss.getSheetByName(nombre);
  if (!h) { h = ss.insertSheet(nombre); h.appendRow(encabezado); }
  return h;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
