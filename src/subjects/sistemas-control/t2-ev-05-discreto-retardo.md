---
title: "Ejercicio 5: respuesta de un sistema discreto con polos complejos y retardo"
asignatura: sistemas-control
tipo: ejercicio
tema: "Tema 2 · Ejercicios en grupo"
orden: 150
resumen: "Con M(z) = 1/(z³ − z² + 0,5z) se calculan k_d, k_p, M_p, k_s y c(∞): factorizar, separar el retardo y aplicar las fórmulas en polar."
keywords: [ejercicio 5, discreto, polos complejos, retardo, z = 0, kd, kp, Mp, ks, c(∞), módulo, fase, sobreimpulso, tiempo de establecimiento, aproximación L(0,05)]
refs:
  - { doc: resumen-t2, pagina: 16, texto: "Ejercicios resueltos del tema" }
---

**Enunciado (resumen).** `M(z) = 1 / (z³ − z² + 0,5z)`. Calcula, ante escalón unitario, `k_d`, `k_p`, `M_p (%)`, `k_s` y `c(∞)`. Usa `L(0,05) ≈ −3`.

## Qué te están preguntando

Una respuesta de segundo orden subamortiguada, medida **en muestras** (no se da `T`), con un retardo escondido.

<details>
<summary>Solución paso a paso</summary>

**1. Factorizar y separar el retardo.**

<p class="eq">M(z) = 1/[ z (z² − z + 0,5) ] = (1/z) · M₁(z),   M₁(z) = 1/(z² − z + 0,5)</p>

El `1/z` es un **retardo de 1 muestra**: desplaza la respuesta, no cambia su forma. Lo que determina la forma es `M₁`.

**2. Polos de M₁.** `z² − z + 0,5 = 0` ⇒ `z = 0,5 ± 0,5j`.

<p class="eq">|p| = √(0,25 + 0,25) = 0,7071,   φ = arctan(0,5/0,5) = π/4 = 0,785 rad</p>

**3. Fórmulas en polar.**

- **Periodo**: `k_d = 2π/φ = 8` muestras. Un giro completo de `φ` por muestra tarda `2π/φ` muestras.
- **Pico**: `k_p = π/φ + 1 = 4 + 1 = 5`. Medio periodo, más 1 del retardo.
- **Sobreimpulso**: `M_p = |p|^(π/φ) = 0,7071⁴ = 0,25` ⇒ **25 %**. La envolvente decae `|p|` por muestra y el pico llega tras 4 muestras.
- **Establecimiento**: `k_s = ⌈−3/ln|p|⌉ + 1 = ⌈−3/(−0,3466)⌉ + 1 = ⌈8,66⌉ + 1 = 9 + 1 =` **10**. (Se pide que la envolvente baje al 5 %: `|p|^k = 0,05` ⇒ `k = L(0,05)/L|p|`.)
- **Valor final**: `c(∞) = M(1) = 1/(1 − 1 + 0,5) = 2`.

| k_d | k_p | M_p (%) | k_s | c(∞) |
|---|---|---|---|---|
| 8 | 5 | 25 | 10 | 2 |

**Nota sobre `k_s`.** La fórmula da 10. Si se lee en la gráfica "el primer pico que queda a ≤ 5 % del valor final", se obtiene 13 (los picos están en k = 5, 9 y 13). Usa la fórmula salvo que digan otra cosa. La herramienta enseña las dos cosas.

</details>

## Herramienta

El estado inicial es el ejercicio. Cambia el retardo `d` y verás que `k_p` y `k_s` se desplazan pero `M_p` y `k_d` no. Cambia el módulo y la fase para ver cómo mandan en el tiempo y la oscilación.

<div data-widget="ej5-discreto"></div>

**Qué comprobar**
- El retardo `d` desplaza toda la curva a la derecha: suma `d` a `k_p` y a `k_s`.
- Acerca `|p|` a 1: `M_p` sube y `k_s` se dispara (se apaga muy despacio).
- Sube la fase: `k_d` baja (oscila más rápido) y `M_p` también baja.
- `K` multiplica el valor final pero no cambia `M_p` (es relativo).
