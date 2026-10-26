# RaquetMatch — Gestión de campeonatos de ráquet

Sistema para el campeonato **"Unidos por la Raqueta"**. Sirve para registrar jugadores, armar equipos por categoría, generar el fixture "todos contra todos", programar las jornadas en canchas y horarios, cargar resultados e imprimir planillas.

Está hecho con **HTML5, CSS y JavaScript** puros, sin frameworks ni servidor. Para usarlo basta con abrir `index.html` en el navegador.

## Estructura

```
index.html            Estructura de la página y menú de pestañas
css/
  base.css            Colores (tema oscuro y claro), tipografía y reset
  layout.css          Cabecera, pestañas, rejillas y diseño adaptable
  components.css      Tarjetas, botones, formularios, listas y equipos
  print.css           Estilos de impresión
js/
  utils.js            Utilidades: fechas, íconos, avisos, búsqueda
  store.js            Datos: guardado en localStorage, consultas, respaldo JSON
  fixture.js          Generador "todos contra todos" (método circular) y validación
  programacion.js     Reparto de partidos en horarios y canchas (intercalado y rotación justa)
  tabla.js            Puntos, orden de la tabla, detección de empates y evolución por fecha
  planilla.js         QR de cada partido, zona de círculos y lectura de fotos/escaneos
  vendor/             qrcode-generator (MIT), jsQR (Apache 2.0) y Chart.js (MIT), copiados para funcionar sin internet
  app.js              Arranque y navegación entre pestañas (#/campeonato…)
  views/
    campeonato.js     Configuración: datos, día de juego, canchas, categorías
    jugadores.js      Registro, edición, búsqueda y filtros de jugadores
    equipos.js        Armado de equipos por categoría y sorteo de números
    fixture.js        Tabla del fixture por categoría (números o nombres)
    programacion.js   Jornadas por horario y cancha, intercambio manual y reporte de equidad
    resultados.js     Carga de resultados por jornada (2-0, 2-1, 1-2, 0-2, W.O.)
    tabla.js          Tabla de posiciones por fecha, gráfico de evolución y partidos de desempate
    planillas.js      Impresión de planillas por jornada y escaneo de planillas llenas
pruebas/
  cargar.js           Carga la lógica de js/ en Node, en el mismo orden que index.html
  fixture.test.js     Todos contra todos: cruces únicos, jornadas, descansos, validación
  tabla.test.js       Puntos, W.O., orden de la tabla, desempates y evolución por fecha
  programacion.test.js  Canchas y horarios: sin choques, huecos al final, intercalado, rotación justa
  planilla.test.js    Texto del QR, perspectiva de la foto y lectura de los círculos
  datos.test.js       Fechas de las jornadas, textos, respaldos y consultas
```

Se usan scripts clásicos en lugar de módulos ES porque los navegadores bloquean los módulos cuando la página se abre como archivo local (`file://`).

## Pruebas automáticas

La lógica del sistema (fixture, tabla, programación, planillas y datos) tiene pruebas automáticas. Se ejecutan con Node.js 22 o superior, sin instalar nada:

```
node --test "pruebas/*.test.js"
```

Las pruebas comprueban las reglas del campeonato tal como están escritas en este README. Algunos ejemplos:

- Con 2 a 16 equipos, todos se enfrentan una sola vez, nadie juega dos veces en la misma jornada y, si el número es impar, cada equipo descansa exactamente una vez.
- Cada resultado da los puntos correctos (2-0 = 3, 2-1 = 2, 1-2 = 1, 0-2 = 0 y W.O.). El partido de desempate pesa más que la diferencia de sets, y esta más que los sets a favor.
- Con las canchas del campeonato, nunca hay dos partidos en la misma cancha y hora, los horarios libres quedan al final y ningún equipo juega más de 3 veces a la misma hora. Con un orden fijo, un equipo podría jugar las 7 veces a la misma hora.
- La planilla ubica los círculos aunque la foto esté inclinada, y rechaza marcas imposibles como 2-2 o dos círculos en la misma fila.
- Con el martes como día de juego, las dos primeras jornadas caen el 22 y el 29 de septiembre de 2026, como en el fixture en papel.

Para comprobar que las pruebas detectan errores, se introdujeron errores a propósito en una copia del código: dar 3 puntos por un 2-1, dar 1 punto al ausente en un W.O., ignorar el desempate, quitar la rotación del fixture o de los horarios, o cambiar un signo en la perspectiva. En todos los casos la suite falló.

## Datos

Los datos se guardan automáticamente en el navegador (`localStorage`). Con los botones de la cabecera se puede **descargar un respaldo `.json`** y **volver a cargarlo**. Así también se pasa el campeonato a otra computadora.

## Reglas del campeonato

- El número de categorías y de equipos es variable. Si una categoría tiene un número impar de equipos, uno descansa en cada jornada.
- Los equipos son parejas, o tríos cuando el tercero es relevo. La categoría de cada jugador la asigna el organizador.
- El día de juego es configurable. Cada cancha tiene sus propios horarios durante todo el campeonato.
- Las categorías se intercalan, los horarios libres quedan al final del día y el reparto de horarios y canchas es justo para todos los equipos.
- Puntos: 2-0 = 3, 2-1 = 2, 1-2 = 1, 0-2 = 0. En un W.O., el equipo ausente recibe 0 y el presente gana 2-0 (3 puntos).
- Si hay empate en puntos al final, se registran partidos de desempate a 3 sets entre los empatados; sus resultados ordenan al grupo. Después se usa la diferencia de sets y los sets a favor.

## Escaneo de planillas

Cada planilla trae un recuadro **RESULTADO FINAL** con un QR y círculos para rellenar: sets ganados por A (0, 1, 2), sets ganados por B (0, 1, 2) y W.O. (A o B). En la pestaña Planillas se eligen una o varias fotos o escaneos. El QR identifica el partido y, a partir de sus esquinas, se calcula dónde están los círculos aunque la foto esté inclinada. Antes de guardar, el resultado detectado se muestra con una imagen del recuadro para confirmarlo o corregirlo.

Recomendaciones: imprimir en A4 al 100 %, rellenar los círculos por completo con bolígrafo oscuro y fotografiar con buena luz, sin doblar el recuadro.

## Evolución de puntos

En la pestaña Posiciones, debajo de la tabla de cada categoría, un gráfico de líneas (Chart.js) muestra los puntos acumulados de cada equipo fecha por fecha. Sirve para ver de un vistazo quién se despega, quién viene subiendo y cómo llegaron los equipos a un empate.

- Los datos salen del mismo cálculo que la tabla, así que el último punto de cada línea siempre coincide con la columna Puntos.
- Cada equipo conserva su color aunque cambie de posición. Los 8 colores están validados para personas con daltonismo, con una versión para el tema claro y otra para el oscuro. Desde el equipo 9 la línea va en gris.
- Al tocar o pasar el cursor sobre una fecha se ve el detalle de todos los equipos: puntos acumulados, resultado y puntos ganados ese día. Al pasar sobre un nombre de la leyenda se resalta su línea; al hacer clic se oculta o se muestra.
- El gráfico aparece cuando hay al menos un resultado cargado y no sale al imprimir: la planilla impresa sigue siendo solo la tabla.

## Fases

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Base, diseño, Campeonato, Jugadores, Equipos | Lista |
| 2 | Fixture todos contra todos y reemplazo de números por nombres | Lista |
| 3 | Programación en canchas y horarios con rotación justa | Lista |
| 4 | Resultados, W.O., tabla de posiciones y desempates | Lista |
| 5 | Planillas imprimibles con QR y lectura del resultado escaneado | Lista |
| 6 | Gráfico de evolución de puntos por fecha en Posiciones (Chart.js) | Lista |

Autores: Dayana Ruth · Kevin
