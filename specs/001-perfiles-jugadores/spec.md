# 001 · Perfiles personalizados de jugadores

**Estado:** implementada · **Fecha:** 2026-10-29

## Problema

Hoy todos los jugadores se ven igual: un círculo con sus iniciales (`<span class="avatar">` en `js/views/jugadores.js`). La organizadora quiere que cada jugador **pueda** personalizar su perfil con una foto. Es opcional: **si un jugador no tiene foto, se muestra el perfil por defecto**, que es el avatar de iniciales actual con el color de su categoría.

Con fotos es más fácil reconocer a los jugadores y a las parejas, sobre todo cuando hay apellidos repetidos o muchos inscritos.

## Alcance

**Incluye**
- Campo opcional **foto** por jugador: se sube un archivo de imagen (`<input type="file" accept="image/*">`; en el celular este control ya permite usar la cámara del teléfono). Se recorta al centro y se reduce a 160 × 160 px en JPEG antes de guardarla.
- **Perfil por defecto**: sin foto se ven las iniciales con el color de la categoría, como hoy.
- En el formulario de jugador: vista previa de la foto, botón para elegirla y botón para quitarla.
- Dónde se ve el avatar (foto o iniciales):
  - Pestaña **Jugadores**: en cada fila de "Plantel inscrito".
  - Pestaña **Equipos**: junto a cada jugador de la pareja (o trío) en la lista de equipos.
  - **Tabla de posiciones**: avatares pequeños de la pareja al lado del nombre del equipo.
- Los respaldos `.json` incluyen la foto; los respaldos viejos (sin ese campo) siguen cargando sin errores.
- Aviso claro si el navegador no puede guardar por falta de espacio.

**No incluye**
- Captura con la cámara en vivo dentro de la app.
- Fotos en planillas impresas ni en la impresión de la tabla. Las planillas no cambian.
- Fotos en Fixture, Resultados ni en el gráfico de la tabla.
- Otros campos de perfil (apodo, mano hábil, fecha de nacimiento, club, etc.). Los nombres de jugadores y equipos no cambian.
- Recorte manual de la foto (se recorta al centro automáticamente).
- Cambios en la demo (sus jugadores quedan con el perfil por defecto).

## Criterios de aceptación

1. **Dado** un jugador sin foto, **cuando** se ve en Jugadores, Equipos o Tabla, **entonces** se muestra el perfil por defecto: círculo con sus iniciales y el color de su categoría (o el estilo "sin categoría"), igual que hoy.
2. **Dado** el formulario de nuevo jugador o de edición, **cuando** se elige una imagen (JPG o PNG), **entonces** aparece su vista previa antes de guardar.
3. **Dado** que se eligió una foto y se guardó el jugador, **cuando** se ve la lista de Jugadores, **entonces** su avatar muestra esa foto en vez de las iniciales.
4. **Dado** una foto original grande (por ejemplo 4000 × 3000 px), **cuando** se guarda, **entonces** lo almacenado es una imagen de 160 × 160 px cuyo texto (`data:image/jpeg;base64,…`) ocupa menos de 30 KB.
5. **Dado** una foto rectangular, **cuando** se reduce, **entonces** se recorta al centro y no se deforma.
6. **Dado** un jugador con foto, **cuando** se edita, se pulsa "Quitar foto" y se guarda, **entonces** vuelve al perfil por defecto (iniciales).
7. **Dado** un archivo que no es imagen o que el navegador no puede leer, **cuando** se elige, **entonces** se muestra un mensaje de error en el formulario y el jugador no cambia.
8. **Dado** un equipo formado, **cuando** se ve la pestaña Equipos, **entonces** cada jugador de la pareja (y el relevo) aparece con su avatar (foto o iniciales).
9. **Dado** una categoría con tabla de posiciones, **cuando** se ve la Tabla, **entonces** al lado del nombre de cada equipo aparecen los avatares pequeños de sus jugadores, y en ancho de celular (520px) la tabla no se desborda más que hoy.
10. **Dado** la Tabla de posiciones, **cuando** se imprime, **entonces** no aparecen las fotos ni los avatares.
11. **Dado** un respaldo `.json` exportado antes de esta mejora, **cuando** se importa, **entonces** carga sin errores y todos los jugadores quedan con el perfil por defecto.
12. **Dado** jugadores con foto, **cuando** se exporta el respaldo y se vuelve a importar, **entonces** las fotos se conservan.
13. **Dado** que el almacenamiento del navegador está lleno, **cuando** se guarda un jugador con foto, **entonces** aparece un aviso de que no se pudo guardar (hoy el error se ignora en silencio en `RM.store.save`).
14. **Dado** la app abierta con doble clic en `index.html` sin internet, **cuando** se usa todo lo anterior, **entonces** funciona igual (sin servidor ni librerías nuevas) en tema oscuro, claro y en celular.

## Reglas del campeonato afectadas

Ninguna. Solo cambia cómo se muestra al jugador; categorías, equipos, puntos y desempates no cambian.

## Preguntas abiertas

Ninguna.
