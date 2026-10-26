/* Fechas, textos, respaldos y consultas de datos (js/utils.js y js/store.js) */
'use strict';
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { RM } = require('./cargar');

// Vuelve al estado inicial (importar completa lo que falta con los valores por defecto)
const reiniciar = () => RM.store.importar(JSON.stringify({ campeonato: {}, jugadores: [] }));

describe('fechas', () => {
  test('parseISO acepta solo aaaa-mm-dd', () => {
    assert.equal(RM.toISO(RM.parseISO('2026-09-22')), '2026-09-22');
    ['', '22/09/2026', '2026-9-22', null].forEach((x) => assert.equal(RM.parseISO(x), null, String(x)));
  });

  test('sumarDias cruza meses y años', () => {
    assert.equal(RM.sumarDias('2026-09-29', 7), '2026-10-06');
    assert.equal(RM.sumarDias('2026-12-29', 7), '2027-01-05');
  });

  test('alinearDia busca el próximo día de juego (o el mismo día si ya coincide)', () => {
    assert.equal(RM.alinearDia('2026-09-20', 2), '2026-09-22'); // domingo → martes
    assert.equal(RM.alinearDia('2026-09-22', 2), '2026-09-22');
  });

  test('fecha larga en español', () => {
    assert.equal(RM.fechaLarga('2026-09-22'), 'Martes 22 de septiembre de 2026');
    assert.equal(RM.fechaCorta('2026-09-22'), '22 sep');
  });
});

describe('textos', () => {
  test('esc evita que un nombre se interprete como HTML', () => {
    assert.equal(RM.esc(`<b>"O'Brien" & cía</b>`), '&lt;b&gt;&quot;O&#39;Brien&quot; &amp; cía&lt;/b&gt;');
    assert.equal(RM.esc(null), '');
  });

  test('norm compara sin tildes ni mayúsculas', () => {
    assert.equal(RM.norm('  TRIVEÑO '), 'triveno');
    assert.equal(RM.norm('Álvarez'), RM.norm('alvarez'));
  });

  test('limpiar quita espacios sobrantes', () => {
    assert.equal(RM.limpiar('  Juan   Carlos  '), 'Juan Carlos');
  });
});

describe('respaldo (importar)', () => {
  beforeEach(reiniciar);

  test('rechaza un archivo que no es JSON', () => {
    assert.throws(() => RM.store.importar('esto no es json'), /no es un JSON válido/);
  });

  test('rechaza un JSON que no es un respaldo de RaquetMatch', () => {
    assert.throws(() => RM.store.importar('{"hola": 1}'), /no es un respaldo/);
  });

  test('un respaldo incompleto se completa con los valores por defecto', () => {
    RM.store.importar(JSON.stringify({ campeonato: { nombre: 'Copa' }, jugadores: [], programacion: { mal: true } }));
    const s = RM.store.state;
    assert.equal(s.campeonato.nombre, 'Copa');
    assert.equal(s.campeonato.canchas.length, 2, 'conserva las canchas por defecto');
    assert.deepEqual([s.equipos, s.fixture, s.resultados, s.desempates], [[], {}, {}, {}]);
    assert.equal(s.programacion, null, 'una programación con formato inválido se descarta');
  });
});

describe('consultas', () => {
  beforeEach(reiniciar);

  // Carga n equipos de 2 jugadores en una categoría
  function equipos(catId, n) {
    RM.store.commit((st) => {
      for (let i = 1; i <= n; i++) {
        const ids = [`${catId}${i}a`, `${catId}${i}b`];
        ids.forEach((id) => st.jugadores.push({ id, nombres: '', apellidos: id.toUpperCase(), categoria: catId }));
        st.equipos.push({ id: `${catId}-e${i}`, categoriaId: catId, jugadores: ids, numero: i });
      }
    });
  }

  test('jornadas del campeonato real: martes 22 y 29 de septiembre de 2026', () => {
    equipos('oro', 8);
    equipos('plata', 8);
    RM.store.commit((st) => { st.campeonato.fechaInicio = '2026-09-20'; st.campeonato.diaJuego = 2; });
    const f = RM.q.fechasJornadas();
    assert.equal(f.length, 7);
    assert.deepEqual(f.slice(0, 2), ['2026-09-22', '2026-09-29']);
  });

  test('cantidad de partidos y horarios por jornada', () => {
    equipos('oro', 8);
    equipos('plata', 7);
    assert.equal(RM.q.partidosJornada(), 4 + 3);
    assert.equal(RM.q.espaciosJornada(), 8);
    assert.equal(RM.q.maxJornadas(), 7);
  });

  test('apellidos repetidos llevan la inicial del nombre (J. GUTIERREZ y G. GUTIERREZ)', () => {
    RM.store.commit((st) => {
      st.jugadores.push({ id: 'j1', nombres: 'Juan', apellidos: 'Gutierrez' }, { id: 'j2', nombres: 'Gonzalo', apellidos: 'Gutiérrez' }, { id: 'j3', nombres: 'Iver', apellidos: 'Ampuero' });
    });
    assert.deepEqual(['j1', 'j2', 'j3'].map((id) => RM.q.nombreCorto(RM.q.jugador(id))), ['J. GUTIERREZ', 'G. GUTIÉRREZ', 'AMPUERO']);
  });

  test('sin equipo con ese número, el nombre es "Equipo N"', () => {
    assert.equal(RM.q.nombrePorNumero('oro', 3), 'Equipo 3');
  });

  test('quitar a un jugador de una pareja deshace el equipo y renumera los demás', () => {
    equipos('oro', 3);
    RM.store.commit((st) => RM.ops.quitarJugador(st, 'oro1a'));
    assert.deepEqual(RM.q.equiposDe('oro').map((e) => [e.id, e.numero]), [['oro-e2', 1], ['oro-e3', 2]]);
  });

  test('quitar al relevo de un trío deja el equipo con 2 jugadores', () => {
    equipos('oro', 2);
    RM.store.commit((st) => st.equipos[0].jugadores.push('relevo'));
    RM.store.commit((st) => RM.ops.quitarJugador(st, 'relevo'));
    assert.deepEqual(RM.q.equiposDe('oro').map((e) => e.jugadores.length), [2, 2]);
  });
});
