/* ===================== Vista: Fixture todos contra todos ===================== */
(function () {
  'use strict';
  const RM = window.RM;
  const { esc, icon } = RM;

  // Cómo se muestran los partidos: por número de sorteo o con los nombres de los equipos
  const ui = { modo: 'nombres' };

  function render(el) {
    const cats = RM.store.state.campeonato.categorias;
    const hayEquipos = cats.some((c) => RM.q.equiposDe(c.id).length >= 2);
    el.innerHTML = `
      <section class="page-head">
        <div><span class="num">04 — SORTEO</span><h2>Fixture</h2></div>
        <div class="form-actions">
          <div class="seg" role="group" aria-label="Mostrar partidos">
            <button type="button" data-modo="numeros" aria-pressed="${ui.modo === 'numeros'}">Números</button>
            <button type="button" data-modo="nombres" aria-pressed="${ui.modo === 'nombres'}">Nombres</button>
          </div>
          <button class="btn primary" type="button" data-act="todos" ${hayEquipos ? '' : 'disabled'}>${icon('bolt')} Generar todos</button>
          <button class="btn" type="button" data-act="imprimir">${icon('print')} Imprimir</button>
        </div>
      </section>
      <p class="hint page-alert">Cada equipo juega una vez contra todos los de su categoría. Los nombres salen del número sorteado en <a href="#/equipos">Equipos</a>: si vuelves a sortear, el fixture se actualiza solo.</p>
      <div class="fixture-list">${cats.map(categoriaHTML).join('')}</div>`;
    bind(el);
  }

  function categoriaHTML(cat) {
    const n = RM.q.equiposDe(cat.id).length;
    const fx = RM.store.state.fixture[cat.id];
    let cuerpo;
    if (n < 2) {
      cuerpo = `<div class="empty">Se necesitan al menos 2 equipos. <a href="#/equipos">Armar equipos</a></div>`;
    } else if (!fx) {
      cuerpo = `<div class="empty">Todavía no se generó el fixture de esta categoría.</div>`;
    } else {
      const desactualizado = fx.n !== n
        ? `<p class="alert warn">${icon('alert')}<span>El fixture se generó con ${fx.n} equipos y ahora hay ${n}. Vuelve a generarlo.</span></p>` : '';
      const ok = RM.fixture.validar(fx.jornadas, fx.n);
      const total = fx.jornadas.reduce((t, j) => t + j.partidos.length, 0);
      cuerpo = `${desactualizado}
        <p class="alert ${ok ? 'ok' : 'warn'}">${icon(ok ? 'check' : 'alert')}<span>${ok
          ? `${total} partidos en ${fx.jornadas.length} jornadas: cada equipo enfrenta una sola vez a cada rival.`
          : 'El fixture guardado tiene partidos repetidos. Vuelve a generarlo.'}</span></p>
        <div class="table-scroll">${tablaHTML(cat, fx)}</div>`;
    }
    return `<section class="card cat-card" style="--cat:${esc(cat.color)}">
      <header class="cat-head">
        <div><span class="kicker">${cat.grupo ? `Grupo ${esc(cat.grupo)} · ` : ''}${n} equipos</span><h3>Categoría ${esc(cat.nombre)}</h3></div>
        <button class="btn sm" type="button" data-act="generar" data-cat="${cat.id}" ${n < 2 ? 'disabled' : ''}>${icon(fx ? 'refresh' : 'bolt')} ${fx ? 'Volver a generar' : 'Generar'}</button>
      </header>
      <div class="cat-body">${cuerpo}</div>
    </section>`;
  }

  function tablaHTML(cat, fx) {
    const fechas = RM.q.fechasJornadas();
    const filas = Math.max(...fx.jornadas.map((j) => j.partidos.length));
    const hayDescanso = fx.jornadas.some((j) => j.descansa !== null);
    const cab = fx.jornadas.map((_, i) =>
      `<th scope="col">Jornada ${i + 1}${fechas[i] ? `<small>${RM.fechaCorta(fechas[i])}</small>` : ''}</th>`).join('');
    let cuerpo = '';
    for (let k = 0; k < filas; k++) {
      cuerpo += `<tr><th scope="row">Partido ${k + 1}</th>${fx.jornadas.map((j) => `<td>${celda(cat, j.partidos[k])}</td>`).join('')}</tr>`;
    }
    if (hayDescanso) {
      cuerpo += `<tr class="rest"><th scope="row">Descansa</th>${fx.jornadas.map((j) => `<td>${j.descansa !== null ? equipo(cat, j.descansa) : '—'}</td>`).join('')}</tr>`;
    }
    return `<table class="fixture ${ui.modo}"><thead><tr><th scope="col">Partidos</th>${cab}</tr></thead><tbody>${cuerpo}</tbody></table>`;
  }

  function equipo(cat, num) {
    if (ui.modo === 'numeros') return `<b class="num-badge">${num}</b>`;
    const e = RM.q.equipoPorNumero(cat.id, num);
    return e ? `<span class="team-name"><b class="num-badge">${num}</b>${esc(RM.q.nombreEquipo(e))}</span>` : `<span class="team-name missing"><b class="num-badge">${num}</b>Sin equipo</span>`;
  }

  function celda(cat, p) {
    if (!p) return '—';
    return `<span class="vs">${equipo(cat, p.a)}<i>vs</i>${equipo(cat, p.b)}</span>`;
  }

  const tieneResultados = (catId) => Object.values(RM.store.state.resultados).some((r) => r.catId === catId);

  function generar(st, catId) {
    // Un fixture nuevo invalida los resultados y desempates de esa categoría
    Object.keys(st.resultados).forEach((k) => { if (st.resultados[k].catId === catId) delete st.resultados[k]; });
    delete st.desempates[catId];
    const n = st.equipos.filter((e) => e.categoriaId === catId).length;
    if (n < 2) { delete st.fixture[catId]; return; }
    st.fixture[catId] = {
      n,
      generado: RM.toISO(new Date()),
      jornadas: RM.fixture.generar(n).map((j, ji) => ({
        descansa: j.descansa,
        partidos: j.partidos.map((p, pi) => ({ id: `${catId}-J${ji + 1}-P${pi + 1}`, a: p.a, b: p.b }))
      }))
    };
  }

  function bind(el) {
    RM.$('.page-head', el).addEventListener('click', (e) => {
      const m = e.target.closest('[data-modo]');
      if (m) { ui.modo = m.dataset.modo; RM.app.render(); return; }
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      if (b.dataset.act === 'imprimir') { window.print(); return; }
      if (b.dataset.act === 'todos') {
        const fx = RM.store.state.fixture;
        const conRes = RM.store.state.campeonato.categorias.some((c) => tieneResultados(c.id));
        if (Object.keys(fx).length && !confirm(`Se generará de nuevo el fixture de todas las categorías.${conRes ? '\nSE BORRARÁN LOS RESULTADOS YA CARGADOS.' : ''} ¿Continuar?`)) return;
        RM.store.commit((st) => st.campeonato.categorias.forEach((c) => generar(st, c.id)));
        RM.toast('Fixture generado');
      }
    });
    RM.$('.fixture-list', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-act="generar"]');
      if (!b || b.disabled) return;
      const cat = RM.q.categoria(b.dataset.cat);
      if (RM.store.state.fixture[cat.id] && !confirm(`Se generará de nuevo el fixture de ${cat.nombre}.${tieneResultados(cat.id) ? '\nSE BORRARÁN SUS RESULTADOS YA CARGADOS.' : ''} ¿Continuar?`)) return;
      RM.store.commit((st) => generar(st, cat.id));
      RM.toast(`Fixture de ${cat.nombre} generado`);
    });
  }

  RM.views.fixture = { render };
})();
