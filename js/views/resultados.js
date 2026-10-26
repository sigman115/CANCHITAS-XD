/* ===================== Vista: Resultados por jornada ===================== */
(function () {
  'use strict';
  const RM = window.RM;
  const { esc, icon } = RM;

  const ui = { j: 0 };
  const estado = () => RM.store.state;

  function numJornadas() {
    const s = estado();
    return Math.max(0, ...s.campeonato.categorias.map((c) => (s.fixture[c.id] ? s.fixture[c.id].jornadas.length : 0)));
  }

  // Partidos de la jornada en el orden de la programación (si está al día) o del fixture
  function partidosDeJornada(j) {
    const s = estado();
    const prog = s.programacion;
    const progOk = prog && prog.firma === RM.programacion.firma(s.fixture, s.campeonato.categorias, s.campeonato.canchas) && prog.jornadas[j];
    if (progOk) {
      const canchas = s.campeonato.canchas;
      const lista = prog.jornadas[j].asignaciones.map((a) => ({
        catId: a.catId, p: RM.q.partido(a.catId, a.partidoId), hora: a.hora,
        cancha: (canchas.find((k) => k.id === a.canchaId) || {}).nombre || ''
      }));
      prog.jornadas[j].sinHorario.forEach((x) => lista.push({ catId: x.catId, p: RM.q.partido(x.catId, x.partidoId), hora: '', cancha: 'Sin horario' }));
      return lista.filter((x) => x.p);
    }
    const lista = [];
    s.campeonato.categorias.forEach((c) => {
      const fj = s.fixture[c.id] && s.fixture[c.id].jornadas[j];
      if (fj) fj.partidos.forEach((p) => lista.push({ catId: c.id, p, hora: '', cancha: '' }));
    });
    return lista;
  }

  function render(el) {
    const nJ = numJornadas();
    if (ui.j >= nJ) ui.j = 0;
    const head = `
      <section class="page-head">
        <div><span class="num">06 — MARCADORES</span><h2>Resultados</h2></div>
        <p>El resultado se lee desde el primer equipo: <b>2-0</b> y <b>2-1</b> gana el de arriba; <b>1-2</b> y <b>0-2</b> gana el de abajo. En un W.O. el ausente recibe 0.</p>
      </section>`;
    if (!nJ) {
      el.innerHTML = `${head}<div class="empty">Primero genera el fixture en la pestaña <a href="#/fixture">Fixture</a>.</div>`;
      return;
    }

    const fechas = RM.q.fechasJornadas();
    let total = 0, cargados = 0;
    const completas = [];
    for (let j = 0; j < nJ; j++) {
      const ps = partidosDeJornada(j);
      const c = ps.filter((x) => RM.tabla.resultadoDe(estado(), x.p)).length;
      total += ps.length; cargados += c;
      completas[j] = ps.length > 0 && c === ps.length;
    }
    const lista = partidosDeJornada(ui.j);

    el.innerHTML = `${head}
      <div class="res-top">
        <div class="seg seg-wrap" role="group" aria-label="Jornada">
          ${Array.from({ length: nJ }, (_, j) => `<button type="button" data-j="${j}" aria-pressed="${j === ui.j}">${completas[j] ? icon('check', 14) : ''}J${j + 1}</button>`).join('')}
        </div>
        <span class="count">${cargados} de ${total} partidos cargados</span>
      </div>
      <section class="card">
        <div class="list-head">
          <div><span class="kicker res-kicker">Jornada ${ui.j + 1}</span><h3>${fechas[ui.j] ? RM.fechaLarga(fechas[ui.j]) : 'Sin fecha'}</h3></div>
          <span class="count">${lista.filter((x) => RM.tabla.resultadoDe(estado(), x.p)).length} / ${lista.length}</span>
        </div>
        <ul class="res-list">${lista.map(filaHTML).join('')}</ul>
      </section>`;
    bind(el);
  }

  function filaHTML(x) {
    const cat = RM.q.categoria(x.catId);
    const res = RM.tabla.resultadoDe(estado(), x.p);
    const r = res ? res.r : '';
    const A = esc(RM.q.nombrePorNumero(x.catId, x.p.a));
    const B = esc(RM.q.nombrePorNumero(x.catId, x.p.b));
    const datos = `data-pid="${x.p.id}" data-cat="${x.catId}"`;
    const esWO = r.startsWith('wo');
    return `<li class="res-row ${res ? 'done' : ''}" style="--cat:${esc(cat ? cat.color : '#888')}">
      <div class="res-when">${x.hora ? `<b>${x.hora}</b>` : ''}<small>${esc(x.cancha)}</small></div>
      <div class="res-teams">
        <span class="cat-tag">${esc(cat ? cat.nombre : '')}</span>
        <span class="${r === 'woA' || r === 'woAB' ? 'absent' : ''}">${A}</span><i>vs</i><span class="${r === 'woB' || r === 'woAB' ? 'absent' : ''}">${B}</span>
      </div>
      <div class="res-pick" role="group" aria-label="Resultado de ${A} contra ${B}">
        ${RM.tabla.RESULTADOS.map((v) => `<button type="button" ${datos} data-r="${v}" aria-pressed="${r === v}">${v}</button>`).join('')}
      </div>
      <label class="sr-only" for="wo-${x.p.id}">W.O.</label>
      <select class="input sm res-wo ${esWO ? 'on' : ''}" id="wo-${x.p.id}" ${datos}>
        <option value="">W.O.…</option>
        <option value="woA" ${r === 'woA' ? 'selected' : ''}>No vino ${A}</option>
        <option value="woB" ${r === 'woB' ? 'selected' : ''}>No vino ${B}</option>
        <option value="woAB" ${r === 'woAB' ? 'selected' : ''}>No vino ninguno</option>
      </select>
      <button type="button" class="del" ${datos} data-r="" aria-label="Borrar resultado" ${res ? '' : 'disabled'}>${icon('trash')}</button>
    </li>`;
  }

  function guardar(catId, pid, r) {
    const p = RM.q.partido(catId, pid);
    if (!p) return;
    RM.store.commit((st) => {
      if (r) st.resultados[pid] = { catId, a: p.a, b: p.b, r };
      else delete st.resultados[pid];
    });
  }

  function bind(el) {
    RM.$('.res-top', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-j]');
      if (!b) return;
      ui.j = +b.dataset.j;
      RM.app.render();
    });
    const listaEl = RM.$('.res-list', el);
    listaEl.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-pid]');
      if (!b || b.disabled) return;
      // Tocar de nuevo el resultado marcado lo borra
      const r = b.getAttribute('aria-pressed') === 'true' ? '' : b.dataset.r;
      guardar(b.dataset.cat, b.dataset.pid, r);
    });
    listaEl.addEventListener('change', (e) => {
      const s = e.target.closest('select[data-pid]');
      if (s) guardar(s.dataset.cat, s.dataset.pid, s.value);
    });
  }

  RM.views.resultados = { render };
})();
