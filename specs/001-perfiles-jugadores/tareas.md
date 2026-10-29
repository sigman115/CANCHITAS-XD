# 001 · Tareas

Se marcan al terminar cada una (`- [x]`).

- [x] 1. Crear `js/perfil.js` con `recorteCentrado`, `fotoValida`, `normalizarJugador`, `iniciales`, `avatarHTML` y las constantes — *verificación:* `node --check js/perfil.js`.
- [x] 2. Agregar `perfil.js` a `pruebas/cargar.js` y a `index.html` entre `utils.js` y `store.js` — *verificación:* la app abre con doble clic sin errores en la consola.
- [x] 3. Crear `pruebas/perfil.test.js` con los casos del plan — *verificación:* `node --test pruebas/perfil.test.js` da `fail 0`.
- [x] 4. En `js/store.js`, normalizar jugadores al cargar e importar — *verificación:* criterio 11.
- [x] 5. En `js/store.js`, hacer que `save()` informe si no pudo guardar y mostrar el aviso — *verificación:* criterio 13 (llenar localStorage a propósito).
- [x] 6. Formulario de Jugadores: foto con vista previa, reducción por canvas y "Quitar foto" — *verificación:* criterios 2, 4, 5, 6 y 7.
- [x] 7. Lista de Jugadores con `RM.perfil.avatarHTML` (quitar `iniciales()` local) — *verificación:* criterios 1 y 3.
- [x] 8. Avatares en `js/views/equipos.js` junto a cada jugador del equipo — *verificación:* criterio 8.
- [x] 9. Avatares de la pareja en `js/views/tabla.js` al lado del nombre del equipo — *verificación:* criterio 9.
- [x] 10. Estilos en `css/components.css` (temas oscuro y claro, 520px) y ocultar avatares en `css/print.css` — *verificación:* capturas con `probar-raquetmatch` y vista de impresión (criterios 10 y 14).
- [x] 11. Exportar e importar un respaldo con fotos — *verificación:* criterio 12.
- [x] 12. Actualizar `README.md` (foto, perfil por defecto, espacio y cuidado al compartir el respaldo) — *verificación:* lectura.
- [x] 13. Correr todas las pruebas — *verificación:* `node --test "pruebas/*.test.js"` da `fail 0` y la app no muestra errores (`probar-escaneo` opcional: las planillas no cambian).
