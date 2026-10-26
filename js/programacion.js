/* ===================== Lógica de programación (horarios y canchas) ===================== */
/*
  Por cada jornada:
  1. Se ordenan los horarios disponibles (hora y luego cancha) y se usan los primeros:
     así los horarios libres quedan al final del día.
  2. Se decide qué categoría va en cada horario intercalándolas de forma pareja.
  3. Dentro de cada categoría se asigna cada partido a un horario buscando el menor "costo":
     se penaliza repetir la misma hora o la misma cancha y se compensa a quien jugó
     temprano (o tarde) en jornadas anteriores. Se mejora con intercambios entre partidos.
*/
(function () {
  'use strict';
  const RM = window.RM;
  const PESO = { hora: 3, cancha: 1.5, equilibrio: 4, intercalado: 2 };

  function horariosOrdenados(canchas) {
    const s = [];
    canchas.forEach((k, ci) => k.horarios.forEach((h) => s.push({ hora: h, canchaId: k.id, ci })));
    return s.sort((x, y) => x.hora.localeCompare(y.hora) || x.ci - y.ci);
  }

  /*
    Patrones posibles de categorías para los horarios usados. Se permiten los que están
    intercalados al máximo y, como mucho, con un par seguido extra: así hay variedad
    para que ninguna categoría quede siempre en la misma cancha u hora.
  */
  function patrones(grupos, total) {
    const cuenta = {};
    grupos.forEach((g) => { cuenta[g.catId] = g.partidos.length; });
    const mayor = Math.max(0, ...Object.values(cuenta));
    const minimo = Math.max(0, 2 * mayor - total - 1);
    const tope = minimo + 1;
    const res = [];
    const seq = [];
    (function rec(adj) {
      if (res.length >= 3000) return;
      if (seq.length === total) { res.push({ seq: [...seq], extra: adj - minimo }); return; }
      for (const id of Object.keys(cuenta)) {
        if (!cuenta[id]) continue;
        const a = adj + (seq.length && seq[seq.length - 1] === id ? 1 : 0);
        if (a > tope) continue;
        cuenta[id]--; seq.push(id);
        rec(a);
        seq.pop(); cuenta[id]++;
      }
    })(0);
    return res;
  }

  function nuevoRegistro() { return { hora: {}, cancha: {}, sumaT: 0, n: 0 }; }

  function costo(stats, catId, partido, slot, t) {
    let c = 0;
    [partido.a, partido.b].forEach((num) => {
      const s = stats[catId + ':' + num];
      if (!s) return;
      c += PESO.hora * (s.hora[slot.hora] || 0);
      c += PESO.cancha * (s.cancha[slot.canchaId] || 0);
      if (s.n) c += PESO.equilibrio * (0.5 - s.sumaT / s.n) * (0.5 - t);
    });
    return c;
  }

  // Asigna partidos a horarios minimizando el costo total (voraz + intercambios)
  function asignar(stats, catId, partidos, slots, tDe) {
    const asig = new Array(partidos.length).fill(-1);
    const libres = slots.map((_, i) => i);
    partidos.forEach((p, i) => {
      let mejor = 0, mejorC = Infinity;
      libres.forEach((si, li) => {
        const c = costo(stats, catId, p, slots[si], tDe(slots[si]));
        if (c < mejorC) { mejorC = c; mejor = li; }
      });
      asig[i] = libres.splice(mejor, 1)[0];
    });
    const c = (i, si) => costo(stats, catId, partidos[i], slots[si], tDe(slots[si]));
    let mejoro = true, vueltas = 0;
    while (mejoro && vueltas++ < 100) {
      mejoro = false;
      for (let i = 0; i < partidos.length; i++) {
        for (let k = i + 1; k < partidos.length; k++) {
          const antes = c(i, asig[i]) + c(k, asig[k]);
          const despues = c(i, asig[k]) + c(k, asig[i]);
          if (despues < antes - 1e-9) { [asig[i], asig[k]] = [asig[k], asig[i]]; mejoro = true; }
        }
      }
    }
    return asig;
  }

  /*
    fixture: { catId: { jornadas: [{ partidos: [{ id, a, b }] }] } }
    categorias: [{ id }] (orden de intercalado), canchas: [{ id, horarios }]
    Devuelve: [{ asignaciones: [{ hora, canchaId, catId, partidoId }], sinHorario: [{ catId, partidoId }] }]
  */
  function generar(fixture, categorias, canchas) {
    const slotsDia = horariosOrdenados(canchas);
    const horas = [...new Set(slotsDia.map((s) => s.hora))];
    const tDe = (slot) => (horas.length > 1 ? horas.indexOf(slot.hora) / (horas.length - 1) : 0.5);
    const cats = categorias.filter((c) => fixture[c.id]);
    const nJ = Math.max(0, ...cats.map((c) => fixture[c.id].jornadas.length));
    const stats = {};
    const resultado = [];

    for (let j = 0; j < nJ; j++) {
      const grupos = cats
        .map((c) => ({ catId: c.id, partidos: (fixture[c.id].jornadas[j] || { partidos: [] }).partidos }))
        .filter((g) => g.partidos.length);
      const total = grupos.reduce((t, g) => t + g.partidos.length, 0);
      const usados = slotsDia.slice(0, total);
      const jornada = { asignaciones: [], sinHorario: [] };

      // Si no alcanzan los horarios, los últimos partidos de cada categoría quedan sin horario
      const caben = {};
      grupos.forEach((g) => { caben[g.catId] = g.partidos; });
      let sobran = total - usados.length;
      while (sobran > 0) {
        const g = grupos.reduce((m, x) => (caben[x.catId].length > caben[m.catId].length ? x : m));
        const p = caben[g.catId][caben[g.catId].length - 1];
        jornada.sinHorario.push({ catId: g.catId, partidoId: p.id });
        caben[g.catId] = caben[g.catId].slice(0, -1);
        sobran--;
      }
      const gruposUsados = grupos.map((g) => ({ catId: g.catId, partidos: caben[g.catId] }));

      // Se prueba cada patrón de intercalado y se queda el de menor costo total
      let mejor = null;
      patrones(gruposUsados, usados.length).forEach((pat) => {
        let total = PESO.intercalado * pat.extra;
        const plan = gruposUsados.map((g) => {
          const misSlots = usados.filter((_, i) => pat.seq[i] === g.catId);
          const asig = asignar(stats, g.catId, g.partidos, misSlots, tDe);
          asig.forEach((si, i) => { total += costo(stats, g.catId, g.partidos[i], misSlots[si], tDe(misSlots[si])); });
          return { g, misSlots, asig };
        });
        if (!mejor || total < mejor.total - 1e-9) mejor = { total, plan };
      });

      (mejor ? mejor.plan : []).forEach(({ g, misSlots, asig }) => {
        g.partidos.forEach((p, i) => {
          const slot = misSlots[asig[i]];
          jornada.asignaciones.push({ hora: slot.hora, canchaId: slot.canchaId, catId: g.catId, partidoId: p.id });
          [p.a, p.b].forEach((num) => {
            const key = g.catId + ':' + num;
            const s = stats[key] || (stats[key] = nuevoRegistro());
            s.hora[slot.hora] = (s.hora[slot.hora] || 0) + 1;
            s.cancha[slot.canchaId] = (s.cancha[slot.canchaId] || 0) + 1;
            s.sumaT += tDe(slot);
            s.n++;
          });
        });
      });
      jornada.asignaciones.sort((x, y) => x.hora.localeCompare(y.hora) || canchas.findIndex((k) => k.id === x.canchaId) - canchas.findIndex((k) => k.id === y.canchaId));
      resultado.push(jornada);
    }
    return resultado;
  }

  // Cuántas veces jugó cada equipo en cada hora y cancha, según la programación
  function equidad(programa, fixture) {
    const porEquipo = {};
    const buscar = (catId, pid) => {
      for (const j of fixture[catId].jornadas) { const p = j.partidos.find((x) => x.id === pid); if (p) return p; }
      return null;
    };
    programa.forEach((j) => j.asignaciones.forEach((a) => {
      if (!fixture[a.catId]) return;
      const p = buscar(a.catId, a.partidoId);
      if (!p) return;
      [p.a, p.b].forEach((num) => {
        const key = a.catId + ':' + num;
        const s = porEquipo[key] || (porEquipo[key] = { catId: a.catId, num, hora: {}, cancha: {} });
        s.hora[a.hora] = (s.hora[a.hora] || 0) + 1;
        s.cancha[a.canchaId] = (s.cancha[a.canchaId] || 0) + 1;
      });
    }));
    return porEquipo;
  }

  // Firma para saber si el fixture o las canchas cambiaron después de programar
  function firma(fixture, categorias, canchas) {
    return JSON.stringify({
      f: categorias.map((c) => fixture[c.id] ? fixture[c.id].jornadas.map((j) => j.partidos.map((p) => p.id + p.a + '-' + p.b)) : null),
      k: canchas.map((k) => [k.id, k.horarios])
    });
  }

  RM.programacion = { generar, equidad, firma, horariosOrdenados };
})();
