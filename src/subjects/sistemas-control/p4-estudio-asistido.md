---
title: "Práctica 4: de los polos a la respuesta (estudio asistido)"
asignatura: sistemas-control
tipo: ejercicio
tema: "Laboratorio · Práctica 4"
orden: 180
resumen: "Guía paso a paso de la práctica 4: qué se calcula en cada apartado, por qué, cómo se resuelve y qué debes concluir. Con animaciones de la respuesta, de los polos y de la ganancia."
keywords: [práctica 4, laboratorio, régimen transitorio, polos de lazo cerrado, polo dominante, sobreimpulso, tiempo de pico, tiempo de establecimiento, sobreamortiguado, críticamente amortiguado, subamortiguado, oscilación sostenida, ganancia crítica, ZOH, Matlab, feedback, step, pole, estudio asistido]
---

Esta página no es solo la solución: está pensada para que **entiendas por qué cada paso se hace así** y puedas reproducirlo sin mirar. Sigue el orden. Cada bloque tiene tres partes: lo que se pregunta, el razonamiento y los números. Antes de las soluciones hay pequeñas preguntas del tipo *piensa antes de abrir*: intenta responderlas, aunque te equivoques.

**Al terminar sabrás:**

1. Explicar por qué los **polos de lazo cerrado** determinan la forma de la respuesta temporal.
2. Calcular `$t_p$`, `$M_p$` y `$t_s$` de un sistema continuo y de uno discreto, y decir cuándo no existen.
3. Predecir cómo cambia la respuesta al **subir la ganancia**, y por qué eso tiene un precio.
4. Encontrar el **rango de ganancias** de cada régimen (sobreamortiguado, crítico, subamortiguado, oscilación sostenida, inestable).
5. Explicar por qué el mismo sistema, **muestreado**, se inestabiliza antes.

## 0. La práctica en un mapa

La práctica tiene un solo hilo conductor: *cerrar el lazo, mirar dónde quedan los polos y comprobar que la respuesta se comporta como dicen las fórmulas*. Lo que cambia es el sistema sobre el que se hace.

| Apartados | Sistema | Qué haces | Qué se calcula | Qué debes concluir |
|---|---|---|---|---|
| 1–4 | Continuo: `$G(s) = 20/((s+1)(s+20))$` | Cierras el lazo con `$F = 1$` y `$F = 25$` | Polos, `$t_p$`, `$M_p$`, `$t_s$` teóricos y medidos | Más ganancia = más rápido y menos error, pero aparece sobreimpulso |
| 5–8 | Discreto: polos en `$0{,}905$` y `$0{,}135$`, `$T = 0{,}1\,\text{s}$` | Lo mismo con `$F = 1$` y `$F = 6{,}25$` | Lo mismo, con las fórmulas de z | Las fórmulas de z dan lo mismo en espíritu, pero con muestras |
| 9–11 | Continuo: `$G'(s) = 10/(s(s+1)(s+10))$` | Barres `$K$` | Rangos de K de cada régimen y periodo de oscilación | Hay un `$K$` crítico y un `$K$` límite de estabilidad |
| 12–14 | Su versión discreta con ZOH | Barres `$K$` | Igual que arriba | El límite de estabilidad baja al muestrear |

## 1. Primero, el vocabulario (con animación)

Antes de calcular nada hay que tener claro **qué se mide en una respuesta al escalón**. Pulsa *Reproducir* y fíjate en cómo van apareciendo las magnitudes. Después mueve `$\sigma$` y `$\omega$` y observa qué cambia.

<div data-widget="anatomia-escalon"></div>

Lo que ha pasado en la animación, dicho con palabras:

- **Valor final.** Hacia dónde se estabiliza la salida. En lazo cerrado no tiene por qué ser 1: lo calcularemos como `$M(0)$` en continuo y `$M(1)$` en discreto.
- **Tiempo de pico `$t_p$`.** Instante del primer máximo. Solo existe si hay oscilación.
- **Sobreimpulso `$M_p$`.** Cuánto se pasa el pico del valor final, **como porcentaje del valor final** (no de 1).
- **Tiempo de establecimiento `$t_s$`.** Instante a partir del cual la salida ya no sale de la banda del ±5 % del valor final.

Y las fórmulas que usará la práctica, con el criterio `$\lvert \ln  0{,}05\rvert  \approx  \pi$`:

| | Continuo, polo `$\sigma  \pm  j\omega$` | Discreto, polo `$r\cdot e^{\pm  j\varphi}$` |
|---|---|---|
| Pico | `$t_p = \pi /\omega$` | `$k_p = \pi /\varphi$`, `$t_p = k_p\cdot T$` |
| Sobreimpulso | `$M_p = e^{\pi \cdot \sigma /\omega}$` | `$M_p = r^{\pi /\varphi}$` |
| Establecimiento | `$t_s = \pi /\lvert \sigma\rvert$` | `$k_s = \lceil -\pi /\ln  r\rceil$`, `$t_s = k_s\cdot T$` |

**La idea que lo une todo.** `$\sigma$` (o `$r$`) dice *cuánto se apaga* la respuesta; `$\omega$` (o `$\varphi$`) dice *cuánto oscila*. Si no hay parte imaginaria, no hay oscilación, no hay pico y `$M_p = 0$`.

<details class="think">
<summary>Piensa antes de abrir: ¿por qué solo se usa el polo dominante?</summary>

Cada polo aporta un modo `$e^{\sigma t}$`. Los modos con `$\sigma$` muy negativa desaparecen enseguida y dejan solo al más lento. Por eso, para estimar `$t_s$`, basta el polo más próximo al eje imaginario (en z, el de módulo más cercano a 1). Es una aproximación: si hay un segundo polo parecido, o si hay ceros cerca, el resultado se desvía.

</details>

## 2. Parte A: sistema continuo (apartados 1–4)

### Paso 1. ¿Qué planta es y por qué ese 20?

El enunciado pide dos polos reales en `$s = -1$` y `$s = -20$` y **ganancia significativa unitaria**. La ganancia significativa es el valor de `$G$` en continua, `$G(0)$`. Con solo los polos, `$1/((s+1)(s+20))$` valdría `$1/20$` en continua. Para que valga 1 hay que multiplicar por 20:

<p class="eq" data-tex>G(s)=\frac{20}{(s+1)(s+20)}=\frac{20}{s^2+21s+20},\qquad G(0)=\frac{20}{20}=1</p>

```matlab
G = zpk([], [-1 -20], 20);
```

### Paso 2. Cerrar el lazo

Con realimentación unitaria `$H = 1$` y regulador de ganancia `$F$`, la función de transferencia de lazo cerrado es:

<p class="eq" data-tex>M(s)=\frac{F\,G}{1+F\,G}=\frac{20F}{s^2+21s+20+20F}</p>

El denominador de `$M$` es la **ecuación característica**: sus raíces son los polos de lazo cerrado, y ahí está toda la información del transitorio. Observa que `$F$` solo mueve el término independiente: es la forma de mover los polos.

```matlab
M1 = feedback(1*G, 1);    pole(M1)
M2 = feedback(25*G, 1);   pole(M2)
```

### Paso 3. Dónde quedan los polos

Aplica la fórmula de segundo grado: `$s = (-21 \pm  \sqrt{D})/2$`, con `$D = 21^2 - 4(20 + 20F) = 361 - 80F$`.

- Si `$D \gt  0$` (esto es, `$F \lt  4{,}51$`): dos polos **reales** ⇒ no hay oscilación.
- Si `$D \lt  0$` (`$F \gt  4{,}51$`): par **complejo** ⇒ hay oscilación.

<details class="think">
<summary>Piensa antes de abrir: con <code>$F = 1$</code> y <code>$F = 25$</code>, ¿qué esperas ver?</summary>

Con `$F = 1$`, `$D = 281 \gt  0$`: polos reales en `$s = -2{,}1185$` y `$s = -18{,}8815$`. Respuesta sobreamortiguada, sin pico.

Con `$F = 25$`, `$D = -1639 \lt  0$`: polos `$s = -10{,}5 \pm  j\cdot 20{,}2423$`. Respuesta subamortiguada, con oscilación.

Piensa en lo que ha pasado: al subir `$F$`, el polo lento (−1) se desplaza a la izquierda, el rápido (−20) a la derecha, **se encuentran** en −10,5 (en `$F = 4{,}51$`) y a partir de ahí se separan en vertical.

</details>

Compruébalo moviendo la ganancia. Pulsa *Animar la ganancia*: cada polo deja un rastro verde mientras es real y naranja cuando ya forma par complejo.

<div data-widget="p4-barrido" data-planta="p31"></div>

### Paso 4. Qué fórmulas usar

| Polos de lazo cerrado | Se llama | Qué se puede calcular |
|---|---|---|
| Reales y distintos | Sobreamortiguado | Solo `$t_s$` (con el polo lento). No hay `$t_p$` ni `$M_p$`. |
| Reales e iguales | Críticamente amortiguado | `$t_s$`, sin pico |
| Complejos | Subamortiguado | `$t_p$`, `$M_p$` y `$t_s$` |

La práctica indica *no simplificar las funciones de transferencia*: no hay que convertir `$M_1$` en un sistema de primer orden, solo **aplicar el criterio del polo dominante** a sus polos.

### Paso 5. Los números

<details class="calc">
<summary><code>$M_1(s)$</code>, con <code>$F = 1$</code></summary>

<p class="eq" data-tex>M_1(s)=\frac{20}{s^2+21s+40},\qquad \text{polos } -2{,}1185\ \text{y}\ -18{,}8815</p>

- Polos reales ⇒ **sin `$t_p$` ni `$M_p$`**.
- Polo dominante `$-2{,}1185$`: `$t_s = \pi /2{,}1185 =$` **1,4830 s**.
- Valor final `$M_1(0) = 20/40 = 0{,}5$`. El error en régimen permanente es del 50 %.

</details>

<details class="calc">
<summary><code>$M_2(s)$</code>, con <code>$F = 25$</code></summary>

<p class="eq" data-tex>M_2(s)=\frac{500}{s^2+21s+520},\qquad \text{polos } -10{,}5\pm 20{,}2423\,j</p>

Aquí `$\sigma  = 10{,}5$` y `$\omega  = 20{,}2423$`:

<p class="eq" data-tex>t_p=\frac{\pi}{\omega}=0{,}1552\ \text{s},\qquad M_p=e^{-\pi\cdot 10{,}5/20{,}2423}=19{,}60\ \%,\qquad t_s=\frac{\pi}{10{,}5}=0{,}2992\ \text{s}</p>

Valor final `$M_2(0) = 500/520 = 0{,}9615$` (error 3,85 %).

</details>

**Tabla 1 (teórico).**

| | `$t_p$` (s) | `$M_p$` (%) | `$t_s$` (s) |
|---|---|---|---|
| `$M_1(s)$` | — | 0 | 1,4830 |
| `$M_2(s)$` | 0,1552 | 19,60 | 0,2992 |

### Paso 6. Medir en Matlab y comparar

```matlab
step(M1);  step(M2)
stepinfo(M2, 'SettlingTimeThreshold', 0.05)   % tp (PeakTime), Mp (Overshoot), ts (SettlingTime)
```

`stepinfo` da los tres valores con la banda del 5 %, así no hay que leer con el cursor. Resultados (los he obtenido con un simulador propio equivalente a `step`):

| | `$t_p$` teór. | `$M_p$` teór. | `$t_s$` teór. | `$t_p$` Matlab | `$M_p$` Matlab | `$t_s$` Matlab |
|---|---|---|---|---|---|---|
| `$M_1(s)$` | — | 0 % | 1,4830 | — | 0 % | 1,478 |
| `$M_2(s)$` | 0,1552 | 19,60 % | 0,2992 | 0,156 | 19,6 % | 0,233 |

<div class="qa">

**¿Tiene ventaja aumentar la ganancia?**

Sí: `$t_s$` baja de 1,48 s a unos 0,3 s (el polo dominante pasa de −2,1 a −10,5) y el error permanente cae del 50 % al 3,85 %. **Pero tiene un precio:** aparece un 19,6 % de sobreimpulso, porque los polos pasaron de reales a complejos.

</div>

<div class="qa">

**¿Por qué el `$t_s$` medido (0,233 s) es menor que el teórico (0,299 s)?**

`$\pi /\lvert \sigma\rvert$` es una **cota basada en la envolvente** de la oscilación. La respuesta real solo se sale de la banda del 5 % mientras *un pico* la supera. Aquí el único pico por encima del 5 % es el primero (19,6 %); el siguiente valle es de unos 3,8 %, ya dentro de la banda. Además, `$\pi$` es un redondeo de `$\lvert \ln  0{,}05\rvert  = 2{,}9957$`. En `$M_1$` coinciden casi por completo (1,478 frente a 1,483) porque el polo rápido apenas influye.

</div>

## 3. Parte B: sistema discreto (apartados 5–8)

### Qué cambia al pasar a z

Todo lo anterior sigue valiendo, con dos cambios de lectura:

- La estabilidad ya no es "parte real negativa", sino **módulo menor que 1**: `$\lvert p\rvert  \lt  1$`.
- El tiempo se mide en **muestras**. Para pasar a segundos se multiplica por `$T$`.

Si quieres entender de dónde salen esas fórmulas, revisa la página *De s a z* (`$z = e^{sT}$`). Aquí basta con la tabla de la sección 1. Prueba el modo discreto de la animación de arriba: elige un polo con `$r = 0{,}8$` y `$\varphi  = 0{,}8$` y compara `$t_p$`, `$M_p$` y `$t_s$` teóricos con los medidos.

### Paso 1. La planta discreta

Dos polos reales en `$z = 0{,}905$` y `$z = 0{,}135$`, y ganancia significativa unitaria. En continua, `$z = 1$`, así que se exige `$G(1) = 1$`:

<p class="eq" data-tex>G(z)=\frac{k}{(z-0{,}905)(z-0{,}135)},\qquad k=(1-0{,}905)(1-0{,}135)=0{,}082175</p>

```matlab
T  = 0.1;
Gz = zpk([], [0.905 0.135], 0.095*0.865, T);
```

(Curiosidad: `$0{,}905 = e^{-1\cdot 0{,}1}$` y `$0{,}135 = e^{-20\cdot 0{,}1}$`. Son los polos de la planta continua del apartado 3.1, muestreados. `$G(z)$` de la práctica no es exactamente su equivalente ZOH, porque no tiene el cero que le correspondería.)

### Paso 2. Cerrar el lazo y hallar los polos

El denominador de `$G$` es `$z^2 - 1{,}04z + 0{,}122175$`. Con ganancia `$F$`, la ecuación característica es `$z^2 - 1{,}04z + 0{,}122175 + 0{,}082175\cdot F = 0$`.

<details class="calc">
<summary><code>$M_1(z)$</code>, con <code>$F = 1$</code></summary>

<p class="eq" data-tex>z^2-1{,}04z+0{,}20435=0\ \Rightarrow\ z=0{,}7770\ \text{y}\ 0{,}2630</p>

Polos reales ⇒ sin pico, `$M_p = 0$`. Dominante `$0{,}7770$`:

<p class="eq" data-tex>k_s=\left\lceil -\frac{\pi}{\ln 0{,}7770}\right\rceil=\lceil 12{,}45\rceil=13\ \text{muestras}\ \Rightarrow\ t_s=1{,}3\ \text{s}</p>

Valor final `$M_1(1) = 0{,}082175/0{,}16435 = 0{,}5$`.

</details>

<details class="calc">
<summary><code>$M_2(z)$</code>, con <code>$F = 6{,}25$</code></summary>

<p class="eq" data-tex>z^2-1{,}04z+0{,}63577=0\ \Rightarrow\ z=0{,}5200\pm 0{,}6045\,j</p>

Pasa a forma polar: `$\lvert p\rvert  = \sqrt{0{,}63577} = 0{,}7974$` y `$\varphi  = \arctan (0{,}6045/0{,}5200) = 0{,}8604\,\text{rad}$`.

- `$k_p = \pi /\varphi  = 3{,}6515$` muestras ⇒ `$t_p = 0{,}3651\,\text{s}$`
- `$M_p = \lvert p\rvert ^{\pi /\varphi} = 0{,}7974^{3{,}6515} =$` **43,74 %**
- `$k_s = \lceil -\pi /\ln  0{,}7974\rceil  = \lceil 13{,}87\rceil  = 14$` ⇒ `$t_s = 1{,}4\,\text{s}$`
- Valor final `$M_2(1) = 0{,}5136/0{,}5958 = 0{,}8621$`

</details>

<details class="think">
<summary>Piensa antes de abrir: ¿por qué el sobreimpulso discreto (44 %) es tan superior al continuo (19,6 %)?</summary>

Con `$F = 6{,}25$` el polo gira `$\varphi  = 0{,}86\,\text{rad}$` por muestra: una oscilación completa dura unas 7,3 muestras. El pico llega tras solo 3,65 muestras y, en ese tiempo, la envolvente `$\lvert p\rvert ^{k}$` apenas ha decaído (vale 0,44). Cuanto mayor es `$\varphi$` con `$\lvert p\rvert$` dado, antes llega el pico y menos se ha apagado.

</details>

**Tabla 2 (teórico y medido).**

| | `$t_p$` teór. | `$M_p$` teór. | `$t_s$` teór. | `$t_p$` Matlab | `$M_p$` Matlab | `$t_s$` Matlab |
|---|---|---|---|---|---|---|
| `$M_1(z)$` | — | 0 % | 1,3 | — | 0 % | 1,4 |
| `$M_2(z)$` | 0,3651 | 43,74 % | 1,4 | 0,4 | 48,1 % | 1,3 |

Los valores medidos difieren porque en discreto **solo existen las muestras**: el máximo real de la secuencia cae en `$k = 4$` (0,4 s), no en `$k_p = 3{,}65$`, y eso eleva el `$M_p$` medido. El `$t_s$` coincide con una muestra de diferencia.

<div class="qa">

**¿Ventaja de subir la ganancia?**

La misma que en continuo: el valor final pasa de 0,5 a 0,862 (error del 13,8 %), pero con mucho más sobreimpulso. Puedes verlo moviendo `$F$` en el widget de la parte A, cambiando el selector a *Discreto*.

</div>

## 4. Parte C: rango de estabilidad (apartados 9–14)

### Qué se busca

Ahora la planta tiene un integrador: `$G'(s) = 10/(s(s+1)(s+10))$`. Se pregunta, como función de `$K$`, **qué respuesta tiene** el lazo cerrado. Es el estudio de cómo se mueven los polos al subir la ganancia. Los cinco regímenes que debes identificar son:

| Régimen | Cómo son los polos |
|---|---|
| Sobreamortiguado | Todos reales |
| Críticamente amortiguado | Dos reales iguales |
| Subamortiguado | Un par complejo con parte real negativa |
| Oscilación sostenida | Un par complejo **sobre el eje imaginario** |
| Inestable | Algún polo en el semiplano derecho |

Por qué `$10$`: el polo en el origen hace que la ganancia significativa sea `$K_v = \lim  s\cdot G'(s) = 10/(1\cdot 10) = 1$`.

```matlab
Gp = zpk([], [0 -1 -10], 10);
```

### Continuo (apartados 9–11)

Con realimentación unitaria, la ecuación característica es `$s(s+1)(s+10) + 10K = 0$`, es decir, `$s^3 + 11s^2 + 10s + 10K = 0$`.

- **Límite de estabilidad (criterio de Routh).** La primera columna es `$1$`, `$11$`, `$(110 - 10K)/11$`, `$10K$`. Para que todas sean positivas: `$K \lt  11$`. Con `$K = 11$` hay polos en `$\pm j\sqrt{10} = \pm 3{,}162j$`: oscilación sostenida de periodo `$2\pi /3{,}162 =$` **1,987 s**.
- **Amortiguamiento crítico.** Es el momento en que dos polos reales se funden. Ocurre en el punto de ruptura del eje real: se anula `$\frac{dK}{ds}$` de `$K = -s(s+1)(s+10)/10$`, es decir `$3s^2 + 22s + 10 = 0$`, de donde `$s = -0{,}4869$` (el otro valor, `$-6{,}8465$`, cae fuera del lugar de las raíces). Entonces `$K = 0{,}2377$`.

| Régimen | Rango de K |
|---|---|
| Sobreamortiguado | `$0 \lt  K \lt  0{,}2377$` |
| Críticamente amortiguado | `$K = 0{,}2377$` |
| Subamortiguado | `$0{,}2377 \lt  K \lt  11$` |
| Oscilación sostenida | `$K = 11$` |
| Inestable | `$K \gt  11$` |

Y estos son los polos para las ganancias que prueba el código de la práctica:

| K | Polos | Comportamiento |
|---|---|---|
| 0,18 | −10,020; −0,736; −0,244 | sobreamortiguado |
| 0,23765 | −10,026; −0,491; −0,483 | críticamente amortiguado |
| 3 | −10,312; −0,344 ± 1,671j | subamortiguado |
| 11 | −11; ±3,162j | oscilación sostenida |
| 12 | −11,075; 0,038 ± 3,291j | inestable |

<details class="think">
<summary>Piensa antes de abrir: si K sigue subiendo, ¿qué le pasa a la respuesta en cada etapa?</summary>

Al principio, los polos reales lentos se acercan. Se funden y se separan en un par complejo: aparece oscilación. El par se acerca al eje imaginario y la oscilación se apaga cada vez más despacio. En `$K = 11$` ya no se apaga. Si `$K$` sigue subiendo, el par cruza al semiplano derecho y la oscilación crece.

</details>

Verlo en movimiento ayuda mucho. En este widget, con la planta del apartado 3.3, pulsa **Animar la ganancia**: los puntos verdes son polos reales, los naranjas, par complejo, y los rojos, inestable.

<div data-widget="p4-barrido" data-planta="p33"></div>

### Discreto (apartados 12–14)

El equivalente con ZOH a `$T = 0{,}1\,\text{s}$` es:

<p class="eq" data-tex>BG'(z)=\frac{0{,}001287z^2+0{,}003984z+0{,}000744}{z^3-2{,}2727z^2+1{,}6056z-0{,}3329}</p>

```matlab
BGp = c2d(Gp, T, 'zoh');
```

El estudio es idéntico, pero la lectura cambia: los polos se miran con módulo y fase (`abs` y `angle` en el código de la práctica), y el límite de estabilidad es `$\lvert p\rvert  = 1$`.

| K | Polos | `$\lvert p\rvert$` | ∠p (rad) | Comportamiento |
|---|---|---|---|---|
| 0,16 | 0,9793; 0,9264; 0,3668 | 0,9793 | 0 | sobreamortiguado |
| 0,232 | 0,9531 ± 0,0006j; 0,3663 | 0,9531 | ≈ 0 | críticamente amortiguado |
| 2,4 | 0,9586 ± 0,1435j; 0,3524 | 0,9693 | 0,1485 | subamortiguado |
| 7,15 | 0,9680 ± 0,2509j; 0,3276 | 0,9999 | 0,2536 | oscilación sostenida |
| 8 | 0,9693 ± 0,2650j; 0,3237 | 1,0049 | 0,2669 | inestable |

| Régimen | Rango de K |
|---|---|
| Sobreamortiguado | `$0 \lt  K \lt  0{,}232$` |
| Críticamente amortiguado | `$K \approx  0{,}232$` |
| Subamortiguado | `$0{,}232 \lt  K \lt  7{,}16$` |
| Oscilación sostenida | `$K \approx  7{,}16$` |
| Inestable | `$K \gt  7{,}16$` |

**Periodo de la oscilación sostenida.** Con `$\angle p = 0{,}2537$` rad, la oscilación dura `$2\pi /0{,}2537 = 24{,}8$` muestras, es decir, `$24{,}8\cdot 0{,}1 =$` **2,48 s**.

**La conclusión importante.** Respecto al continuo, el límite baja de `$K = 11$` a `$K \approx  7{,}16$` y el periodo sube de 1,99 s a 2,48 s. Muestrear con ZOH equivale a añadir un retardo medio de `$T/2 = 50\,\text{ms}$`, y todo retardo resta margen de estabilidad.

## 5. Resumen: qué se calcula y para qué

| Qué | Cómo | Para qué |
|---|---|---|
| Polos de lazo cerrado | Raíces de `$1 + F\cdot G = 0$` | Es la clave: todo sale de ellos |
| Valor final | `$M(0)$` en s; `$M(1)$` en z | Medir `$M_p$` y el error permanente |
| `$t_p$`, `$M_p$`, `$t_s$` | Fórmulas del polo dominante | Predecir la respuesta antes de simularla |
| Medida en Matlab | `stepinfo` o cursor sobre `step` | Contrastar teoría y realidad |
| `$K$` crítico | Punto de ruptura del eje real | Frontera sobreamortiguado/subamortiguado |
| `$K$` límite | Routh (continuo), `$\lvert p\rvert  = 1$` (discreto) | Frontera de estabilidad |
| Periodo del límite | `$2\pi /\omega$` (s); `$2\pi /\varphi \cdot T$` (z) | Describir la oscilación sostenida |

## 6. Errores típicos, para no caer

1. **Dar `$t_p$` y `$M_p$` a una respuesta sobreamortiguada.** Con polos reales no hay pico.
2. **Medir `$M_p$` respecto a 1.** Es relativo al valor final: en `$M_2(s)$`, `$(1{,}15 - 0{,}9615)/0{,}9615$`.
3. **Olvidar `$T$`.** `$k_p$`, `$k_s$` y `$k_d$` están en muestras.
4. **Usar el polo rápido para `$t_s$`.** Manda el lento.
5. **Pensar que `$t_s$` medido y teórico deben coincidir.** El teórico es una cota; puede haber diferencias de un 20 %.
6. **Comparar el `$F$` de continuo con el de discreto.** `$F = 25$` y `$F = 6{,}25$` no son equivalentes.

## 7. Comprueba lo que has aprendido

Haz la prueba de la práctica 4, con 32 preguntas que incluyen contenido del Tema 2 y preguntas en el estilo de las prácticas anteriores. Tus resultados se guardan en el navegador y suman XP en Polos Quest.

Si vas a hacer la prueba, repasa antes las [preguntas tipo resueltas y el test con variantes](/subjects/sistemas-control/p4-prueba-tipo/).
