---
title: "Control de posición de una masa con perturbación (S7b ej. 7)"
asignatura: sistemas-control
tipo: ejercicio
tema: Tema 2
orden: 80
resumen: "Regulador proporcional, entrada escalón y perturbación escalón en t = 10: caracteriza la respuesta."
keywords: [perturbación, regulador proporcional, subamortiguado, masa, desplazamiento, Mp, ts, canónico]
refs:
  - { doc: resumen-t2, pagina: 22, texto: "S7b, ejercicio 7" }
---

Planta `G = 2/(s² + 2s + 2)` [m/V], regulador `K = 1`, `r = u(t)` [m] y `p(t) = 0,25·u(t − 10)` [m] sumada a la salida. Caracteriza la respuesta cuando (1) `R` es escalón y `P = 0`, y (2) `R = 0` y `P` es escalón.

<details>
<summary>Ver solución</summary>

Lazo cerrado: `M = 2/(s² + 2s + 4)`. Polos `−1 ± 1,732j` (ζ = 0,5, ωₙ = 2).

1. **Escalón de referencia**: `c(∞) = 0,5 m` (error 0,5). `Tₐ = 3,63 s`, `tₚ = 1,81 s`, `Mₚ = e^(−π/1,732) = 16,3 %`, `tₛ = π/1 = 3,14 s`.
2. **Perturbación**: `C/P = −(s² + 2s + 2)/(s² + 2s + 4)`. Mismos polos, por tanto mismos `Tₐ`, `tₚ` (desde t = 10), `Mₚ` y `tₛ`. `c(∞) = −0,125 m`.

Juntas: `c = 0,5` antes de t = 10 y `0,375` después.

</details>

Prueba esos polos en la herramienta de [polos continuos](../t2-polos-continuos/): σ = −1, ω = 1,7.
