/* ===================== Arranque y navegación por pestañas ===================== */
(function () {
  'use strict';
  const RM = window.RM;

  const TABS = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'campeonato', label: 'Campeonato' },
    { id: 'jugadores', label: 'Jugadores' },
    { id: 'equipos', label: 'Equipos' },
    { id: 'fixture', label: 'Fixture' },
    { id: 'programacion', label: 'Programación' },
    { id: 'resultados', label: 'Resultados' },
    { id: 'tabla', label: 'Posiciones' },
    { id: 'planillas', label: 'Planillas' }
  ];
  const vista = RM.$('#view');

  const actual = () => {
    const id = location.hash.replace(/^#\/?/, '');
    return TABS.find((t) => t.id === id) || TABS[0];
  };

  function renderTabs(t) {
    RM.$('#tabs').innerHTML = TABS.map((x, i) =>
      `<a class="tab" href="#/${x.id}" ${x.id === t.id ? 'aria-current="page"' : ''}>${i ? `<small>${String(i).padStart(2, '0')}</small>` : ''}${x.label}</a>`).join('');
  }

  function renderMeta() {
    const c = RM.store.state.campeonato;
    RM.$('#topMeta').innerHTML = `<strong>${RM.esc(c.nombre)}</strong> · Gestión ${c.gestion} · Temporada ${c.temporada} · Vuelta ${c.vuelta}`;
  }

  function render() {
    const t = actual();
    renderTabs(t);
    renderMeta();
    document.title = `${t.label} · RaquetMatch`;
    RM.views[t.id].render(vista);
  }

  RM.app = { render, renderMeta };

  window.addEventListener('hashchange', () => {
    render();
    window.scrollTo({ top: 0 });
    vista.focus({ preventScroll: true });
  });
  RM.store.subscribe(render);

  // Tema claro / oscuro
  RM.$('#themeBtn').addEventListener('click', () => {
    const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('rm-theme', t); } catch (e) { /* ignorar */ }
  });

  // Respaldo: exportar / importar JSON
  RM.$('#exportBtn').addEventListener('click', () => { RM.store.exportar(); RM.toast('Respaldo descargado'); });
  RM.$('#importBtn').addEventListener('click', () => RM.$('#importInput').click());
  RM.$('#importInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f || !confirm('Se reemplazarán los datos actuales por los del archivo. ¿Continuar?')) return;
    f.text().then((txt) => {
      try {
        const ok = RM.store.importar(txt);
        RM.toast(ok ? 'Respaldo cargado' : RM.store.SIN_ESPACIO, !ok);
      } catch (err) { RM.toast(err.message, true); }
    });
  });

  RM.store.load();
  render();
})();
