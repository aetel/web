---
title: "Ejercicio 1: sistema híbrido, ganancias y rango de K"
asignatura: sistemas-control
tipo: ejercicio
tema: "Tema 2 · Ejercicios en grupo"
orden: 110
resumen: "Un lazo con bloqueador de orden cero y planta con ganancia estática 1: calcula K_BG, la ganancia de la cadena abierta, la del sistema y el rango de K para error ≤ 20 %."
keywords: [ejercicio 1, sistema híbrido, bloqueador de orden cero, ZOH, EQD, ganancia significativa, constante de error, Kp, tipo 0, rango de K, estabilidad, Jury, error]
refs:
  - { doc: resumen-t2, pagina: 5, texto: "Ganancias y constantes de error" }
---

**Enunciado (resumen).** Lazo unitario híbrido: ZOH, muestreo de 500 ms, controlador `F(z) = 2`, planta con equivalente discreto

<p class="eq">B₀G(z) = K_BG (z + 0,5) / ((z − 0,9)(z − 0,2))</p>

La planta tiene ganancia estática unitaria. (a) Ganancia significativa de la cadena abierta y su constante de error. (b) Ganancia significativa del sistema. (c) Con `F(z) = K`, rango de `K` para error en RP ≤ 20 % ante la entrada significativa unitaria.

## Qué te están preguntando

Solo hay preguntas de **régimen permanente**. No importa que el muestreo sea 500 ms: solo cambia el eje del tiempo. Lo que importa es evaluar en `z = 1`.

<details>
<summary>Solución paso a paso</summary>

**Paso 0: calcular K_BG.** "Ganancia estática unitaria" quiere decir `B₀G(1) = G(0) = 1`:

<p class="eq">K_BG · 1,5 / (0,1 · 0,8) = 1  ⇒  K_BG = 0,08 / 1,5 ≈ 0,0533</p>

**a) Cadena abierta.** `CA(z) = F·B₀G(z)`. No hay polos en `z = 1` (están en 0,9 y 0,2), así que es **tipo 0**. Por tanto `K₀[CA] = CA(1) = 2 · 1 = 2`.

Al ser tipo 0, esa ganancia es la **constante de posición** `K_p = 2` (la asociada al escalón).

**b) Ganancia del sistema.** Realimentación unitaria, tipo 0:

<p class="eq">K₀[M] = K_p / (1 + K_p) = 2 / 3 ≈ 0,667</p>

Ante un escalón unitario, la salida se queda en 0,667. El 0,333 que falta es el error.

**c) Rango de K.** Ahora `CA(1) = K·1 = K`. El error al escalón unitario es `1/(1+K)`:

<p class="eq">1/(1+K) ≤ 0,2  ⇒  K ≥ 4</p>

Falta comprobar **estabilidad**. Ecuación característica `1 + K·B₀G(z) = 0`:

<p class="eq">z² + (0,0533K − 1,1)z + (0,18 + 0,0267K) = 0</p>

Condiciones de Jury para un polinomio de 2.º orden (`|a₀| < 1`, `1 + a₁ + a₀ > 0`, `1 − a₁ + a₀ > 0`):

- `|a₀| < 1` ⇒ `K < 30,75`.
- `1 + a₁ + a₀ = 0,08 + 0,08K > 0` ⇒ siempre para `K > 0`.
- `1 − a₁ + a₀ = 2,28 − 0,0267K > 0` ⇒ `K < 85,5`.

**Resultado: `4 ≤ K < 30,75`.** Si el enunciado dijera que no se tenga en cuenta la estabilidad, bastaría `K ≥ 4`. Conviene comentar el límite de estabilidad igualmente.

</details>

## Herramienta

Mueve `K`: la gráfica de arriba es la respuesta al escalón (el valor final es `K/(1+K)`, línea roja). La de abajo es el error en función de `K`, con la zona válida entre el verde y el rojo.

<div data-widget="ej1-hibrido"></div>

**Qué comprobar**
- Con `K = 2` la salida acaba en 0,667.
- Sube `K` por encima de 30,75: el sistema se hace inestable (las oscilaciones crecen).
- Cambia el error máximo a 10 %: el rango cambia a `K ≥ 9`.
