---
title: "Ejercicio 2: cinta transportadora, perturbación y valor de la salida"
asignatura: sistemas-control
tipo: ejercicio
tema: "Tema 2 · Ejercicios en grupo"
orden: 120
resumen: "Control discreto de la velocidad de una cinta: equivalente discreto de un primer orden, superposición de referencia y perturbación, y cálculo de K y de la salida en dos instantes."
keywords: [ejercicio 2, cinta transportadora, EQD, primer orden, perturbación, superposición, e^(-T/tau), muestreo, retardo, ganancia, salida en t, escalón retrasado]
refs:
  - { doc: resumen-t2, pagina: 9, texto: "Respuesta de primer orden" }
---

**Enunciado (resumen).** Controlador `F(z) = K`, planta `G(s) = 0,2/(0,4s + 1)` [m/s por V], realimentación unitaria, muestreo `T = 0,1 s`. La perturbación **resta** a la velocidad de la cinta. Entrada `r[k] = u[k − 20]`, perturbación `p(t) = 0,5·u(t − 6)`.
(a) `K` para que la salida en `t = 5,9 s` sea 0,8 m/s. (b) Salida en `t = 10 s` con `K = 10`.

## Qué te están preguntando

Un valor **de la salida en un instante**, no solo en RP. Pero hay un truco: en los dos instantes el transitorio ya se ha apagado (lo comprobaremos). Así que se resuelve con ganancias.

<details>
<summary>Solución paso a paso</summary>

**1. Equivalente discreto de la planta.** Un primer orden `G₀/(τs+1)` con entrada constante durante `T` obedece:

<p class="eq">y[k+1] = a · y[k] + G₀(1 − a) · u[k],   a = e^(−T/τ)</p>

Con `T = 0,1`, `τ = 0,4`: `a = e^(−0,25) = 0,7788`. Entonces

<p class="eq">B₀G(z) = 0,2(1 − a)/(z − a) = 0,04424 / (z − 0,7788),   B₀G(1) = 0,2</p>

**2. Lazo cerrado.** `L = K·B₀G`. `M = L/(1+L) = 0,04424K / (z − 0,7788 + 0,04424K)`. Un solo polo: `p = 0,7788 − 0,04424K`. Ganancia estática:

<p class="eq">K₀[M] = L(1)/(1+L(1)) = 0,2K / (1 + 0,2K) = K / (5 + K)</p>

**3. Superposición.** La salida es `c = M·r − S·p`, con `S = 1/(1+L)`. En RP: `S(1) = 1/(1 + 0,2K)`.

**(a) t = 5,9 s ⇒ k = 59.**
- La perturbación empieza en `t = 6 s` (k = 60). **Todavía no ha entrado.**
- La referencia empezó en `k = 20`, hace 39 muestras.
- Con `K = 20` el polo del lazo es `p = 0,7788 − 0,885 = −0,106`. `|p|³⁹ ≈ 0`: ya está asentado.

Entonces `c(5,9) ≈ K/(5+K) = 0,8` ⇒ **K = 20**. (Fórmula general: `K = 5c/(1−c)`.)

**(b) t = 10 s ⇒ k = 100, con K = 10.**
- Referencia: `K₀[M] = 10/15 = 2/3`. Polo `p = 0,336`. Han pasado 80 muestras: asentado.
- Perturbación: `S(1) = 1/(1+2) = 1/3`. Han pasado 40 muestras: asentado.

<p class="eq">c(10 s) = (2/3)(1) − (1/3)(0,5) = 0,667 − 0,167 = 0,5 m/s</p>

</details>

## Herramienta

Es una simulación directa de las ecuaciones del lazo, muestra a muestra. Mueve `K` y fíjate en las líneas verde (5,9 s) y roja (10 s).

<div data-widget="ej2-cinta"></div>

**Qué comprobar**
- Con `K = 20` la curva pasa por 0,8 en la línea verde. La herramienta también lo calcula por bisección.
- Con `K = 10`, a los 10 s da 0,5.
- Sube `K` por encima de 40: el polo pasa de −1 (`|p| > 1`) y la cinta oscila sin parar (inestable).
- Pon la perturbación a 0: el valor final con `K = 10` es 0,667. La perturbación lo baja a 0,5.
- Fíjate en que con `K` alto la perturbación se rechaza mejor: `S(1) = 1/(1+0,2K)` baja.
