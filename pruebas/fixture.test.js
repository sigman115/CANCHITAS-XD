/* Fixture "todos contra todos" (js/fixture.js) */
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { RM } = require('./cargar');

const clave = (p) => Math.min(p.a, p.b) + '-' + Math.max(p.a, p.b);

describe('fixture.generar', () => {
  test('con menos de 2 equipos no hay partidos', () => {
    assert.deepEqual(RM.fixture.generar(0), []);
    assert.deepEqual(RM.fixture.generar(1), []);
  });

  // Se prueban todos los tamaños razonables de categoría, pares e impares
  for (let n = 2; n <= 16; n++) {
    test(`${n} equipos: todos se enfrentan una sola vez`, () => {
      const jornadas = RM.fixture.generar(n);
      const cruces = jornadas.flatMap((j) => j.partidos.map(clave));
      assert.equal(cruces.length, (n * (n - 1)) / 2, 'cantidad total de partidos');
      assert.equal(new Set(cruces).size, cruces.length, 'ningún cruce repetido');
    });

    test(`${n} equipos: cantidad de jornadas y partidos por jornada`, () => {
      const jornadas = RM.fixture.generar(n);
      assert.equal(jornadas.length, n % 2 ? n : n - 1);
      assert.equal(jornadas.length, RM.q.numJornadas(n), 'coincide con la consulta que usa la interfaz');
      jornadas.forEach((j) => assert.equal(j.partidos.length, Math.floor(n / 2)));
    });

    test(`${n} equipos: nadie juega dos veces en la misma jornada`, () => {
      RM.fixture.generar(n).forEach((j, ji) => {
        const enJornada = j.partidos.flatMap((p) => [p.a, p.b]);
        assert.equal(new Set(enJornada).size, enJornada.length, `jornada ${ji + 1}`);
        if (n % 2) {
          assert.ok(j.descansa >= 1 && j.descansa <= n, 'con número impar alguien descansa');
          assert.ok(!enJornada.includes(j.descansa), 'el que descansa no juega');
        } else {
          assert.equal(j.descansa, null, 'con número par nadie descansa');
        }
      });
    });

    if (n % 2) {
      test(`${n} equipos (impar): cada equipo descansa exactamente una vez`, () => {
        const descansos = RM.fixture.generar(n).map((j) => j.descansa).sort((x, y) => x - y);
        assert.deepEqual(descansos, Array.from({ length: n }, (_, i) => i + 1));
      });
    }

    test(`${n} equipos: el resultado pasa la validación`, () => {
      assert.equal(RM.fixture.validar(RM.fixture.generar(n), n), true);
    });
  }

  test('8 equipos: la primera jornada es 1-8, 2-7, 3-6, 4-5 (método circular)', () => {
    const j1 = RM.fixture.generar(8)[0].partidos.map((p) => [p.a, p.b]);
    assert.deepEqual(j1, [[1, 8], [2, 7], [3, 6], [4, 5]]);
  });

  test('el equipo fijo (1) alterna de lado entre jornadas', () => {
    const lados = RM.fixture.generar(8).map((j) => (j.partidos[0].a === 1 ? 'a' : 'b'));
    assert.deepEqual(lados, ['a', 'b', 'a', 'b', 'a', 'b', 'a']);
  });
});

describe('fixture.validar', () => {
  const base = () => RM.fixture.generar(4);

  test('detecta un cruce repetido', () => {
    const j = base();
    j[1].partidos[0] = { ...j[0].partidos[0] };
    assert.equal(RM.fixture.validar(j, 4), false);
  });

  test('detecta un equipo que juega dos veces en la misma jornada', () => {
    const j = base();
    j[0].partidos[1] = { a: j[0].partidos[0].a, b: j[0].partidos[1].b };
    assert.equal(RM.fixture.validar(j, 4), false);
  });

  test('detecta un fixture incompleto', () => {
    const j = base();
    j.pop();
    assert.equal(RM.fixture.validar(j, 4), false);
  });

  test('detecta que el número de equipos cambió después de generar', () => {
    assert.equal(RM.fixture.validar(RM.fixture.generar(6), 8), false);
  });
});
