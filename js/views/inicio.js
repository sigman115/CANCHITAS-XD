/* ===================== Vista: Inicio (bienvenida y progreso) ===================== */
(function () {
  'use strict';
  const RM = window.RM;
  const { esc, icon } = RM;

  const estado = () => RM.store.state;

  // Estado de cada paso del campeonato
  function pasos() {
    const s = estado();
    const c = s.campeonato;
    const cats = c.categorias;
    const catsConEquipos = cats.filter((k) => RM.q.equiposDe(k.id).length >= 2);
    const nEquipos = s.equipos.length;
    const sinCat = s.jugadores.filter((j) => !RM.q.categoria(j.categoria)).length;
    const fixtureOk = catsConEquipos.length > 0 && catsConEquipos.every((k) => s.fixture[k.id] && s.fixture[k.id].n === RM.q.equiposDe(k.id).length);
    const progOk = !!(s.programacion && s.programacion.firma === RM.programacion.firma(s.fixture, cats, c.canchas));
    const tablas = cats.filter((k) => s.fixture[k.id]).map((k) => ({ cat: k, t: RM.tabla.calcular(s, k.id) }));
    const total = tablas.reduce((n, x) => n + x.t.total, 0);
    const jugados = tablas.reduce((n, x) => n + x.t.jugados, 0);
    const terminado = tablas.length > 0 && tablas.every((x) => x.t.terminado);
    const lider = tablas.find((x) => x.t.jugados > 0);

    return [
      { id: 'campeonato', titulo: 'Configura', texto: 'Nombre, día de juego, canchas con sus horarios y categorías.',
        ok: !!c.fechaInicio, detalle: c.fechaInicio ? `${RM.DIAS[c.diaJuego]} · ${c.canchas.length} canchas · ${RM.q.espaciosJornada()} horarios` : 'Falta la fecha de la primera jornada' },
      { id: 'jugadores', titulo: 'Inscribe', texto: 'Registra a cada jugador y asígnale su categoría.',
        ok: s.jugadores.length > 0 && !sinCat, detalle: s.jugadores.length ? `${s.jugadores.length} inscritos${sinCat ? ` · ${sinCat} sin categoría` : ''}` : 'Sin jugadores todavía' },
      { id: 'equipos', titulo: 'Arma equipos', texto: 'Parejas o tríos con relevo por categoría y sorteo de números.',
        ok: catsConEquipos.length > 0, detalle: nEquipos ? `${nEquipos} equipos` : 'Sin equipos todavía' },
      { id: 'fixture', titulo: 'Fixture', texto: 'Todos contra todos, con descanso si el número es impar.',
        ok: fixtureOk, detalle: fixtureOk ? `${total} partidos` : 'Por generar' },
      { id: 'programacion', titulo: 'Programa', texto: 'Horarios y canchas con rotación justa para todos.',
        ok: progOk, detalle: progOk ? `${s.programacion.jornadas.length} jornadas` : 'Por generar' },
      { id: 'resultados', titulo: 'Resultados', texto: 'Carga cada marcador o escanea la planilla con QR.',
        ok: total > 0 && jugados === total, detalle: total ? `${jugados} de ${total} partidos` : 'Sin partidos' },
      { id: 'tabla', titulo: 'Corona', texto: 'La tabla se calcula sola, con desempates si hace falta.',
        ok: terminado, detalle: lider ? `Líder ${esc(lider.cat.nombre)}: ${esc(RM.q.nombrePorNumero(lider.cat.id, lider.t.lista[0].num))}` : 'Aún sin resultados' }
    ];
  }

  // Primera jornada que todavía tiene partidos sin resultado
  function proximaFecha() {
    const s = estado();
    const fechas = RM.q.fechasJornadas();
    for (let j = 0; j < fechas.length; j++) {
      const pend = s.campeonato.categorias.some((k) => {
        const fj = s.fixture[k.id] && s.fixture[k.id].jornadas[j];
        return fj && fj.partidos.some((p) => !RM.tabla.resultadoDe(s, p));
      });
      if (pend) return { j, f: fechas[j] };
    }
    return null;
  }

  function render(el) {
    const s = estado();
    const c = s.campeonato;
    const lista = pasos();
    const siguiente = lista.find((p) => !p.ok);
    const partidos = Object.values(s.fixture).reduce((n, f) => n + f.jornadas.reduce((m, j) => m + j.partidos.length, 0), 0);
    const cargados = Object.keys(s.resultados).length;
    const prox = proximaFecha();

    const cta = siguiente
      ? `<a href="#/${siguiente.id}" class="btn primary">${s.jugadores.length ? 'Continuar' : 'Empezar campeonato'}: ${siguiente.titulo.toLowerCase()} →</a>`
      : '<a href="#/tabla" class="btn primary">Ver tabla de posiciones →</a>';

    el.innerHTML = `
      <section class="hero">
        <div class="court" aria-hidden="true">
          <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor">
            <rect x="60" y="60" width="1080" height="580" stroke-width="3"/>
            <line x1="600" y1="60" x2="600" y2="640" stroke-width="3"/>
            <line x1="60" y1="250" x2="1140" y2="250" stroke-width="2" stroke-dasharray="14 12"/>
            <line x1="60" y1="450" x2="1140" y2="450" stroke-width="2" stroke-dasharray="14 12"/>
            <rect x="380" y="60" width="440" height="190" stroke-width="2"/>
            <circle cx="600" cy="350" r="70" stroke-width="2"/>
          </svg>
        </div>
        <div class="wrap hero-grid">
          <div>
            <span class="tag"><i></i> Gestión ${c.gestion} · Temporada ${c.temporada} · Vuelta ${c.vuelta}</span>
            <h1>Arma equipos <span class="stroke">justos.</span><br>Juega <span class="hl">parejo.</span></h1>
            <p class="lead">Todo el campeonato <b>${esc(c.nombre)}</b> en un solo lugar: inscribe jugadores, arma equipos por categoría, genera el fixture con horarios justos, imprime planillas con QR y lleva la tabla al día.</p>
            <div class="cta">
              ${cta}
              ${s.jugadores.length ? '<a href="#/campeonato" class="btn">Configuración</a>' : '<button class="btn" type="button" id="heroDemo">Cargar demo</button>'}
            </div>
            <div class="stats" aria-live="polite">
              <div class="stat"><strong data-n="${s.jugadores.length}">0</strong><span>Jugadores</span></div>
              <div class="stat"><strong data-n="${s.equipos.length}">0</strong><span>Equipos</span></div>
              <div class="stat"><strong data-n="${partidos}">0</strong><span>Partidos</span></div>
              <div class="stat"><strong data-n="${cargados}">0</strong><span>Resultados</span></div>
            </div>
          </div>
          <div class="ball-stage" aria-hidden="true">
            <div class="ring"></div><div class="ring r2"></div>
            <div class="ball"><svg viewBox="0 0 100 100"><path d="M8 38c28 12 56 12 84 0M8 62c28-12 56-12 84 0" stroke="#fff" stroke-width="4" fill="none" opacity=".75" stroke-linecap="round"/></svg></div>
            <div class="chip c1">${icon('users', 16)} Rotación justa<small>Horarios y canchas</small></div>
            <div class="chip c2"><b>●</b> Planillas con QR<small>Escanea el resultado</small></div>
            ${prox ? `<div class="chip c3">${icon('clock', 16)} Jornada ${prox.j + 1}<small>${esc(RM.fechaLarga(prox.f))}</small></div>` : ''}
          </div>
        </div>
      </section>

      <section class="steps-sec">
        <div class="page-head">
          <div><span class="num">TU CAMPEONATO</span><h2>De la inscripción al campeón</h2></div>
          <p>Sigue los pasos en orden. Cada tarjeta te lleva a su sección y muestra cómo vas.</p>
        </div>
        <div class="steps">
          ${lista.map((p) => `
            <a class="step ${p.ok ? 'ok' : ''} ${siguiente && siguiente.id === p.id ? 'next' : ''}" href="#/${p.id}">
              <h3>${p.titulo}</h3>
              <p>${p.texto}</p>
              <span class="step-state">${p.ok ? icon('check', 14) : siguiente && siguiente.id === p.id ? icon('bolt', 14) : ''} ${p.detalle}</span>
            </a>`).join('')}
          <a class="step" href="#/planillas">
            <h3>Planillas</h3>
            <p>Imprime la planilla de control de cada partido con su QR.</p>
            <span class="step-state">${icon('print', 14)} Imprimir y escanear</span>
          </a>
        </div>
      </section>`;

    const demo = RM.$('#heroDemo', el);
    if (demo) demo.addEventListener('click', () => RM.demo.cargar());
    RM.$$('.stat strong', el).forEach((n) => contar(n, +n.dataset.n));
  }

  function contar(el, hasta) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = hasta; return; }
    const inicio = performance.now();
    const paso = (t) => {
      const p = Math.min((t - inicio) / 700, 1);
      el.textContent = Math.round(hasta * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  RM.views.inicio = { render };
})();
