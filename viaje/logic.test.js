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
  assert.strictEqual(L.toCents('12.5'), 1250);
  assert.strictEqual(L.toCents('1.250'), 125000);
  assert.strictEqual(L.parseNum('0,14'), 0.14);
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

test('convertBalances suma cero y respeta el tipo de cambio', () => {
  const c = L.convertBalances({ A: 1001, B: -500, C: -501 }, 0.333);
  assert.strictEqual(Object.values(c).reduce((a, b) => a + b, 0), 0);
  assert.ok(Math.abs(c.B - (-167)) <= 1);
});

test('conversión opcional: todo se netea en una sola moneda', () => {
  const ex = [
    { id: '1', payer: 'Ana', amount: 40000, currency: 'CNY', split: ['Ana', 'Beto'], createdAt: 1 },
    { id: '2', payer: 'Beto', amount: 10000, currency: 'USD', split: ['Ana', 'Beto'], createdAt: 2 },
  ];
  // sin convertir: dos transferencias en monedas distintas
  const s0 = L.settleAll(ex);
  assert.deepStrictEqual(Object.keys(s0), ['CNY', 'USD']);
  // convertir CNY a USD a 0,14
  const b = L.balances(ex);
  ex.push({ id: 'fx', type: 'fx', from: 'CNY', to: 'USD', rate: 0.14, amounts: b.CNY, conv: L.convertBalances(b.CNY, 0.14), createdAt: 3 });
  const s1 = L.settleAll(ex);
  assert.deepStrictEqual(Object.keys(s1), ['USD']);
  // Ana tenía +200 CNY = +28 USD, debía 50 USD -> Ana paga 22 USD a Beto
  assert.deepStrictEqual(s1.USD, [{ from: 'Ana', to: 'Beto', amount: 2200 }]);
});

test('summary: pagó, parte, pagos y saldo', () => {
  const ex = [
    { id: '1', payer: 'Ana', amount: 900, currency: 'CNY', split: ['Ana', 'Beto', 'Caro'] },
    { id: '2', payer: 'Beto', amount: 300, currency: 'CNY', split: ['Ana'], settlement: true },
  ];
  const s = L.summary(ex).CNY;
  assert.deepStrictEqual(s.Ana, { pagado: 900, parte: 300, pagos: -300, convertido: 0, saldo: 300 });
  assert.strictEqual(s.Beto.saldo, 0);
  assert.strictEqual(s.Caro.saldo, -300);
});
