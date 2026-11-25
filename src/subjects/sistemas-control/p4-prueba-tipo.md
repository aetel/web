---
title: "Práctica 4: prepara la prueba (preguntas tipo y variantes)"
asignatura: sistemas-control
tipo: test
tema: "Laboratorio · Práctica 4"
orden: 55
resumen: "Las seis preguntas tipo de la prueba de la práctica 4, explicadas con el concepto que hay detrás de cada una, y un test dinámico con números distintos en cada intento."
keywords: [práctica 4, prueba, examen, tiempo de pico, polos reales, feedback, zpk, tf, planta inestable, rango de ganancias, polo dominante, simplificar orden, discreto, test dinámico]
---

Las seis preguntas se resuelven con la misma idea: **la respuesta al escalón la decide dónde están los polos de lazo cerrado**. Cada apartado explica qué concepto se evalúa, cómo se resuelve y en qué se suele fallar. Al final hay un test que repite estos tipos con números distintos. Los comandos de Matlab están en la sección 4 de [`SC_P4.m`](/assets/docs/subjects/sistemas-control/SC_P4.m).

## Antes de empezar: del polo al comportamiento

Método para cualquier pregunta: cerrar el lazo, escribir la ecuación característica `$1 + F\,G\,H = 0$`, calcular sus raíces y clasificarlas.

| Polos de lazo cerrado | Continuo (s) | Discreto (z) | Comportamiento |
|---|---|---|---|
| Reales y distintos | `$\operatorname{Re} \lt 0$` | `$\lvert p\rvert \lt 1$` | Sobreamortiguado: sin pico |
| Reales e iguales | `$\operatorname{Re} \lt 0$` | `$\lvert p\rvert \lt 1$` | Críticamente amortiguado: sin pico |
| Par complejo | `$\sigma \pm j\omega$`, `$\sigma \lt 0$` | `$r\,e^{\pm j\varphi}$`, `$r \lt 1$` | Subamortiguado: oscila y tiene pico |
| Par complejo en el límite | `$\sigma = 0$` | `$r = 1$` | Oscilación sostenida |
| Alguno fuera | `$\operatorname{Re} \gt 0$` | `$\lvert p\rvert \gt 1$` | Inestable |

Dos reglas que se usan en todo el documento:

- **Sin parte imaginaria no hay oscilación**, y sin oscilación no existe `$t_p$` ni `$M_p$`.
- **Estabilidad y amortiguamiento son cosas distintas.** La estabilidad depende de dónde están los polos (semiplano izquierdo o círculo unidad). El amortiguamiento depende de si son reales o complejos.

## 1. Tiempo de pico con dos polos reales

<div class="enun">

**Enunciado.** Planta con polos en `$s = -2$` y `$s = -20$`, ganancia significativa unitaria, `$H = 1$`, regulador `$F = 2$`. ¿Cuánto vale `$t_p$`?

</div>

**Concepto.** El tiempo de pico es el instante del primer máximo, y solo hay máximo si la respuesta oscila, es decir, si los polos de lazo cerrado son complejos. Antes de aplicar `$t_p = \pi/\omega$` hay que comprobar que existe `$\omega$`.

**Resolución.**

1. Ganancia significativa unitaria: `$G(0) = 1$`, luego `$G(s) = 40/((s+2)(s+20))$`.
2. Ecuación característica: `$1 + F\,G = 0$` ⇒ `$s^2 + 22s + 40 + 80 = s^2 + 22s + 120 = 0$`.
3. Discriminante: `$22^2 - 4\cdot 120 = 4 \gt 0$`. Polos reales: `$s = -10$` y `$s = -12$`.
4. **No existe tiempo de pico.** La respuesta: «No existe tiempo de pico para este sistema».

<div class="trap">

**Error típico.** Elegir una opción numérica (0,41 s en la captura) por haber sustituido en `$\pi/\omega$` sin mirar el discriminante. Las opciones con segundos son el cebo: primero se mira el signo de `$D$`.

</div>

<details class="think">
<summary>Piensa antes de abrir: ¿a partir de qué F aparece el pico?</summary>

Cuando `$D = 22^2 - 4(40 + 40F) = 324 - 160F \lt 0$`, es decir, `$F \gt 2{,}025$`. Con `$F = 2$` se está justo en el borde: los polos (−10 y −12) están muy juntos pero siguen siendo reales.

</details>

## 2. Ganancias y comportamientos en discreto

<div class="enun">

**Enunciado.** Se ejecuta este código para tres ganancias y se obtienen los polos de lazo cerrado. Hay que decir qué ganancia da un sistema críticamente amortiguado, cuál subamortiguado y cuál inestable.

```matlab
for K=[0.001 10 40]
	M=feedback(K*bg,1);
	[NumM,DenM]=tfdata(M, 'v');
	raicesDenM=roots(DenM);
	x=x+1;
	polos(x,1:2)=raicesDenM';
end
polos
```

```text
polos =

   ±1

   0.6463 ± 0.6427i

   0.2488 ± 1.2008i
```

</div>

**Concepto.** En discreto la estabilidad es `$\lvert p\rvert \lt 1$` (dentro del círculo unidad). El módulo indica cuánto se apaga la respuesta y la parte imaginaria (el ángulo) cuánto oscila. Se lee cada fila así:

- Raíces reales e iguales: **crítico**. Raíces reales distintas: sobreamortiguado.
- Par complejo con `$\lvert p\rvert \lt 1$`: **subamortiguado**.
- Algún `$\lvert p\rvert \gt 1$`: **inestable**.

| K | Polos | `$\lvert p\rvert$` | Conclusión |
|---|---|---|---|
| 0,001 | dos raíces reales iguales (≈ 1) | ≈ 1 | **críticamente amortiguado** |
| 10 | `$0{,}6463 \pm 0{,}6427i$` | `$\sqrt{0{,}6463^2 + 0{,}6427^2} = 0{,}9115 \lt 1$` | **subamortiguado** |
| 40 | `$0{,}2488 \pm 1{,}2008i$` | `$\sqrt{0{,}2488^2 + 1{,}2008^2} = 1{,}2263 \gt 1$` | **inestable** |

**Comprobación.** Al subir `$K$`, los polos reales se acercan, se juntan (crítico), pasan a complejos (subamortiguado) y acaban cruzando el círculo unidad (inestable). Las ganancias salen siempre en el orden crítico < subamortiguado < inestable, que es una forma rápida de verificar la respuesta.

<div class="trap">

**Error típico (el de la captura).** Marcar `$10 \to$` crítico y `$0{,}001 \to$` subamortiguado. Un par complejo nunca es crítico: crítico exige raíces reales iguales.

</div>

## 3. Tabla de una planta inestable

<div class="enun">

**Enunciado.** Planta `$G(s) = K_G/((s-1)(s+9))$` con regulador proporcional `$K$` y realimentación unitaria. Hay que completar una tabla (estable, polos, `$t_s$`, `$t_p$`, `$M_p$`, amortiguamiento) para `$K = 1;\ 2{,}8;\ 4{,}6;\ 0{,}01$`.

</div>

**Paso 1: la ecuación característica.** La tabla da para `$K = 1$` los polos `$-8$` y `$0$`, y de ahí sale `$K_G = 9$`. El denominador de lazo cerrado es

<p class="eq" data-tex>(s-1)(s+9)+9K=s^2+8s+9(K-1)</p>

**Paso 2: qué se deduce de ella.**

- **Estabilidad.** En un sistema de orden 2 basta con que todos los coeficientes sean positivos: `$9(K-1) \gt 0$` ⇒ **`$K \gt 1$`**. La planta es inestable en lazo abierto (polo en `$+1$`) y la ganancia lo arrastra hacia la izquierda.
- **Parte real fija.** La suma de los polos es el coeficiente de `$s$` cambiado de signo, `$-8$`, y no depende de `$K$`. Con un par complejo, cada polo tiene parte real **`$-4$`**, así que `$\sigma = 4$` y `$t_s = \pi/4 = 785\,\text{ms}$`.
- **Tipo de polos.** `$s = -4 \pm \sqrt{16 - 9(K-1)}$`. Son reales si `$K \le 25/9$`, iguales en `$K = 25/9 \approx 2{,}8$` y complejos para `$K \gt 2{,}8$`.

**Paso 3: cuándo «procede» cada columna.**

| Columna | Procede si… |
|---|---|
| `$t_s$` | El sistema es estable |
| `$t_p$` y `$M_p$` | El sistema es estable **y** tiene polos complejos |
| Amortiguamiento | Siempre: solo mira si los polos son reales distintos, iguales o complejos |

**Tabla resuelta.**

| K | Estable | Polos (de menor a mayor parte real) | `$t_s$` | `$t_p$` | `$M_p$` | Amortiguamiento |
|---|---|---|---|---|---|---|
| 1 | No (polo en 0) | `$-8 ;\ 0$` | No procede | No procede | No procede | Sobreamortiguado |
| 2,8 | Sí | `$-4+j0 ;\ -4-j0$` (doble) | ver nota | No procede | No procede | Crítico |
| 4,6 | Sí | `$-4+j4 ;\ -4-j4$` | 785 ms | 785 ms | `$e^{-\pi} = 4{,}32 \%$` | Subamortiguado |
| 0,01 | No (polo en +0,99) | `$-8{,}99+j0 ;\ 0{,}99-j0$` | No procede | No procede | No procede | Sobreamortiguado |

Fila de `$K = 4{,}6$`: `$\omega = \pi/t_p = 4$`, `$t_s = \pi/\sigma = 785\,\text{ms}$` y `$M_p = e^{-\pi\sigma/\omega} = e^{-\pi} = 4{,}32 \%$`. La fila de `$K = 0{,}01$` es sobreamortiguada pero **inestable**: sus polos son `$-8{,}991$` y `$+0{,}991$`, y el polo positivo impide hablar de `$t_s$`.

**Nota sobre `$t_s$` en la fila crítica.** Con polo doble la respuesta es `$1-(1+\sigma t)e^{-\sigma t}$`, y `$\pi/\sigma$` (que sale de la envolvente de una oscilación) no se aplica. Con `$\sigma = 4$` entra en la banda del 5 % hacia **1,19 s**. Si el desplegable no ofrece ese valor, elige el más cercano a 1,2 s, no 785 ms.

Mueve `$K$` y comprueba la tabla fila a fila:

<div data-widget="p4-tabla-inestable"></div>

## 4. Comando de Matlab del lazo cerrado

<div class="enun">

**Enunciado.** Planta `g`, realimentación `$H(s) = 3$`, regulador `$F(s) = 2$`. ¿Qué comando calcula `$M(s)$`?

</div>

**Concepto.** El lazo cerrado con realimentación negativa es

<p class="eq" data-tex>M=\frac{F\,G}{1+F\,G\,H}</p>

`feedback(sys1, sys2)` calcula `$\mathrm{sys}_1/(1+\mathrm{sys}_1\,\mathrm{sys}_2)$`. Por tanto, en el **primer argumento va la cadena directa** (regulador en serie con la planta, `2*g`) y en el **segundo la rama de retorno** (el sensor, `3`).

**Respuesta correcta:** `M=feedback(2*g,3)`.

Por qué fallan las otras opciones de la captura:

- `feedback(3*g,2)`: intercambia `$F$` y `$H$`.
- `feedback(3*g,3*g*2)`: mete la planta y ambas ganancias en la rama de retorno.
- `feedback(series(2,g,3))`: `series` combina dos sistemas, no sirve para multiplicar ganancias, y además `feedback` recibiría un solo argumento (realimentación unitaria, sin `$H$`).

## 5. ¿Es razonable simplificar un sistema de orden 2 con polos complejos conjugados?

<div class="tip">

**Respuesta modelo.** **No.** Se puede sustituir un sistema por otro de menor orden cuando hay un **polo dominante**: un polo mucho más lento que el resto, cuyo modo domina la respuesta porque los demás se extinguen enseguida. Los dos polos de un par conjugado `$\sigma \pm j\omega$` tienen **la misma parte real**, así que sus modos se apagan a la misma velocidad y ninguno domina. Además, quitar uno dejaría un polo complejo suelto, que no corresponde a ningún sistema real, y un sistema de orden 1 no puede oscilar, así que se perdería el sobreimpulso.

</div>

**Cuándo sí es razonable** (con polos reales): si el polo rápido `$p_2$` cumple `$\lvert p_2\rvert \ge 5$` a `$10$` veces `$\lvert p_1\rvert$` en continuo (o está mucho más cerca del origen en `$z$`). Se elimina el rápido, se conserva el lento y se **reajusta la ganancia para no cambiar el valor final** `$M(0)$`. Ejemplo:

<p class="eq" data-tex>\frac{15}{(s+1)(s+15)}\approx\frac{1}{s+1}</p>

## 6. Emparejar funciones de transferencia y comandos

**Concepto.** Matlab define una FdeT de dos formas distintas:

- `zpk(ceros, polos, ganancia, T)` recibe **los polos tal cual**, con su signo: `(z - 0.2)` es el polo `0.2`, y `(z + 0.2)` es el polo `-0.2`. La ganancia multiplica la forma factorizada.
- `tf(num, den, T)` recibe los **coeficientes** de numerador y denominador en potencias decrecientes de `$z$`.

El cuarto argumento es el periodo de muestreo **en segundos** (`0.04` para 40 ms). Sin él, el sistema sería continuo.

Con `$T = 40\,\text{ms}$`:

| Función | Comando |
|---|---|
| `$X_1 = 3/((z - 0{,}2)(z - 0{,}6))$` | `zpk([],[0.2 0.6],3,0.04)` |
| `$X_2 = 3/((z + 0{,}2)(z + 0{,}6))$` | `tf(3,[1 0.8 0.12],0.04)` (o `zpk([],[-0.2 -0.6],3,0.04)`) |

Para `tf`, el denominador se desarrolla: `$(z + 0{,}2)(z + 0{,}6) = z^2 + 0{,}8z + 0{,}12$`, de ahí `[1 0.8 0.12]`.

<div class="trap">

**Errores típicos.** `tf([3],[0.2 0.6],0.04)` es `$3/(0{,}2z + 0{,}6)$`: un solo polo en `$z = -3$`, no dos polos. Y `zpk([],[0.2 0.6],3,0.04)` para `$X_2$` tiene los polos con el signo cambiado.

</div>

## Test dinámico

Cada pregunta tiene parámetros aleatorios (polos, ganancias, periodos, orden de las opciones) y la explicación se calcula con los mismos números. Pulsa *Nuevo intento* para generar otras variantes. Tus resultados se guardan en este navegador y suman XP.

<div data-widget="quiz-dinamico" data-src="/assets/data/quiz/p4-prueba-tipo.json" data-id="p4-prueba-tipo"></div>
