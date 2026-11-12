const test = require('node:test');
const assert = require('node:assert');
const L = require('./logic.js');

const e = (payer, amount, currency, split, extra = {}) =>
  ({ id: Math.random().toString(36), payer, amount, currency, split, ...extra });

test('toCents acepta coma decimal y punto de miles', () => {
  assert.strictEqual(L.toCents('1.234,5'), 123450);
  assert.strictEqual(L.toCents('12'), 1200);
  assert.strictEqual(L.toCents('0,01'), 1);
  assert.ok(isNaN(L.toCents('abc')));
});

test('fromCents formatea estilo es-AR', () => {
  assert.strictEqual(L.fromCents(123450), '1.234,50');
  assert.strictEqual(L.fromCents(-5), '-0,05');
});

test('splitEqual no pierde centavos', () => {
  const p = L.splitEqual(1000, 3);
  assert.deepStrictEqual(p, [334, 333, 333]);
  assert.strictEqual(p.reduce((a, b) => a + b), 1000);
});

test('las monedas NO se mezclan', () => {
  const ex = [
    e('Ana', 40000, 'CNY', ['Ana', 'Beto', 'Caro', 'Dani']),
    e('Beto', 20000, 'USD', ['Ana', 'Beto', 'Caro', 'Dani']),
  ];
  const s = L.settleAll(ex);
  assert.deepStrictEqual(Object.keys(s), ['CNY', 'USD']);
  assert.ok(s.CNY.every(t => t.to === 'Ana' && t.amount === 10000));
  assert.ok(s.USD.every(t => t.to === 'Beto' && t.amount === 5000));
  assert.strictEqual(s.CNY.length, 3);
});

test('neteo dentro de la misma moneda', () => {
  const ex = [
    e('Ana', 1000, 'CNY', ['Ana', 'Beto']),
    e('Beto', 1000, 'CNY', ['Ana', 'Beto']),
  ];
  assert.deepStrictEqual(L.settleAll(ex), {});
});

test('simplifica cadena A->B->C a una transferencia', () => {
  const ex = [
    e('Beto', 1000, 'USD', ['Ana']),
    e('Caro', 1000, 'USD', ['Beto']),
  ];
  assert.deepStrictEqual(L.settleAll(ex), { USD: [{ from: 'Ana', to: 'Caro', amount: 1000 }] });
});

test('gastos borrados no cuentan', () => {
  const ex = [e('Ana', 1000, 'USD', ['Beto'], { deleted: true })];
  assert.deepStrictEqual(L.settleAll(ex), {});
});

test('los saldos de cada moneda suman cero', () => {
  const ps = ['A', 'B', 'C', 'D'], cs = ['CNY', 'USD', 'ARS'], ex = [];
  for (let i = 0; i < 300; i++) {
    const split = ps.filter(() => Math.random() < 0.7);
    if (!split.length) continue;
    ex.push(e(ps[i % 4], 1 + Math.floor(Math.random() * 99999), cs[i % 3], split));
  }
  const b = L.balances(ex);
  for (const cur of cs) assert.strictEqual(Object.values(b[cur]).reduce((a, x) => a + x, 0), 0);
  const s = L.settleAll(ex);
  for (const cur of Object.keys(s)) {
    const net = {};
    for (const t of s[cur]) { net[t.from] = (net[t.from] || 0) + t.amount; net[t.to] = (net[t.to] || 0) - t.amount; }
    for (const p of ps) assert.strictEqual((net[p] || 0) + (b[cur][p] || 0), 0);
    assert.ok(s[cur].length <= 3);
  }
});

test('mergeById gana el más nuevo', () => {
  const a = [{ id: '1', v: 'viejo', updatedAt: 1 }];
  const b = [{ id: '1', v: 'nuevo', updatedAt: 2 }, { id: '2', updatedAt: 1 }];
  const m = L.mergeById(a, b);
  assert.strictEqual(m.length, 2);
  assert.strictEqual(m.find(x => x.id === '1').v, 'nuevo');
});
