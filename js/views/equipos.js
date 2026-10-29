/* ===================== Vista: Equipos por categoría ===================== */
(function () {
  'use strict';
  const RM = window.RM;
  const { esc, icon } = RM;

  // Selección en curso por categoría: { catId: [jugadorId, ...] } (el 3.º es relevo)
  const ui = { sel: {} };

  function render(el) {
    const s = RM.store.state;
    const cats = s.campeonato.categorias;
    const sinCat = s.jugadores.filter((j) => !RM.q.categoria(j.categoria)).length;
    el.innerHTML = `
      <section class="page-head">
        <div><span class="num">03 — EQUIPOS</span><h2>Equipos por categoría</h2></div>
        <p>Arma parejas (o tríos con un relevo) dentro de cada categoría. Luego sortea el número de cada equipo: ese número es su lugar en el fixture.</p>
      </section>
      ${sinCat ? `<p class="alert warn page-alert">${icon('alert')}<span>${sinCat} jugador${sinCat === 1 ? '' : 'es'} sin categoría. <a href="#/jugadores">Asígnalos en Jugadores</a> para poder usarlos aquí.</span></p>` : ''}
      <div class="cat-cols">${cats.map(categoriaHTML).join('')}</div>`;
    bind(el);
  }

  function categoriaHTML(cat) {
    const equipos = RM.q.equiposDe(cat.id);
    const libres = RM.q.jugadoresDe(cat.id)
      .filter((j) => !RM.q.equipoDeJugador(j.id))
      .sort((a, b) => RM.norm(a.apellidos).localeCompare(RM.norm(b.apellidos)));
    const sel = (ui.sel[cat.id] || []).filter((id) => libres.some((j) => j.id === id));
    ui.sel[cat.id] = sel;
    const n = equipos.length;

    return `<section class="card cat-card" style="--cat:${esc(cat.color)}">
      <header class="cat-head">
        <div><span class="kicker">${cat.grupo ? `Grupo ${esc(cat.grupo)}` : 'Categoría'}</span><h3>Categoría ${esc(cat.nombre)}</h3></div>
        <span class="count">${n} equipo${n === 1 ? '' : 's'}</span>
      </header>
      <div class="cat-body">
        <div class="mini-stats">
          <span><b>${RM.q.numJornadas(n)}</b> jornadas</span>
          <span><b>${RM.q.partidosPorJornada(n)}</b> partidos por jornada</span>
          ${n > 1 && n % 2 ? '<span><b>1</b> descansa cada jornada</span>' : ''}
        </div>
        ${n ? `<ol class="team-list">${equipos.map(equipoHTML).join('')}</ol>` : '<div class="empty">Todavía no hay equipos en esta categoría.</div>'}
        <div class="builder">
          <div class="list-head"><h4>Jugadores libres</h4><span class="count">${libres.length}</span></div>
          ${libres.length
            ? `<div class="pick">${libres.map((j) => {
                const k = sel.indexOf(j.id);
                return `<button type="button" class="pick-chip" data-act="pick" data-cat="${cat.id}" data-id="${j.id}" aria-pressed="${k >= 0}">${k >= 0 ? `<span class="pick-n">${k === 2 ? 'R' : k + 1}</span>` : ''}${esc(RM.q.nombreCorto(j))}</button>`;
              }).join('')}</div>
              <p class="hint">Elige 2 titulares y, si quieres, un 3.º como relevo (R).</p>`
            : '<p class="hint">Todos los jugadores de esta categoría ya tienen equipo.</p>'}
          <div class="form-actions">
            <button class="btn primary sm" type="button" data-act="crear" data-cat="${cat.id}" ${sel.length < 2 ? 'disabled' : ''}>${icon('plus')} Crear equipo</button>
            <button class="btn sm" type="button" data-act="azar" data-cat="${cat.id}" ${libres.length < 2 ? 'disabled' : ''}>${icon('shuffle')} Emparejar al azar</button>
            <button class="btn hot sm" type="button" data-act="sortear" data-cat="${cat.id}" ${n < 2 ? 'disabled' : ''}>${icon('hash')} Sortear números</button>
          </div>
        </div>
      </div>
    </section>`;
  }

  function equipoHTML(e) {
    const js = e.jugadores.map(RM.q.jugador).filter(Boolean);
    const nombre = esc(RM.q.nombreEquipo(e));
    return `<li class="team-row">
      <span class="team-num" aria-label="Número ${e.numero}">${e.numero}</span>
      <div class="team-info">
        <strong>${nombre}</strong>
        <small>${js.map((j, i) => RM.perfil.avatarHTML(j, RM.q.categoria(e.categoriaId), 'sm') + esc(RM.q.nombreCompleto(j)) + (i === 2 ? ' <em>relevo</em>' : '')).join(' · ')}</small>
      </div>
      <button class="del" type="button" data-act="delTeam" data-id="${e.id}" aria-label="Deshacer el equipo ${nombre}">${icon('trash')}</button>
    </li>`;
  }

  function bind(el) {
    // Se escucha en .cat-cols (se recrea en cada render) y no en <main>, para no acumular manejadores
    RM.$('.cat-cols', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      const cat = b.dataset.cat;
      const acciones = { pick, crear, azar, sortear, delTeam };
      const fn = acciones[b.dataset.act];
      if (fn) fn(cat, b.dataset.id);
    });
  }

  function pick(cat, id) {
    const sel = ui.sel[cat] || (ui.sel[cat] = []);
    const k = sel.indexOf(id);
    if (k >= 0) sel.splice(k, 1);
    else if (sel.length >= 3) { RM.toast('Máximo 3: dos titulares y un relevo', true); return; }
    else sel.push(id);
    RM.app.render();
  }

  function crear(cat) {
    const ids = [...(ui.sel[cat] || [])];
    if (ids.length < 2) return;
    ui.sel[cat] = [];
    RM.store.commit((st) => {
      const max = Math.max(0, ...st.equipos.filter((e) => e.categoriaId === cat).map((e) => e.numero));
      st.equipos.push({ id: RM.uid(), categoriaId: cat, jugadores: ids, numero: max + 1 });
    });
    RM.toast('Equipo creado');
  }

  function azar(cat) {
    const libres = RM.shuffle(RM.q.jugadoresDe(cat).filter((j) => !RM.q.equipoDeJugador(j.id)).map((j) => j.id));
    const sobra = libres.length % 2 ? RM.q.jugador(libres[libres.length - 1]) : null;
    ui.sel[cat] = [];
    RM.store.commit((st) => {
      let max = Math.max(0, ...st.equipos.filter((e) => e.categoriaId === cat).map((e) => e.numero));
      for (let i = 0; i + 1 < libres.length; i += 2) {
        st.equipos.push({ id: RM.uid(), categoriaId: cat, jugadores: [libres[i], libres[i + 1]], numero: ++max });
      }
    });
    RM.toast(sobra ? `Parejas armadas. ${RM.q.nombreCorto(sobra)} quedó libre (número impar)` : 'Parejas armadas al azar', !!sobra);
  }

  function sortear(cat) {
    const c = RM.q.categoria(cat);
    if (!confirm(`Se sortearán de nuevo los números de los equipos de ${c.nombre}. ¿Continuar?`)) return;
    RM.store.commit((st) => {
      const eqs = st.equipos.filter((e) => e.categoriaId === cat);
      const nums = RM.shuffle(eqs.map((_, i) => i + 1));
      eqs.forEach((e, i) => { e.numero = nums[i]; });
    });
    RM.toast(`Números sorteados en ${c.nombre}`);
  }

  function delTeam(cat, id) {
    const eq = RM.store.state.equipos.find((e) => e.id === id);
    if (!eq || !confirm(`¿Deshacer el equipo ${RM.q.nombreEquipo(eq)}? Sus jugadores quedarán libres.`)) return;
    RM.store.commit((st) => {
      st.equipos = st.equipos.filter((e) => e.id !== id);
      RM.ops.renumerar(st, eq.categoriaId);
    });
    RM.toast('Equipo deshecho');
  }

  RM.views.equipos = { render };
})();
