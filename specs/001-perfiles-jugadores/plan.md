# 001 · Plan

## Archivos

| Archivo | Cambio |
|---|---|
| `js/perfil.js` (nuevo) | lógica sin DOM: `recorteCentrado`, `fotoValida`, `normalizarJugador`, `iniciales` y el helper de texto `avatarHTML` |
| `js/store.js` | normalizar jugadores al cargar e importar; `save()` devuelve `false` si `localStorage.setItem` falla |
| `index.html` | `<script src="js/perfil.js">` entre `utils.js` y `store.js` (el store lo usa al cargar) |
| `pruebas/cargar.js` | agregar `perfil.js` a la lista, en el mismo orden que `index.html` |
| `js/views/jugadores.js` | control de foto con vista previa y "Quitar foto", reducción por `<canvas>`, avatar con `RM.perfil.avatarHTML`, aviso si no se pudo guardar; se quita la función local `iniciales()` |
| `js/views/equipos.js` | en `equipoHTML`, avatar pequeño junto a cada jugador de la línea `<small>` |
| `js/views/tabla.js` | en la fila (`<th scope="row">`), avatares pequeños de la pareja antes del nombre del equipo |
| `css/components.css` | `.avatar img`, tamaño pequeño `.avatar.sm`, grupo `.avatares`, vista previa del formulario; colores solo con variables de `css/base.css`; ajuste a 520px |
| `css/print.css` | ocultar `.avatares` / `.avatar` al imprimir |
| `pruebas/perfil.test.js` (nuevo) | pruebas de la lógica |
| `README.md` | foto, perfil por defecto, límite de espacio y cuidado al compartir el respaldo |

No se tocan `RM.q.nombreCorto`, `RM.q.nombreEquipo` ni `js/views/planillas.js`.

## Diseño

**Modelo:** jugador pasa a `{ id, nombres, apellidos, ci, celular, categoria, foto }`. `foto` es un data URL JPEG o `''` (vacío = perfil por defecto de iniciales).

**Lógica (`js/perfil.js`, se carga en Node con `pruebas/cargar.js`):**
- `recorteCentrado(ancho, alto)`: `{ sx, sy, lado }` del cuadrado central; la vista lo usa en `ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO, LADO)`.
- `fotoValida(v)`: `true` solo para cadenas que empiezan con `data:image/` y no pasan de 60 KB (protege de respaldos editados a mano o enormes).
- `normalizarJugador(j)`: completa `foto: ''` si falta y descarta una `foto` inválida, sin tocar los demás campos.
- `iniciales(j)`: se mueve aquí desde `jugadores.js` (misma regla de hoy).
- `avatarHTML(j, cat, tam)`: **un solo helper** para las tres vistas. Devuelve solo texto HTML (no toca el DOM, por eso se puede probar en Node): `<span class="avatar [sm] [nocat]" style="--cat:…"><img src="…" alt=""></span>` si `fotoValida(j.foto)`, si no el `<span>` con las iniciales. Todo valor pasa por `RM.esc`. Va en `perfil.js` y no en `utils.js` para que todo lo del perfil quede junto.
- Constantes `LADO = 160`, `CALIDAD = 0.8`.

**Vistas:**
- Jugadores: `ui.foto` guarda la foto pendiente del formulario (no entra al estado hasta guardar); al editar se inicia con la del jugador. Al elegir archivo: `FileReader.readAsDataURL` → `Image` → `canvas` 160×160 con `recorteCentrado` → `toDataURL('image/jpeg', CALIDAD)`. Funciona en `file://` porque la imagen la elige el usuario desde su equipo. Si falla, mensaje en `#jErr`.
- Equipos: `js.map((j) => RM.perfil.avatarHTML(j, cat, 'sm') + esc(nombreCompleto))`.
- Tabla: `<span class="avatares">` con los avatares `sm` de los jugadores del equipo (`RM.q.equipoPorNumero(cat.id, f.num)`), antes del nombre. Si el equipo no existe, nada.
- Después de `RM.store.commit`, si el guardado falló: `RM.toast('No hay espacio para guardar. Quita fotos o exporta un respaldo.', true)`. Revisar cómo `commit` llama a `save` para propagar el resultado.

## Pruebas

- Automáticas (`pruebas/perfil.test.js`):
  - `recorteCentrado`: 4000×3000 → `{ sx: 500, sy: 0, lado: 3000 }`, vertical, cuadrada, 1×1.
  - `fotoValida`: data URL JPEG, vacío, `javascript:…`, `http://…`, demasiado larga, no-cadena.
  - `normalizarJugador`: jugador viejo → agrega `foto: ''`; foto inválida → `''`; no cambia `id`, `ci`, etc.
  - `iniciales`: mismos casos que la regla actual (con y sin nombres, apellido con inicial "G.").
  - `avatarHTML`: con foto → contiene `<img`; sin foto → iniciales; sin categoría → clase `nocat`; tamaño `sm`; nombre con `<b>` sale escapado.
- En la app (skill `probar-raquetmatch`, mirando capturas): agregar jugador con foto grande, editar, quitar foto, archivo no imagen, ver Equipos y Tabla con y sin fotos, exportar/importar respaldo y uno viejo; tema oscuro, claro y 520px; vista de impresión de la Tabla sin avatares.
- `probar-escaneo`: opcional, porque las planillas no cambian.

## Riesgos

| Riesgo | Cómo se evita |
|---|---|
| localStorage (~5 MB) se llena con fotos | foto 160×160 JPEG (~8–15 KB, unos 60 jugadores ≈ 1 MB); tope en `fotoValida`; aviso cuando `setItem` falla |
| Respaldos viejos sin el campo nuevo | `normalizarJugador` al cargar e importar; prueba específica |
| Inyección de HTML/URL por la foto | `esc()` en todo; solo se aceptan `data:image/…` |
| La tabla se desborda en celular con avatares | avatares `sm` (unos 20px) superpuestos; revisar a 520px y ocultarlos ahí si hace falta |
| Impresión de la tabla se ensucia | `css/print.css` oculta los avatares |
| Privacidad: las fotos viajan dentro del respaldo `.json` | compartir el respaldo con cuidado (lo dice el README); no se agregan funciones nuevas para esto; no subir fotos reales al repositorio (la carpeta `contexto/` no se sube) |
| Romper el doble clic en `index.html` | sin librerías ni módulos; script clásico en el orden correcto; probar abriendo el archivo directo |
