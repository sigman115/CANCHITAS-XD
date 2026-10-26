/* ===================== Lógica de resultados y tabla de posiciones ===================== */
(function () {
  'use strict';
  const RM = window.RM;

  /*
    Resultado guardado desde el punto de vista del primer equipo (a):
    '2-0' | '2-1' | '1-2' | '0-2' | 'woA' (no vino a) | 'woB' (no vino b) | 'woAB' (no vino ninguno)
    Valor: [puntos a, puntos b, sets a, sets b]. En W.O. el ausente recibe 0 y el presente gana 2-0.
  */
  const VALOR = {
    '2-0': [3, 0, 2, 0], '2-1': [2, 1, 2, 1], '1-2': [1, 2, 1, 2], '0-2': [0, 3, 0, 2],
    woA: [0, 3, 0, 2], woB: [3, 0, 2, 0], woAB: [0, 0, 0, 0]
  };
  const RESULTADOS = ['2-0', '2-1', '1-2', '0-2'];

  const valor = (r) => VALOR[r] || null;

  // Texto del resultado visto por el equipo del lado 'a' o 'b'
  function etiqueta(r, lado) {
    if (r === 'woAB') return 'W.O.';
    if (r === 'woA') return lado === 'a' ? 'W.O.' : '2-0';
    if (r === 'woB') return lado === 'b' ? 'W.O.' : '2-0';
    return lado === 'a' ? r : r.split('-').reverse().join('-');
  }

  // Solo vale si el resultado corresponde a los mismos equipos del fixture actual
  function resultadoDe(st, p) {
    const x = st.resultados[p.id];
    return x && x.a === p.a && x.b === p.b && VALOR[x.r] ? x : null;
  }

  function calcular(st, catId) {
    const fx = st.fixture[catId];
    if (!fx) return null;
    const filas = {};
    for (let i = 1; i <= fx.n; i++) filas[i] = { num: i, pj: 0, pts: 0, sf: 0, sc: 0, fechas: [], dPts: 0, dSets: 0 };
    let total = 0, jugados = 0;

    fx.jornadas.forEach((j, ji) => {
      Object.values(filas).forEach((f) => { f.fechas[ji] = { estado: 'pendiente' }; });
      if (j.descansa !== null && filas[j.descansa]) filas[j.descansa].fechas[ji] = { estado: 'descansa' };
      j.partidos.forEach((p) => {
        total++;
        const x = resultadoDe(st, p);
        if (!x) return;
        jugados++;
        const v = valor(x.r);
        [['a', p.a, v[0], v[2], v[3]], ['b', p.b, v[1], v[3], v[2]]].forEach(([lado, num, pts, sf, sc]) => {
          const f = filas[num];
          if (!f) return;
          f.pj++; f.pts += pts; f.sf += sf; f.sc += sc;
          f.fechas[ji] = { estado: 'jugado', texto: etiqueta(x.r, lado), pts };
        });
      });
    });

    // Partidos de desempate: solo ordenan a los equipos empatados en puntos
    (st.desempates[catId] || []).forEach((d) => {
      const v = valor(d.r);
      if (!v) return;
      if (filas[d.a]) { filas[d.a].dPts += v[0]; filas[d.a].dSets += v[2] - v[3]; }
      if (filas[d.b]) { filas[d.b].dPts += v[1]; filas[d.b].dSets += v[3] - v[2]; }
    });

    const lista = Object.values(filas).sort((x, y) =>
      y.pts - x.pts || y.dPts - x.dPts || y.dSets - x.dSets ||
      (y.sf - y.sc) - (x.sf - x.sc) || y.sf - x.sf || x.num - y.num);

    const terminado = total > 0 && jugados === total;
    const empates = [];
    if (terminado) {
      const porPts = {};
      lista.forEach((f) => { (porPts[f.pts] = porPts[f.pts] || []).push(f); });
      Object.values(porPts).forEach((g) => {
        if (g.length < 2) return;
        const separados = new Set(g.map((f) => f.dPts + '|' + f.dSets)).size === g.length;
        empates.push({ pts: g[0].pts, equipos: g.map((f) => f.num), resuelto: separados });
      });
    }
    return { lista, total, jugados, terminado, empates };
  }

  RM.tabla = { calcular, valor, etiqueta, resultadoDe, RESULTADOS };
})();
