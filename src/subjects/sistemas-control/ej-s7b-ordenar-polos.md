---
title: "Ordenar sistemas por ωd y tₛ (S7b ej. 5 y 6)"
asignatura: sistemas-control
tipo: ejercicio
tema: Tema 2
orden: 70
resumen: "Ordena pares de sistemas subamortiguados, continuos y discretos, sin simular."
keywords: [ordenar, frecuencia de oscilación, tiempo de establecimiento, módulo, fase, parte real, parte imaginaria]
refs:
  - { doc: resumen-t2, pagina: 22, texto: "S7b, ejercicios 5 y 6" }
---

## Ejercicio 5 (continuo)

`M₁ = K₁/((s+7)² + 7²)` y `M₂ = K₂/((s+5)² + 8²)`. Ordena por `ωd` y por `tₛ`.

<details>
<summary>Ver solución</summary>

| | ωd = Im[p] | tₛ = π/\|Re[p]\| |
|---|---|---|
| M₁: −7 ± 7j | 7 | 0,449 s |
| M₂: −5 ± 8j | 8 | 0,628 s |

Menor ωd: **M₁**. Menor tₛ: **M₁**.

</details>

## Ejercicio 6 (discreto, mismo T)

`M₁ = K₁/((z−0,7)² + 0,7²)` y `M₂ = K₂/((z−0,7)² + 0,1²)`.

<details>
<summary>Ver solución</summary>

| | \|p\| | fase [rad] | kₛ = −π/ln\|p\| |
|---|---|---|---|
| M₁: 0,7 ± 0,7j | 0,99 | 0,7854 | ≈ 311 |
| M₂: 0,7 ± 0,1j | 0,7071 | 0,1419 | ≈ 9 |

Menor ωd: **M₂** (menor fase). Menor tₛ: **M₂** (menor módulo).

</details>
