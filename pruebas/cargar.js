/* ===================== Carga de la lógica de la app en Node ===================== */
/*
  Los archivos de js/ son scripts clásicos que cuelgan su API de window.RM.
  Aquí se hace que "window" sea el objeto global de Node y se cargan en el mismo
  orden que en index.html. Solo se cargan los módulos de lógica (sin vistas ni DOM).
*/
'use strict';
const path = require('path');

globalThis.window = globalThis;
// localStorage en memoria: el store vuelve al estado anterior si no puede guardar, así que necesita uno que funcione
const guardado = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: (k) => (guardado.has(k) ? guardado.get(k) : null), setItem: (k, v) => { guardado.set(k, String(v)); }, removeItem: (k) => { guardado.delete(k); } }
});
['utils.js', 'perfil.js', 'store.js', 'fixture.js', 'programacion.js', 'tabla.js', 'planilla.js']
  .forEach((f) => require(path.join(__dirname, '..', 'js', f)));

const RM = window.RM;

// Fixture de una categoría con la misma forma que guarda la pestaña Fixture
function armarFixture(catId, n) {
  return {
    n,
    jornadas: RM.fixture.generar(n).map((j, ji) => ({
      descansa: j.descansa,
      partidos: j.partidos.map((p, pi) => ({ id: `${catId}-J${ji + 1}-P${pi + 1}`, a: p.a, b: p.b }))
    }))
  };
}

// Estado mínimo para calcular tablas: una categoría "c" con n equipos y sin resultados
function estadoCon(n) {
  return { fixture: { c: armarFixture('c', n) }, resultados: {}, desempates: {} };
}

// Carga el resultado r del partido pi de la jornada ji (ambos desde 0)
function cargarResultado(st, ji, pi, r, catId = 'c') {
  const p = st.fixture[catId].jornadas[ji].partidos[pi];
  st.resultados[p.id] = { catId, a: p.a, b: p.b, r };
  return p;
}

module.exports = { RM, armarFixture, estadoCon, cargarResultado };
