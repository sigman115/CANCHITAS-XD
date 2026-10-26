/* ===================== Datos de demostración ===================== */
(function () {
  'use strict';
  const RM = window.RM;

  // Parejas tomadas de las planillas del campeonato
  const DEMO = {
    oro: [['IVER', 'AMPUERO'], ['MARZANA', 'VASQUEZ'], ['ALANOCA', 'QUINTEROS'], ['CALLE', 'CARVAJAL'], ['BASOALTO', 'YANA'], ['ARZE', 'DOMINGUEZ'], ['CORDOVA', 'G.GUTIERREZ'], ['ANCASI', 'FERNANDEZ']],
    plata: [['J.GUTIERREZ', 'S.GONZALES'], ['GOMEZ', 'TRIVEÑO'], ['BARRIOS', 'QUISPE'], ['VERGARA', 'UGARTE'], ['LOPEZ', 'PONCE'], ['CALCINA', 'ALVAREZ'], ['MORALES', 'CRUZ'], ['RIVERA', 'CORONEL']]
  };

  // Devuelve true si se cargó (el usuario puede cancelar)
  function cargar() {
    const s = RM.store.state;
    if (s.jugadores.length && !confirm('Se reemplazarán los jugadores, equipos, fixture y resultados actuales por los de la demo. ¿Continuar?')) return false;
    const cats = s.campeonato.categorias;
    const destino = [cats.find((c) => c.id === 'oro') || cats[0], cats.find((c) => c.id === 'plata') || cats[1] || cats[0]];
    RM.store.commit((st) => {
      st.jugadores = [];
      st.equipos = [];
      st.fixture = {};
      st.programacion = null;
      st.resultados = {};
      st.desempates = {};
      [DEMO.oro, DEMO.plata].forEach((parejas, k) => {
        parejas.forEach((par, i) => {
          const ids = par.map((ap) => {
            const m = ap.match(/^([A-Z])\.(.+)$/);
            const j = { id: RM.uid(), nombres: m ? m[1] + '.' : '', apellidos: m ? m[2] : ap, ci: '', celular: '', categoria: destino[k].id };
            st.jugadores.push(j);
            return j.id;
          });
          st.equipos.push({ id: RM.uid(), categoriaId: destino[k].id, jugadores: ids, numero: i + 1 });
        });
      });
    });
    RM.toast('Demo cargada: 32 jugadores y 16 equipos');
    return true;
  }

  RM.demo = { cargar };
})();
