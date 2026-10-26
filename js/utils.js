/* ===================== Utilidades generales ===================== */
(function () {
  'use strict';
  const RM = (window.RM = window.RM || {});
  RM.views = RM.views || {};

  RM.$ = (s, r) => (r || document).querySelector(s);
  RM.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  RM.esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  RM.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  RM.limpiar = (s) => String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
  // Quita tildes y pasa a minúsculas para comparar y buscar
  RM.norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  RM.shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ---------- Fechas (siempre en hora local, formato ISO yyyy-mm-dd) ----------
  RM.DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  RM.MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  RM.parseISO = (iso) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  RM.toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  RM.sumarDias = (iso, n) => {
    const d = RM.parseISO(iso);
    d.setDate(d.getDate() + n);
    return RM.toISO(d);
  };
  // Primera fecha (desde iso inclusive) que cae en el día de la semana indicado
  RM.alinearDia = (iso, dia) => {
    const d = RM.parseISO(iso);
    if (!d) return null;
    while (d.getDay() !== dia) d.setDate(d.getDate() + 1);
    return RM.toISO(d);
  };
  RM.fechaLarga = (iso) => {
    const d = RM.parseISO(iso);
    return d ? `${RM.DIAS[d.getDay()]} ${d.getDate()} de ${RM.MESES[d.getMonth()]} de ${d.getFullYear()}` : '';
  };

  RM.fechaCorta = (iso) => {
    const d = RM.parseISO(iso);
    return d ? `${d.getDate()} ${RM.MESES[d.getMonth()].slice(0, 3)}` : '';
  };

  // ---------- Íconos SVG ----------
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
    shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    hash: '<path d="M5 9h14M5 15h14M10 3 8 21M16 3l-2 18"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    alert: '<path d="M12 3 2 21h20zM12 10v5M12 18v.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
    camera: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13.5" r="3.5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'
  };
  RM.icon = (name, size) => {
    const s = size || 16;
    return `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  };

  // ---------- Notificación breve ----------
  let toastTimer;
  RM.toast = (msg, warn) => {
    const t = RM.$('#toast');
    if (!t) return;
    t.classList.toggle('warn', !!warn);
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  };
})();
