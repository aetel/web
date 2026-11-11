---
title: "Polo dominante y simplificación"
asignatura: sistemas-control
tipo: herramienta
tema: Tema 2
orden: 40
resumen: "Cuándo se puede despreciar un polo rápido y qué hay que conservar al simplificar."
keywords: [polo dominante, simplificación, sobreamortiguado, polo doble, amortiguamiento crítico, ganancia estática, retardo]
refs:
  - { doc: resumen-t2, pagina: 9, texto: "Polos dominantes" }
  - { doc: resumen-t2, pagina: 10, texto: "Tiempo de establecimiento" }
  - { doc: resumen-t2, pagina: 12, texto: "Amortiguamiento crítico" }
---

Manda el polo **más lento** (el más cercano al límite de estabilidad). Un polo mucho más rápido se extingue enseguida y se puede despreciar, **pero hay que conservar**:

1. La **ganancia estática** `K₀ = M(1)` (en z) o `M(0)` (en s).
2. El **retardo** de entrada a salida (en discreto, añadiendo polos en `z = 0` si hace falta).

Tiempo de establecimiento: continuo `tₛ ≈ 3/|p|`; discreto `kₛ = ⌈−π/ln|p|⌉`. Con **polo doble** sale ≈1,6 veces mayor.

<div data-widget="dominante"></div>

Cuando `b < 10a` la simplificación deja de ser fiable: el error en `tₛ` sube de forma visible.
