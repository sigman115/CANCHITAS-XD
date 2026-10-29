/* ===================== Capa de datos ===================== */
(function () {
  'use strict';
  const RM = window.RM;
  const KEY = 'raquetmatch-campeonato';
  const SIN_ESPACIO = 'No hay espacio para guardar. Quita fotos o exporta un respaldo.';

  function estadoInicial() {
    return {
      version: 1,
      campeonato: {
        nombre: 'Unidos por la Raqueta',
        gestion: new Date().getFullYear(),
        temporada: 1,
        vuelta: 1,
        diaJuego: 2, // 0 = domingo … 6 = sábado
        fechaInicio: '',
        categorias: [
          { id: 'oro', nombre: 'Oro', grupo: 'A', color: '#ffd23f' },
          { id: 'plata', nombre: 'Plata', grupo: 'B', color: '#c0c7d6' }
        ],
        canchas: [
          { id: 'c1', nombre: 'Cancha 1', horarios: ['07:45', '08:30', '09:20', '10:10', '11:00', '12:00'] },
          { id: 'c2', nombre: 'Cancha 2', horarios: ['07:45', '08:30'] }
        ]
      },
      // { id, nombres, apellidos, ci, celular, categoria, foto } — foto: data URL JPEG o '' (perfil por defecto)
      jugadores: [],
      // { id, categoriaId, jugadores: [id, id, (id relevo)], numero }
      equipos: [],
      // { catId: { n, generado, jornadas: [{ partidos: [{ id, a, b }], descansa }] } }
      // a y b son números de sorteo: el nombre sale del equipo con ese número
      fixture: {},
      // { firma, generado, jornadas: [{ asignaciones: [{ hora, canchaId, catId, partidoId }], sinHorario: [] }] }
      programacion: null,
      // { partidoId: { catId, a, b, r } } — r: '2-0' | '2-1' | '1-2' | '0-2' | 'woA' | 'woB' | 'woAB'
      resultados: {},
      // { catId: [{ id, a, b, r }] } partidos de desempate a 3 sets
      desempates: {}
    };
  }

  function combinar(d) {
    const base = estadoInicial();
    return {
      ...base,
      ...d,
      campeonato: { ...base.campeonato, ...(d.campeonato || {}) },
      jugadores: Array.isArray(d.jugadores) ? d.jugadores.filter((j) => j && typeof j === 'object').map(RM.perfil.normalizarJugador) : [],
      equipos: Array.isArray(d.equipos) ? d.equipos : [],
      fixture: d.fixture && typeof d.fixture === 'object' ? d.fixture : {},
      programacion: d.programacion && Array.isArray(d.programacion.jornadas) ? d.programacion : null,
      resultados: d.resultados && typeof d.resultados === 'object' ? d.resultados : {},
      desempates: d.desempates && typeof d.desempates === 'object' ? d.desempates : {}
    };
  }

  const oyentes = [];
  const avisar = () => oyentes.forEach((fn) => fn());

  RM.store = {
    state: estadoInicial(),
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) this.state = combinar(JSON.parse(raw));
      } catch (e) { /* sin almacenamiento disponible: se trabaja en memoria */ }
    },
    // Devuelve false si no se pudo guardar (por ejemplo, localStorage lleno por las fotos)
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); return true; } catch (e) { return false; }
    },
    /*
      Aplica un cambio, guarda y redibuja (silent: guarda sin redibujar la vista). Devuelve si se guardó.
      deshacerSiFalla: si no se pudo guardar, vuelve al estado anterior para que la pantalla no muestre
      un cambio que se perdería al recargar (se usa al guardar jugadores, que pueden traer foto).
    */
    commit(fn, opts) {
      const o = opts || {};
      const copia = o.deshacerSiFalla ? JSON.stringify(this.state) : null;
      fn(this.state);
      const ok = this.save();
      if (!ok && copia) this.state = JSON.parse(copia);
      if (!o.silent) avisar();
      return ok;
    },
    SIN_ESPACIO,
    subscribe(fn) { oyentes.push(fn); },
    exportar() {
      const c = this.state.campeonato;
      const slug = RM.norm(c.nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'campeonato';
      const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `raquetmatch-${slug}-${RM.toISO(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    importar(texto) {
      let d;
      try { d = JSON.parse(texto); } catch (e) { throw new Error('El archivo no es un JSON válido'); }
      if (!d || !d.campeonato || !Array.isArray(d.jugadores)) throw new Error('El archivo no es un respaldo de RaquetMatch');
      // Si no se puede guardar se vuelve al estado anterior: la pantalla muestra lo que de verdad quedó guardado
      const anterior = this.state;
      this.state = combinar(d);
      const ok = this.save();
      if (!ok) this.state = anterior;
      avisar();
      return ok;
    }
  };

  // ---------- Consultas ----------
  const S = () => RM.store.state;
  RM.q = {
    categoria: (id) => S().campeonato.categorias.find((c) => c.id === id),
    jugador: (id) => S().jugadores.find((j) => j.id === id),
    jugadoresDe: (catId) => S().jugadores.filter((j) => j.categoria === catId),
    equiposDe: (catId) => S().equipos.filter((e) => e.categoriaId === catId).sort((a, b) => a.numero - b.numero),
    equipoDeJugador: (jid) => S().equipos.find((e) => e.jugadores.includes(jid)),
    equipoPorNumero: (catId, num) => S().equipos.find((e) => e.categoriaId === catId && e.numero === num),
    nombrePorNumero(catId, num) {
      const e = RM.q.equipoPorNumero(catId, num);
      return e ? RM.q.nombreEquipo(e) : `Equipo ${num}`;
    },
    partido(catId, pid) {
      const fx = S().fixture[catId];
      if (!fx) return null;
      for (const j of fx.jornadas) {
        const p = j.partidos.find((x) => x.id === pid);
        if (p) return p;
      }
      return null;
    },

    nombreCompleto: (j) => [j.apellidos, j.nombres].filter(Boolean).join(', '),
    // Apellido en mayúsculas; si otro jugador comparte apellido se antepone la inicial (G. GUTIERREZ)
    nombreCorto(j) {
      const ap = (j.apellidos || j.nombres || '').toUpperCase();
      const repetido = S().jugadores.some((o) => o.id !== j.id && RM.norm(o.apellidos) === RM.norm(j.apellidos));
      return repetido && j.nombres ? `${j.nombres[0].toUpperCase()}. ${ap}` : ap;
    },
    nombreEquipo: (e) => e.jugadores.map(RM.q.jugador).filter(Boolean).map(RM.q.nombreCorto).join(' - '),

    // Todos contra todos: n-1 jornadas si es par, n si es impar (uno descansa)
    numJornadas: (n) => (n < 2 ? 0 : n % 2 ? n : n - 1),
    partidosPorJornada: (n) => Math.floor(n / 2),
    maxJornadas: () => Math.max(0, ...S().campeonato.categorias.map((c) => RM.q.numJornadas(RM.q.equiposDe(c.id).length))),
    partidosJornada: () => S().campeonato.categorias.reduce((t, c) => t + RM.q.partidosPorJornada(RM.q.equiposDe(c.id).length), 0),
    espaciosJornada: () => S().campeonato.canchas.reduce((t, k) => t + k.horarios.length, 0),
    primeraFecha() {
      const c = S().campeonato;
      return c.fechaInicio ? RM.alinearDia(c.fechaInicio, c.diaJuego) : null;
    },
    fechasJornadas() {
      const f = RM.q.primeraFecha();
      const n = RM.q.maxJornadas();
      return f ? Array.from({ length: n }, (_, i) => RM.sumarDias(f, 7 * i)) : [];
    }
  };

  // ---------- Operaciones reutilizables (reciben el estado dentro de commit) ----------
  RM.ops = {
    renumerar(st, catId) {
      st.equipos.filter((e) => e.categoriaId === catId).sort((a, b) => a.numero - b.numero).forEach((e, i) => { e.numero = i + 1; });
    },
    // Saca a un jugador de su equipo; si el equipo queda con menos de 2, se deshace
    quitarJugador(st, jid) {
      const eq = st.equipos.find((e) => e.jugadores.includes(jid));
      if (!eq) return;
      eq.jugadores = eq.jugadores.filter((id) => id !== jid);
      if (eq.jugadores.length < 2) {
        st.equipos = st.equipos.filter((e) => e !== eq);
        RM.ops.renumerar(st, eq.categoriaId);
      }
    }
  };
})();
