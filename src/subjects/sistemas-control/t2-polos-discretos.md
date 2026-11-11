---
title: "Polos discretos: módulo y fase"
asignatura: sistemas-control
tipo: herramienta
tema: Tema 2
orden: 30
resumen: "En el plano z el módulo del polo fija el tiempo de establecimiento y la fase fija el periodo de oscilación."
keywords: [plano z, discreto, módulo, fase, círculo unidad, muestras, ks, kp, periodo de muestreo, estabilidad]
refs:
  - { doc: resumen-t2, pagina: 7, texto: "Clasificación en z" }
  - { doc: resumen-t2, pagina: 13, texto: "Subamortiguados discretos" }
---

En discreto el polo se escribe `p = |p|·e^(±jφ)`. Es estable si `|p| < 1`.

| Magnitud | Fórmula |
|----------|---------|
| Periodo de oscilación | `k_d = 2π/φ` muestras |
| Pico | `k_p = π/φ` |
| Sobreimpulso | `Mₚ = \|p\|^(π/φ)` |
| Establecimiento | `kₛ = ⌈−π/ln\|p\|⌉`, `tₛ = kₛ·T` |

<div data-widget="polos-z"></div>

**Idea**: mismo módulo = mismo `tₛ`; misma fase = mismo periodo (en muestras). El periodo de muestreo T solo escala el eje de tiempo.
