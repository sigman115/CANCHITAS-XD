# Especificaciones (desarrollo guiado por especificaciones)

Cada mejora de RaquetMatch empieza aquí, **antes** de escribir código. La especificación dice qué se quiere y cómo se va a comprobar; el código viene después y se revisa contra ella.

## Flujo

```
Pedido ─▶ Especificación ─▶ ✋ Aprobación ─▶ Implementación ─▶ Revisión en paralelo ─▶ ✋ Aprobación ─▶ Commit / PR
            spec.md                          código + pruebas    · reglas del campeonato
            plan.md                                              · calidad del código
            tareas.md                                            · pruebas y app real
                                                    ▲                      │
                                                    └── correcciones ◀─────┘
```

1. **Especificar**: se escribe la carpeta `NNN-nombre-corto/` con tres archivos:
   - `spec.md`: problema, alcance (qué sí y qué no) y criterios de aceptación *Dado / Cuando / Entonces*.
   - `plan.md`: archivos que cambian, separación lógica / vista, pruebas nuevas y riesgos.
   - `tareas.md`: pasos pequeños, cada uno con su forma de verificarlo.
2. **Aprobar la especificación**: nada se programa sin que una persona la revise y la apruebe.
3. **Implementar** en una rama, siguiendo `tareas.md` y marcando cada tarea al terminarla. Toda lógica nueva lleva pruebas en `pruebas/`.
4. **Revisar** con tres enfoques a la vez:
   - **Reglas del campeonato**: ¿cumple cada criterio de aceptación y respeta las reglas del README?
   - **Código**: errores, seguridad (`esc()`), convenciones y simplicidad.
   - **Pruebas**: `node --test "pruebas/*.test.js"`, la app en el navegador (temas claro y oscuro, celular) y, si aplica, `pruebas/escaneo.html`.
   Si hay hallazgos, se corrigen y se vuelve a revisar.
5. **Aprobar el resultado**: recién entonces se hace el commit (que nombra la especificación) y el pull request.

## Por qué así

- Los criterios de aceptación se escriben **antes** del código, así no se ajustan a lo que salió.
- Cada decisión queda escrita: en `specs/` se puede ver qué se pidió, cómo se planificó y qué se verificó.
- Hay dos puntos de control humano: nadie programa algo que no se aprobó, y nada se sube sin aprobar el resultado.

## Especificaciones

| N.º | Mejora | Estado |
|---|---|---|
| — | (todavía ninguna) | — |

Plantilla: [`_plantilla/`](_plantilla/).
