---
title: "Polos continuos y respuesta transitoria"
asignatura: sistemas-control
tipo: herramienta
tema: Tema 2
orden: 20
resumen: "Mueve un polo en el plano s y observa tiempo de establecimiento, sobreimpulso y periodo de oscilación."
keywords: [polos, plano s, subamortiguado, crítico, sobreimpulso, Mp, tiempo de establecimiento, ts, tp, periodo, ζ, amortiguamiento]
refs:
  - { doc: resumen-t2, pagina: 7, texto: "Clasificación de la respuesta según los polos" }
  - { doc: resumen-t2, pagina: 13, texto: "Sistemas subamortiguados" }
  - { doc: resumen-t2, pagina: 15, texto: "Relación cualitativa polos-respuesta" }
---

Un polo `p = σ ± jω` fija la forma de la respuesta:

- **Parte real σ**: qué rápido se apaga la oscilación. `tₛ = π/|σ|`.
- **Parte imaginaria ω**: qué rápido oscila. `Tₐ = 2π/ω`, `tₚ = π/ω`.
- **Sobreimpulso**: `Mₚ = e^(π·σ/ω)`. Sube al aumentar ω con σ fija.

<div data-widget="polos-s"></div>

**Experimentos**
1. Deja σ fija y sube ω: `tₛ` no cambia, `Mₚ` crece.
2. Deja ω fija y aleja el polo hacia la izquierda: `tₛ` baja, `Tₐ` no cambia.
3. Baja ω a 0: aparece un polo doble (amortiguamiento crítico), sin oscilar.
