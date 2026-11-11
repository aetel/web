---
title: "Simplificar M(z) y calcular tₛ (S6 ej. 1 y 2)"
asignatura: sistemas-control
tipo: ejercicio
tema: Tema 2
orden: 60
resumen: "Dos sistemas discretos de segundo orden con polo dominante. Simplifica y calcula el tiempo de establecimiento."
keywords: [simplificar, polo dominante, tiempo de establecimiento, discreto, ganancia estática, cero cancela polo, T = 1 s]
refs:
  - { doc: resumen-t2, pagina: 19, texto: "S6, ejercicios 1 y 2" }
---

## Ejercicio 1 (T = 1 s)

`M(z) = 0,09·z / ((z − 0,1)(z − 0,9))`. Obtén la FdeT simplificada y `tₛ`.

<details>
<summary>Ver solución</summary>

- Dominante: `0,9`. El `0,1` es mucho más rápido.
- Ganancia: `M(1) = 0,09 / (0,9·0,1) = 1`. Retardo 1, no hacen falta polos extra.
- `Mₛ(z) = Kₛ/(z − 0,9)` con `Kₛ = M(1)·(1 − 0,9) = 0,1`, es decir `Mₛ = 0,1/(z − 0,9)`.
- `kₛ = ⌈−π / ln 0,9⌉ = ⌈29,8⌉ = 30`, por tanto `tₛ = 30·1 = 30 s`.

</details>

## Ejercicio 2 (T = 1 s)

`M(z) = 0,185(z − 0,35) / ((z − 0,4)(z − 0,8))`. Simplifica si es posible y calcula `tₛ` ante escalón.

<details>
<summary>Ver solución</summary>

- El cero `0,35` casi cancela el polo `0,4`. Dominante: `0,8`.
- `M(1) ≈ 1`, retardo 1.
- `Mₛ(z) = 0,2/(z − 0,8)`.
- `kₛ = ⌈−π / ln 0,8⌉ = ⌈14,08⌉ = 15`, por tanto `tₛ = 15 s`.

</details>

Comprueba el resultado con la herramienta de [polo dominante](../t2-polo-dominante/) o de [polos discretos](../t2-polos-discretos/) (|p| = 0,8).
