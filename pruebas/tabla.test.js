/* Puntos, tabla de posiciones, desempates y evolución (js/tabla.js) */
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { RM, estadoCon, cargarResultado } = require('./cargar');

/*
  Con 4 equipos el fixture es:
    Fecha 1: 1-4, 2-3 · Fecha 2: 3-1, 4-2 · Fecha 3: 1-2, 3-4
  cargarTodos() recibe los 6 resultados en ese orden.
*/
function cargarTodos(st, resultados) {
  resultados.forEach((r, i) => cargarResultado(st, Math.floor(i / 2), i % 2, r));
}
const orden = (t) => t.lista.map((f) => f.num);
const fila = (t, num) => t.lista.find((f) => f.num === num);

describe('reglas de puntos (README: 2-0 = 3, 2-1 = 2, 1-2 = 1, 0-2 = 0)', () => {
  // [resultado, puntos a, puntos b, sets a, sets b]
  const casos = [
    ['2-0', 3, 0, 2, 0], ['2-1', 2, 1, 2, 1], ['1-2', 1, 2, 1, 2], ['0-2', 0, 3, 0, 2],
    ['woA', 0, 3, 0, 2], // no vino a: b gana 2-0
    ['woB', 3, 0, 2, 0], // no vino b: a gana 2-0
    ['woAB', 0, 0, 0, 0] // no vino ninguno
  ];
  for (const [r, pa, pb, sa, sb] of casos) {
    test(`${r} → ${pa} y ${pb} puntos, sets ${sa}-${sb}`, () => {
      assert.deepEqual(RM.tabla.valor(r), [pa, pb, sa, sb]);
    });
  }

  test('cada partido jugado reparte 3 puntos en total (salvo W.O. de ambos)', () => {
    RM.tabla.RESULTADOS.concat('woA', 'woB').forEach((r) => {
      const v = RM.tabla.valor(r);
      assert.equal(v[0] + v[1], 3, r);
    });
  });

  test('un resultado desconocido no vale', () => {
    assert.equal(RM.tabla.valor('3-0'), null);
    assert.equal(RM.tabla.valor(undefined), null);
  });

  test('solo se aceptan 2-0, 2-1, 1-2 y 0-2 como resultados de sets', () => {
    assert.deepEqual(RM.tabla.RESULTADOS, ['2-0', '2-1', '1-2', '0-2']);
  });
});

describe('tabla.etiqueta (resultado visto por cada equipo)', () => {
  test('invierte el marcador para el equipo b', () => {
    assert.equal(RM.tabla.etiqueta('2-1', 'a'), '2-1');
    assert.equal(RM.tabla.etiqueta('2-1', 'b'), '1-2');
  });
  test('en W.O. el ausente ve "W.O." y el presente "2-0"', () => {
    assert.equal(RM.tabla.etiqueta('woA', 'a'), 'W.O.');
    assert.equal(RM.tabla.etiqueta('woA', 'b'), '2-0');
    assert.equal(RM.tabla.etiqueta('woB', 'a'), '2-0');
    assert.equal(RM.tabla.etiqueta('woB', 'b'), 'W.O.');
    assert.equal(RM.tabla.etiqueta('woAB', 'a'), 'W.O.');
  });
});

describe('tabla.resultadoDe (resultados guardados)', () => {
  test('ignora un resultado de un fixture anterior (otros equipos en ese partido)', () => {
    const st = estadoCon(4);
    const p = st.fixture.c.jornadas[0].partidos[0];
    st.resultados[p.id] = { catId: 'c', a: p.b, b: p.a, r: '2-0' };
    assert.equal(RM.tabla.resultadoDe(st, p), null);
    assert.equal(RM.tabla.calcular(st, 'c').jugados, 0);
  });
  test('ignora un resultado con un valor inválido', () => {
    const st = estadoCon(4);
    const p = cargarResultado(st, 0, 0, '9-9');
    assert.equal(RM.tabla.resultadoDe(st, p), null);
  });
});

describe('tabla.calcular', () => {
  test('sin fixture devuelve null', () => {
    assert.equal(RM.tabla.calcular(estadoCon(4), 'otra'), null);
  });

  test('sin resultados todos tienen 0 y se ordenan por número', () => {
    const t = RM.tabla.calcular(estadoCon(4), 'c');
    assert.deepEqual(orden(t), [1, 2, 3, 4]);
    assert.ok(t.lista.every((f) => f.pts === 0 && f.pj === 0));
    assert.equal(t.total, 6);
    assert.equal(t.jugados, 0);
    assert.equal(t.terminado, false);
  });

  test('suma puntos, partidos jugados y sets de un campeonato completo', () => {
    const st = estadoCon(4);
    cargarTodos(st, ['2-0', '2-1', '0-2', '1-2', '2-1', '2-0']);
    const t = RM.tabla.calcular(st, 'c');
    assert.deepEqual(orden(t), [1, 2, 3, 4]);
    assert.deepEqual(t.lista.map((f) => [f.pts, f.pj, f.sf, f.sc]), [[8, 3, 6, 1], [5, 3, 5, 4], [4, 3, 3, 4], [1, 3, 1, 6]]);
    assert.equal(t.terminado, true);
    assert.deepEqual(t.empates, []);
  });

  test('W.O.: el ausente recibe 0 y el presente gana 2-0', () => {
    const st = estadoCon(4);
    cargarResultado(st, 0, 0, 'woA'); // fecha 1: 1-4, no vino el 1
    const t = RM.tabla.calcular(st, 'c');
    assert.deepEqual([fila(t, 1).pts, fila(t, 1).sf, fila(t, 1).sc], [0, 0, 2]);
    assert.deepEqual([fila(t, 4).pts, fila(t, 4).sf, fila(t, 4).sc], [3, 2, 0]);
    assert.equal(fila(t, 1).fechas[0].texto, 'W.O.');
    assert.equal(fila(t, 4).fechas[0].texto, '2-0');
  });

  test('W.O. de ambos: los dos cuentan el partido como jugado y suman 0', () => {
    const st = estadoCon(4);
    cargarResultado(st, 0, 0, 'woAB');
    const t = RM.tabla.calcular(st, 'c');
    [1, 4].forEach((n) => assert.deepEqual([fila(t, n).pj, fila(t, n).pts], [1, 0]));
  });

  test('con número impar marca la fecha libre de cada equipo', () => {
    const st = estadoCon(5);
    const t = RM.tabla.calcular(st, 'c');
    st.fixture.c.jornadas.forEach((j, ji) => assert.equal(fila(t, j.descansa).fechas[ji].estado, 'descansa'));
  });

  test('empate en puntos: sin desempate decide la diferencia de sets', () => {
    // Equipos 1 y 2 con 4 puntos; el 2 tiene mejor diferencia (4-4 contra 3-4)
    const st = estadoCon(4);
    cargarTodos(st, ['1-2', '2-1', '2-0', '1-2', '2-0', '2-0']);
    const t = RM.tabla.calcular(st, 'c');
    assert.deepEqual(orden(t), [3, 2, 1, 4]);
    assert.deepEqual(t.empates, [{ pts: 4, equipos: [2, 1], resuelto: false }]);
  });

  test('el partido de desempate pesa más que la diferencia de sets', () => {
    const st = estadoCon(4);
    cargarTodos(st, ['1-2', '2-1', '2-0', '1-2', '2-0', '2-0']);
    st.desempates.c = [{ id: 'd1', a: 1, b: 2, r: '2-1' }];
    const t = RM.tabla.calcular(st, 'c');
    assert.deepEqual(orden(t), [3, 1, 2, 4]);
    assert.deepEqual(t.empates, [{ pts: 4, equipos: [1, 2], resuelto: true }]);
    assert.equal(fila(t, 1).pts, 4, 'el desempate no suma puntos a la tabla');
  });

  test('un desempate con resultado inválido se ignora', () => {
    const st = estadoCon(4);
    cargarTodos(st, ['1-2', '2-1', '2-0', '1-2', '2-0', '2-0']);
    st.desempates.c = [{ id: 'd1', a: 1, b: 2, r: 'xx' }];
    assert.deepEqual(orden(RM.tabla.calcular(st, 'c')), [3, 2, 1, 4]);
  });

  test('empate en puntos y diferencia: decide quién tiene más sets a favor', () => {
    // Equipos 3 (5-3) y 1 (4-2): 6 puntos y +2 los dos
    const st = estadoCon(4);
    cargarTodos(st, ['2-0', '2-1', '2-0', '2-0', '2-0', '2-1']);
    assert.deepEqual(orden(RM.tabla.calcular(st, 'c')), [3, 1, 4, 2]);
  });

  test('los empates solo se informan cuando el campeonato terminó', () => {
    const st = estadoCon(4);
    cargarTodos(st, ['1-2', '2-1', '2-0', '1-2', '2-0']); // falta un partido
    const t = RM.tabla.calcular(st, 'c');
    assert.equal(t.terminado, false);
    assert.deepEqual(t.empates, []);
  });
});

describe('tabla.evolucion (gráfico de Posiciones)', () => {
  test('sin resultados no hay línea en ninguna fecha', () => {
    const ev = RM.tabla.evolucion(estadoCon(5), 'c');
    assert.equal(ev.hasta, -1);
    assert.equal(ev.nFechas, 5);
    assert.ok(ev.equipos.every((e) => e.puntos.every((x) => x === null)));
  });

  test('acumula por fecha y corta la línea después de la última fecha jugada', () => {
    const st = estadoCon(5);
    cargarResultado(st, 0, 0, '2-1');
    cargarResultado(st, 0, 1, 'woB');
    cargarResultado(st, 1, 0, '0-2'); // la fecha 2 queda con un partido pendiente
    cargarResultado(st, 2, 0, 'woA');
    const ev = RM.tabla.evolucion(st, 'c');
    const t = RM.tabla.calcular(st, 'c');
    assert.equal(ev.hasta, 2);
    for (const e of ev.equipos) {
      assert.equal(e.puntos[2], fila(t, e.num).pts, `el último punto del equipo ${e.num} es igual a la tabla`);
      assert.deepEqual(e.puntos.slice(3), [null, null]);
      for (let i = 1; i <= 2; i++) assert.ok(e.puntos[i] >= e.puntos[i - 1], 'el acumulado nunca baja');
    }
  });

  test('los equipos van por número (el color sigue al equipo, no a su posición)', () => {
    const st = estadoCon(4);
    cargarTodos(st, ['0-2', '0-2', '0-2', '0-2', '0-2', '0-2']);
    assert.deepEqual(RM.tabla.evolucion(st, 'c').equipos.map((e) => e.num), [1, 2, 3, 4]);
  });

  test('sin fixture devuelve null', () => {
    assert.equal(RM.tabla.evolucion(estadoCon(4), 'otra'), null);
  });
});
