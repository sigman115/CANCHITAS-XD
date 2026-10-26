/* ===================== Planilla: QR, zona de resultado y lectura del escaneo ===================== */
/*
  La zona "RESULTADO FINAL" tiene el QR a la izquierda y los circulitos a la derecha.
  Todas las posiciones están en milímetros medidos desde la esquina superior izquierda del QR.
  Al escanear, jsQR entrega las 4 esquinas del QR en la foto; con ellas se calcula una
  homografía (transformación de perspectiva) que dice dónde está cada circulito en la imagen.
*/
(function () {
  'use strict';
  const RM = window.RM;

  const LAYOUT = {
    qr: 30, // lado del QR en mm
    r: 3.5, // radio del círculo en mm
    burbujas: [
      { key: 'a0', x: 40, y: 5, txt: '0' }, { key: 'a1', x: 50, y: 5, txt: '1' }, { key: 'a2', x: 60, y: 5, txt: '2' },
      { key: 'b0', x: 40, y: 15, txt: '0' }, { key: 'b1', x: 50, y: 15, txt: '1' }, { key: 'b2', x: 60, y: 15, txt: '2' },
      { key: 'woA', x: 40, y: 25, txt: 'A' }, { key: 'woB', x: 60, y: 25, txt: 'B' }
    ],
    // Puntos de papel en blanco entre círculos: sirven de referencia de iluminación
    papel: [[45, 5], [55, 5], [45, 15], [55, 15], [45, 25], [50, 25], [55, 25], [45, 10], [55, 20]]
  };

  const PREFIJO = 'RM1';
  const textoQR = (pid, a, b) => `${PREFIJO}|${pid}|${a}|${b}`;
  function leerTextoQR(t) {
    const p = String(t || '').split('|');
    if (p.length !== 4 || p[0] !== PREFIJO) return null;
    return { pid: p[1], a: +p[2], b: +p[3] };
  }

  // SVG del QR sin margen: el lado mide exactamente LAYOUT.qr mm
  function qrSVG(texto) {
    const qr = window.qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    }
    return `<svg class="qr" viewBox="0 0 ${n} ${n}" width="${LAYOUT.qr}mm" height="${LAYOUT.qr}mm" shape-rendering="crispEdges" aria-hidden="true"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  // ---------- Homografía: del cuadrado unidad (QR) a la imagen ----------
  function resolver(A, b) {
    const n = b.length;
    const M = A.map((fila, i) => [...fila, b[i]]);
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      if (Math.abs(M[c][c]) < 1e-12) return null;
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map((fila, i) => fila[n] / fila[i]);
  }

  function homografia(origen, destino) {
    const A = [], b = [];
    origen.forEach(([x, y], i) => {
      const [u, v] = destino[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    });
    const h = resolver(A, b);
    if (!h) return null;
    return (x, y) => {
      const w = h[6] * x + h[7] * y + 1;
      return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
    };
  }

  // ---------- Lectura de una imagen ----------
  function cargarImagen(archivo) {
    return new Promise((ok, mal) => {
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se pudo abrir la imagen')); };
      img.src = url;
    });
  }

  function lienzo(img, maxLado) {
    const k = Math.min(1, maxLado / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const c = document.createElement('canvas');
    c.width = Math.round((img.naturalWidth || img.width) * k);
    c.height = Math.round((img.naturalHeight || img.height) * k);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return { c, ctx, data: ctx.getImageData(0, 0, c.width, c.height) };
  }

  // Brillo promedio (0 negro – 255 blanco) dentro de un círculo de la imagen
  function brillo(data, cx, cy, rad) {
    const { width: w, height: h, data: px } = data;
    let suma = 0, n = 0;
    const r2 = rad * rad;
    for (let y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(h - 1, Math.ceil(cy + rad)); y++) {
      for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(w - 1, Math.ceil(cx + rad)); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > r2) continue;
        const i = (y * w + x) * 4;
        suma += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        n++;
      }
    }
    return n ? suma / n : 255;
  }

  const UMBRAL = 0.3; // fracción de oscurecimiento respecto del papel para considerar "rellenado"
  /*
    Franja de duda alrededor del umbral (20 % a 40 %). Con bolígrafo, un círculo relleno queda
    entre 75 % y 90 % y uno vacío por debajo de 15 % (ver pruebas/escaneo.html); en la franja
    caen las marcas a medias, las X o el lápiz muy suave. La lectura puede estar bien, pero
    no se registra sola: la confirma una persona.
  */
  const MARGEN = 0.1;
  const dudosos = (oscuro) => Object.keys(oscuro || {}).filter((k) => Math.abs(oscuro[k] - UMBRAL) < MARGEN);

  // Nombre de un círculo para mostrarlo: a1 → "A 1", woB → "W.O. B"
  const nombreCirculo = (k) => (k.startsWith('wo') ? 'W.O. ' + k[2] : k[0].toUpperCase() + ' ' + k[1]);

  function decidir(lleno) {
    const fila = (p) => ['0', '1', '2'].filter((d) => lleno[p + d]).map(Number);
    const avisos = [];
    if (lleno.woA || lleno.woB) {
      if (fila('a').length || fila('b').length) avisos.push('Se marcaron sets y W.O.: se tomó el W.O.');
      return { r: lleno.woA && lleno.woB ? 'woAB' : lleno.woA ? 'woA' : 'woB', avisos };
    }
    const a = fila('a'), b = fila('b');
    if (a.length !== 1 || b.length !== 1) {
      return { error: !a.length && !b.length ? 'No hay ningún círculo rellenado.' : 'Debe haber exactamente un círculo rellenado en la fila de cada equipo.' };
    }
    const r = `${a[0]}-${b[0]}`;
    if (!RM.tabla.RESULTADOS.includes(r)) return { error: `El resultado ${r} no es válido (debe ser 2-0, 2-1, 1-2 o 0-2).` };
    return { r, avisos };
  }

  async function escanear(archivo) {
    const img = await cargarImagen(archivo);
    let lectura = null, base = null;
    for (const lado of [1600, 2600, 1000]) {
      base = lienzo(img, lado);
      lectura = window.jsQR(base.data.data, base.c.width, base.c.height, { inversionAttempts: 'attemptBoth' });
      if (lectura) break;
    }
    if (!lectura) return { error: 'No se encontró el código QR. Toma la foto de frente y con buena luz.' };
    const info = leerTextoQR(lectura.data);
    if (!info) return { error: 'El QR no es de una planilla de RaquetMatch.' };

    const L = lectura.location;
    const H = homografia(
      [[0, 0], [1, 0], [1, 1], [0, 1]],
      [[L.topLeftCorner.x, L.topLeftCorner.y], [L.topRightCorner.x, L.topRightCorner.y],
       [L.bottomRightCorner.x, L.bottomRightCorner.y], [L.bottomLeftCorner.x, L.bottomLeftCorner.y]]
    );
    if (!H) return { ...info, error: 'No se pudo ubicar la zona del resultado.' };
    const q = LAYOUT.qr;
    const aImg = (x, y) => H(x / q, y / q);
    const radioImg = (x, y, r) => { const [x0, y0] = aImg(x, y); const [x1, y1] = aImg(x + r, y); return Math.hypot(x1 - x0, y1 - y0); };

    const papeles = LAYOUT.papel.map(([x, y]) => { const [u, v] = aImg(x, y); return brillo(base.data, u, v, radioImg(x, y, 1)); }).sort((m, n) => m - n);
    const papel = papeles[Math.floor(papeles.length / 2)] || 255;
    const oscuro = {}, lleno = {};
    LAYOUT.burbujas.forEach((bb) => {
      const [u, v] = aImg(bb.x, bb.y);
      const val = brillo(base.data, u, v, radioImg(bb.x, bb.y, LAYOUT.r * 0.55));
      oscuro[bb.key] = Math.max(0, (papel - val) / papel);
      lleno[bb.key] = oscuro[bb.key] > UMBRAL;
    });

    const vista = recorte(base.c, aImg, lleno);
    return { ...info, ...decidir(lleno), oscuro, dudosos: dudosos(oscuro), vista };
  }

  // Imagen pequeña de la zona leída, con los círculos detectados marcados
  function recorte(canvas, aImg, lleno) {
    const esquinas = [[-3, -3], [75, -3], [75, 33], [-3, 33]].map(([x, y]) => aImg(x, y));
    const xs = esquinas.map((p) => p[0]), ys = esquinas.map((p) => p[1]);
    const x0 = Math.max(0, Math.min(...xs)), y0 = Math.max(0, Math.min(...ys));
    const w = Math.min(canvas.width, Math.max(...xs)) - x0, h = Math.min(canvas.height, Math.max(...ys)) - y0;
    if (w <= 0 || h <= 0) return '';
    const k = 360 / w;
    const out = document.createElement('canvas');
    out.width = 360; out.height = Math.max(1, Math.round(h * k));
    const ctx = out.getContext('2d');
    ctx.drawImage(canvas, x0, y0, w, h, 0, 0, out.width, out.height);
    ctx.lineWidth = 3;
    LAYOUT.burbujas.forEach((bb) => {
      const [u, v] = aImg(bb.x, bb.y);
      const [u2] = aImg(bb.x + LAYOUT.r, bb.y);
      ctx.strokeStyle = lleno[bb.key] ? '#16a34a' : 'rgba(255,91,46,.55)';
      ctx.beginPath();
      ctx.arc((u - x0) * k, (v - y0) * k, Math.abs(u2 - u) * k + 3, 0, Math.PI * 2);
      ctx.stroke();
    });
    return out.toDataURL('image/jpeg', 0.8);
  }

  RM.planilla = { LAYOUT, UMBRAL, MARGEN, textoQR, leerTextoQR, qrSVG, homografia, escanear, decidir, dudosos, nombreCirculo };
})();
