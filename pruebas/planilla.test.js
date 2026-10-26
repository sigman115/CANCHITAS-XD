/* Planillas: texto del QR, perspectiva y lectura de los círculos (js/planilla.js) */
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { RM } = require('./cargar');

describe('texto del QR', () => {
  test('lo que se escribe en el QR se vuelve a leer igual', () => {
    const t = RM.planilla.textoQR('oro-J3-P2', 5, 1);
    assert.equal(t, 'RM1|oro-J3-P2|5|1');
    assert.deepEqual(RM.planilla.leerTextoQR(t), { pid: 'oro-J3-P2', a: 5, b: 1 });
  });

  test('rechaza QR que no son de una planilla de RaquetMatch', () => {
    ['', null, undefined, 'https://ejemplo.com', 'RM1|oro-J1-P1|1', 'XX1|oro-J1-P1|1|8', 'RM1|a|1|2|extra']
      .forEach((t) => assert.equal(RM.planilla.leerTextoQR(t), null, String(t)));
  });
});

describe('homografía (ubicar los círculos aunque la foto esté inclinada)', () => {
  const cuadrado = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const cerca = (p, q) => assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6, `${p} ≠ ${q}`);

  test('sin cambios deja cada punto en su lugar', () => {
    const h = RM.planilla.homografia(cuadrado, cuadrado);
    [[0.5, 0.5], [0.2, 0.9], [2, 3]].forEach(([x, y]) => cerca(h(x, y), [x, y]));
  });

  test('escala y desplazamiento (foto derecha, más grande y corrida)', () => {
    const h = RM.planilla.homografia(cuadrado, [[100, 50], [300, 50], [300, 250], [100, 250]]);
    cerca(h(0.5, 0.5), [200, 150]);
    cerca(h(2, 0), [500, 50]); // los círculos están fuera del QR, a la derecha
  });

  test('perspectiva: las 4 esquinas del QR caen donde las encontró el lector', () => {
    const foto = [[120, 80], [410, 110], [395, 390], [90, 350]];
    const h = RM.planilla.homografia(cuadrado, foto);
    cuadrado.forEach((p, i) => cerca(h(...p), foto[i]));
  });

  test('perspectiva: una línea recta del papel sigue siendo recta en la foto', () => {
    const h = RM.planilla.homografia(cuadrado, [[120, 80], [410, 110], [395, 390], [90, 350]]);
    const [a, b, c] = [h(0, 0.5), h(1, 0.5), h(2, 0.5)];
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    assert.ok(Math.abs(area) < 1e-6, 'los tres puntos están alineados');
  });

  test('si las esquinas están alineadas (QR mal leído) no hay transformación', () => {
    assert.equal(RM.planilla.homografia(cuadrado, [[0, 0], [1, 1], [2, 2], [3, 3]]), null);
  });
});

describe('círculos dudosos (no se registran solos)', () => {
  test('la franja de duda va del 20 % al 40 % de oscuridad', () => {
    assert.equal(RM.planilla.UMBRAL, 0.3);
    assert.equal(RM.planilla.MARGEN, 0.1);
  });

  test('una lectura normal con bolígrafo no tiene círculos dudosos', () => {
    // Valores medidos en pruebas/escaneo.html: rellenos 75-90 %, vacíos por debajo de 15 %
    const oscuro = { a0: 0.05, a1: 0.06, a2: 0.89, b0: 0.04, b1: 0.75, b2: 0.13, woA: 0.03, woB: 0.05 };
    assert.deepEqual(RM.planilla.dudosos(oscuro), []);
  });

  test('marcas a medias o muy suaves quedan como dudosas', () => {
    // X ≈ 27 %, relleno a la mitad ≈ 33 %: justo los casos cercanos al umbral en el banco de pruebas
    const oscuro = { a0: 0.05, a1: 0.27, a2: 0.06, b0: 0.04, b1: 0.06, b2: 0.33, woA: 0.03, woB: 0.05 };
    assert.deepEqual(RM.planilla.dudosos(oscuro), ['a1', 'b2']);
  });

  test('los bordes de la franja no son dudosos (19 % y 41 %)', () => {
    assert.deepEqual(RM.planilla.dudosos({ a0: 0.19, a1: 0.41 }), []);
  });

  test('sin datos no hay dudosos', () => {
    assert.deepEqual(RM.planilla.dudosos(undefined), []);
  });

  test('nombre legible de cada círculo', () => {
    assert.deepEqual(['a0', 'b2', 'woA', 'woB'].map(RM.planilla.nombreCirculo), ['A 0', 'B 2', 'W.O. A', 'W.O. B']);
  });
});

describe('decidir el resultado según los círculos rellenados', () => {
  // marcados('a2', 'b1') → { a2: true, b1: true }
  const marcados = (...k) => Object.fromEntries(k.map((x) => [x, true]));

  for (const [a, b] of [[2, 0], [2, 1], [1, 2], [0, 2]]) {
    test(`A ${a} y B ${b} → ${a}-${b}`, () => {
      assert.deepEqual(RM.planilla.decidir(marcados('a' + a, 'b' + b)), { r: `${a}-${b}`, avisos: [] });
    });
  }

  test('W.O. de un equipo', () => {
    assert.equal(RM.planilla.decidir(marcados('woA')).r, 'woA');
    assert.equal(RM.planilla.decidir(marcados('woB')).r, 'woB');
  });

  test('W.O. de los dos equipos', () => {
    assert.equal(RM.planilla.decidir(marcados('woA', 'woB')).r, 'woAB');
  });

  test('si se marcó W.O. y también sets, vale el W.O. con un aviso', () => {
    const d = RM.planilla.decidir(marcados('woB', 'a2', 'b0'));
    assert.equal(d.r, 'woB');
    assert.equal(d.avisos.length, 1);
  });

  test('sin círculos rellenados da error', () => {
    assert.match(RM.planilla.decidir({}).error, /ningún círculo/);
  });

  test('dos círculos en la misma fila o una fila vacía da error', () => {
    assert.ok(RM.planilla.decidir(marcados('a2', 'a1', 'b0')).error);
    assert.ok(RM.planilla.decidir(marcados('a2')).error);
  });

  test('marcadores imposibles (2-2, 1-0, 0-0) dan error', () => {
    ['2-2', '1-0', '0-0', '1-1'].forEach((m) => {
      const [a, b] = m.split('-');
      assert.match(RM.planilla.decidir(marcados('a' + a, 'b' + b)).error || '', /no es válido/, m);
    });
  });
});
