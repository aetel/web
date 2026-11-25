---
title: "Práctica 4: prepara la prueba (preguntas tipo y variantes)"
asignatura: sistemas-control
tipo: test
tema: "Laboratorio · Práctica 4"
orden: 55
resumen: "Las seis preguntas tipo de la prueba de la práctica 4, resueltas paso a paso, y un test dinámico que genera variantes con otros números cada vez que lo repites."
keywords: [práctica 4, prueba, examen, tiempo de pico, polos reales, feedback, zpk, tf, planta inestable, rango de ganancias, polo dominante, simplificar orden, discreto, test dinámico]
---

La prueba mezcla seis tipos de pregunta. Aquí están resueltas, con **el razonamiento y el error típico de cada una**, y debajo tienes un test que las reproduce con números distintos cada vez. Los comandos de Matlab de cada apartado están en la sección 4 de [`SC_P4.m`](/assets/docs/subjects/sistemas-control/SC_P4.m).

| # | Qué te preguntan | Qué hay que mirar |
|---|---|---|
| 1 | Tiempo de pico de un lazo cerrado con planta de dos polos reales | El discriminante de la ecuación característica: ¿polos reales o complejos? |
| 2 | Relacionar ganancias con comportamientos a partir de los polos (discreto) | Módulo y fase de los polos: dentro o fuera del círculo unidad, con o sin parte imaginaria |
| 3 | Tabla de una planta **inestable** `$K_G/((s-1)(s+9))$` con regulador proporcional | Estabilidad (¿K > 1?) y polos para cada K |
| 4 | Comando de Matlab que calcula el lazo cerrado | Qué va en cada argumento de `feedback` |
| 5 | ¿Es razonable simplificar un sistema de orden 2 con polos complejos conjugados? | Qué es un polo dominante |
| 6 | Emparejar funciones de transferencia con comandos `tf` / `zpk` | `zpk` pide polos; `tf` pide coeficientes |

## 1. Tiempo de pico con dos polos reales

<div class="enun">

**Enunciado.** Planta con polos en `$s = -2$` y `$s = -20$`, ganancia significativa unitaria, `$H = 1$`, regulador `$F = 2$`. ¿Cuánto vale `$t_p$`?

</div>

**Resolución.**

1. Ganancia unitaria: `$G(0) = 1$`, luego `$G(s) = 40/((s+2)(s+20))$`.
2. Lazo cerrado: `$1 + F\cdot G = 0$` ⇒ `$s^2 + 22s + 40 + 80 = s^2 + 22s + 120 = 0$`.
3. Discriminante: `$22^2 - 4\cdot 120 = 484 - 480 = 4 \gt  0$`. Polos **reales**: `$s = -10$` y `$s = -12$`.
4. Con polos reales la salida sube sin oscilar: **no existe tiempo de pico**.

<div class="trap">

**Error típico (el de la captura, 0,41 s).** Sustituir un valor en `$\pi /\omega$` sin comprobar si hay `$\omega$`. Primero se mira el discriminante; solo si es negativo hay par complejo y tiene sentido `$t_p = \pi /\omega$`.

</div>

<details class="think">
<summary>Piensa antes de abrir: ¿a partir de qué F aparece el pico en este sistema?</summary>

Cuando `$D = 22^2 - 4\cdot (40 + 40F) \lt  0$`, es decir `$F \gt  2{,}025$`. Con `$F = 2$` estás en el borde, por eso los polos están tan cerca (−10 y −12) y aun así no hay pico.

</details>

## 2. Ganancias y comportamientos en discreto (código con `roots`)

<div class="enun">

**Enunciado.** El código recorre `K = [0.001 10 40]`, calcula `M=feedback(K*bg,1)`, las raíces del denominador y las guarda en `polos`. Resultado: la primera fila no tiene parte imaginaria apreciable (≈ 1), la segunda es `$0{,}6463 \pm  0{,}6427i$` y la tercera `$0{,}2488 \pm  1{,}2008i$`. Hay que decir qué ganancia da un sistema críticamente amortiguado, cuál subamortiguado y cuál inestable.

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

**Resolución.** En discreto se calcula `$\lvert p\rvert$`:

| K | Polos | `$\lvert p\rvert$` | Conclusión |
|---|---|---|---|
| 0,001 | dos raíces reales iguales (≈ 1), sin parte imaginaria | ≈ 1 | **críticamente amortiguado** |
| 10 | `$0{,}6463 \pm  0{,}6427i$` | `$\sqrt{0{,}6463^2 + 0{,}6427^2} = 0{,}9115 \lt  1$` | **subamortiguado** |
| 40 | `$0{,}2488 \pm  1{,}2008i$` | `$\sqrt{0{,}2488^2 + 1{,}2008^2} = 1{,}2263 \gt  1$` | **inestable** |

La captura marcaba bien `$40 \to  \text{inestable}$`, y mal `$10 \to  \text{crítico}$` y `$0{,}001 \to  \text{subamortiguado}$`: estaban cruzados. Regla de lectura:

- parte imaginaria **cero** y raíces iguales ⇒ crítico; raíces reales distintas ⇒ sobreamortiguado;
- par complejo con `$\lvert p\rvert  \lt  1$` ⇒ subamortiguado;
- algún `$\lvert p\rvert  \gt  1$` ⇒ inestable (en continuo sería `$\operatorname{Re} \gt  0$`).

## 3. Tabla de una planta inestable

**Planta.** `$G(s) = K_G/((s-1)(s+9))$` con regulador proporcional `$K$` y realimentación unitaria. La tabla da, para `$K = 1$`, polos `$-8; 0$`, lo que fija `$K_G = 9$`: el denominador de lazo cerrado es `$(s-1)(s+9) + 9K = s^2 + 8s + 9(K-1)$`.

**Claves.**

- **Estabilidad.** Con orden 2 basta que los coeficientes sean positivos: `$9(K-1) \gt  0$` ⇒ **`$K \gt  1$`**.
- **Polos.** `$s = -4 \pm  \sqrt{16 - 9(K-1)}$`. La parte real es siempre `$-4$`: **`$\sigma  = 4$` no depende de K**, y por eso `$t_s = \pi /4 = 785\,\text{ms}$` sale en las filas estables con polos complejos.
- **Polo doble.** `$16 - 9(K-1) = 0$` ⇒ `$K = 25/9 = 2{,}78 \approx  2{,}8$`.
- **El amortiguamiento solo mira los polos** (reales distintos, iguales o complejos); la estabilidad va en otra columna.

| K | Estable | Polos (menor a mayor parte real) | `$t_s$` | `$t_p$` | `$M_p$` | Amortiguamiento |
|---|---|---|---|---|---|---|
| 1 | No (polo en 0) | `$-8 ; 0$` | No procede | No procede | No procede | Sobreamortiguado |
| 2,8 | Sí | `$-4+j0 ; -4-j0$` (doble) | ver nota | No procede | No procede | Crítico |
| 4,6 | Sí | `$-4+j4 ; -4-j4$` | 785 ms | 785 ms | `$e^{-\pi} = 4{,}32 \%$` | Subamortiguado |
| 0,01 | No (polo en +0,99) | `$-8{,}99+j0 ; 0{,}99-j0$` | No procede | No procede | No procede | Sobreamortiguado |

*Cuentas de la fila 3:* `$\omega  = \pi /t_p = 4$`, `$t_s = \pi /\sigma  = 785\,\text{ms}$`, `$M_p = e^{-\pi \sigma /\omega} = e^{-\pi} = 4{,}32 \%$`. La fila de `$K = 0{,}01$` tiene polos `$-8{,}991$` y `$+0{,}991$`: un polo en el semiplano derecho, no hay `$t_s$`.

**Nota sobre `$t_s$` en la fila crítica.** Con polo doble la respuesta es `$1 - (1 + \sigma t)e^{-\sigma t}$` y `$\pi /\sigma$` (que sale de la envolvente de una oscilación) no se aplica. Con `$\sigma  = 4$` el 5 % se alcanza hacia **1,19 s** (4,74/σ; el cursor de `step` da lo mismo). En la captura `$785\,\text{ms}$` aparecía como incorrecto para esa casilla; si el desplegable de tu prueba no ofrece 1,19 s, elige la opción más cercana a 1,2 s y no la de 785 ms.

Mueve `$K$` y comprueba la tabla fila a fila:

<div data-widget="p4-tabla-inestable"></div>

## 4. Comando de Matlab del lazo cerrado

<div class="enun">

**Enunciado.** Planta `g`, realimentación `$H(s) = 3$`, regulador `$F(s) = 2$`. Respuesta: **`M=feedback(2*g,3)`**.

</div>

`feedback(sys1, sys2)` pone `sys1` en la cadena directa y `sys2` en la rama de retorno, con realimentación negativa por defecto: `$M = \mathrm{sys}_1/(1 + \mathrm{sys}_1\cdot \mathrm{sys}_2)$`. El regulador va en serie con la planta, así que entra en el primer argumento (`2*g`), y el sensor en el segundo (`$3$`).

Trampas habituales: `feedback(3*g,2)` (intercambiados), `feedback(6*g,1)` (mete `$H$` en la cadena directa, que no es lo mismo que `$F\cdot G/(1+F\cdot G\cdot H)$`) y `feedback(g)` (olvida `$F$` y `$H$`).

## 5. ¿Es razonable simplificar un sistema de orden 2 con polos complejos conjugados?

<div class="tip">

**Respuesta modelo.** **No**. Se puede aproximar un sistema por otro de orden menor cuando hay un **polo dominante**: otro polo varias veces más rápido (regla práctica: 5–10 veces más a la izquierda en `$s$`, o mucho más cerca del origen en `$z$`) cuyo modo se extingue enseguida. Un par conjugado `$\sigma  \pm  j\omega$` tiene **la misma parte real**: ambos modos se apagan con la misma envolvente `$e^{\sigma t}$` y ninguno domina. Además, quitar solo uno dejaría un polo complejo suelto (coeficientes complejos), que no corresponde a ningún sistema físico.

</div>

**Condiciones en las que sí es razonable** (con polos reales): un polo `$p_2$` con `$\lvert p_2\rvert  \ge  5\text{–}10\cdot \lvert p_1\rvert$`. Se elimina el rápido, se conserva el lento y se **ajusta la ganancia para no cambiar el valor final** (`$M(0)$`). Ejemplo: `$15/((s+1)(s+15)) \approx  1/(s+1)$`.

## 6. Emparejar FdeT y comandos

Con `$T = 40\,\text{ms}$`:

| Función | Comando |
|---|---|
| `$X_1 = 3/((z - 0{,}2)(z - 0{,}6))$` | `zpk([],[0.2 0.6],3,0.04)` |
| `$X_2 = 3/((z + 0{,}2)(z + 0{,}6))$` | `tf(3,[1 0.8 0.12],0.04)` (o `zpk([],[-0.2 -0.6],3,0.04)`) |

- `zpk(ceros, polos, ganancia, T)` recibe **los polos tal cual**: en `$X_1$` son `$+0{,}2$` y `$+0{,}6$`; en `$X_2$`, `$-0{,}2$` y `$-0{,}6$`.
- `tf(num, den, T)` recibe **coeficientes** en potencias decrecientes de `$z$`: `$(z + 0{,}2)(z + 0{,}6) = z^2 + 0{,}8z + 0{,}12$`.
- Error de la captura: `tf([3],[0.2 0.6],0.04)` es `$3/(0{,}2z + 0{,}6)$`, un solo polo en `$z = -3$`, y `zpk([],[0.2 0.6],3,0.04)` en la segunda fila tiene los polos con signo cambiado.
- El cuarto argumento es el periodo de muestreo **en segundos** (`0.04`, no `40`). Sin él, el sistema sería continuo.

## Test dinámico

Cada pregunta tiene parámetros aleatorios (polos, ganancias, periodos, orden de las opciones) y la explicación se calcula con los mismos números. Pulsa *Nuevo intento* para generar otras variantes. Tus resultados se guardan en este navegador y suman XP.

<div data-widget="quiz-dinamico" data-src="/assets/data/quiz/p4-prueba-tipo.json" data-id="p4-prueba-tipo"></div>
