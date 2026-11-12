/* Gastos de viaje — lógica pura (sin DOM). Montos en centavos (enteros). */
(function (g) {
  'use strict';

  function toCents(v) {
    const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
    if (!isFinite(n)) return NaN;
    return Math.round(n * 100);
  }

  function fromCents(c) {
    const neg = c < 0; c = Math.abs(c);
    const ent = Math.floor(c / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const dec = String(c % 100).padStart(2, '0');
    return (neg ? '-' : '') + ent + ',' + dec;
  }

  // Reparte `total` centavos entre `n` partes iguales; el resto va a las primeras.
  function splitEqual(total, n) {
    const base = Math.trunc(total / n), rest = total - base * n;
    return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
  }

  // Saldos por moneda: { CNY: { Ana: 1500, Beto: -1500 } }. Positivo = le deben.
  function balances(expenses) {
    const out = {};
    for (const e of expenses) {
      if (e.deleted || !e.split || !e.split.length) continue;
      const b = out[e.currency] || (out[e.currency] = {});
      b[e.payer] = (b[e.payer] || 0) + e.amount;
      const parts = splitEqual(e.amount, e.split.length);
      e.split.forEach((p, i) => { b[p] = (b[p] || 0) - parts[i]; });
    }
    return out;
  }

  // Transferencias mínimas (greedy) dentro de UNA moneda.
  function settle(bal) {
    const cred = [], debt = [];
    for (const [p, v] of Object.entries(bal)) {
      if (v > 0) cred.push([p, v]); else if (v < 0) debt.push([p, -v]);
    }
    const byAmt = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1);
    cred.sort(byAmt); debt.sort(byAmt);
    const tx = [];
    let i = 0, j = 0;
    while (i < debt.length && j < cred.length) {
      const m = Math.min(debt[i][1], cred[j][1]);
      tx.push({ from: debt[i][0], to: cred[j][0], amount: m });
      debt[i][1] -= m; cred[j][1] -= m;
      if (!debt[i][1]) i++;
      if (!cred[j][1]) j++;
    }
    return tx;
  }

  // Para cada moneda, por separado: { CNY: [{from,to,amount}], USD: [...] }
  function settleAll(expenses) {
    const b = balances(expenses), out = {};
    for (const cur of Object.keys(b).sort()) {
      const tx = settle(b[cur]);
      if (tx.length) out[cur] = tx;
    }
    return out;
  }

  // Une listas por id; gana el updatedAt mayor.
  function mergeById(a, b) {
    const m = new Map();
    for (const x of [...a, ...b]) {
      const prev = m.get(x.id);
      if (!prev || (x.updatedAt || 0) > (prev.updatedAt || 0)) m.set(x.id, x);
    }
    return [...m.values()];
  }

  const api = { toCents, fromCents, splitEqual, balances, settle, settleAll, mergeById };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else g.ViajeLogic = api;
})(typeof self !== 'undefined' ? self : this);
