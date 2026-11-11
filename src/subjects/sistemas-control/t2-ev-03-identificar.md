---
title: "Ejercicio 3: obtener la FdeT a partir de la respuesta al escalón"
asignatura: sistemas-control
tipo: ejercicio
tema: "Tema 2 · Ejercicios en grupo"
orden: 130
resumen: "Con valor final, instante y valor del primer pico, se obtienen los polos σ ± jω y la ganancia K de un sistema canónico de segundo orden."
keywords: [ejercicio 3, identificación, respuesta al escalón, sobreimpulso, tiempo de pico, valor final, polos complejos, canónico, σ, ω, K, FdeT, gráfica]
refs:
  - { doc: resumen-t2, pagina: 13, texto: "Sistemas subamortiguados canónicos" }
---

**Enunciado (resumen).** Se da la respuesta al escalón unitario de un sistema continuo (gráfica con puntos marcados). Obtén su FdeT.

Datos de la gráfica: primer pico `(1,54 s; 0,363)`, valle `(3,16; 0,198)`, segundo pico `(4,74; 0,274)`, valor final `≈ 0,25`.

## Qué te están preguntando

La pregunta inversa: en vez de dar el sistema y pedir la respuesta, te dan la respuesta y piden el sistema. Se asume **canónico**: dos polos complejos y ningún cero.

<p class="eq">M(s) = K / ( (s − σ)² + ω² ),   σ < 0</p>

Hay **tres incógnitas**: `σ`, `ω` y `K`. Cada dato de la gráfica da una ecuación.

<details>
<summary>Solución paso a paso</summary>

**1. Valor final.** La gráfica se estabiliza en 0,25 ⇒ `c(∞) = M(0) = 0,25`.

**2. Sobreimpulso.** Primer pico 0,363:

<p class="eq">M_p = (0,363 − 0,25)/0,25 = 0,452 = 45,2 %</p>

**3. ω del tiempo de pico.** El primer pico está a **media oscilación**: `t_p = π/ω`.

<p class="eq">ω = π / 1,54 ≈ 2,04 rad/s</p>

Comprobación con otro dato: el periodo entre los dos picos es `4,74 − 1,54 = 3,2 s` ⇒ `ω = 2π/3,2 = 1,96`. Dos lecturas coherentes, así que `ω ≈ 2`.

**4. σ del sobreimpulso.** De `M_p = e^(πσ/ω)` y `t_p = π/ω`:

<p class="eq">σ = ln(M_p) / t_p = ln(0,452)/1,54 ≈ −0,52</p>

Con las lecturas redondeadas, `σ ≈ −0,5`.

**5. K del valor final.** `M(0) = K/(σ² + ω²) = 0,25`:

<p class="eq">K = 0,25 · (0,25 + 4) = 1,0625</p>

**Resultado:**

<p class="eq">M(s) = 1,0625 / (s² + s + 4,25),   polos −0,5 ± 2j</p>

**Verificación.** `t_s = π/|σ| = 6,28 s`. En la gráfica, el primer pico que entra en la banda del 5 % es el de `t = 6,3 s` (0,239, un 4,4 % por debajo). Coincide.

</details>

## Herramienta

Los puntos rojos son los datos de la gráfica. La línea es el modelo. Cambia entre *Calculado con los datos*, *Redondeado* y *Manual*, y ajusta a mano `σ`, `ω` y `K` para ver cómo cada parámetro mueve la curva.

<div data-widget="ej3-identificar"></div>

**Qué comprobar**
- `K` solo cambia la **altura** (valor final), no el tiempo ni la forma.
- `ω` mueve los picos en el tiempo: más grande, picos más juntos.
- `σ` cambia **cuánto se apagan** las oscilaciones. Más negativo, se apagan antes.
- El error RMS baja cuando el modelo se parece a los datos.
