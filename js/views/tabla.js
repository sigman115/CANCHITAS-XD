/* ===================== Vista: Tabla de posiciones ===================== */
(function () {
  'use strict';
  const RM = window.RM;
  const { esc, icon } = RM;

  // Selección del formulario de desempate por categoría: { catId: { a, b } }
  const ui = { des: {} };
  const estado = () => RM.store.state;

  // Gráficos de evolución activos (Chart.js); se destruyen antes de volver a dibujar
  let graficos = [];
  const hayChart = () => typeof window.Chart === 'function';
  if (hayChart()) window.Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

  function render(el) {
    graficos.forEach((g) => g.destroy());
    graficos = [];
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
    el.querySelectorAll('canvas[data-evo]').forEach((c) => graficos.push(grafico(c)));
  }

  function categoriaHTML(cat) {
    const s = estado();
    const t = RM.tabla.calcular(s, cat.id);
    const nJ = s.fixture[cat.id].jornadas.length;
    const nombre = (n) => esc(RM.q.nombrePorNumero(cat.id, n));
    // Avatares pequeños de la pareja (o trío); si el equipo ya no existe no se muestra nada
    const avatares = (n) => {
      const e = RM.q.equipoPorNumero(cat.id, n);
      return e ? `<span class="avatares">${e.jugadores.map(RM.q.jugador).filter(Boolean).map((j) => RM.perfil.avatarHTML(j, cat, 'sm')).join('')}</span> ` : '';
    };
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
        <th scope="row"><b class="num-badge">${f.num}</b> ${avatares(f.num)}${nombre(f.num)}</th>
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
        ${t.jugados && hayChart() ? evolucionHTML(cat) : ''}
        ${t.terminado && t.empates.length ? desempateHTML(cat, t, pendientes) : ''}
      </div>
    </section>`;
  }

  function evolucionHTML(cat) {
    const hasta = RM.tabla.evolucion(estado(), cat.id).hasta;
    return `<figure class="evo">
      <figcaption><b>Evolución de puntos</b><span>Puntos acumulados hasta la fecha ${hasta + 1} · toca o pasa el cursor sobre una fecha para ver cada resultado</span></figcaption>
      <div class="evo-canvas"><canvas data-evo="${cat.id}" role="img" aria-label="Gráfico de puntos acumulados por fecha de la categoría ${esc(cat.nombre)}. Los mismos datos están en la tabla de posiciones."></canvas></div>
    </figure>`;
  }

  /*
    Gráfico de líneas: una línea por equipo con sus puntos acumulados en cada fecha.
    El color sigue al número del equipo (no a su posición), así no cambia al moverse en la tabla.
    Los colores salen de las variables CSS --serie-N, que tienen versión para tema claro y oscuro.
  */
  function grafico(canvas) {
    const catId = canvas.dataset.evo;
    const ev = RM.tabla.evolucion(estado(), catId);
    const css = getComputedStyle(document.documentElement);
    const v = (n) => css.getPropertyValue(n).trim();
    const tinta = v('--text'), apagado = v('--muted'), linea = v('--line'), fondo = v('--card');
    // Hay 8 colores validados; desde el equipo 9 la línea va en gris (sigue en la leyenda y el detalle)
    const colores = ev.equipos.map((e) => (e.num <= 8 ? v(`--serie-${e.num}`) : apagado));

    // Al pasar sobre la leyenda se resalta un equipo y los demás se atenúan
    const resaltar = (g, idx) => {
      g.data.datasets.forEach((d, i) => { d.borderColor = d.backgroundColor = idx === null || i === idx ? colores[i] : colores[i] + '30'; });
      g.update('none');
    };
    const detalle = (f) => (f.estado === 'jugado' ? `${f.texto}, +${f.pts}` : f.estado === 'descansa' ? 'libre' : 'pendiente');

    return new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: Array.from({ length: ev.nFechas }, (_, i) => `Fecha ${i + 1}`),
        datasets: ev.equipos.map((e, i) => ({
          label: `${e.num} · ${RM.q.nombrePorNumero(catId, e.num)}`,
          data: e.puntos,
          borderColor: colores[i], backgroundColor: colores[i],
          borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBorderColor: fondo, pointBorderWidth: 2
        }))
      },
      options: {
        animation: false,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, border: { color: linea }, ticks: { color: apagado } },
          y: {
            beginAtZero: true, grace: 1, grid: { color: linea }, border: { display: false },
            ticks: { color: apagado, precision: 0 },
            title: { display: true, text: 'Puntos acumulados', color: apagado }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: tinta, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 14 },
            onHover: (e, item, legend) => resaltar(legend.chart, item.datasetIndex),
            onLeave: (e, item, legend) => resaltar(legend.chart, null)
          },
          tooltip: {
            backgroundColor: v('--bg2'), borderColor: linea, borderWidth: 1,
            titleColor: tinta, bodyColor: tinta, usePointStyle: true, padding: 10,
            itemSort: (a, b) => b.parsed.y - a.parsed.y,
            callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y} pts (${detalle(ev.equipos[c.datasetIndex].fechas[c.dataIndex])})` }
          }
        }
      }
    });
  }

  // Al cambiar de tema se vuelven a dibujar los gráficos con los colores del tema nuevo
  new MutationObserver(() => {
    graficos = graficos.map((g) => {
      const canvas = g.canvas;
      g.destroy();
      return canvas.isConnected ? grafico(canvas) : null;
    }).filter(Boolean);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

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
