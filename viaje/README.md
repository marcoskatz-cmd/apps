# Gastos de viaje

App para dividir gastos de un viaje en grupo, tipo Splitwise, con una diferencia clave:
**cada moneda se netea por separado y nunca se convierte**. El resultado es del tipo
"Juan le paga 500 CNY a Pedro" y "Marcos le paga 50 USD a Juan".

- URL: https://marcoskatz-cmd.github.io/apps/viaje/
- Sin cuentas: cada viaje tiene un link secreto; quien lo tiene puede ver y cargar.
- Funciona sin señal: lo cargado queda en el celular y se sube cuando vuelve la conexión.
- Instalable en el celular (Agregar a pantalla de inicio).
- No figura en el menú de Apps INGECO: es personal.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Toda la app (pantallas, carga, sincronización) |
| `logic.js` | Cálculo de saldos y transferencias por moneda (sin pantalla) |
| `logic.test.js` | Tests: `node --test viaje/logic.test.js` |
| `backend.gs` | Servidor en Google Apps Script que guarda todo en una planilla |
| `sw.js`, `manifest.json` | Para que funcione offline y se pueda instalar |

## Servidor (Apps Script + planilla, publicado con clasp)

| Qué | Dónde |
|---|---|
| Planilla | "Gastos de viaje — datos", id `1FgNO-g5-JjBNJJ4w1pfArniqXZ1XwKJyp70ckH5G_7s` |
| Script (independiente, como Combustible) | "Gastos de viaje", scriptId `1BpfKEA5Oi9uuS6wIqUEt-KdnUevKnRsXhAmdumMmSu7PNvmTn_EkPpPr` |
| Implementación | `AKfycbyMR59LmltIUGj6HjplaXPKolizjRWmY38M-I3pVGCIyMwXKTliMiHuC1fxwZZdKlGjVg` |

`backend.gs` es el `Code.js` del proyecto clasp. Para actualizar sin cambiar la URL:

```bash
clasp push -f
clasp redeploy AKfycbyMR59LmltIUGj6HjplaXPKolizjRWmY38M-I3pVGCIyMwXKTliMiHuC1fxwZZdKlGjVg -d "descripción"
```

Puesta en marcha (una sola vez, ya hecha si el tablero responde):
1. En el editor del script, elegir `setup` y tocar **Ejecutar**; aceptar permisos ("app no verificada" → Avanzado → Ir a…).
2. **Compartir** el script como "Cualquier persona con el enlace · Lector". Sin esto Apps Script responde
   "Access Denied" a quien no tiene sesión de Google (mismo esquema que Combustible).

## Cómo se usa

1. Crear el viaje con las personas y las monedas (CNY, USD, ARS por defecto).
2. Viaje → Compartir link, y mandarlo al grupo por WhatsApp. Cada uno elige quién es.
3. Cargar gastos: monto, moneda, quién pagó y entre quiénes (partes iguales).
4. Saldos muestra las transferencias mínimas por moneda. "Ya pagó" registra el pago y lo descuenta.

Para viajar a China: abrir el link e instalar la app en cada celular **antes de salir**.
Así queda guardada y funciona aunque allá no cargue GitHub.

## Seguridad

El link del viaje es la única llave. Tiene 22 caracteres aleatorios, así que no se adivina,
pero cualquiera que lo reciba puede ver y cargar gastos de ese viaje.

## Servidor actual (nov-2026)

- Planilla: "Gastos de viaje — datos" (Drive de marcoskatz@grupoingeco.com.ar), id `1FgNO-g5-JjBNJJ4w1pfArniqXZ1XwKJyp70ckH5G_7s`.
- Script vinculado: id `14TTZVg1jdly5s9rPueXnTlur5hAohzg6gIPB-KCN_wJMigCv7KdI_hzI`, publicado con clasp.
- Para actualizar sin cambiar la URL: `clasp push` y luego `clasp create-deployment -i <deploymentId>` sobre la implementación existente.
