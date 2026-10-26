/* ===================== Vista: Jugadores (registro) ===================== */
(function () {
  'use strict';
  const RM = window.RM;
  const { esc, icon } = RM;

  // Estado de la interfaz (no se guarda)
  const ui = { editId: null, busqueda: '', filtro: 'todas', ultimaCat: '', enfocar: false };

  const iniciales = (j) => {
    const a = (j.apellidos || '').replace(/^[A-Z]\./i, '');
    return ((j.nombres || '')[0] || '') + (a[0] || '') || '?';
  };

  function render(el) {
    const s = RM.store.state;
    const cats = s.campeonato.categorias;
    const ed = ui.editId ? RM.q.jugador(ui.editId) : null;
    if (!ed) ui.editId = null;
    const v = ed || { nombres: '', apellidos: '', ci: '', celular: '', categoria: ui.ultimaCat };
    const catSel = RM.q.categoria(v.categoria) ? v.categoria : '';

    el.innerHTML = `
      <section class="page-head">
        <div><span class="num">02 — REGISTRO</span><h2>Jugadores</h2></div>
        <div class="form-actions"><button class="btn" type="button" id="demoBtn">Cargar demo</button></div>
      </section>
      <div class="grid-2">
        <form class="card" id="fJug" novalidate>
          <h3 class="card-title">${ed ? 'Editar jugador' : 'Nuevo jugador'}</h3>
          <div class="row-2">
            <div><label for="jNom">Nombres</label><input class="input" id="jNom" name="nombres" maxlength="40" autocomplete="off" value="${esc(v.nombres)}"></div>
            <div><label for="jApe">Apellidos *</label><input class="input" id="jApe" name="apellidos" maxlength="40" autocomplete="off" required value="${esc(v.apellidos)}"></div>
          </div>
          <div class="row-2">
            <div><label for="jCi">C.I.</label><input class="input" id="jCi" name="ci" maxlength="20" autocomplete="off" value="${esc(v.ci)}"></div>
            <div><label for="jCel">Celular</label><input class="input" id="jCel" name="celular" type="tel" maxlength="20" autocomplete="off" value="${esc(v.celular)}"></div>
          </div>
          <fieldset class="fs">
            <legend>Categoría (la asigna el organizador)</legend>
            <div class="choice">
              <input type="radio" name="cat" id="cat-none" value="" ${catSel === '' ? 'checked' : ''}><label for="cat-none">Sin asignar</label>
              ${cats.map((c) => `<input type="radio" name="cat" id="cat-${c.id}" value="${c.id}" ${catSel === c.id ? 'checked' : ''}><label for="cat-${c.id}" style="--cat:${esc(c.color)}">${esc(c.nombre)}</label>`).join('')}
            </div>
          </fieldset>
          <p class="error" id="jErr" role="alert"></p>
          <div class="form-actions">
            <button class="btn primary" type="submit">${ed ? `${icon('check')} Guardar cambios` : `${icon('plus')} Agregar`}</button>
            ${ed ? '<button class="btn" type="button" id="cancelEdit">Cancelar</button>' : ''}
          </div>
        </form>
        <div class="card">
          <div class="list-head"><h3>Plantel inscrito</h3><span class="count" id="jCount"></span></div>
          <div class="list-tools">
            <label for="jBuscar" class="sr-only">Buscar jugador</label>
            <input class="input" type="search" id="jBuscar" placeholder="Buscar por nombre o C.I." value="${esc(ui.busqueda)}">
            <div class="filters" id="jFiltros"></div>
          </div>
          <ul class="players" id="jLista"></ul>
        </div>
      </div>`;

    renderLista(el);
    bind(el);
    if (ui.enfocar) { RM.$('#jNom', el).focus(); ui.enfocar = false; }
    if (ed) RM.$('#jApe', el).focus();
  }

  function renderLista(el) {
    const s = RM.store.state;
    const cats = s.campeonato.categorias;
    const sinCat = (j) => !RM.q.categoria(j.categoria);
    const total = s.jugadores.length;
    RM.$('#jCount', el).textContent = `${total} jugador${total === 1 ? '' : 'es'}`;

    const filtros = [['todas', 'Todas', total]]
      .concat(cats.map((c) => [c.id, c.nombre, RM.q.jugadoresDe(c.id).length]))
      .concat([['sin', 'Sin categoría', s.jugadores.filter(sinCat).length]]);
    RM.$('#jFiltros', el).innerHTML = filtros.map(([id, nom, n]) =>
      `<button type="button" class="filter" data-filtro="${id}" aria-pressed="${ui.filtro === id}">${esc(nom)} · ${n}</button>`).join('');

    const q = RM.norm(ui.busqueda);
    const lista = s.jugadores
      .filter((j) => ui.filtro === 'todas' || (ui.filtro === 'sin' ? sinCat(j) : j.categoria === ui.filtro))
      .filter((j) => !q || RM.norm(`${j.apellidos} ${j.nombres} ${j.ci}`).includes(q))
      .sort((a, b) => RM.norm(a.apellidos).localeCompare(RM.norm(b.apellidos)));

    const ul = RM.$('#jLista', el);
    if (!total) { ul.innerHTML = '<li class="empty" style="grid-column:1/-1">Aún no hay jugadores. ¡Inscribe al primero o carga la demo!</li>'; return; }
    if (!lista.length) { ul.innerHTML = '<li class="empty" style="grid-column:1/-1">Ningún jugador coincide con la búsqueda.</li>'; return; }

    ul.innerHTML = lista.map((j) => {
      const cat = RM.q.categoria(j.categoria);
      const eq = RM.q.equipoDeJugador(j.id);
      const nom = esc(RM.q.nombreCompleto(j));
      return `<li class="player" ${cat ? `style="--cat:${esc(cat.color)}"` : ''}>
        <span class="avatar ${cat ? '' : 'nocat'}">${esc(iniciales(j).toUpperCase())}</span>
        <div class="info">
          <div class="name" title="${nom}">${nom}</div>
          <div class="meta">
            ${cat ? `<span class="badge">${esc(cat.nombre)}</span>` : '<span class="badge ghost">Sin categoría</span>'}
            ${eq ? `<span class="badge ghost">Equipo ${eq.numero}${eq.jugadores.indexOf(j.id) === 2 ? ' · relevo' : ''}</span>` : ''}
            ${j.ci ? `<span>C.I. ${esc(j.ci)}</span>` : ''}
          </div>
        </div>
        <button class="del" type="button" data-act="edit" data-id="${j.id}" aria-label="Editar a ${nom}">${icon('edit')}</button>
        <button class="del" type="button" data-act="del" data-id="${j.id}" aria-label="Eliminar a ${nom}">${icon('trash')}</button>
      </li>`;
    }).join('');
  }

  function bind(el) {
    const form = RM.$('#fJug', el);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      guardar(el, new FormData(form));
    });
    const cancel = RM.$('#cancelEdit', el);
    if (cancel) cancel.addEventListener('click', () => { ui.editId = null; RM.app.render(); });

    RM.$('#jBuscar', el).addEventListener('input', (e) => { ui.busqueda = e.target.value; renderLista(el); });
    RM.$('#jFiltros', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-filtro]');
      if (!b) return;
      ui.filtro = b.dataset.filtro;
      renderLista(el);
    });

    RM.$('#jLista', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const j = RM.q.jugador(b.dataset.id);
      if (!j) return;
      if (b.dataset.act === 'edit') { ui.editId = j.id; RM.app.render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      const eq = RM.q.equipoDeJugador(j.id);
      const extra = eq ? `\nTambién saldrá del equipo ${RM.q.nombreEquipo(eq)}.` : '';
      if (!confirm(`¿Eliminar a ${RM.q.nombreCompleto(j)}?${extra}`)) return;
      if (ui.editId === j.id) ui.editId = null;
      RM.store.commit((st) => {
        RM.ops.quitarJugador(st, j.id);
        st.jugadores = st.jugadores.filter((x) => x.id !== j.id);
      });
      RM.toast('Jugador eliminado');
    });

    RM.$('#demoBtn', el).addEventListener('click', cargarDemo);
  }

  function guardar(el, fd) {
    const s = RM.store.state;
    const err = RM.$('#jErr', el);
    const d = {
      nombres: RM.limpiar(fd.get('nombres')),
      apellidos: RM.limpiar(fd.get('apellidos')).toUpperCase(),
      ci: RM.limpiar(fd.get('ci')),
      celular: RM.limpiar(fd.get('celular')),
      categoria: fd.get('cat') || ''
    };
    if (d.apellidos.length < 2) { err.textContent = 'Escribe al menos el apellido (2 letras o más).'; RM.$('#jApe', el).focus(); return; }
    const otros = s.jugadores.filter((j) => j.id !== ui.editId);
    if (d.ci && otros.some((j) => j.ci === d.ci)) { err.textContent = 'Ya hay un jugador con ese C.I.'; RM.$('#jCi', el).focus(); return; }
    if (otros.some((j) => RM.norm(j.apellidos + j.nombres) === RM.norm(d.apellidos + d.nombres))) { err.textContent = 'Ya hay un jugador con ese nombre.'; return; }

    if (ui.editId) {
      const id = ui.editId;
      const eq = RM.q.equipoDeJugador(id);
      const cambiaCat = eq && eq.categoriaId !== d.categoria;
      if (cambiaCat && !confirm(`Está en el equipo ${RM.q.nombreEquipo(eq)}. Si cambias su categoría saldrá de ese equipo. ¿Continuar?`)) return;
      ui.editId = null;
      RM.store.commit((st) => {
        if (cambiaCat) RM.ops.quitarJugador(st, id);
        Object.assign(st.jugadores.find((j) => j.id === id), d);
      });
      RM.toast('Datos actualizados');
    } else {
      ui.ultimaCat = d.categoria;
      ui.enfocar = true;
      RM.store.commit((st) => st.jugadores.push({ id: RM.uid(), ...d }));
      RM.toast(`${RM.q.nombreCompleto(d)} inscrito`);
    }
  }

  function cargarDemo() {
    ui.filtro = 'todas';
    ui.busqueda = '';
    RM.demo.cargar();
  }

  RM.views.jugadores = { render };
})();
