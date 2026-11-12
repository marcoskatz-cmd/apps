/* Gastos de viaje — lógica pura (sin DOM). Montos en centavos (enteros). */
(function (g) {
  'use strict';

  // Número escrito por una persona: "1.234,5", "12,5", "12.5" o "1.250".
  function parseNum(v) {
    let s = String(v).trim().replace(/\s/g, '');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  function toCents(v) {
    const n = parseNum(v);
    return isNaN(n) ? NaN : Math.round(n * 100);
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

  // Convierte saldos (centavos) a otra moneda; el resultado suma exactamente cero.
  function convertBalances(amounts, rate) {
    const conv = {};
    let sum = 0, mayor = null;
    for (const [p, v] of Object.entries(amounts)) {
      conv[p] = Math.round(v * rate); sum += conv[p];
      if (mayor === null || Math.abs(conv[p]) > Math.abs(conv[mayor])) mayor = p;
    }
    if (sum && mayor !== null) conv[mayor] -= sum;
    return conv;
  }

  // Saldos por moneda: { CNY: { Ana: 1500, Beto: -1500 } }. Positivo = le deben.
  // Una conversión (type 'fx') pasa el saldo de cada uno de una moneda a otra.
  function balances(expenses) {
    const out = {};
    const ordenados = [...expenses].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    for (const e of ordenados) {
      if (e.deleted) continue;
      if (e.type === 'fx') {
        const f = out[e.from] || (out[e.from] = {}), t = out[e.to] || (out[e.to] = {});
        for (const [p, v] of Object.entries(e.amounts || {})) f[p] = (f[p] || 0) - v;
        for (const [p, v] of Object.entries(e.conv || {})) t[p] = (t[p] || 0) + v;
        continue;
      }
      if (!e.split || !e.split.length) continue;
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

  // Resumen tipo Splitwise: por moneda y persona, cuánto pagó, cuánto le tocaba y el saldo.
  function summary(expenses) {
    const out = {};
    const fila = (cur, p) => {
      const c = out[cur] || (out[cur] = {});
      return c[p] || (c[p] = { pagado: 0, parte: 0, pagos: 0, convertido: 0, saldo: 0 });
    };
    for (const e of expenses) {
      if (e.deleted || e.type === 'fx' || !e.split || !e.split.length) continue;
      const parts = splitEqual(e.amount, e.split.length);
      if (e.settlement) {
        fila(e.currency, e.payer).pagos += e.amount;
        fila(e.currency, e.split[0]).pagos -= e.amount;
      } else {
        fila(e.currency, e.payer).pagado += e.amount;
        e.split.forEach((p, i) => { fila(e.currency, p).parte += parts[i]; });
      }
    }
    for (const e of expenses) {
      if (e.deleted || e.type !== 'fx') continue;
      for (const [p, v] of Object.entries(e.amounts || {})) fila(e.from, p).convertido -= v;
      for (const [p, v] of Object.entries(e.conv || {})) fila(e.to, p).convertido += v;
    }
    const b = balances(expenses);
    for (const cur of Object.keys(out)) for (const p of Object.keys(out[cur])) out[cur][p].saldo = (b[cur] && b[cur][p]) || 0;
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

  const api = { parseNum, toCents, fromCents, splitEqual, convertBalances, balances, settle, settleAll, summary, mergeById };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else g.ViajeLogic = api;
})(typeof self !== 'undefined' ? self : this);
