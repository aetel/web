---
title: "Ejercicio 7: identificación desde gráfica y análisis de error continuo y discreto"
asignatura: sistemas-control
tipo: ejercicio
tema: "Tema 2 · Ejercicios en grupo"
orden: 170
resumen: "Identificar un sistema de segundo orden a partir de tₚ y Mₚ, y calcular el error en régimen permanente con ganancia paramétrica (continuo) y ante rampa (discreto, tipo 1)."
keywords: [ejercicio 7, identificación, tiempo de pico, sobreimpulso, segundo orden, error de posición, error de velocidad, tipo 0, tipo 1, discreto, estabilidad]
refs:
  - { doc: resumen-t2, pagina: 13, texto: "Sistemas subamortiguados canónicos" }
  - { doc: resumen-t2, pagina: 6, texto: "Cálculo del error en sistemas discretos" }
---

**Enunciado (resumen).** Una plataforma móvil, ante un escalón de `1` V, da: tiempo de pico `t_p = 0,5` s, valor máximo `2,416` m y valor final `2` m.

- **a)** Obtén `G(s)` canónica.
- **b)** Con `GH(s) = 150/(s² + 6s + 50)` y un regulador `F₁(s) = K`, halla el error mínimo en RP ante escalón si `0 ≤ K ≤ 0,82`.
- **c)** La cadena abierta discretizada a `T = 0,1` s es `F·B₀GH(z) = 0,36/((z − 0,19)(z − 1))`. Halla el error en RP significativo.

## Qué te están preguntando

Ingeniería inversa: de un ensayo (`t_p`, `M_p`, valor final) a polos y ganancia. Después, decidir qué constante de error manda según el **tipo** del sistema, en s y en z.

<details>
<summary>Solución paso a paso</summary>

**a) Identificación de `G(s)`.**

Valor final con `R = 1`: `G(0) = 2` m/V.

<p class="eq">M_p = (2,416 − 2)/2 = 0,208   (20,8 %)</p>

Parte imaginaria, desde el pico:

<p class="eq">t_p = π/ω   ⇒   ω = π/0,5 = 2π = 6,28 rad/s</p>

Parte real, desde el sobreimpulso. Como `M_p = e^(πσ/ω)`:

<p class="eq">ln 0,208 = −1,570 = −π/2 = πσ/ω   ⇒   σ = −ω/2 = −π = −3,14 s⁻¹</p>

Polos: `p = −π ± 2πj`. Denominador: `(s + π)² + (2π)² = s² + 2πs + 5π²`, con `5π² = 49,3 ≈ 50`.

Ganancia: `G(0) = A/50 = 2` ⇒ `A = 100`.

<p class="eq">G(s) ≈ 100 / (s² + 2πs + 50)   [m/V]</p>

**b) Error mínimo en RP (continuo).**

`CA(s) = K·150/(s² + 6s + 50)` no tiene polos en el origen: **tipo 0**, y el error significativo es el de posición.

<p class="eq">K_p = K·150/50 = 3K   ⇒   e_rpp = 1/(1 + 3K)</p>

Es decreciente en `K`, así que el mínimo está en el extremo del rango, `K = 0,82`:

<p class="eq">e_min = 1/(1 + 2,46) = 1/3,46 = 0,289   (28,9 % de la referencia)</p>

Estabilidad: el denominador del lazo cerrado es `s² + 6s + 50 + 150K`, con todos los coeficientes positivos para `K ≥ 0`. Es estable en todo el rango y la fórmula es válida.

**c) Error en RP (discreto).**

`CA(z) = 0,36/((z − 0,19)(z − 1))` tiene un polo en `z = 1`: **tipo 1**. Ante escalón el error es 0; la entrada significativa es la **rampa**.

Antes de aplicar la fórmula, estabilidad. El lazo cerrado es `z² − 1,19z + 0,55 = 0`: polos complejos con `|p| = √0,55 = 0,74 < 1`. Estable.

<p class="eq">K_v = (1/T)·lim<sub>z→1</sub> (z − 1)·CA(z) = 10·0,36/(1 − 0,19) = 4,44 s⁻¹</p>

<p class="eq">e_rpv = 1/K_v = 0,225   (para r(t) = t, es decir, 0,225 por unidad de pendiente)</p>

Atajo directo: `e_rpv = T·(1 − p₁)/Num(1) = 0,1·0,81/0,36 = 0,225`.

| G(0) | polos | K_p (b) | e_min (b) | K_v (c) | e_rpv (c) |
|---|---|---|---|---|---|
| 2 | −π ± 2πj | 3K | 28,9 % | 4,44 | 0,225 |

</details>

## Herramienta

Tres apartados en el selector. En a) ajusta `σ`, `ω` y `G(0)` hasta clavar el pico medido. En b) mueve `K`. En c) mira la rampa de referencia, la salida y el error, que converge a 0,225.

<div data-widget="ej7-identificacion"></div>

**Qué comprobar**
- a) Con `σ = −3,14`, `ω = 6,28`, `G(0) = 2`: pico en `t = 0,5` s, valor 2,42 m y valor final 2 m.
- b) Con `K = 0` el lazo no actúa: `c = 0` y error del 100 %. Sube a `K = 0,82`: `c(∞) = 0,71` y error ≈ 29 %.
- c) La línea naranja marca `e_rpv = 0,225`; el error simulado la alcanza y se queda ahí.
