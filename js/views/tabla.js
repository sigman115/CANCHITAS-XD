/* ===================== Vista: Tabla de posiciones ===================== */
(function () {
  'use strict';
  const RM = window.RM;
  const { esc, icon } = RM;

  // Selección del formulario de desempate por categoría: { catId: { a, b } }
  const ui = { des: {} };
  const estado = () => RM.store.state;

  function render(el) {
    const s = estado();
    const cats = s.campeonato.categorias.filter((c) => s.fixture[c.id]);
    el.innerHTML = `
      <section class="page-head">
        <div><span class="num">07 — POSICIONES</span><h2>Tabla de posiciones</h2></div>
        <div class="form-actions"><button class="btn" type="button" data-act="imprimir" ${cats.length ? '' : 'disabled'}>${icon('print')} Imprimir</button></div>
      </section>
      <p class="hint page-alert">Puntos: 2-0 = 3 · 2-1 = 2 · 1-2 = 1 · 0-2 = 0 · W.O. = 0 para el ausente. Orden: puntos, desempate, diferencia de sets y sets a favor.</p>
      ${cats.length ? `<div class="fixture-list">${cats.map(categoriaHTML).join('')}</div>` : '<div class="empty">Primero genera el fixture en la pestaña <a href="#/fixture">Fixture</a>.</div>'}`;
    bind(el);
  }

  function categoriaHTML(cat) {
    const s = estado();
    const t = RM.tabla.calcular(s, cat.id);
    const nJ = s.fixture[cat.id].jornadas.length;
    const nombre = (n) => esc(RM.q.nombrePorNumero(cat.id, n));
    const pendientes = t.empates.filter((e) => !e.resuelto);

    const filas = t.lista.map((f, i) => {
      const ds = f.sf - f.sc;
      const celdas = f.fechas.map((x) => {
        if (x.estado === 'jugado') return `<td class="res ${x.texto === 'W.O.' ? 'wo' : ''}"><span>${x.texto}</span><b class="pts p${x.pts}">${x.pts}</b></td>`;
        if (x.estado === 'descansa') return '<td class="res rest">Libre</td>';
        return '<td class="res pend">·</td>';
      }).join('');
      return `<tr>
        <td class="pos">${i + 1}</td>
        <th scope="row"><b class="num-badge">${f.num}</b> ${nombre(f.num)}</th>
        <td>${f.pj}</td>${celdas}
        <td>${f.sf}-${f.sc} <small>(${ds > 0 ? '+' : ''}${ds})</small></td>
        <td class="total">${f.pts}</td>
      </tr>`;
    }).join('');

    let cierre = '';
    if (t.terminado && !pendientes.length) {
      cierre = `<p class="champion">${icon('check', 20)} Campeón de ${esc(cat.nombre)}: ${nombre(t.lista[0].num)} con ${t.lista[0].pts} puntos</p>`;
    } else if (!t.terminado) {
      cierre = `<p class="hint">Faltan ${t.total - t.jugados} de ${t.total} partidos por jugar.</p>`;
    }

    return `<section class="card cat-card" style="--cat:${esc(cat.color)}">
      <header class="cat-head">
        <div><span class="kicker">${cat.grupo ? `Serie ${esc(cat.grupo)} · ` : ''}${t.jugados}/${t.total} partidos</span><h3>Categoría ${esc(cat.nombre)}</h3></div>
      </header>
      <div class="cat-body">
        <div class="table-scroll"><table class="standings">
          <thead><tr><th>N.º</th><th>Equipo</th><th title="Partidos jugados">P.J.</th>${Array.from({ length: nJ }, (_, i) => `<th>Fecha ${i + 1}</th>`).join('')}<th>Sets</th><th>Puntos</th></tr></thead>
          <tbody>${filas}</tbody>
        </table></div>
        ${cierre}
        ${t.terminado && t.empates.length ? desempateHTML(cat, t, pendientes) : ''}
      </div>
    </section>`;
  }

  function desempateHTML(cat, t, pendientes) {
    const s = estado();
    const nombre = (n) => esc(RM.q.nombrePorNumero(cat.id, n));
    const empatados = [...new Set(t.empates.flatMap((e) => e.equipos))];
    const sel = ui.des[cat.id] || {};
    const opciones = (lado) => `<option value="">Equipo…</option>${empatados.map((n) => `<option value="${n}" ${+sel[lado] === n ? 'selected' : ''}>${n} · ${nombre(n)}</option>`).join('')}`;
    const jugados = (s.desempates[cat.id] || []).map((d) =>
      `<li><span>${nombre(d.a)} <b>${d.r}</b> ${nombre(d.b)}</span><button type="button" class="del" data-act="borrarDes" data-cat="${cat.id}" data-id="${d.id}" aria-label="Borrar desempate">${icon('trash')}</button></li>`).join('');

    return `<div class="desempate">
      ${pendientes.length
        ? `<p class="alert warn">${icon('alert')}<span>Empate en puntos: ${pendientes.map((e) => `${e.equipos.map(nombre).join(', ')} (${e.pts} pts)`).join(' · ')}. Registra el partido de desempate a 3 sets.</span></p>`
        : `<p class="alert ok">${icon('check')}<span>Empates resueltos con los partidos de desempate.</span></p>`}
      ${jugados ? `<ul class="des-list">${jugados}</ul>` : ''}
      <div class="des-form" data-cat="${cat.id}">
        <select class="input sm" data-lado="a" aria-label="Primer equipo">${opciones('a')}</select>
        <span class="vs-sep">vs</span>
        <select class="input sm" data-lado="b" aria-label="Segundo equipo">${opciones('b')}</select>
        <div class="res-pick" role="group" aria-label="Resultado del desempate">
          ${RM.tabla.RESULTADOS.map((v) => `<button type="button" data-act="desempate" data-cat="${cat.id}" data-r="${v}">${v}</button>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function bind(el) {
    el.querySelector('.page-head').addEventListener('click', (e) => {
      if (e.target.closest('[data-act="imprimir"]')) window.print();
    });
    const lista = RM.$('.fixture-list', el);
    if (!lista) return;
    lista.addEventListener('change', (e) => {
      const s = e.target.closest('select[data-lado]');
      if (!s) return;
      const cat = s.closest('.des-form').dataset.cat;
      (ui.des[cat] = ui.des[cat] || {})[s.dataset.lado] = s.value;
    });
    lista.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const cat = b.dataset.cat;
      if (b.dataset.act === 'borrarDes') {
        RM.store.commit((st) => { st.desempates[cat] = (st.desempates[cat] || []).filter((d) => d.id !== b.dataset.id); });
        return;
      }
      if (b.dataset.act === 'desempate') {
        const sel = ui.des[cat] || {};
        const a = +sel.a, bb = +sel.b;
        if (!a || !bb || a === bb) { RM.toast('Elige dos equipos distintos', true); return; }
        ui.des[cat] = {};
        RM.store.commit((st) => { (st.desempates[cat] = st.desempates[cat] || []).push({ id: RM.uid(), a, b: bb, r: b.dataset.r }); });
        RM.toast('Desempate registrado');
      }
    });
  }

  RM.views.tabla = { render };
})();
