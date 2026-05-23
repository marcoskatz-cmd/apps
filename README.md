# Apps INGECO

Hub PWA con acceso rápido a todas las apps de trabajo de INGECO.

- **URL pública**: https://marcoskatz-cmd.github.io/apps/
- **PWA instalable**: un solo ícono en el celular → menú con todas las apps

## Apps incluidas

| App | Rol | URL |
|---|---|---|
| PAVIMAX | App operario | https://marcoskatz-cmd.github.io/pavimax/ |
| PAVIMAX | Oficina (cargar pedidos) | https://marcoskatz-cmd.github.io/pavimax/cargar.html |
| INGECOV | Mantenimiento de flota | https://marcoskatz-cmd.github.io/ingecov/ |
| Bacheo | Gestión de bacheo | (pendiente) |

## Sumar una app nueva

Editar la lista `APPS` en `index.html`:

```js
const APPS = [
  ...,
  {
    name: 'Nombre',
    role: 'Descripción corta',
    url:  'https://...',
    icon: '🚀',         // emoji
    color: 'blue'       // green, blue, orange, purple, cyan, amber
  }
];
```

Después `git add . && git commit && git push`. GitHub Pages redeploya solo en 1-3 min.
