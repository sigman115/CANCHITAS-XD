/* ===================== Banco de pruebas del escaneo de planillas ===================== */
/*
  Genera fotos sintéticas de planillas llenas y las pasa por RM.planilla.escanear(),
  el mismo lector que usa la pestaña Planillas.

  1. Dibuja la hoja con las medidas de LAYOUT (las mismas que usa la planilla impresa).
  2. La "rellena" con distintas marcas: relleno completo, parcial, X, visto, número encerrado,
     bolígrafo azul, lápiz, manchas y dobleces.
  3. La "fotografía": giro, perspectiva, poca luz, sombra, desenfoque, baja resolución,
     compresión JPEG y ruido.

  Cada caso dice qué debe pasar:
  - 'leer': tiene que leer el resultado correcto (si lo rechaza, también es falla).
  - 'leer-o-rechazar': caso difícil; vale leerlo bien o pedir revisión a mano.
  - 'rechazar': la planilla está mal llenada; tiene que pedir revisión.
  En ningún caso puede leer un resultado distinto sin avisar: eso metería un dato falso en la tabla.
*/
(function () {
  'use strict';
  const RM = window.RM;
  const L = RM.planilla.LAYOUT;
  const MM = 8; // píxeles por milímetro de la hoja dibujada (unos 200 ppp, como un escaneo)
  const HOJA = { w: 210, h: 297 };
  const ZONA = { x: 21, y: 236 }; // esquina superior izquierda del QR en la hoja, en mm
  const TINTA = { negra: '#1b1b1f', azul: '#1f3f95', lapiz: '#6a6a6a' };

  // Números pseudoaleatorios con semilla (mulberry32): cada corrida genera las mismas fotos
  function azar(semilla) {
    let s = semilla >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), s | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- 1. La hoja impresa ----------
  function hoja(pid, marcas, rnd) {
    const c = document.createElement('canvas');
    c.width = HOJA.w * MM;
    c.height = HOJA.h * MM;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.scale(MM, MM); // desde aquí todo se dibuja en milímetros

    // Resto de la planilla (títulos y renglones) para que el QR no aparezca aislado
    ctx.fillStyle = ctx.strokeStyle = '#000';
    ctx.textAlign = 'center';
    ctx.font = 'bold 4.5px Arial';
    ctx.fillText('PLANILLA DE CONTROL · CAMPEONATO "UNIDOS POR LA RAQUETA"', 105, 14);
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(8, 18); ctx.lineTo(202, 18); ctx.stroke();
    ctx.lineWidth = 0.2;
    ctx.setLineDash([0.4, 0.6]);
    for (let y = 30; y < 212; y += 7) {
      ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(98, y); ctx.moveTo(112, y); ctx.lineTo(200, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Recuadro RESULTADO FINAL
    ctx.lineWidth = 0.53;
    ctx.strokeRect(8, 218, 194, 66);
    ctx.font = 'bold 3.9px Arial';
    ctx.fillText('R E S U L T A D O   F I N A L', 105, 224);
    ctx.textAlign = 'left';
    ctx.font = '2.8px Arial';
    ctx.fillText('Rellena completamente un círculo por fila con bolígrafo oscuro: sets ganados por A y por B.', 12, 229);

    // QR: mismo contenido y mismo tamaño que RM.planilla.qrSVG()
    const qr = window.qrcode(0, 'M');
    qr.addData(RM.planilla.textoQR(pid, 1, 8));
    qr.make();
    const n = qr.getModuleCount(), m = L.qr / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) if (qr.isDark(y, x)) ctx.fillRect(ZONA.x + x * m, ZONA.y + y * m, m + 0.02, m + 0.02);
    }

    // Círculos impresos (borde negro y número en gris, como .omr-b) y textos de cada fila
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    L.burbujas.forEach((b) => {
      ctx.lineWidth = 0.42;
      ctx.beginPath(); ctx.arc(ZONA.x + b.x, ZONA.y + b.y, L.r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#b5b5b5';
      ctx.font = 'bold 2.8px Arial';
      ctx.fillText(b.txt, ZONA.x + b.x, ZONA.y + b.y + 0.1);
    });
    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    ctx.font = 'bold 3px Arial';
    [['Sets ganados por A', 5], ['Sets ganados por B', 15], ['W.O.: rellena el que no vino', 25]]
      .forEach(([t, y]) => ctx.fillText(t, ZONA.x + 68, ZONA.y + y));

    marcas.forEach((mk) => trazar(ctx, mk, rnd));
    return c;
  }

  // ---------- 2. Marcas hechas a mano ----------
  function trazar(ctx, mk, rnd) {
    const b = L.burbujas.find((z) => z.key === mk.key);
    const cx = ZONA.x + (b ? b.x : mk.x), cy = ZONA.y + (b ? b.y : mk.y), r = L.r;
    const temblor = (k) => (rnd() - 0.5) * k;
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = mk.color || TINTA.negra;
    ctx.globalAlpha = mk.alfa || 1;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    if (mk.tipo === 'relleno') {
      // Rayas de lado a lado, como se rellena con bolígrafo. 'cobertura' < 1 deja sin pintar la parte derecha
      const hasta = -r + 2 * r * (mk.cobertura || 1);
      ctx.lineWidth = 0.75;
      for (let y = -r * 0.95; y <= r * 0.95; y += 0.45) {
        const borde = Math.sqrt(r * r - y * y) * 1.02;
        const x0 = -borde + temblor(0.4), x1 = Math.min(borde, hasta) + temblor(0.4);
        if (x1 <= x0) continue;
        ctx.moveTo(cx + x0, cy + y + temblor(0.2));
        ctx.lineTo(cx + x1, cy + y + temblor(0.2));
      }
      ctx.stroke();
    } else if (mk.tipo === 'x') {
      ctx.lineWidth = 0.5;
      const k = r * 0.8;
      ctx.moveTo(cx - k, cy - k); ctx.lineTo(cx + k, cy + k);
      ctx.moveTo(cx + k, cy - k); ctx.lineTo(cx - k, cy + k);
      ctx.stroke();
    } else if (mk.tipo === 'visto') {
      ctx.lineWidth = 0.5;
      ctx.moveTo(cx - r * 0.7, cy); ctx.lineTo(cx - r * 0.15, cy + r * 0.6); ctx.lineTo(cx + r * 0.9, cy - r * 0.8);
      ctx.stroke();
    } else if (mk.tipo === 'encerrar') {
      // Encierra el número con otro círculo en vez de rellenarlo (error común)
      ctx.lineWidth = 0.45;
      ctx.ellipse(cx + temblor(0.4), cy + temblor(0.4), r * 1.3, r * 1.2, temblor(0.6), 0, Math.PI * 2);
      ctx.stroke();
    } else if (mk.tipo === 'mancha') {
      ctx.ellipse(cx, cy, mk.radio || 1.2, (mk.radio || 1.2) * 0.8, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (mk.tipo === 'linea') {
      // Doblez o raya que cruza la zona: va de (x, y) a (x2, y2), en mm desde el QR
      ctx.lineWidth = mk.grosor || 0.3;
      ctx.moveTo(cx, cy); ctx.lineTo(ZONA.x + mk.x2, ZONA.y + mk.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 3. La foto ----------
  /*
    f: { ancho, giro (grados), perspectiva (0 = de frente; 0.1 = borde superior 10 % más angosto),
         ocupa (fracción de la foto que ocupa la hoja), luz (1 = normal), sombra: [inicio, fin] de
         izquierda a derecha, desenfoque (px), ruido (0-255), calidad (JPEG 0-1) }
  */
  function fotografiar(papel, f, rnd) {
    const W = f.ancho, H = Math.round(f.ancho * 1.38);
    const esc = (f.ocupa || 0.86) * Math.min(W / HOJA.w, H / HOJA.h);
    const w = HOJA.w * esc, h = HOJA.h * esc, t = f.perspectiva || 0;
    const local = [[-w / 2 * (1 - t), -h / 2], [w / 2 * (1 - t), -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    const g = ((f.giro || 0) * Math.PI) / 180, co = Math.cos(g), si = Math.sin(g);
    const destino = local.map(([x, y]) => [W / 2 + x * co - y * si, H / 2 + x * si + y * co]);
    const pw = papel.width, ph = papel.height;
    // De cada píxel de la foto al punto de la hoja que se ve ahí (homografía inversa)
    const aPapel = RM.planilla.homografia(destino, [[0, 0], [pw, 0], [pw, ph], [0, ph]]);
    const src = papel.getContext('2d').getImageData(0, 0, pw, ph).data;

    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const octx = out.getContext('2d');
    const img = octx.createImageData(W, H);
    const d = img.data;
    const fondo = [96, 78, 60]; // mesa de madera
    const luz = f.luz || 1, [s0, s1] = f.sombra || [1, 1], ruido = f.ruido || 0;
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i += 4) {
        const [u, v] = aPapel(x + 0.5, y + 0.5);
        let rr, gg, bb;
        if (u >= 0 && v >= 0 && u < pw - 1 && v < ph - 1) {
          // Interpolación bilineal entre los 4 píxeles vecinos de la hoja
          const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0;
          const p = (y0 * pw + x0) * 4, q = p + pw * 4;
          const mez = (k) => (src[p + k] * (1 - fx) + src[p + 4 + k] * fx) * (1 - fy) + (src[q + k] * (1 - fx) + src[q + 4 + k] * fx) * fy;
          rr = mez(0); gg = mez(1); bb = mez(2);
        } else {
          [rr, gg, bb] = fondo;
        }
        const k = luz * (s0 + (s1 - s0) * (x / W));
        const z = ruido ? (rnd() - 0.5) * 2 * ruido : 0;
        d[i] = rr * k + z;
        d[i + 1] = gg * k + z;
        d[i + 2] = bb * k * 0.97 + z; // luz un poco cálida, como en interiores
        d[i + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);

    let final = out;
    if (f.desenfoque) {
      final = document.createElement('canvas');
      final.width = W;
      final.height = H;
      const fctx = final.getContext('2d');
      fctx.filter = `blur(${f.desenfoque}px)`;
      fctx.drawImage(out, 0, 0);
    }
    return new Promise((ok) => final.toBlob((blob) => ok({ blob, canvas: final }), 'image/jpeg', f.calidad || 0.85));
  }

  // ---------- Casos ----------
  // Marcas para un resultado: '2-1' → A2 y B1 rellenos; 'woA' → W.O. de A
  function marcar(r, extra = {}) {
    const keys = r.startsWith('wo') ? [r] : ['a' + r[0], 'b' + r[2]];
    return keys.map((key) => ({ key, tipo: 'relleno', ...extra }));
  }
  const FOTO = {
    escaner: { ancho: 1700, ocupa: 0.97, calidad: 0.92 },
    celular: { ancho: 1500, giro: 4, perspectiva: 0.04, sombra: [1, 0.82], ruido: 5, calidad: 0.8 }
  };
  const caso = (grupo, nombre, foto, marcas, espera, debe = 'leer') => ({ grupo, nombre, foto, marcas, espera, debe });

  const CASOS = [
    // Condiciones de la foto, con relleno completo y bolígrafo negro
    caso('Foto', 'Escáner, hoja derecha', FOTO.escaner, marcar('2-0'), '2-0'),
    caso('Foto', 'Celular normal', FOTO.celular, marcar('2-1'), '2-1'),
    caso('Foto', 'Hoja girada 12°', { ...FOTO.celular, giro: 12 }, marcar('1-2'), '1-2'),
    caso('Foto', 'Hoja girada 30°', { ...FOTO.celular, giro: 30, ocupa: 0.7 }, marcar('0-2'), '0-2'),
    caso('Foto', 'Hoja al revés (180°)', { ...FOTO.celular, giro: 180 }, marcar('woA'), 'woA'),
    caso('Foto', 'Perspectiva fuerte (foto en ángulo)', { ...FOTO.celular, perspectiva: 0.18 }, marcar('woB'), 'woB'),
    caso('Foto', 'Poca luz (45 %)', { ...FOTO.celular, luz: 0.45 }, marcar('2-1'), '2-1'),
    caso('Foto', 'Sombra fuerte de un lado', { ...FOTO.celular, sombra: [1, 0.35] }, marcar('1-2'), '1-2'),
    caso('Foto', 'Sombra al revés', { ...FOTO.celular, sombra: [0.35, 1] }, marcar('2-0'), '2-0'),
    caso('Foto', 'Desenfocada (2 px)', { ...FOTO.celular, desenfoque: 2 }, marcar('0-2'), '0-2'),
    caso('Foto', 'Baja resolución (900 px)', { ...FOTO.celular, ancho: 900 }, marcar('2-1'), '2-1'),
    caso('Foto', 'Resolución muy baja (650 px)', { ...FOTO.celular, ancho: 650 }, marcar('1-2'), '1-2', 'leer-o-rechazar'),
    caso('Foto', 'JPEG muy comprimido (calidad 30 %)', { ...FOTO.celular, calidad: 0.3 }, marcar('2-0'), '2-0'),
    caso('Foto', 'Mucho ruido (poca luz del celular)', { ...FOTO.celular, ruido: 28 }, marcar('woB'), 'woB'),
    caso('Foto', 'Todo junto: girada, en ángulo, sombra, borrosa', { ...FOTO.celular, giro: -9, perspectiva: 0.1, sombra: [0.5, 1], desenfoque: 1.2, ruido: 12, calidad: 0.6 }, marcar('2-1'), '2-1'),

    // Formas de marcar, con foto de celular normal
    caso('Marca', 'Bolígrafo azul', FOTO.celular, marcar('2-1', { color: TINTA.azul }), '2-1'),
    caso('Marca', 'Lápiz', FOTO.celular, marcar('1-2', { color: TINTA.lapiz }), '1-2', 'leer-o-rechazar'),
    caso('Marca', 'Lápiz suave con poca luz', { ...FOTO.celular, luz: 0.55 }, marcar('2-0', { color: TINTA.lapiz, alfa: 0.7 }), '2-0', 'leer-o-rechazar'),
    caso('Marca', 'Relleno al 75 %', FOTO.celular, marcar('0-2', { cobertura: 0.75 }), '0-2'),
    caso('Marca', 'Relleno a la mitad', FOTO.celular, marcar('2-0', { cobertura: 0.5 }), '2-0', 'leer-o-rechazar'),
    caso('Marca', 'Relleno al 30 %', FOTO.celular, marcar('2-1', { cobertura: 0.3 }), '2-1', 'leer-o-rechazar'),
    caso('Marca', 'Marcado con X', FOTO.celular, marcar('1-2').map((m) => ({ ...m, tipo: 'x' })), '1-2', 'leer-o-rechazar'),
    caso('Marca', 'Marcado con visto ✓', FOTO.celular, marcar('2-0').map((m) => ({ ...m, tipo: 'visto' })), '2-0', 'leer-o-rechazar'),
    caso('Marca', 'Número encerrado en vez de relleno', FOTO.celular, marcar('0-2').map((m) => ({ ...m, tipo: 'encerrar' })), '0-2', 'leer-o-rechazar'),
    caso('Marca', 'Mancha sobre un punto de papel de referencia', FOTO.celular,
      [...marcar('2-1'), { tipo: 'mancha', x: 45, y: 5, radio: 1.4, color: '#444' }], '2-1'),
    caso('Marca', 'Mancha chica dentro de un círculo vacío', FOTO.celular,
      [...marcar('2-0'), { tipo: 'mancha', x: 50.8, y: 15.6, radio: 0.7, color: '#333' }], '2-0'),
    caso('Marca', 'Doblez de la hoja cruzando los círculos', FOTO.celular,
      [...marcar('1-2'), { tipo: 'linea', x: 33, y: -2, x2: 68, y2: 30, grosor: 0.35, color: '#777' }], '1-2'),
    caso('Marca', 'Raya de bolígrafo sobre la fila B', FOTO.celular,
      [...marcar('2-1'), { tipo: 'linea', x: 36, y: 15.5, x2: 64, y2: 14.5, grosor: 0.5 }], '2-1', 'leer-o-rechazar'),

    // Planillas mal llenadas: el lector tiene que pedir revisión, nunca inventar un resultado
    caso('Error de llenado', 'Nada marcado', FOTO.celular, [], null, 'rechazar'),
    caso('Error de llenado', 'Dos círculos en la fila A', FOTO.celular, [...marcar('2-1'), { key: 'a1', tipo: 'relleno' }], null, 'rechazar'),
    caso('Error de llenado', 'Marcador imposible 2-2', FOTO.celular, [{ key: 'a2', tipo: 'relleno' }, { key: 'b2', tipo: 'relleno' }], null, 'rechazar'),
    caso('Error de llenado', 'Solo la fila A', FOTO.celular, [{ key: 'a2', tipo: 'relleno' }], null, 'rechazar'),
    caso('Error de llenado', 'W.O. y también sets (vale el W.O.)', FOTO.celular, [...marcar('2-0'), { key: 'woB', tipo: 'relleno' }], 'woB')
  ];

  // ---------- Ejecución ----------
  /*
    estado: 'ok' (cumple lo que debe), 'rechazado' (pidió revisión en un caso que debía leer)
    o 'MAL' (leyó un resultado distinto o no rechazó una planilla mal llenada).
  */
  function evaluar(c, res, pid) {
    if (res.error) return c.debe === 'leer' ? 'rechazado' : 'ok';
    if (res.pid !== pid || res.r !== c.espera) return 'MAL';
    return 'ok';
  }

  async function correr(alAvanzar) {
    const resultados = [];
    for (let i = 0; i < CASOS.length; i++) {
      const c = CASOS[i];
      const rnd = azar(1000 + i);
      const pid = `oro-J${1 + (i % 7)}-P${1 + (i % 4)}`;
      const t0 = performance.now();
      const { blob, canvas } = await fotografiar(hoja(pid, c.marcas, rnd), c.foto, rnd);
      let res;
      try { res = await RM.planilla.escanear(new File([blob], `caso-${i + 1}.jpg`, { type: 'image/jpeg' })); } catch (e) { res = { error: e.message }; }
      // Margen respecto del umbral: el relleno más claro y el círculo vacío más oscuro
      const rellenos = c.marcas.filter((m) => m.key && m.tipo === 'relleno').map((m) => m.key);
      const os = res.oscuro || {};
      const claves = Object.keys(os);
      const r = {
        n: i + 1, ...c, pid, leido: res.error ? null : res.r, error: res.error || null, avisos: res.avisos || [],
        estado: evaluar(c, res, pid), oscuro: os, dudosos: res.dudosos || [],
        // ¿La cámara la registraría sola? Solo si no hay error, avisos ni círculos dudosos
        auto: !res.error && !(res.avisos || []).length && !(res.dudosos || []).length,
        rellenoMin: rellenos.length && claves.length ? Math.min(...rellenos.map((k) => os[k])) : null,
        vacioMax: claves.length ? Math.max(0, ...claves.filter((k) => !rellenos.includes(k)).map((k) => os[k])) : null,
        ms: Math.round(performance.now() - t0), foto: miniatura(canvas), vista: res.vista || ''
      };
      resultados.push(r);
      if (alAvanzar) alAvanzar(r, i, CASOS.length);
    }
    return resultados;
  }

  function miniatura(canvas) {
    const k = 150 / canvas.width;
    const m = document.createElement('canvas');
    m.width = 150;
    m.height = Math.round(canvas.height * k);
    m.getContext('2d').drawImage(canvas, 0, 0, m.width, m.height);
    return m.toDataURL('image/jpeg', 0.7);
  }

  window.BancoEscaneo = { CASOS, correr, hoja, fotografiar, ZONA, MM };
})();
