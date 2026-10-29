/* Foto y avatar del perfil del jugador (js/perfil.js) */
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { RM } = require('./cargar');

const P = RM.perfil;
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

describe('recorteCentrado: cuadrado central sin deformar', () => {
  test('horizontal 4000×3000: sobran 1000 px de ancho, 500 a cada lado', () => {
    assert.deepEqual(P.recorteCentrado(4000, 3000), { sx: 500, sy: 0, lado: 3000 });
  });
  test('vertical 600×1000: sobran 400 px de alto, 200 arriba y abajo', () => {
    assert.deepEqual(P.recorteCentrado(600, 1000), { sx: 0, sy: 200, lado: 600 });
  });
  test('cuadrada 500×500: se usa entera', () => {
    assert.deepEqual(P.recorteCentrado(500, 500), { sx: 0, sy: 0, lado: 500 });
  });
  test('1×1', () => {
    assert.deepEqual(P.recorteCentrado(1, 1), { sx: 0, sy: 0, lado: 1 });
  });
});

describe('fotoValida: solo data URL de imagen y de tamaño razonable', () => {
  test('data URL JPEG', () => assert.equal(P.fotoValida(JPEG), true));
  test('vacío', () => assert.equal(P.fotoValida(''), false));
  test('javascript:', () => assert.equal(P.fotoValida('javascript:alert(1)'), false));
  test('http://', () => assert.equal(P.fotoValida('http://ejemplo.com/a.jpg'), false));
  test('justo en el tope de 60 KB sí, un carácter más no', () => {
    const base = 'data:image/jpeg;base64,';
    assert.equal(P.fotoValida(base + 'A'.repeat(61440 - base.length)), true);
    assert.equal(P.fotoValida(base + 'A'.repeat(61441 - base.length)), false);
  });
  test('no es cadena', () => {
    assert.equal(P.fotoValida(null), false);
    assert.equal(P.fotoValida(undefined), false);
    assert.equal(P.fotoValida({}), false);
  });
});

describe('normalizarJugador: respaldos viejos y fotos inválidas', () => {
  const viejo = { id: 'a1', nombres: 'Ana', apellidos: 'ROJAS', ci: '123', celular: '700', categoria: 'oro' };
  test('jugador sin foto (respaldo viejo) queda con foto vacía y los demás campos iguales', () => {
    assert.deepEqual(P.normalizarJugador(viejo), { ...viejo, foto: '' });
  });
  test('foto inválida se descarta', () => {
    assert.equal(P.normalizarJugador({ ...viejo, foto: 'http://x/y.png' }).foto, '');
  });
  test('foto válida se conserva', () => {
    assert.equal(P.normalizarJugador({ ...viejo, foto: JPEG }).foto, JPEG);
  });
  test('no modifica el objeto original', () => {
    P.normalizarJugador(viejo);
    assert.equal('foto' in viejo, false);
  });
});

describe('iniciales: perfil por defecto', () => {
  test('nombre y apellido', () => assert.equal(P.iniciales({ nombres: 'Juan', apellidos: 'PEREZ' }), 'JP'));
  test('solo apellido', () => assert.equal(P.iniciales({ nombres: '', apellidos: 'PEREZ' }), 'P'));
  test('sin datos', () => assert.equal(P.iniciales({}), '?'));
  test('apellido con inicial "G." la ignora', () => assert.equal(P.iniciales({ nombres: 'Luis', apellidos: 'G.GUTIERREZ' }), 'LG'));
});

describe('avatarHTML: helper compartido por las tres vistas', () => {
  const oro = { id: 'oro', color: '#ffd23f' };
  test('sin foto: iniciales en mayúscula con el color de la categoría', () => {
    assert.equal(P.avatarHTML({ nombres: 'juan', apellidos: 'perez', foto: '' }, oro),
      '<span class="avatar" style="--cat:#ffd23f">JP</span>');
  });
  test('con foto: imagen en lugar de iniciales', () => {
    const h = P.avatarHTML({ nombres: 'Juan', apellidos: 'PEREZ', foto: JPEG }, oro);
    assert.equal(h, `<span class="avatar" style="--cat:#ffd23f"><img src="${JPEG}" alt=""></span>`);
  });
  test('foto inválida: vuelve a las iniciales', () => {
    const h = P.avatarHTML({ nombres: 'Juan', apellidos: 'PEREZ', foto: 'javascript:alert(1)' }, oro);
    assert.equal(h.includes('<img'), false);
    assert.equal(h.includes('JP'), true);
  });
  test('sin categoría: clase nocat y sin color', () => {
    assert.equal(P.avatarHTML({ nombres: 'Juan', apellidos: 'PEREZ' }, null), '<span class="avatar nocat">JP</span>');
  });
  test('tamaño sm', () => {
    assert.equal(P.avatarHTML({ nombres: 'Juan', apellidos: 'PEREZ' }, oro, 'sm'), '<span class="avatar sm" style="--cat:#ffd23f">JP</span>');
  });
  test('texto del usuario sale escapado', () => {
    const h = P.avatarHTML({ nombres: '<b>', apellidos: 'X' }, { color: '"red' });
    assert.equal(h, '<span class="avatar" style="--cat:&quot;red">&lt;X</span>');
  });
});

describe('store: respaldos con y sin foto, y almacenamiento lleno', () => {
  test('respaldo viejo (sin campo foto): carga con el perfil por defecto', () => {
    RM.store.importar(JSON.stringify({ campeonato: {}, jugadores: [{ id: 'a', nombres: 'Ana', apellidos: 'ROJAS', ci: '', celular: '', categoria: 'oro' }] }));
    assert.equal(RM.store.state.jugadores[0].foto, '');
    assert.equal(RM.store.state.jugadores[0].apellidos, 'ROJAS');
  });
  test('exportar e importar conserva las fotos', () => {
    RM.store.importar(JSON.stringify({ campeonato: {}, jugadores: [{ id: 'a', apellidos: 'ROJAS', foto: JPEG }] }));
    const texto = JSON.stringify(RM.store.state);
    RM.store.importar(texto);
    assert.equal(RM.store.state.jugadores[0].foto, JPEG);
  });
  test('commit devuelve false si localStorage.setItem falla (lleno) y true si guarda', () => {
    const antes = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    try {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem() { throw new Error('QuotaExceededError'); } } });
      assert.equal(RM.store.commit(() => {}, { silent: true }), false);
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem() {} } });
      assert.equal(RM.store.commit(() => {}, { silent: true }), true);
    } finally {
      if (antes) Object.defineProperty(globalThis, 'localStorage', antes); else delete globalThis.localStorage;
    }
  });
});

describe('correcciones de la revisión', () => {
  test('fotoValida rechaza SVG, comillas y texto no base64; acepta PNG y WebP', () => {
    assert.equal(P.fotoValida('data:image/svg+xml;base64,PHN2Zz4='), false);
    assert.equal(P.fotoValida('data:image/jpeg;base64,AAA"onerror=x'), false);
    assert.equal(P.fotoValida('data:image/jpeg,hola mundo'), false);
    assert.equal(P.fotoValida('data:image/jpeg;base64,'), false);
    assert.equal(P.fotoValida('data:image/png;base64,iVBORw0KGgo='), true);
    assert.equal(P.fotoValida('data:image/webp;base64,UklGRg=='), true);
  });
  test('un respaldo con null u otros valores en jugadores carga solo los jugadores válidos', () => {
    RM.store.importar(JSON.stringify({ campeonato: {}, jugadores: [null, 5, 'x', { id: 'a', apellidos: 'ROJAS' }] }));
    assert.deepEqual(RM.store.state.jugadores, [{ id: 'a', apellidos: 'ROJAS', foto: '' }]);
  });
  const conLocalStorage = (setItem, fn) => {
    const antes = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem } });
    try { return fn(); } finally {
      if (antes) Object.defineProperty(globalThis, 'localStorage', antes); else delete globalThis.localStorage;
    }
  };
  const lleno = () => { throw new Error('QuotaExceededError'); };
  test('importar con almacenamiento lleno devuelve false y deja el estado anterior', () => {
    RM.store.importar(JSON.stringify({ campeonato: {}, jugadores: [{ id: 'a', apellidos: 'ROJAS' }] }));
    const ok = conLocalStorage(lleno, () => RM.store.importar(JSON.stringify({ campeonato: {}, jugadores: [{ id: 'z', apellidos: 'OTRO' }] })));
    assert.equal(ok, false);
    assert.deepEqual(RM.store.state.jugadores, [{ id: 'a', apellidos: 'ROJAS', foto: '' }]);
  });
  test('el aviso de falta de espacio es el mismo para todos', () => {
    assert.equal(RM.store.SIN_ESPACIO, 'No hay espacio para guardar. Quita fotos o exporta un respaldo.');
  });
  test('commit con deshacerSiFalla vuelve al estado anterior si no se pudo guardar', () => {
    RM.store.importar(JSON.stringify({ campeonato: {}, jugadores: [{ id: 'a', apellidos: 'ROJAS' }] }));
    const ok = conLocalStorage(lleno, () => RM.store.commit((st) => {
      st.jugadores.push({ id: 'b', apellidos: 'PAZ', foto: JPEG });
      st.jugadores[0].foto = JPEG;
    }, { silent: true, deshacerSiFalla: true }));
    assert.equal(ok, false);
    assert.deepEqual(RM.store.state.jugadores, [{ id: 'a', apellidos: 'ROJAS', foto: '' }]);
  });
  test('commit sin la opción mantiene el cambio aunque no se guarde (comportamiento de siempre)', () => {
    RM.store.importar(JSON.stringify({ campeonato: {}, jugadores: [] }));
    conLocalStorage(lleno, () => RM.store.commit((st) => st.jugadores.push({ id: 'b' }), { silent: true }));
    assert.equal(RM.store.state.jugadores.length, 1);
  });
});
