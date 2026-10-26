/* ===================== Vista: Programación de jornadas ===================== */
(function () {
  'use strict';
  const RM = window.RM;
  const { esc, icon } = RM;

  // Casilla seleccionada para intercambiar: { j, hora, canchaId }
  const ui = { sel: null };

  const estado = () => RM.store.state;
  const firmaActual = () => {
    const s = estado();
    return RM.programacion.firma(s.fixture, s.campeonato.categorias, s.campeonato.canchas);
  };

  function render(el) {
    const s = estado();
    const hayFixture = s.campeonato.categorias.some((c) => s.fixture[c.id]);
    const prog = s.programacion;

    let cuerpo;
    if (!hayFixture) {
      cuerpo = `<div class="empty">Primero genera el fixture en la pestaña <a href="#/fixture">Fixture</a>.</div>`;
    } else if (!prog) {
      cuerpo = `<div class="empty">Todavía no hay programación. Pulsa <b>Generar programación</b>.</div>`;
    } else {
      const aviso = prog.firma !== firmaActual()
        ? `<p class="alert warn page-alert">${icon('alert')}<span>El fixture o los horarios de las canchas cambiaron después de programar. Vuelve a generar la programación.</span></p>` : '';
      cuerpo = `${aviso}
        <p class="hint page-alert">Para intercambiar dos partidos, o mover uno a un horario libre, toca uno y luego el otro dentro de la misma jornada.</p>
        <div class="jornadas">${prog.jornadas.map(jornadaHTML).join('')}</div>
        ${equidadHTML(prog)}`;
    }

    el.innerHTML = `
      <section class="page-head">
        <div><span class="num">05 — CALENDARIO</span><h2>Programación</h2></div>
        <div class="form-actions">
          <button class="btn primary" type="button" data-act="generar" ${hayFixture ? '' : 'disabled'}>${icon(prog ? 'refresh' : 'bolt')} ${prog ? 'Volver a generar' : 'Generar programación'}</button>
          <button class="btn" type="button" data-act="imprimir" ${prog ? '' : 'disabled'}>${icon('print')} Imprimir</button>
        </div>
      </section>
      <p class="hint page-alert">Las categorías se intercalan, los horarios libres quedan al final del día y la rotación reparte de forma justa las horas y las canchas entre todos los equipos.</p>
      <div class="prog-body">${cuerpo}</div>`;
    bind(el);
  }

  function horasDelDia() {
    return [...new Set(RM.programacion.horariosOrdenados(estado().campeonato.canchas).map((x) => x.hora))];
  }

  function jornadaHTML(jor, j) {
    const s = estado();
    const canchas = s.campeonato.canchas;
    const fecha = RM.q.fechasJornadas()[j];
    const filas = horasDelDia().map((h) => `<tr><th scope="row">${h}</th>${canchas.map((k) => {
      if (!k.horarios.includes(h)) return '<td class="na"><span class="sr-only">No disponible</span></td>';
      const a = jor.asignaciones.find((x) => x.hora === h && x.canchaId === k.id);
      const sel = ui.sel && ui.sel.j === j && ui.sel.hora === h && ui.sel.canchaId === k.id;
      const datos = `data-j="${j}" data-hora="${h}" data-cancha="${k.id}" aria-pressed="${!!sel}"`;
      if (!a) return `<td><button type="button" class="match-cell free" ${datos}>Libre</button></td>`;
      return `<td>${celdaPartido(a, datos)}</td>`;
    }).join('')}</tr>`).join('');

    const descansan = s.campeonato.categorias.map((c) => {
      const fj = s.fixture[c.id] && s.fixture[c.id].jornadas[j];
      return fj && fj.descansa !== null ? `${esc(RM.q.nombrePorNumero(c.id, fj.descansa))} (${esc(c.nombre)})` : null;
    }).filter(Boolean);

    const sinHorario = jor.sinHorario.map((x) => {
      const p = RM.q.partido(x.catId, x.partidoId);
      return p ? `${esc(RM.q.nombrePorNumero(x.catId, p.a))} vs ${esc(RM.q.nombrePorNumero(x.catId, p.b))}` : '';
    });

    return `<section class="card jornada">
      <header class="jor-head">
        <div><span class="kicker">Jornada ${j + 1}</span><h3>${fecha ? RM.fechaLarga(fecha) : 'Sin fecha (elige la primera jornada en Campeonato)'}</h3></div>
        <span class="count">${jor.asignaciones.length} partidos</span>
      </header>
      <div class="table-scroll"><table class="prog">
        <thead><tr><th scope="col">Horario</th>${canchas.map((k) => `<th scope="col">${esc(k.nombre)}</th>`).join('')}</tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
      ${descansan.length ? `<p class="hint">Descansa: ${descansan.join(' · ')}</p>` : ''}
      ${sinHorario.length ? `<p class="alert warn">${icon('alert')}<span>Sin horario disponible: ${sinHorario.join(' · ')}. Agrega horarios en Campeonato.</span></p>` : ''}
    </section>`;
  }

  function celdaPartido(a, datos) {
    const cat = RM.q.categoria(a.catId);
    const p = RM.q.partido(a.catId, a.partidoId);
    if (!cat || !p) return `<button type="button" class="match-cell free" ${datos}>Partido no encontrado</button>`;
    return `<button type="button" class="match-cell" style="--cat:${esc(cat.color)}" ${datos}>
      <span class="cat-tag">${esc(cat.nombre)}</span>
      <span>${esc(RM.q.nombrePorNumero(a.catId, p.a))}</span><i>vs</i><span>${esc(RM.q.nombrePorNumero(a.catId, p.b))}</span>
    </button>`;
  }

  function equidadHTML(prog) {
    const s = estado();
    const horas = horasDelDia();
    const canchas = s.campeonato.canchas;
    const eq = RM.programacion.equidad(prog.jornadas, s.fixture);
    const tablas = s.campeonato.categorias.filter((c) => s.fixture[c.id]).map((c) => {
      const filas = Object.values(eq).filter((x) => x.catId === c.id).sort((a, b) => a.num - b.num).map((x) => {
        const celdas = horas.map((h) => { const n = x.hora[h] || 0; return `<td class="${n >= 3 ? 'hi' : ''}">${n || '·'}</td>`; }).join('');
        const cc = canchas.map((k) => `<td>${x.cancha[k.id] || '·'}</td>`).join('');
        return `<tr><td><b class="num-badge" style="--cat:${esc(c.color)}">${x.num}</b> ${esc(RM.q.nombrePorNumero(c.id, x.num))}</td>${celdas}${cc}</tr>`;
      }).join('');
      return `<h4 class="sub">Categoría ${esc(c.nombre)}</h4>
        <div class="table-scroll"><table class="mini equity">
          <thead><tr><th>Equipo</th>${horas.map((h) => `<th>${h}</th>`).join('')}${canchas.map((k) => `<th>${esc(k.nombre)}</th>`).join('')}</tr></thead>
          <tbody>${filas}</tbody>
        </table></div>`;
    }).join('');
    return `<details class="card equity-card">
      <summary><h3 class="card-title">Reporte de equidad</h3><span class="hint">Cuántas veces jugó cada equipo en cada horario y cancha. En naranja: 3 o más veces en la misma hora.</span></summary>
      ${tablas}
    </details>`;
  }

  function generar() {
    const s = estado();
    if (s.programacion && !confirm('Se generará de nuevo la programación y se perderán los cambios hechos a mano. ¿Continuar?')) return;
    ui.sel = null;
    RM.store.commit((st) => {
      st.programacion = {
        firma: RM.programacion.firma(st.fixture, st.campeonato.categorias, st.campeonato.canchas),
        generado: RM.toISO(new Date()),
        jornadas: RM.programacion.generar(st.fixture, st.campeonato.categorias, st.campeonato.canchas)
      };
    });
    RM.toast('Programación generada');
  }

  function tocarCasilla(b) {
    const pos = { j: +b.dataset.j, hora: b.dataset.hora, canchaId: b.dataset.cancha };
    const sel = ui.sel;
    if (!sel || sel.j !== pos.j) {
      if (b.classList.contains('free')) return; // la primera casilla debe ser un partido
      ui.sel = pos;
      RM.app.render();
      return;
    }
    ui.sel = null;
    if (sel.hora === pos.hora && sel.canchaId === pos.canchaId) { RM.app.render(); return; }
    RM.store.commit((st) => {
      const asig = st.programacion.jornadas[pos.j].asignaciones;
      const a = asig.find((x) => x.hora === sel.hora && x.canchaId === sel.canchaId);
      const b2 = asig.find((x) => x.hora === pos.hora && x.canchaId === pos.canchaId);
      if (a) { a.hora = pos.hora; a.canchaId = pos.canchaId; }
      if (b2) { b2.hora = sel.hora; b2.canchaId = sel.canchaId; }
    });
    RM.toast('Partidos intercambiados');
  }

  function bind(el) {
    RM.$('.page-head', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      if (b.dataset.act === 'generar') generar();
      if (b.dataset.act === 'imprimir') window.print();
    });
    RM.$('.prog-body', el).addEventListener('click', (e) => {
      const b = e.target.closest('.match-cell');
      if (b) tocarCasilla(b);
    });
  }

  RM.views.programacion = { render };
})();
