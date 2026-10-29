/* ===================== Perfil del jugador (foto y avatar) ===================== */
(function () {
  'use strict';
  const RM = window.RM;

  // Lado en px de la foto guardada y calidad JPEG: 160×160 ocupa ~8–15 KB
  const LADO = 160;
  const CALIDAD = 0.8;
  // Tope del texto de la foto: protege de respaldos editados a mano o enormes
  const MAX_FOTO = 60 * 1024;

  /*
    Cuadrado central de una imagen ancho×alto. Se usa en
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO, LADO) para recortar sin deformar.
  */
  function recorteCentrado(ancho, alto) {
    const lado = Math.min(ancho, alto);
    return { sx: Math.floor((ancho - lado) / 2), sy: Math.floor((alto - lado) / 2), lado };
  }

  /*
    Solo data URL base64 de JPEG, PNG o WebP y de tamaño razonable. Se descarta todo lo demás
    (http:, javascript:, SVG, texto suelto) para no guardar imágenes rotas de respaldos editados a mano.
  */
  const FORMATO_FOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  const fotoValida = (v) => typeof v === 'string' && v.length <= MAX_FOTO && FORMATO_FOTO.test(v);

  // Respaldos viejos no traen foto; una foto inválida se descarta (queda el perfil por defecto)
  function normalizarJugador(j) {
    return { ...j, foto: fotoValida(j.foto) ? j.foto : '' };
  }

  // Inicial del nombre + inicial del apellido, sin la inicial de desambiguación ("G. ")
  function iniciales(j) {
    const a = (j.apellidos || '').replace(/^[A-Z]\./i, '');
    return ((j.nombres || '')[0] || '') + (a[0] || '') || '?';
  }

  /*
    Avatar compartido por Jugadores, Equipos y Tabla. Devuelve solo texto HTML
    (sin DOM) para poder probarlo en Node. Sin foto: perfil por defecto con iniciales.
  */
  function avatarHTML(j, cat, tam) {
    const clases = ['avatar', tam === 'sm' ? 'sm' : '', cat ? '' : 'nocat'].filter(Boolean).join(' ');
    const estilo = cat ? ` style="--cat:${RM.esc(cat.color)}"` : '';
    const dentro = fotoValida(j.foto) ? `<img src="${RM.esc(j.foto)}" alt="">` : RM.esc(iniciales(j).toUpperCase());
    return `<span class="${clases}"${estilo}>${dentro}</span>`;
  }

  RM.perfil = { LADO, CALIDAD, MAX_FOTO, recorteCentrado, fotoValida, normalizarJugador, iniciales, avatarHTML };
})();
