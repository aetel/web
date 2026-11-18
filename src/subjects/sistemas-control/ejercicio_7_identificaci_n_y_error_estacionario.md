---
title: "Ejercicio 7: identificación desde gráfica y análisis de error continuo y discreto"
asignatura: sistemas-control
tipo: ejercicio
tema: "Tema 2 · Ejercicios en grupo"
orden: 170
resumen: "Identificación de un sistema de segundo orden a partir de su tiempo de pico y sobreimpulso, y posterior cálculo del error en régimen permanente (continuo y discreto) con una ganancia paramétrica."
keywords: [ejercicio 7, identificación, tiempo de pico, sobreimpulso, segundo orden, error de posición, error de velocidad, tipo 1, discreto]
refs:
  - { doc: resumen-t2, pagina: 13, texto: "Sistemas subamortiguados canónicos" }
  - { doc: resumen-t2, pagina: 6, texto: "Cálculo del error en sistemas discretos" }
---

**Enunciado (resumen).** Una plataforma móvil presenta una respuesta al escalón de excitación de $1$ V con las siguientes características extraídas de una gráfica: tiempo de pico $t_p = 0.5$ s, valor máximo $2.416$ m y valor final $2$ m.
Se pide:
(a) Obtener la función de transferencia canónica $G(s)$.
(b) Para un sistema realimentado con $GH(s) = \frac{150}{s^2 + 6s + 50}$ y un regulador $F_1(s) = K$, hallar el error mínimo en régimen permanente ante escalón si la ganancia varía en el rango $0 \le K \le 0.82$.
(c) Si la cadena abierta discretizada a $T = 0.1$ s resulta ser $FB_0GH(z) = \frac{0.36}{(z-0.19)(z-1)}$, hallar el error en régimen permanente significativo del sistema.

## Qué te están preguntando

Un ejercicio clásico de **ingeniería inversa**: extraer la dinámica (polos y ganancia) a partir de un ensayo empírico. Después, se evalúa tu comprensión sobre qué constante de error ($K_p$, $K_v$, etc.) aplica según el "Tipo" del sistema, tanto en el dominio de Laplace como en el dominio Z.

<details>
<summary>Solución paso a paso</summary>

**a) Identificación de la FdeT $G(s)$.**
El sistema es subamortiguado. Del valor final $c(\infty) = 2$ para una entrada $R = 1$, deducimos la ganancia estática:
$$G(0) = 2 \text{ m/V}$$
Calculamos el sobreimpulso máximo ($M_p$):
$$M_p = \frac{c(t_p) - c(\infty)}{c(\infty)} = \frac{2.416 - 2}{2} = 0.208 = 20.8\%$$
Sabiendo que $t_p = 0.5$ s, hallamos la parte imaginaria de los polos dominantes:
$$t_p = \frac{\pi}{\text{Im}(p)} \implies \text{Im}(p) = \frac{\pi}{0.5} = 2\pi \approx 6.28 \text{ rad/s}$$
Despejamos la parte real a partir de la fórmula del sobreimpulso:
$$M_p = e^{\frac{\pi \text{Re}(p)}{\text{Im}(p)}} \implies \ln(0.208) = \frac{\pi \text{Re}(p)}{2\pi} = \frac{\text{Re}(p)}{2}$$
$$\text{Re}(p) = 2 \ln(0.208) = 2(-1.57) = -3.14 \approx -\pi \text{ rad/s}$$
La función de transferencia de un sistema de segundo orden canónico es $G(s) = \frac{A}{s^2 - 2\text{Re}(p)s + |p|^2}$.
El denominador es: $(s + \pi)^2 + (2\pi)^2 \approx s^2 + 2\pi s + 5\pi^2 \approx s^2 + 2\pi s + 50$.
Para que $G(0) = 2$, $A / 50 = 2 \implies A = 100$.
$$G(s) \approx \frac{100}{s^2 + 2\pi s + 50} \text{ m/V}$$

**b) Error mínimo en RP (continuo).**
La cadena abierta es $CA(s) = K \cdot \frac{150}{s^2 + 6s + 50}$. Como no tiene polos en el origen, es de Tipo 0. El error significativo es el de posición.
$$K_p = \lim_{s \to 0} CA(s) = K \cdot \frac{150}{50} = 3K$$
$$e_{rpp} = \frac{1}{1 + K_p} = \frac{1}{1 + 3K}$$
Para minimizar el error, debemos maximizar la ganancia dentro del rango permitido ($K = 0.82$):
$$e_{rpp, min} = \frac{1}{1 + 3(0.82)} = \frac{1}{1 + 2.46} = \frac{1}{3.46} \approx 0.289 \implies 28.9\%$$

**c) Error en RP (discreto).**
La cadena abierta discretizada es $CA(z) = \frac{0.36}{(z-0.19)(z-1)}$. Al tener un polo en $z = 1$, el sistema es de **Tipo 1**. Por tanto, el error ante escalón es nulo, y el error significativo es ante **rampa** ($e_{rpv}$).
Calculamos la constante de velocidad discreta ($K_v$):
$$K_v = \lim_{z \to 1} \frac{z-1}{T} CA(z) = \frac{1}{0.1} \lim_{z \to 1} \frac{0.36}{z-0.19} = 10 \cdot \frac{0.36}{0.81} = \frac{3.6}{0.81} = 4.44 \text{ s}^{-1}$$
El error de velocidad es la inversa de la constante de velocidad multiplicada por la pendiente (que asumimos unitaria):
$$e_{rpv} = \frac{1}{K_v} = \frac{1}{4.44} = 0.225 \implies 22.5\%$$
Alternativamente, usando la fórmula directa en $z$: $e_{rpv} = \frac{T \cdot (1 - p_1)}{\text{Num}(1)} = \frac{0.1 \cdot (1 - 0.19)}{0.36} = \frac{0.081}{0.36} = 0.225$.

</details>

## Herramienta

Modifica los parámetros $\text{Re}(p)$ e $\text{Im}(p)$ para ver cómo se ajusta la curva de respuesta al escalón a los puntos empíricos medidos en el experimento. En la segunda pestaña, puedes probar diferentes valores de $K$ para visualizar la reducción del error estacionario en el sistema realimentado.

<div data-widget="ej7-identificacion"></div>

**Qué comprobar**
- Fija $\text{Re}(p) = -3.14$ e $\text{Im}(p) = 6.28$. Observa que el pico de la gráfica coincide exactamente con el tiempo $t_p = 0.5$ s y la amplitud de $2.416$ m.
- Cambia a la pestaña de Lazo Cerrado. Comprueba que con $K = 0$ (lazo abierto sin excitación), el error es del 100%. 
- Incrementa $K$ progresivamente hacia $0.82$. Verás cómo la línea de la respuesta final se acerca a la referencia unitaria, logrando un error residual del $\approx 29\%$.