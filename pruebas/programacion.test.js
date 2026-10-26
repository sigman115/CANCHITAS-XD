/* Reparto de partidos en horarios y canchas (js/programacion.js) */
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { RM, armarFixture } = require('./cargar');

const CATS = [{ id: 'oro' }, { id: 'plata' }];
// Canchas del campeonato real: la 1 con 6 horarios y la 2 con 2
const CANCHAS = [
  { id: 'c1', horarios: ['07:45', '08:30', '09:20', '10:10', '11:00', '12:00'] },
  { id: 'c2', horarios: ['07:45', '08:30'] }
];
const fixture8y8 = () => ({ oro: armarFixture('oro', 8), plata: armarFixture('plata', 8) });
const idsDe = (fx) => Object.values(fx).flatMap((f) => f.jornadas.flatMap((j) => j.partidos.map((p) => p.id)));

describe('programacion.horariosOrdenados', () => {
  test('ordena por hora y, a la misma hora, por el orden de las canchas', () => {
    const s = RM.programacion.horariosOrdenados(CANCHAS).map((x) => x.hora + ' ' + x.canchaId);
    assert.deepEqual(s.slice(0, 4), ['07:45 c1', '07:45 c2', '08:30 c1', '08:30 c2']);
    assert.equal(s.length, 8);
  });
});

describe('programacion.generar', () => {
  test('cada partido del fixture queda programado exactamente una vez', () => {
    const fx = fixture8y8();
    const prog = RM.programacion.generar(fx, CATS, CANCHAS);
    const asignados = prog.flatMap((j) => j.asignaciones.map((a) => a.partidoId));
    assert.deepEqual([...asignados].sort(), idsDe(fx).sort());
    assert.ok(prog.every((j) => j.sinHorario.length === 0));
  });

  test('cada partido se juega en la jornada que le corresponde', () => {
    const prog = RM.programacion.generar(fixture8y8(), CATS, CANCHAS);
    prog.forEach((j, ji) => j.asignaciones.forEach((a) => assert.ok(a.partidoId.includes(`-J${ji + 1}-`), a.partidoId)));
  });

  test('nunca hay dos partidos en la misma cancha a la misma hora', () => {
    RM.programacion.generar(fixture8y8(), CATS, CANCHAS).forEach((j, ji) => {
      const usados = j.asignaciones.map((a) => a.hora + a.canchaId);
      assert.equal(new Set(usados).size, usados.length, `jornada ${ji + 1}`);
    });
  });

  test('solo se usan horarios que existen en cada cancha', () => {
    const validos = new Set(CANCHAS.flatMap((k) => k.horarios.map((h) => h + k.id)));
    RM.programacion.generar(fixture8y8(), CATS, CANCHAS).forEach((j) =>
      j.asignaciones.forEach((a) => assert.ok(validos.has(a.hora + a.canchaId), a.hora + ' ' + a.canchaId)));
  });

  test('los horarios libres quedan al final del día', () => {
    // 7 y 5 equipos: 5 partidos por jornada (3 en las dos últimas) para 8 horarios
    const fx = { oro: armarFixture('oro', 7), plata: armarFixture('plata', 5) };
    const orden = RM.programacion.horariosOrdenados(CANCHAS).map((s) => s.hora + s.canchaId);
    RM.programacion.generar(fx, CATS, CANCHAS).forEach((j, ji) => {
      const usados = j.asignaciones.map((a) => a.hora + a.canchaId);
      assert.deepEqual(usados, orden.slice(0, usados.length), `jornada ${ji + 1}: se usan los primeros horarios`);
    });
  });

  test('las categorías se intercalan', () => {
    // Con el mismo número de partidos por categoría no debería haber dos seguidos
    // de la misma categoría más de una vez por jornada
    RM.programacion.generar(fixture8y8(), CATS, CANCHAS).forEach((j, ji) => {
      const seq = j.asignaciones.map((a) => a.catId);
      const seguidos = seq.filter((c, i) => i && c === seq[i - 1]).length;
      assert.ok(seguidos <= 1, `jornada ${ji + 1}: ${seq.join(' ')}`);
    });
  });

  test('si faltan horarios, los partidos que no entran quedan en "sin horario" repartidos entre categorías', () => {
    const pocas = [{ id: 'c1', horarios: ['08:00', '09:00', '10:00'] }];
    RM.programacion.generar(fixture8y8(), CATS, pocas).forEach((j) => {
      assert.equal(j.asignaciones.length, 3);
      assert.equal(j.sinHorario.length, 5);
      const porCat = (c) => j.sinHorario.filter((x) => x.catId === c).length;
      assert.ok(Math.abs(porCat('oro') - porCat('plata')) <= 1);
    });
  });

  test('con los mismos datos siempre da la misma programación', () => {
    const a = RM.programacion.generar(fixture8y8(), CATS, CANCHAS);
    const b = RM.programacion.generar(fixture8y8(), CATS, CANCHAS);
    assert.deepEqual(a, b);
  });

  test('una categoría sin fixture se ignora', () => {
    const prog = RM.programacion.generar({ oro: armarFixture('oro', 4) }, CATS, CANCHAS);
    assert.ok(prog.every((j) => j.asignaciones.every((a) => a.catId === 'oro')));
  });
});

describe('rotación justa (programacion.equidad)', () => {
  const fx = fixture8y8();
  const eq = RM.programacion.equidad(RM.programacion.generar(fx, CATS, CANCHAS), fx);
  const equipos = Object.values(eq);

  test('cuenta un partido por jornada para cada equipo', () => {
    assert.equal(equipos.length, 16);
    equipos.forEach((s) => {
      const total = Object.values(s.hora).reduce((t, x) => t + x, 0);
      assert.equal(total, 7, `${s.catId} ${s.num}`);
    });
  });

  /*
    Hay 8 horarios y cada equipo juega 7 jornadas. Si siempre se usara el mismo orden,
    un equipo podría jugar las 7 veces a la misma hora. Con la rotación, ningún equipo
    repite la misma hora ni la cancha 2 (que solo tiene 2 de los 8 horarios) más de 3 veces.
  */
  test('ningún equipo juega más de 3 veces a la misma hora', () => {
    equipos.forEach((s) => assert.ok(Math.max(...Object.values(s.hora)) <= 3, `${s.catId} ${s.num}: ${JSON.stringify(s.hora)}`));
  });

  test('ningún equipo juega más de 3 veces en la cancha 2', () => {
    equipos.forEach((s) => assert.ok((s.cancha.c2 || 0) <= 3, `${s.catId} ${s.num}: ${JSON.stringify(s.cancha)}`));
  });

  test('todos los equipos juegan alguna vez en el primer horario y alguna vez en el último', () => {
    equipos.forEach((s) => {
      assert.ok(s.hora['07:45'] || s.hora['08:30'], `${s.catId} ${s.num} nunca juega temprano`);
      assert.ok(s.hora['11:00'] || s.hora['12:00'], `${s.catId} ${s.num} nunca juega tarde`);
    });
  });
});

describe('programacion.firma', () => {
  const fx = fixture8y8();
  const base = RM.programacion.firma(fx, CATS, CANCHAS);

  test('es igual si nada cambió', () => {
    assert.equal(RM.programacion.firma(fixture8y8(), CATS, CANCHAS), base);
  });
  test('cambia si se modifican los horarios de una cancha', () => {
    const otras = [CANCHAS[0], { id: 'c2', horarios: ['07:45'] }];
    assert.notEqual(RM.programacion.firma(fx, CATS, otras), base);
  });
  test('cambia si se vuelve a generar el fixture con otros equipos', () => {
    assert.notEqual(RM.programacion.firma({ ...fx, oro: armarFixture('oro', 6) }, CATS, CANCHAS), base);
  });
});
