/* ===================== Vista: Campeonato (configuración) ===================== */
(function () {
  'use strict';
  const RM = window.RM;
  const { esc, icon } = RM;
  const PALETA = ['#ffd23f', '#c0c7d6', '#4cc9f0', '#ff5b2e', '#06d6a0', '#c77dff'];

  function render(el) {
    const c = RM.store.state.campeonato;
    el.innerHTML = `
      <section class="page-head">
        <div><span class="num">01 — CONFIGURACIÓN</span><h2>Campeonato</h2></div>
        <p>Datos generales, día de juego, canchas con sus horarios disponibles y categorías. Los cambios se guardan solos.</p>
      </section>
      <div class="grid-cols">
        <form class="card" id="fGeneral" novalidate>
          <h3 class="card-title">Datos generales</h3>
          <label for="cNombre">Nombre del campeonato</label>
          <input class="input" id="cNombre" name="nombre" maxlength="60" value="${esc(c.nombre)}">
          <div class="row-3">
            <div><label for="cGestion">Gestión</label><input class="input" id="cGestion" name="gestion" type="number" min="2000" max="2100" value="${c.gestion}"></div>
            <div><label for="cTemp">Temporada</label><input class="input" id="cTemp" name="temporada" type="number" min="1" value="${c.temporada}"></div>
            <div><label for="cVuelta">Vuelta</label><input class="input" id="cVuelta" name="vuelta" type="number" min="1" value="${c.vuelta}"></div>
          </div>
          <div class="row-2">
            <div><label for="cDia">Día de juego</label>
              <select class="input" id="cDia" name="diaJuego">${RM.DIAS.map((d, i) => `<option value="${i}" ${i === c.diaJuego ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
            <div><label for="cInicio">Primera jornada</label><input class="input" id="cInicio" name="fechaInicio" type="date" value="${esc(c.fechaInicio)}"></div>
          </div>
          <p class="hint" id="fechaHint"></p>
        </form>

        <section class="card">
          <h3 class="card-title">Canchas y horarios</h3>
          <p class="hint">Cada cancha tiene sus propios horarios disponibles para todo el campeonato. Cada horario es un partido.</p>
          <div id="canchasBox"></div>
          <button class="btn sm" type="button" id="addCancha">${icon('plus')} Agregar cancha</button>
        </section>

        <section class="card">
          <h3 class="card-title">Categorías</h3>
          <p class="hint">Color, nombre y grupo de cada categoría. Puedes tener las que necesites.</p>
          <div id="catsBox"></div>
          <button class="btn sm" type="button" id="addCat">${icon('plus')} Agregar categoría</button>
        </section>

        <section class="card span-all" id="resumenBox" aria-live="polite"></section>
      </div>`;
    bind(el);
    refrescar(el);
  }

  function refrescar(el) {
    const c = RM.store.state.campeonato;
    RM.$('#canchasBox', el).innerHTML = c.canchas.map((k) => `
      <div class="cancha" data-id="${k.id}">
        <div class="cancha-head">
          <input class="input sm" data-f="nombre" value="${esc(k.nombre)}" maxlength="30" aria-label="Nombre de la cancha">
          <button type="button" class="icon-btn sm" data-act="delCancha" aria-label="Eliminar ${esc(k.nombre)}" ${c.canchas.length < 2 ? 'disabled' : ''}>${icon('trash')}</button>
        </div>
        <div class="slots">${k.horarios.length
          ? k.horarios.map((h) => `<span class="slot">${h}<button type="button" data-act="delHora" data-h="${h}" aria-label="Quitar ${h}">×</button></span>`).join('')
          : '<span class="hint">Sin horarios todavía</span>'}</div>
        <div class="add-slot">
          <input type="time" class="input sm" data-f="hora" aria-label="Nuevo horario para ${esc(k.nombre)}">
          <button type="button" class="btn sm" data-act="addHora">${icon('plus')} Horario</button>
        </div>
      </div>`).join('');

    RM.$('#catsBox', el).innerHTML = c.categorias.map((k) => `
      <div class="cat-row" data-id="${k.id}">
        <input type="color" data-f="color" value="${esc(k.color)}" aria-label="Color de ${esc(k.nombre)}">
        <input class="input sm" data-f="nombre" value="${esc(k.nombre)}" maxlength="20" aria-label="Nombre de la categoría">
        <input class="input sm" data-f="grupo" value="${esc(k.grupo)}" maxlength="3" aria-label="Grupo de ${esc(k.nombre)}" placeholder="Grupo">
        <button type="button" class="del" data-act="delCat" aria-label="Eliminar categoría ${esc(k.nombre)}" ${c.categorias.length < 2 ? 'disabled' : ''}>${icon('trash')}</button>
      </div>`).join('');

    refrescarResumen(el);
  }

  function refrescarResumen(el) {
    const c = RM.store.state.campeonato;
    const hint = RM.$('#fechaHint', el);
    const primera = RM.q.primeraFecha();
    if (!c.fechaInicio) hint.textContent = 'Elige la fecha de la primera jornada.';
    else if (primera !== c.fechaInicio) hint.textContent = `Esa fecha no es ${RM.DIAS[c.diaJuego].toLowerCase()}: la primera jornada será el ${RM.fechaLarga(primera).toLowerCase()}.`;
    else hint.textContent = `Primera jornada: ${RM.fechaLarga(primera)}.`;

    const filas = c.categorias.map((k) => {
      const n = RM.q.equiposDe(k.id).length;
      return `<tr><td><span class="dot" style="--cat:${esc(k.color)}"></span>${esc(k.nombre)}</td><td>${n}</td><td>${RM.q.numJornadas(n)}</td><td>${RM.q.partidosPorJornada(n)}</td><td>${n > 1 && n % 2 ? '1 equipo' : '—'}</td></tr>`;
    }).join('');

    const total = RM.q.partidosJornada();
    const espacios = RM.q.espaciosJornada();
    let alerta;
    if (!total) alerta = `<p class="alert">${icon('users')} Arma los equipos para calcular cuántos partidos hay por jornada.</p>`;
    else if (total <= espacios) alerta = `<p class="alert ok">${icon('check')} ${total} partidos por jornada y ${espacios} horarios disponibles: alcanza${espacios > total ? ` (sobran ${espacios - total})` : ' justo'}.</p>`;
    else alerta = `<p class="alert warn">${icon('alert')} ${total} partidos por jornada pero solo ${espacios} horarios. Agrega ${total - espacios} horario(s) más en las canchas.</p>`;

    const fechas = RM.q.fechasJornadas();
    RM.$('#resumenBox', el).innerHTML = `
      <h3 class="card-title">Resumen</h3>
      <table class="mini">
        <thead><tr><th>Categoría</th><th>Equipos</th><th>Jornadas</th><th>Partidos por jornada</th><th>Descansa</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
      ${alerta}
      <h4 class="sub">Fechas de las jornadas</h4>
      ${fechas.length
        ? `<ol class="fechas">${fechas.map((f, i) => `<li><b>J${i + 1}</b>${RM.fechaLarga(f)}</li>`).join('')}</ol>`
        : `<p class="hint">${RM.q.maxJornadas() ? 'Elige la fecha de la primera jornada para ver el calendario.' : 'Se calcularán al armar los equipos.'}</p>`}`;
  }

  function bind(el) {
    const form = RM.$('#fGeneral', el);
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('change', (e) => {
      const t = e.target;
      RM.store.commit((st) => {
        const c = st.campeonato;
        if (t.name === 'nombre') c.nombre = RM.limpiar(t.value) || 'Campeonato';
        else if (t.name === 'fechaInicio') c.fechaInicio = t.value;
        else if (t.name === 'diaJuego') c.diaJuego = parseInt(t.value, 10);
        else if (['gestion', 'temporada', 'vuelta'].includes(t.name)) {
          const v = parseInt(t.value, 10);
          if (v > 0) c[t.name] = v; else t.value = c[t.name];
        }
      }, { silent: true });
      RM.app.renderMeta();
      refrescarResumen(el);
    });

    RM.$('#addCancha', el).addEventListener('click', () => {
      RM.store.commit((st) => {
        const n = st.campeonato.canchas.length + 1;
        st.campeonato.canchas.push({ id: RM.uid(), nombre: `Cancha ${n}`, horarios: [] });
      }, { silent: true });
      refrescar(el);
    });

    RM.$('#addCat', el).addEventListener('click', () => {
      RM.store.commit((st) => {
        const cats = st.campeonato.categorias;
        cats.push({ id: RM.uid(), nombre: 'Nueva', grupo: String.fromCharCode(65 + cats.length), color: PALETA[cats.length % PALETA.length] });
      }, { silent: true });
      refrescar(el);
    });

    // Canchas: clics
    RM.$('#canchasBox', el).addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const id = btn.closest('.cancha').dataset.id;
      if (btn.dataset.act === 'addHora') agregarHora(el, id);
      if (btn.dataset.act === 'delHora') {
        RM.store.commit((st) => { const k = st.campeonato.canchas.find((x) => x.id === id); k.horarios = k.horarios.filter((h) => h !== btn.dataset.h); }, { silent: true });
        refrescar(el);
      }
      if (btn.dataset.act === 'delCancha') {
        const k = RM.store.state.campeonato.canchas.find((x) => x.id === id);
        if (!confirm(`¿Eliminar ${k.nombre} y sus ${k.horarios.length} horarios?`)) return;
        RM.store.commit((st) => { st.campeonato.canchas = st.campeonato.canchas.filter((x) => x.id !== id); }, { silent: true });
        refrescar(el);
      }
    });
    RM.$('#canchasBox', el).addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.dataset.f === 'hora') { e.preventDefault(); agregarHora(el, e.target.closest('.cancha').dataset.id); }
    });
    RM.$('#canchasBox', el).addEventListener('change', (e) => {
      if (e.target.dataset.f !== 'nombre') return;
      const id = e.target.closest('.cancha').dataset.id;
      RM.store.commit((st) => { st.campeonato.canchas.find((x) => x.id === id).nombre = RM.limpiar(e.target.value) || 'Cancha'; }, { silent: true });
    });

    // Categorías
    RM.$('#catsBox', el).addEventListener('change', (e) => {
      const f = e.target.dataset.f;
      if (!f) return;
      const id = e.target.closest('.cat-row').dataset.id;
      RM.store.commit((st) => {
        const k = st.campeonato.categorias.find((x) => x.id === id);
        if (f === 'color') k.color = e.target.value;
        else if (f === 'grupo') k.grupo = RM.limpiar(e.target.value).toUpperCase();
        else k.nombre = RM.limpiar(e.target.value) || k.nombre;
      }, { silent: true });
      refrescarResumen(el);
    });
    RM.$('#catsBox', el).addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act="delCat"]');
      if (!btn) return;
      const id = btn.closest('.cat-row').dataset.id;
      const k = RM.q.categoria(id);
      if (RM.q.jugadoresDe(id).length || RM.q.equiposDe(id).length) {
        RM.toast(`${k.nombre} tiene jugadores o equipos; muévelos primero`, true);
        return;
      }
      RM.store.commit((st) => { st.campeonato.categorias = st.campeonato.categorias.filter((x) => x.id !== id); }, { silent: true });
      refrescar(el);
    });
  }

  function agregarHora(el, id) {
    const input = RM.$(`.cancha[data-id="${id}"] [data-f="hora"]`, el);
    const h = input.value;
    if (!/^\d{2}:\d{2}$/.test(h)) { RM.toast('Escribe una hora válida', true); input.focus(); return; }
    const k = RM.store.state.campeonato.canchas.find((x) => x.id === id);
    if (k.horarios.includes(h)) { RM.toast(`${h} ya está en ${k.nombre}`, true); return; }
    RM.store.commit((st) => {
      const kk = st.campeonato.canchas.find((x) => x.id === id);
      kk.horarios.push(h);
      kk.horarios.sort();
    }, { silent: true });
    refrescar(el);
    RM.$(`.cancha[data-id="${id}"] [data-f="hora"]`, el).focus();
  }

  RM.views.campeonato = { render };
})();
