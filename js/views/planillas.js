/* ===================== Vista: Planillas (imprimir y escanear) ===================== */
(function () {
  'use strict';
  const RM = window.RM;
  const { esc, icon } = RM;

  // escaneos: resultados de lectura en memoria (no se guardan hasta confirmar)
  // camara: transmisión en vivo; auto = registrar solas las lecturas claras;
  // visto = QR visto en los últimos cuadros; ultima = planilla ya leída que sigue frente a la cámara
  const ui = {
    j: 0, excluir: new Set(), preview: null, escaneos: [], procesando: false,
    camara: { stream: null, error: '', auto: true, aviso: null, visto: { pid: null, veces: 0 }, ultima: null }
  };
  const estado = () => RM.store.state;

  const ETIQUETA = { '2-0': '2-0', '2-1': '2-1', '1-2': '1-2', '0-2': '0-2', woA: 'W.O. (no vino A)', woB: 'W.O. (no vino B)', woAB: 'W.O. (no vino ninguno)' };

  function numJornadas() {
    const s = estado();
    return Math.max(0, ...s.campeonato.categorias.map((c) => (s.fixture[c.id] ? s.fixture[c.id].jornadas.length : 0)));
  }

  // Partidos de la jornada con hora y cancha si la programación está al día
  function partidos(j) {
    const s = estado();
    const prog = s.programacion;
    const ok = prog && prog.firma === RM.programacion.firma(s.fixture, s.campeonato.categorias, s.campeonato.canchas) && prog.jornadas[j];
    const nomCancha = (id) => (s.campeonato.canchas.find((k) => k.id === id) || {}).nombre || '';
    if (ok) {
      return prog.jornadas[j].asignaciones
        .map((a) => ({ catId: a.catId, p: RM.q.partido(a.catId, a.partidoId), hora: a.hora, cancha: nomCancha(a.canchaId) }))
        .concat(prog.jornadas[j].sinHorario.map((x) => ({ catId: x.catId, p: RM.q.partido(x.catId, x.partidoId), hora: '', cancha: '' })))
        .filter((x) => x.p);
    }
    const lista = [];
    s.campeonato.categorias.forEach((c) => {
      const fj = s.fixture[c.id] && s.fixture[c.id].jornadas[j];
      if (fj) fj.partidos.forEach((p) => lista.push({ catId: c.id, p, hora: '', cancha: '' }));
    });
    return lista;
  }

  function render(el) {
    const nJ = numJornadas();
    if (ui.j >= nJ) ui.j = 0;
    const head = `<section class="page-head">
        <div><span class="num">08 — IMPRESIÓN</span><h2>Planillas</h2></div>
        <p>Imprime la planilla de control de cada partido. Al terminar, escanea o fotografía la hoja: el sistema lee el QR y los círculos del resultado final.</p>
      </section>`;
    if (!nJ) {
      el.innerHTML = `${head}<div class="empty">Primero genera el fixture en la pestaña <a href="#/fixture">Fixture</a>.</div>`;
      return;
    }
    const lista = partidos(ui.j);
    const incluidos = lista.filter((x) => !ui.excluir.has(x.p.id));
    if (!ui.preview || !lista.some((x) => x.p.id === ui.preview)) ui.preview = lista.length ? lista[0].p.id : null;

    el.innerHTML = `<div class="pl-root">${head}
      <div class="grid-2 planillas-grid">
        <section class="card">
          <h3 class="card-title">${icon('print')} Imprimir</h3>
          <div class="seg seg-wrap" role="group" aria-label="Jornada" data-zona="jornadas">
            ${Array.from({ length: nJ }, (_, j) => `<button type="button" data-j="${j}" aria-pressed="${j === ui.j}">J${j + 1}</button>`).join('')}
          </div>
          <ul class="sheet-list">${lista.map((x) => {
            const cat = RM.q.categoria(x.catId);
            return `<li style="--cat:${esc(cat ? cat.color : '#888')}" class="${ui.preview === x.p.id ? 'on' : ''}">
              <input type="checkbox" id="inc-${x.p.id}" data-inc="${x.p.id}" ${ui.excluir.has(x.p.id) ? '' : 'checked'} aria-label="Incluir en la impresión">
              <button type="button" class="sheet-pick" data-ver="${x.p.id}">
                <span class="res-when">${x.hora ? `<b>${x.hora}</b>` : ''}<small>${esc(x.cancha)}</small></span>
                <span class="res-teams"><span class="cat-tag">${esc(cat ? cat.nombre : '')}</span>${esc(RM.q.nombrePorNumero(x.catId, x.p.a))} <i>vs</i> ${esc(RM.q.nombrePorNumero(x.catId, x.p.b))}</span>
              </button>
            </li>`;
          }).join('')}</ul>
          <div class="form-actions">
            <button class="btn primary" type="button" data-act="imprimir" ${incluidos.length ? '' : 'disabled'}>${icon('print')} Imprimir ${incluidos.length} planilla${incluidos.length === 1 ? '' : 's'}</button>
          </div>
          <p class="hint">Imprime en A4 al 100 % (sin "ajustar a la página" si es posible). El recuadro del resultado no debe doblarse ni taparse.</p>
        </section>

        <section class="card">
          <h3 class="card-title">${icon('upload')} Escanear planillas llenas</h3>
          <p class="hint">Sube fotos o escaneos, o toma la foto con la cámara del celular o de la computadora. Debe verse completo el recuadro <b>RESULTADO FINAL</b>.</p>
          <div class="form-actions">
            <label class="btn primary file-btn">${icon('upload')} ${ui.procesando ? 'Leyendo…' : 'Subir fotos'}
              <input type="file" accept="image/*" multiple data-act="archivos" ${ui.procesando ? 'disabled' : ''}>
            </label>
            ${botonCamara()}
            ${ui.escaneos.some((x) => x.listo) ? `<button class="btn" type="button" data-act="guardarTodos">${icon('check')} Guardar todos los válidos</button>` : ''}
            ${ui.escaneos.length ? `<button class="btn sm" type="button" data-act="limpiar">Limpiar lista</button>` : ''}
          </div>
          ${ui.camara.error ? `<p class="alert warn">${icon('alert')}<span>${esc(ui.camara.error)}</span></p>` : ''}
          ${ui.camara.stream ? camaraHTML() : ''}
          <ul class="scan-list">${ui.escaneos.map(escaneoHTML).join('')}</ul>
        </section>
      </div>
      <h3 class="sub">Vista previa</h3>
      <div class="sheets">${incluidos.map((x) => sheetHTML(x, x.p.id === ui.preview)).join('')}${ui.preview && ui.excluir.has(ui.preview) ? sheetHTML(lista.find((x) => x.p.id === ui.preview), true, true) : ''}</div></div>`;
    bind(el);
    conectarVideo(el);
  }

  // ---------- Cámara ----------
  /*
    Con getUserMedia se ve la cámara en vivo dentro de la pestaña (celular o computadora).
    Necesita un contexto seguro: funciona abriendo index.html como archivo o desde https/localhost.
    Si no está disponible (por ejemplo, la app abierta por http desde otra computadora), el botón
    se vuelve un selector de archivos con capture="environment", que en el celular abre la cámara.
  */
  const hayCamaraEnVivo = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  function botonCamara() {
    if (ui.camara.stream) return '';
    if (!hayCamaraEnVivo()) {
      return `<label class="btn primary file-btn">${icon('camera')} Tomar foto
        <input type="file" accept="image/*" capture="environment" data-act="archivos" ${ui.procesando ? 'disabled' : ''}>
      </label>`;
    }
    return `<button class="btn primary" type="button" data-act="camara">${icon('camera')} Tomar foto</button>`;
  }

  /*
    Aviso sobre el video. tipo: 'buscar' (sin QR), 'ok' (QR visto o lectura registrada, verde)
    o 'revisar' (la lectura quedó abajo para confirmar, naranja).
  */
  const AVISO_BUSCAR = { tipo: 'buscar', texto: 'Encuadra el recuadro RESULTADO FINAL dentro de la guía' };

  function avisoHTML(a) {
    return `${a.tipo === 'ok' ? icon('check') : a.tipo === 'revisar' ? icon('alert') : ''} ${esc(a.texto)}`;
  }

  function camaraHTML() {
    const a = ui.camara.aviso;
    return `<div class="cam">
      <div class="cam-view ${a.tipo === 'buscar' ? '' : a.tipo === 'ok' ? 'ok' : 'warn'}">
        <video playsinline muted aria-label="Vista de la cámara"></video>
        <span class="cam-guia" aria-hidden="true"></span>
        <p class="cam-estado" role="status">${avisoHTML(a)}</p>
      </div>
      <label class="cam-auto"><input type="checkbox" data-act="auto" ${ui.camara.auto ? 'checked' : ''}> Registrar automáticamente las lecturas claras</label>
      <div class="form-actions">
        <button class="btn ${ui.camara.auto ? '' : 'primary'}" type="button" data-act="capturar" ${ui.procesando ? 'disabled' : ''}>${icon('camera')} ${ui.procesando ? 'Leyendo…' : ui.camara.auto ? 'Capturar ahora' : 'Capturar'}</button>
        <button class="btn" type="button" data-act="cerrarCamara">Cerrar cámara</button>
      </div>
      <p class="hint">${ui.camara.auto
        ? 'Pon cada planilla frente a la cámara y mantenla quieta un momento: se lee y se registra sola. Si algún círculo quedó dudoso, o el partido ya tenía otro resultado, queda abajo para que lo revises.'
        : 'Encuadra la planilla y presiona Capturar. Revisa la lectura abajo y guárdala.'} Usa buena luz y evita sombras sobre los círculos.</p>
    </div>`;
  }

  async function abrirCamara() {
    ui.camara.error = '';
    try {
      // Cámara trasera si existe; resolución alta para que el QR y los círculos se lean bien
      ui.camara.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false
      });
    } catch (e) {
      ui.camara.stream = null;
      ui.camara.error = e.name === 'NotAllowedError' ? 'No se dio permiso para usar la cámara. Actívalo en el navegador o usa "Subir fotos".'
        : e.name === 'NotFoundError' ? 'No se encontró ninguna cámara en este equipo. Usa "Subir fotos".'
        : e.name === 'NotReadableError' ? 'La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.'
        : 'No se pudo abrir la cámara: ' + e.message;
    }
    ui.camara.aviso = AVISO_BUSCAR;
    ui.camara.visto = { pid: null, veces: 0 };
    ui.camara.ultima = null;
    RM.app.render();
  }

  function cerrarCamara() {
    if (ui.camara.stream) ui.camara.stream.getTracks().forEach((t) => t.stop());
    ui.camara.stream = null;
    ui.camara.aviso = AVISO_BUSCAR;
    clearInterval(ui.camara.vigia);
  }

  // Cambia solo el aviso del visor, sin redibujar la vista (el video tendría que reconectarse)
  function avisar(a) {
    ui.camara.aviso = a;
    const vista = RM.$('.cam-view'), estado = RM.$('.cam-estado');
    if (vista) { vista.classList.toggle('ok', a.tipo === 'ok'); vista.classList.toggle('warn', a.tipo === 'revisar'); }
    if (estado) estado.innerHTML = avisoHTML(a);
  }

  // Cada render crea un <video> nuevo: se le vuelve a conectar la transmisión y se vigila el QR
  function conectarVideo(el) {
    const video = RM.$('.cam video', el);
    if (!video || !ui.camara.stream) return;
    // El visor toma la forma del video: horizontal en la computadora, vertical en un celular parado
    const ajustar = () => { if (video.videoWidth) video.parentElement.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`; };
    video.addEventListener('loadedmetadata', ajustar);
    video.srcObject = ui.camara.stream;
    video.play().catch(() => { /* se reproduce cuando el navegador lo permita */ });
    clearInterval(ui.camara.vigia);
    const muestra = document.createElement('canvas');
    ui.camara.vigia = setInterval(() => vigilar(video, muestra), 300);
  }

  /*
    Cada 0,3 s busca el QR en una copia pequeña del video.
    - Con registro automático, cuando ve el mismo QR dos veces seguidas (la hoja está quieta)
      captura sola en resolución completa.
    - La última planilla leída no se vuelve a capturar mientras siga frente a la cámara;
      si se saca de la vista por más de 1,5 s, se puede volver a leer.
  */
  function vigilar(video, muestra) {
    // Si se cambió de pestaña el video ya no está en la página: se apaga la cámara
    if (!video.isConnected) { cerrarCamara(); return; }
    if (!video.videoWidth || ui.procesando) return;
    const k = Math.min(1, 640 / video.videoWidth);
    muestra.width = Math.round(video.videoWidth * k);
    muestra.height = Math.round(video.videoHeight * k);
    const ctx = muestra.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, muestra.width, muestra.height);
    const lectura = window.jsQR(ctx.getImageData(0, 0, muestra.width, muestra.height).data, muestra.width, muestra.height, { inversionAttempts: 'dontInvert' });
    const info = lectura ? RM.planilla.leerTextoQR(lectura.data) : null;
    const cam = ui.camara, ahora = Date.now();

    if (!info) {
      cam.visto = { pid: null, veces: 0 };
      if (cam.ultima && ahora - cam.ultima.vista > 1500) cam.ultima = null;
      if (!cam.ultima && cam.aviso.tipo !== 'buscar') avisar(AVISO_BUSCAR);
      return;
    }
    if (cam.ultima && cam.ultima.pid === info.pid) {
      cam.ultima.vista = ahora; // sigue la misma hoja: se mantiene el aviso de su lectura
      return;
    }
    cam.visto = cam.visto.pid === info.pid ? { pid: info.pid, veces: cam.visto.veces + 1 } : { pid: info.pid, veces: 1 };
    if (!cam.auto) { avisar({ tipo: 'ok', texto: 'QR detectado: ya puedes capturar' }); return; }
    if (cam.visto.veces < 2) { avisar({ tipo: 'ok', texto: 'QR detectado: mantén la hoja quieta…' }); return; }
    avisar({ tipo: 'ok', texto: 'Leyendo la planilla…' });
    capturar();
  }

  // Toma el cuadro actual en resolución completa y lo procesa igual que una foto subida
  function capturar() {
    const video = RM.$('.cam video');
    if (!video || !video.videoWidth || ui.procesando) return;
    ui.procesando = true; // evita una segunda captura mientras se arma la imagen
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    const hora = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
    c.toBlob((blob) => {
      ui.procesando = false;
      if (blob) procesar([new File([blob], `camara-${hora}.jpg`, { type: 'image/jpeg' })], { camara: true });
    }, 'image/jpeg', 0.92);
  }

  // ---------- Planilla imprimible ----------
  function nomina(catId, num) {
    const e = RM.q.equipoPorNumero(catId, num);
    const js = e ? e.jugadores.map(RM.q.jugador).filter(Boolean) : [];
    return [0, 1, 2].map((i) => `<div class="sh-line"><span>${i + 1}.</span><b>${js[i] ? esc(RM.q.nombreCompleto(js[i])) + (i === 2 ? ' (relevo)' : '') : ''}</b><span>Firma</span><span class="fill"></span></div>`).join('');
  }

  function puntos(max) {
    return `<div class="sh-set"><div class="sh-pts">${Array.from({ length: max }, (_, i) => `<span>${i + 1}</span>`).join('')}</div><span class="sh-box"></span></div>`;
  }

  function columnaEquipo(x, num, lado) {
    return `<div class="sh-col">
      <p class="sh-team"><span>Equipo ${lado}</span><b>${esc(RM.q.nombrePorNumero(x.catId, num))}</b></p>
      <h4>Nómina de jugadores</h4>${nomina(x.catId, num)}
      <h4>Primera cancha</h4>${puntos(18)}
      <h4>Segunda cancha</h4>${puntos(18)}
      <h4>Tercera cancha</h4>${puntos(16)}
      <div class="sh-cm"><div><h4>Cambios</h4><span class="sh-123">1 - 2 - 3</span></div><div><h4>Minutos</h4><span class="sh-123">1 - 2 - 3</span></div></div>
    </div>`;
  }

  function zonaResultado(x) {
    const L = RM.planilla.LAYOUT;
    const qr = RM.planilla.qrSVG(RM.planilla.textoQR(x.p.id, x.p.a, x.p.b));
    const bur = L.burbujas.map((b) => `<span class="omr-b" style="left:${b.x - L.r}mm;top:${b.y - L.r}mm;width:${2 * L.r}mm;height:${2 * L.r}mm">${b.txt}</span>`).join('');
    return `<div class="omr">
      ${qr}${bur}
      <span class="omr-l" style="top:${5 - 2}mm">Sets ganados por A</span>
      <span class="omr-l" style="top:${15 - 2}mm">Sets ganados por B</span>
      <span class="omr-l" style="top:${25 - 2}mm">W.O.: rellena el que no vino</span>
    </div>`;
  }

  function sheetHTML(x, preview, soloPreview) {
    const s = estado();
    const c = s.campeonato;
    const cat = RM.q.categoria(x.catId);
    const fecha = RM.q.fechasJornadas()[ui.j];
    const A = esc(RM.q.nombrePorNumero(x.catId, x.p.a));
    const B = esc(RM.q.nombrePorNumero(x.catId, x.p.b));
    return `<article class="sheet ${preview ? 'preview' : ''} ${soloPreview ? 'no-print' : ''}">
      <header class="sh-head">
        <h2>Planilla de control · Campeonato "${esc(c.nombre)}"</h2>
        <p>Gestión ${c.gestion} · Temporada ${c.temporada} · Vuelta ${c.vuelta} · Categoría ${esc(cat ? cat.nombre : '')} · Jornada ${ui.j + 1}</p>
      </header>
      <div class="sh-data">
        <div><span>Fecha</span><b>${fecha ? RM.fechaLarga(fecha) : ''}</b></div>
        <div><span>Hora</span><b>${x.hora || ''}</b></div>
        <div><span>Cancha</span><b>${esc(x.cancha)}</b></div>
        <div><span>Árbitro</span><b></b></div>
        <div><span>Mesa de control</span><b></b></div>
      </div>
      <div class="sh-cols">${columnaEquipo(x, x.p.a, 'A')}${columnaEquipo(x, x.p.b, 'B')}</div>
      <div class="sh-obs"><h4>Observaciones del partido</h4><span></span><span></span></div>
      <section class="sh-result">
        <h3>Resultado final</h3>
        <p class="sh-help">Rellena <b>completamente</b> un círculo por fila con bolígrafo oscuro: sets ganados por A y por B (2-0, 2-1, 1-2 o 0-2). Si un equipo no se presentó, rellena solo su W.O. &nbsp;·&nbsp; <b>A</b> = ${A} &nbsp;·&nbsp; <b>B</b> = ${B}</p>
        ${zonaResultado(x)}
        <div class="sh-firmas"><span>Firma árbitro</span><span>Firma capitán A</span><span>Firma capitán B</span></div>
      </section>
    </article>`;
  }

  // ---------- Escaneo ----------
  function buscarPartido(pid) {
    const s = estado();
    for (const c of s.campeonato.categorias) {
      const p = RM.q.partido(c.id, pid);
      if (p) return { catId: c.id, p };
    }
    return null;
  }

  function escaneoHTML(x, i) {
    const encontrado = x.pid ? buscarPartido(x.pid) : null;
    const cat = encontrado ? RM.q.categoria(encontrado.catId) : null;
    const A = encontrado ? esc(RM.q.nombrePorNumero(encontrado.catId, encontrado.p.a)) : '';
    const B = encontrado ? esc(RM.q.nombrePorNumero(encontrado.catId, encontrado.p.b)) : '';
    const previo = encontrado ? RM.tabla.resultadoDe(estado(), encontrado.p) : null;
    const opciones = Object.keys(ETIQUETA).map((k) => `<option value="${k}" ${x.r === k ? 'selected' : ''}>${ETIQUETA[k]}</option>`).join('');
    return `<li class="scan ${x.guardado ? 'saved' : x.error ? 'bad' : 'good'}" ${cat ? `style="--cat:${esc(cat.color)}"` : ''}>
      ${x.vista ? `<img src="${x.vista}" alt="Zona de resultado leída de ${esc(x.archivo)}">` : ''}
      <div class="scan-info">
        <small>${esc(x.archivo)}</small>
        ${encontrado ? `<b>${cat ? esc(cat.nombre) + ' · ' : ''}${A} <i>vs</i> ${B}</b>` : ''}
        ${x.error ? `<p class="scan-msg">${icon('alert')} ${esc(x.error)}</p>` : ''}
        ${(x.avisos || []).map((a) => `<p class="scan-msg">${icon('alert')} ${esc(a)}</p>`).join('')}
        ${!x.error && !x.guardado && (x.dudosos || []).length ? `<p class="scan-msg">${icon('alert')} Círculo${x.dudosos.length > 1 ? 's' : ''} poco marcado${x.dudosos.length > 1 ? 's' : ''}: ${x.dudosos.map(RM.planilla.nombreCirculo).join(', ')}. Mira la imagen y confirma el resultado.</p>` : ''}
        ${previo && x.r && previo.r !== x.r && !x.guardado ? `<p class="scan-msg">${icon('alert')} Ya tenía cargado ${ETIQUETA[previo.r]}: se reemplazará.</p>` : ''}
        ${x.guardado ? `<p class="scan-ok">${icon('check')} ${x.repetido ? 'Ya estaba registrado con este resultado' : x.auto ? 'Registrado automáticamente' : 'Guardado'}</p>` : ''}
        ${encontrado ? `<div class="scan-actions">
            <select class="input sm" data-scan="${i}" aria-label="Resultado detectado (puedes corregirlo)"><option value="">Elegir resultado…</option>${opciones}</select>
            ${x.guardado && !x.repetido
              ? `<button class="btn sm" type="button" data-deshacer="${i}">Deshacer</button>`
              : `<button class="btn primary sm" type="button" data-guardar="${i}" ${x.r && !x.guardado ? '' : 'disabled'}>${x.guardado ? `${icon('check')} Guardado` : 'Guardar'}</button>`}
          </div>` : ''}
      </div>
    </li>`;
  }

  // opts.camara: la imagen viene de la cámara (se registra sola si la lectura es clara y está activado)
  async function procesar(archivos, opts = {}) {
    ui.procesando = true;
    RM.app.render();
    for (const f of archivos) {
      let res;
      try { res = await RM.planilla.escanear(f); } catch (e) { res = { error: e.message }; }
      res.archivo = f.name;
      const qrVisto = res.pid;
      if (res.pid) {
        const enc = buscarPartido(res.pid);
        if (!enc) { res.error = 'Esta planilla no corresponde a ningún partido del fixture actual.'; res.pid = null; }
        else if (enc.p.a !== res.a || enc.p.b !== res.b) { res.error = 'La planilla es de un fixture anterior: los equipos ya no coinciden.'; res.pid = null; }
      }
      res.listo = !!(res.pid && res.r && !res.error);
      ui.escaneos.unshift(res);
      if (opts.camara) {
        // Aunque la lectura falle, esa hoja no se vuelve a capturar mientras siga frente a la cámara
        ui.camara.ultima = { pid: qrVisto || ui.camara.visto.pid, vista: Date.now() };
        ui.camara.aviso = ui.camara.auto ? registrarSiEsClara(res) : { tipo: res.listo ? 'ok' : 'revisar', texto: res.listo ? `Leído: ${ETIQUETA[res.r]}. Revisa abajo y guárdalo` : 'Revisa la lectura abajo' };
      }
      RM.app.render();
    }
    ui.procesando = false;
    RM.app.render();
    if (!opts.camara) {
      const ok = ui.escaneos.filter((x) => x.listo).length;
      RM.toast(`${archivos.length} imagen(es) leída(s) · ${ok} lista(s) para guardar`);
    }
  }

  /*
    Registro automático (solo desde la cámara). Se guarda sola únicamente una lectura clara:
    sin errores, sin avisos, sin círculos dudosos y sin pisar un resultado distinto ya cargado.
    Todo lo demás queda en la lista para que una persona lo confirme. Devuelve el aviso del visor.
  */
  function registrarSiEsClara(x) {
    const enc = x.pid ? buscarPartido(x.pid) : null;
    const nombre = enc ? `${RM.q.nombrePorNumero(enc.catId, enc.p.a)} vs ${RM.q.nombrePorNumero(enc.catId, enc.p.b)}` : '';
    // El navegador solo deja vibrar si la persona ya tocó la página (al tocar "Tomar foto")
    const vibrar = (patron) => {
      const toco = !navigator.userActivation || navigator.userActivation.hasBeenActive;
      if (navigator.vibrate && toco) navigator.vibrate(patron);
    };
    if (!x.listo) {
      vibrar([60, 60, 60]);
      return { tipo: 'revisar', texto: x.error ? 'No se pudo leer: revisa abajo' : 'Revisa la lectura abajo' };
    }
    const previo = RM.tabla.resultadoDe(estado(), enc.p);
    const motivo = (x.avisos || []).length ? 'tiene avisos'
      : (x.dudosos || []).length ? 'hay círculos poco marcados'
      : previo && previo.r !== x.r ? `ya tenía ${ETIQUETA[previo.r]}` : '';
    if (motivo) {
      vibrar([60, 60, 60]);
      return { tipo: 'revisar', texto: `${ETIQUETA[x.r]}: no se registró porque ${motivo}. Revisa abajo` };
    }
    if (previo) {
      // Ya estaba guardado el mismo resultado: no hay nada que cambiar
      x.guardado = true;
      x.listo = false;
      x.repetido = true;
      return { tipo: 'ok', texto: `Ya estaba registrado: ${nombre} ${ETIQUETA[x.r]}` };
    }
    registrar([x], true);
    vibrar(120);
    return { tipo: 'ok', texto: `Registrado: ${nombre} ${ETIQUETA[x.r]}` };
  }

  // Guarda las lecturas en los resultados; recuerda el resultado anterior para poder deshacer
  function registrar(lista, auto) {
    RM.store.commit((st) => {
      lista.forEach((x) => {
        const enc = buscarPartido(x.pid);
        if (!enc) return;
        x.anterior = st.resultados[x.pid] ? { ...st.resultados[x.pid] } : null;
        st.resultados[x.pid] = { catId: enc.catId, a: enc.p.a, b: enc.p.b, r: x.r };
        x.guardado = true;
        x.auto = !!auto;
        x.listo = false;
      });
    }, { silent: true });
  }

  function guardar(indices) {
    const validos = indices.map((i) => ui.escaneos[i]).filter((x) => x && x.pid && x.r && !x.guardado);
    if (!validos.length) return;
    registrar(validos, false);
    RM.app.render();
    RM.toast(`${validos.length} resultado(s) guardado(s)`);
  }

  function deshacer(i) {
    const x = ui.escaneos[i];
    if (!x || !x.guardado || x.repetido) return;
    RM.store.commit((st) => {
      if (x.anterior) st.resultados[x.pid] = x.anterior;
      else delete st.resultados[x.pid];
    }, { silent: true });
    x.guardado = false;
    x.auto = false;
    x.listo = true;
    RM.app.render();
    RM.toast('Se deshizo el registro');
  }

  function bind(el) {
    // Se escucha en .pl-root (se recrea en cada render) y no en <main>, para no afectar a otras pestañas
    const root = RM.$('.pl-root', el);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
  }

  function onClick(e) {
    const t = e.target;
    const j = t.closest('[data-zona="jornadas"] [data-j]');
    if (j) { ui.j = +j.dataset.j; ui.preview = null; RM.app.render(); return; }
    const ver = t.closest('[data-ver]');
    if (ver) { ui.preview = ver.dataset.ver; RM.app.render(); return; }
    const act = t.closest('[data-act]');
    if (act && act.dataset.act === 'imprimir') { imprimir(); return; }
    if (act && act.dataset.act === 'guardarTodos') { guardar(ui.escaneos.map((_, i) => i)); return; }
    if (act && act.dataset.act === 'limpiar') { ui.escaneos = []; RM.app.render(); return; }
    if (act && act.dataset.act === 'camara') { abrirCamara(); return; }
    if (act && act.dataset.act === 'capturar') { capturar(); return; }
    if (act && act.dataset.act === 'cerrarCamara') { cerrarCamara(); RM.app.render(); return; }
    const g = t.closest('[data-guardar]');
    if (g && !g.disabled) { guardar([+g.dataset.guardar]); return; }
    const d = t.closest('[data-deshacer]');
    if (d) deshacer(+d.dataset.deshacer);
  }

  function onChange(e) {
    const t = e.target;
    if (t.dataset.inc) {
      if (t.checked) ui.excluir.delete(t.dataset.inc); else ui.excluir.add(t.dataset.inc);
      RM.app.render();
    } else if (t.dataset.act === 'archivos' && t.files.length) {
      procesar(Array.from(t.files));
    } else if (t.dataset.act === 'auto') {
      ui.camara.auto = t.checked;
      ui.camara.aviso = AVISO_BUSCAR;
      RM.app.render();
    } else if (t.dataset.scan) {
      const x = ui.escaneos[+t.dataset.scan];
      x.r = t.value;
      x.guardado = false;
      x.listo = !!(x.pid && x.r);
      RM.app.render();
    }
  }

  function imprimir() {
    document.body.classList.add('print-sheets');
    const fin = () => { document.body.classList.remove('print-sheets'); window.removeEventListener('afterprint', fin); };
    window.addEventListener('afterprint', fin);
    window.print();
  }

  RM.views.planillas = { render };
})();
