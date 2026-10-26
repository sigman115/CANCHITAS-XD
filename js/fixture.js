/* ===================== Lógica del fixture "todos contra todos" ===================== */
/*
  Método circular (tablas de Berger): el equipo 1 queda fijo y los demás rotan una
  posición por jornada. Jornada 1 con 8 equipos: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5.
  Con número impar se agrega un "fantasma": quien juega contra él, descansa.
*/
(function () {
  'use strict';
  const RM = window.RM;

  function generar(n) {
    if (n < 2) return [];
    const pos = Array.from({ length: n }, (_, i) => i + 1);
    if (n % 2) pos.push(null);
    const m = pos.length;
    let arr = pos;
    const jornadas = [];
    for (let r = 0; r < m - 1; r++) {
      const partidos = [];
      let descansa = null;
      for (let i = 0; i < m / 2; i++) {
        let a = arr[i], b = arr[m - 1 - i];
        if (i === 0 && r % 2 === 1) [a, b] = [b, a]; // alterna el lado del equipo fijo
        if (a === null || b === null) descansa = a === null ? b : a;
        else partidos.push({ a, b });
      }
      jornadas.push({ partidos, descansa });
      arr = [arr[0], arr[m - 1], ...arr.slice(1, m - 1)];
    }
    return jornadas;
  }

  // Comprueba que cada par se enfrente una sola vez y que nadie juegue dos veces en una jornada
  function validar(jornadas, n) {
    const vistos = new Set();
    for (const j of jornadas) {
      const enJornada = new Set();
      for (const p of j.partidos) {
        const clave = Math.min(p.a, p.b) + '-' + Math.max(p.a, p.b);
        if (vistos.has(clave) || enJornada.has(p.a) || enJornada.has(p.b)) return false;
        vistos.add(clave);
        enJornada.add(p.a);
        enJornada.add(p.b);
      }
    }
    return vistos.size === (n * (n - 1)) / 2;
  }

  RM.fixture = { generar, validar };
})();
