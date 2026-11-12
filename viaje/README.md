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

## Conectar el servidor (una sola vez, ~5 minutos)

Sin este paso la app funciona, pero cada celular ve solo lo suyo.

1. Crear una planilla de Google nueva, por ejemplo "Gastos de viaje — datos".
2. En la planilla: **Extensiones → Apps Script**. Borrar lo que haya y pegar el contenido de `backend.gs`. Guardar.
3. **Implementar → Nueva implementación → tipo Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona**.
   - Autorizar cuando lo pida.
4. Copiar la URL que termina en `/exec` y pegarla en `index.html`, en `const API_URL = '...'`.
5. Pushear. GitHub Pages actualiza en 1 a 3 minutos.

Si después se cambia `backend.gs`: Implementar → Administrar implementaciones → lápiz → Nueva versión.
No usar "Nueva implementación" porque cambia la URL.

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
